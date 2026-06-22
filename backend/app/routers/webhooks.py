import uuid
from datetime import datetime, timezone

import structlog
from fastapi import APIRouter, HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import AsyncSessionLocal
from app.deps import get_redis
from app.models.campaign import Campaign
from app.models.payout import Payout
from app.services.auction import AuctionService
from app.services.ledger import LedgerService
from app.services.razorpay_service import RazorpayService

logger = structlog.get_logger(__name__)
router = APIRouter(prefix="/webhooks", tags=["webhooks"])


# ── Razorpay webhook ──────────────────────────────────────────────────────────

@router.post("/razorpay", status_code=status.HTTP_200_OK)
async def razorpay_webhook(request: Request) -> dict[str, str]:
    """
    Handle Razorpay webhook events.
    Acts as idempotent backup for:
      - payment.captured  → activate campaign (if not already active)
      - payout.processed  → mark developer payout complete
      - payout.failed     → mark developer payout failed, restore balance
    """
    payload = await request.body()
    signature = request.headers.get("X-Razorpay-Signature", "")

    razorpay_svc = RazorpayService()
    try:
        event = razorpay_svc.verify_webhook(body=payload, signature=signature)
    except ValueError as exc:
        logger.warning("razorpay_webhook.invalid_signature", error=str(exc))
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid signature") from exc
    except RuntimeError as exc:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc)) from exc

    event_type: str = event.get("event", "")
    logger.info("razorpay_webhook.received", event_type=event_type)

    async with AsyncSessionLocal() as db:
        try:
            if event_type == "payment.captured":
                await _rzp_handle_payment_captured(db, event)
            elif event_type == "payout.processed":
                await _rzp_handle_payout_processed(db, event)
            elif event_type == "payout.failed":
                await _rzp_handle_payout_failed(db, event)
            elif event_type == "payout.reversed":
                await _rzp_handle_payout_failed(db, event, reason="Payout reversed by Razorpay")
            else:
                logger.debug("razorpay_webhook.unhandled", event_type=event_type)

            await db.commit()
        except Exception as exc:
            await db.rollback()
            logger.error("razorpay_webhook.processing_error", event_type=event_type, error=str(exc))
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Webhook processing failed",
            ) from exc

    return {"status": "ok"}


async def _rzp_handle_payment_captured(db: AsyncSession, event: dict) -> None:
    """Activate campaign when Razorpay payment is captured (idempotent)."""
    payment = event.get("payload", {}).get("payment", {}).get("entity", {})
    notes = payment.get("notes", {})
    campaign_id_str: str | None = notes.get("campaign_id")
    if not campaign_id_str:
        logger.warning("razorpay_webhook.payment.missing_campaign_id")
        return

    try:
        campaign_uuid = uuid.UUID(campaign_id_str)
    except ValueError:
        logger.warning("razorpay_webhook.payment.invalid_campaign_id", raw=campaign_id_str)
        return

    result = await db.execute(select(Campaign).where(Campaign.id == campaign_uuid))
    campaign = result.scalar_one_or_none()
    if campaign is None:
        logger.warning("razorpay_webhook.payment.campaign_not_found", campaign_id=campaign_id_str)
        return

    if campaign.status == "active":
        logger.info("razorpay_webhook.payment.already_active", campaign_id=campaign_id_str)
        return  # idempotent — already handled by verify-payment endpoint

    campaign.status = "active"
    campaign.stripe_payment_id = payment.get("id")  # reused field — stores Razorpay payment_id
    await db.flush()

    redis = await get_redis()
    auction = AuctionService(redis=redis, db=db)
    await auction.place_bid(campaign_id_str, float(campaign.bid_cpm))
    logger.info("razorpay_webhook.payment.campaign_activated", campaign_id=campaign_id_str)


async def _rzp_handle_payout_processed(db: AsyncSession, event: dict) -> None:
    """Mark developer payout as completed when Razorpay payout succeeds."""
    payout_entity = event.get("payload", {}).get("payout", {}).get("entity", {})
    reference_id: str | None = payout_entity.get("reference_id")
    razorpay_payout_id: str | None = payout_entity.get("id")

    if not reference_id:
        logger.warning("razorpay_webhook.payout.missing_reference_id")
        return

    try:
        payout_uuid = uuid.UUID(reference_id)
    except ValueError:
        logger.warning("razorpay_webhook.payout.invalid_reference_id", raw=reference_id)
        return

    result = await db.execute(select(Payout).where(Payout.id == payout_uuid))
    payout = result.scalar_one_or_none()
    if payout is None:
        logger.warning("razorpay_webhook.payout.not_found", payout_id=reference_id)
        return

    if payout.status == "completed":
        return  # idempotent

    payout.status = "completed"
    payout.razorpay_payout_id = razorpay_payout_id
    payout.completed_at = datetime.now(timezone.utc).isoformat()
    logger.info("razorpay_webhook.payout.completed", payout_id=reference_id)


async def _rzp_handle_payout_failed(
    db: AsyncSession, event: dict, reason: str | None = None
) -> None:
    """Mark developer payout as failed and restore their balance."""
    payout_entity = event.get("payload", {}).get("payout", {}).get("entity", {})
    reference_id: str | None = payout_entity.get("reference_id")

    if not reference_id:
        logger.warning("razorpay_webhook.payout_failed.missing_reference_id")
        return

    try:
        payout_uuid = uuid.UUID(reference_id)
    except ValueError:
        return

    result = await db.execute(select(Payout).where(Payout.id == payout_uuid))
    payout = result.scalar_one_or_none()
    if payout is None or payout.status in ("completed", "failed"):
        return  # idempotent

    failure_reason = reason or payout_entity.get("failure_reason", "Razorpay payout failed")
    ledger = LedgerService(db=db)
    await ledger.fail_payout(payout_id=payout_uuid, reason=failure_reason)
    logger.info("razorpay_webhook.payout.failed", payout_id=reference_id, reason=failure_reason)
