import httpx
import structlog

from app.config import settings

logger = structlog.get_logger(__name__)


class WiseService:
    """
    Wise Business API client for sending payouts to global developers.
    Source currency is always USD (your Wise balance); converts to developer's local currency.

    Full transfer flow: create quote → create transfer → fund transfer.
    Wise transfers are typically processed within 1-2 business days.
    """

    BASE_URL = "https://api.wise.com"

    def _headers(self) -> dict[str, str]:
        if not settings.WISE_API_KEY:
            raise RuntimeError("WISE_API_KEY not configured")
        return {
            "Authorization": f"Bearer {settings.WISE_API_KEY}",
            "Content-Type": "application/json",
        }

    def _profile_id(self) -> int:
        if not settings.WISE_PROFILE_ID:
            raise RuntimeError("WISE_PROFILE_ID not configured")
        return int(settings.WISE_PROFILE_ID)

    async def create_recipient(
        self,
        account_holder_name: str,
        currency: str,
        payment_type: str,
        account_number: str | None = None,
        iban: str | None = None,
        swift_code: str | None = None,
        routing_number: str | None = None,
    ) -> str:
        """
        Create a Wise recipient account. Returns recipient account ID (string).

        payment_type:
          "iban"       — European / global IBAN-based accounts
          "swift_code" — International SWIFT/BIC (non-IBAN countries)
          "aba"        — US ACH (account number + ABA routing number)
          "sort_code"  — UK bank accounts (account number + sort code)
        """
        if payment_type == "iban":
            details: dict = {"iban": iban}
        elif payment_type == "aba":
            details = {"accountNumber": account_number, "abartn": routing_number}
        elif payment_type == "sort_code":
            details = {"accountNumber": account_number, "sortCode": routing_number}
        else:  # swift_code — works for most non-IBAN countries
            details = {"accountNumber": account_number, "swiftCode": swift_code}

        payload = {
            "profile": self._profile_id(),
            "accountHolderName": account_holder_name,
            "currency": currency.upper(),
            "type": payment_type,
            "details": details,
        }

        async with httpx.AsyncClient(base_url=self.BASE_URL, timeout=30.0) as client:
            resp = await client.post("/v1/accounts", json=payload, headers=self._headers())
            resp.raise_for_status()
            data = resp.json()
            recipient_id = str(data["id"])
            logger.info(
                "wise.recipient.created",
                recipient_id=recipient_id,
                currency=currency,
                payment_type=payment_type,
            )
            return recipient_id

    async def _create_quote(self, target_currency: str, source_amount_usd: float) -> str:
        """Create a Wise quote: USD → target_currency. Returns quote UUID."""
        payload = {
            "sourceCurrency": "USD",
            "targetCurrency": target_currency.upper(),
            "sourceAmount": round(source_amount_usd, 2),
            "profile": self._profile_id(),
        }
        async with httpx.AsyncClient(base_url=self.BASE_URL, timeout=30.0) as client:
            resp = await client.post(
                f"/v3/profiles/{self._profile_id()}/quotes",
                json=payload,
                headers=self._headers(),
            )
            resp.raise_for_status()
            data = resp.json()
            return str(data["id"])

    async def _create_transfer(
        self, recipient_account_id: str, quote_uuid: str, payout_id: str
    ) -> str:
        """Create a Wise transfer. Returns transfer ID."""
        payload = {
            "targetAccount": int(recipient_account_id),
            "quoteUuid": quote_uuid,
            "customerTransactionId": payout_id,
            "details": {
                "reference": f"SpinEarn {payout_id[:20]}",
                "transferPurpose": "TRANSFER",
                "sourceOfFunds": "Savings",
            },
        }
        async with httpx.AsyncClient(base_url=self.BASE_URL, timeout=30.0) as client:
            resp = await client.post("/v1/transfers", json=payload, headers=self._headers())
            resp.raise_for_status()
            data = resp.json()
            transfer_id = str(data["id"])
            logger.info(
                "wise.transfer.created", transfer_id=transfer_id, payout_id=payout_id
            )
            return transfer_id

    async def _fund_transfer(self, transfer_id: str) -> None:
        """Fund a Wise transfer from your Wise USD balance account."""
        async with httpx.AsyncClient(base_url=self.BASE_URL, timeout=30.0) as client:
            resp = await client.post(
                f"/v3/profiles/{self._profile_id()}/transfers/{transfer_id}/payments",
                json={"type": "BALANCE"},
                headers=self._headers(),
            )
            resp.raise_for_status()
            logger.info("wise.transfer.funded", transfer_id=transfer_id)

    async def send_payout(
        self,
        recipient_id: str,
        target_currency: str,
        amount_usd_cents: int,
        payout_id: str,
    ) -> str:
        """
        Full payout pipeline: quote → create transfer → fund.
        Returns Wise transfer ID. Transfer settles asynchronously (1-2 business days).
        """
        amount_usd = amount_usd_cents / 100.0
        quote_uuid = await self._create_quote(target_currency, amount_usd)
        transfer_id = await self._create_transfer(recipient_id, quote_uuid, payout_id)
        await self._fund_transfer(transfer_id)
        logger.info(
            "wise.payout.dispatched",
            payout_id=payout_id,
            transfer_id=transfer_id,
            amount_usd=amount_usd,
            target_currency=target_currency,
        )
        return transfer_id
