import asyncio
import uuid
from decimal import Decimal

import structlog
from celery import Task
from sqlalchemy import select, update

from app.database import AsyncSessionLocal
from app.models.developer import Developer
from app.models.payout import Payout
from app.services.ledger import LedgerService
from app.services.razorpay_service import RazorpayService
from app.services.wise_service import WiseService
from app.tasks.celery_app import celery_app

logger = structlog.get_logger(__name__)


@celery_app.task(
    bind=True,
    max_retries=3,
    default_retry_delay=30,
    name="app.tasks.payout_tasks.process_payout",
)
def process_payout(self: Task, payout_id: str) -> dict:  # type: ignore[type-arg]
    async def _run() -> dict:  # type: ignore[return]
        async with AsyncSessionLocal() as db:
            payout_result = await db.execute(
                select(Payout).where(Payout.id == uuid.UUID(payout_id))
            )
            payout = payout_result.scalar_one_or_none()
            if payout is None:
                logger.error("payout_task.not_found", payout_id=payout_id)
                return {"error": "payout_not_found"}

            if payout.status not in ("pending", "processing"):
                logger.info(
                    "payout_task.already_processed",
                    payout_id=payout_id,
                    status=payout.status,
                )
                return {"status": payout.status}

            dev_result = await db.execute(
                select(Developer).where(Developer.id == payout.developer_id)
            )
            developer = dev_result.scalar_one_or_none()
            if developer is None:
                ledger = LedgerService(db=db)
                await ledger.fail_payout(payout.id, "Developer not found")
                await db.commit()
                return {"error": "developer_not_found"}

            payout.status = "processing"
            await db.commit()

            provider = payout.provider or developer.payment_provider or "razorpay"

            try:
                if provider == "wise":
                    return await _process_wise_payout(db, payout, developer)
                else:
                    return await _process_razorpay_payout(db, payout, developer)
            except Exception as exc:
                logger.error(
                    "payout_task.error",
                    payout_id=payout_id,
                    provider=provider,
                    error=str(exc),
                )
                ledger = LedgerService(db=db)
                await ledger.fail_payout(payout.id, str(exc))
                await db.commit()
                raise

    try:
        return asyncio.run(_run())
    except Exception as exc:
        raise self.retry(exc=exc, countdown=30 * (2 ** self.request.retries)) from exc


async def _process_wise_payout(db, payout: Payout, developer: Developer) -> dict:
    """Send payout via Wise Business API. Completes synchronously after funding."""
    if not developer.wise_recipient_id:
        raise ValueError("Developer has no Wise recipient account — onboarding required")

    target_currency = developer.wise_currency or "USD"
    wise_svc = WiseService()
    transfer_id = await wise_svc.send_payout(
        recipient_id=developer.wise_recipient_id,
        target_currency=target_currency,
        amount_usd_cents=payout.amount_cents,
        payout_id=str(payout.id),
    )

    # Wise transfers process asynchronously, but we mark complete once funded
    payout.wise_transfer_id = transfer_id
    payout.status = "completed"
    amount_usd = Decimal(str(payout.amount_cents)) / Decimal("100")
    await db.execute(
        update(Developer)
        .where(Developer.id == developer.id)
        .values(paid_balance=Developer.paid_balance + amount_usd)
    )
    await db.commit()

    logger.info(
        "payout_task.wise.completed",
        payout_id=str(payout.id),
        transfer_id=transfer_id,
        target_currency=target_currency,
    )
    return {"status": "completed", "transfer_id": transfer_id}


async def _process_razorpay_payout(db, payout: Payout, developer: Developer) -> dict:
    """Send payout via Razorpay Route. Completion is confirmed by webhook."""
    if not developer.razorpay_fund_account_id:
        raise ValueError("Developer has no Razorpay fund account — onboarding required")

    if not payout.amount_inr_paise:
        raise ValueError("INR paise amount not set on payout — cannot send via Razorpay")

    razorpay_svc = RazorpayService()
    rzp_payout_id = await razorpay_svc.create_payout(
        fund_account_id=developer.razorpay_fund_account_id,
        amount_paise=payout.amount_inr_paise,
        payout_id=str(payout.id),
        mode="UPI",
    )

    # Razorpay payout is async — webhook (payout.processed / payout.failed) completes it
    payout.razorpay_payout_id = rzp_payout_id
    await db.commit()

    logger.info(
        "payout_task.razorpay.dispatched",
        payout_id=str(payout.id),
        razorpay_payout_id=rzp_payout_id,
    )
    return {"status": "processing", "razorpay_payout_id": rzp_payout_id}
