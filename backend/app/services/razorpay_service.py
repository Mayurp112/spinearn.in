import asyncio
import hashlib
import hmac
import json
import uuid

import razorpay
import structlog

from app.config import settings

logger = structlog.get_logger(__name__)


def _get_client() -> razorpay.Client:
    return razorpay.Client(
        auth=(settings.RAZORPAY_KEY_ID, settings.RAZORPAY_KEY_SECRET)
    )


class RazorpayService:
    """
    Wraps Razorpay SDK (sync) with asyncio.to_thread so it fits the async FastAPI stack.
    All monetary amounts:
      - Orders / advertiser payments: INR paise
      - Route payouts to developers: INR paise
    """

    # ── Advertiser payment ────────────────────────────────────────────────────

    async def create_order(self, amount_inr_paise: int, campaign_id: str) -> dict:
        """
        Create a Razorpay order for an advertiser paying for a campaign.
        amount_inr_paise: total charge in INR paise (1 INR = 100 paise).
        """
        if amount_inr_paise < 100:
            raise ValueError("Minimum Razorpay order amount is ₹1 (100 paise)")

        def _create():
            client = _get_client()
            return client.order.create({
                "amount": amount_inr_paise,
                "currency": "INR",
                "receipt": f"camp_{campaign_id[:16]}",
                "notes": {"campaign_id": campaign_id},
            })

        try:
            order = await asyncio.to_thread(_create)
            logger.info("razorpay.order.created", order_id=order["id"], campaign_id=campaign_id)
            return order
        except Exception as exc:
            logger.error("razorpay.order.create_failed", campaign_id=campaign_id, error=str(exc))
            raise

    def verify_payment_signature(
        self, order_id: str, payment_id: str, signature: str
    ) -> bool:
        """
        Verify Razorpay payment signature after checkout completes.
        Must be called BEFORE activating a campaign.
        """
        message = f"{order_id}|{payment_id}"
        expected = hmac.new(
            settings.RAZORPAY_KEY_SECRET.encode("utf-8"),
            message.encode("utf-8"),
            hashlib.sha256,
        ).hexdigest()
        return hmac.compare_digest(expected, signature)

    # ── Developer payout via Razorpay Route ───────────────────────────────────

    async def create_contact(self, name: str | None, email: str) -> str:
        """Create a Razorpay Contact for a developer (prerequisite for fund account)."""
        def _create():
            client = _get_client()
            return client.contact.create({
                "name": name or email.split("@")[0],
                "email": email,
                "type": "vendor",
                "reference_id": email,
            })

        try:
            contact = await asyncio.to_thread(_create)
            logger.info("razorpay.contact.created", contact_id=contact["id"], email=email)
            return contact["id"]
        except Exception as exc:
            logger.error("razorpay.contact.create_failed", email=email, error=str(exc))
            raise

    async def create_fund_account_bank(
        self,
        contact_id: str,
        account_number: str,
        ifsc: str,
        account_holder_name: str,
    ) -> str:
        """Add Indian bank account as fund account for Route payouts."""
        def _create():
            client = _get_client()
            return client.fund_account.create({
                "contact_id": contact_id,
                "account_type": "bank_account",
                "bank_account": {
                    "name": account_holder_name,
                    "ifsc": ifsc.upper(),
                    "account_number": account_number,
                },
            })

        try:
            fa = await asyncio.to_thread(_create)
            logger.info("razorpay.fund_account.bank.created", fund_account_id=fa["id"])
            return fa["id"]
        except Exception as exc:
            logger.error("razorpay.fund_account.bank.create_failed", error=str(exc))
            raise

    async def create_fund_account_upi(self, contact_id: str, vpa: str) -> str:
        """Add UPI VPA as fund account for Route payouts."""
        def _create():
            client = _get_client()
            return client.fund_account.create({
                "contact_id": contact_id,
                "account_type": "vpa",
                "vpa": {"address": vpa},
            })

        try:
            fa = await asyncio.to_thread(_create)
            logger.info("razorpay.fund_account.upi.created", fund_account_id=fa["id"])
            return fa["id"]
        except Exception as exc:
            logger.error("razorpay.fund_account.upi.create_failed", error=str(exc))
            raise

    async def create_payout(
        self,
        fund_account_id: str,
        amount_paise: int,
        payout_id: str,
        mode: str = "UPI",
    ) -> str:
        """
        Initiate a Route payout to a developer's bank/UPI.
        mode: UPI | IMPS | NEFT | RTGS
        Returns Razorpay payout ID.
        """
        if not settings.RAZORPAY_ACCOUNT_NUMBER:
            raise RuntimeError("RAZORPAY_ACCOUNT_NUMBER not configured")

        def _create():
            client = _get_client()
            return client.payout.create({
                "account_number": settings.RAZORPAY_ACCOUNT_NUMBER,
                "fund_account_id": fund_account_id,
                "amount": amount_paise,
                "currency": "INR",
                "mode": mode,
                "purpose": "payout",
                "queue_if_low_balance": True,
                "reference_id": str(payout_id),
                "narration": "SpinEarn Developer Earnings",
            })

        try:
            payout = await asyncio.to_thread(_create)
            logger.info(
                "razorpay.payout.created",
                razorpay_payout_id=payout["id"],
                internal_payout_id=payout_id,
            )
            return payout["id"]
        except Exception as exc:
            logger.error("razorpay.payout.create_failed", payout_id=payout_id, error=str(exc))
            raise

    # ── Webhook verification ──────────────────────────────────────────────────

    def verify_webhook(self, body: bytes, signature: str) -> dict:
        """
        Verify Razorpay webhook signature using HMAC-SHA256.
        Raises ValueError on invalid signature.
        """
        if not settings.RAZORPAY_WEBHOOK_SECRET:
            raise RuntimeError("RAZORPAY_WEBHOOK_SECRET not configured")

        expected = hmac.new(
            settings.RAZORPAY_WEBHOOK_SECRET.encode("utf-8"),
            body,
            hashlib.sha256,
        ).hexdigest()

        if not hmac.compare_digest(expected, signature):
            raise ValueError("Invalid Razorpay webhook signature")

        return json.loads(body)
