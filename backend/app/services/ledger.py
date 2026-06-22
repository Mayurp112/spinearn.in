from __future__ import annotations

import uuid
from decimal import Decimal

import structlog
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.developer import Developer
from app.models.payout import Payout

logger = structlog.get_logger(__name__)


class LedgerService:
    def __init__(self, db: AsyncSession) -> None:
        self._db = db

    async def get_developer_balance(self, developer_id: uuid.UUID) -> dict[str, Decimal]:
        result = await self._db.execute(
            select(Developer.pending_balance, Developer.paid_balance).where(
                Developer.id == developer_id
            )
        )
        row = result.first()
        if row is None:
            return {"pending_balance": Decimal("0"), "paid_balance": Decimal("0")}
        return {
            "pending_balance": row.pending_balance,
            "paid_balance": row.paid_balance,
        }

    async def deduct_for_payout(
        self, developer_id: uuid.UUID, amount_cents: int
    ) -> Payout:
        amount_usd = Decimal(str(amount_cents)) / Decimal("100")

        result = await self._db.execute(
            select(Developer)
            .where(Developer.id == developer_id)
            .with_for_update(nowait=True)
        )
        developer = result.scalar_one_or_none()
        if developer is None:
            raise ValueError("Developer not found")

        if developer.pending_balance < amount_usd:
            raise ValueError(
                f"Insufficient balance: {developer.pending_balance} < {amount_usd}"
            )

        await self._db.execute(
            update(Developer)
            .where(Developer.id == developer_id)
            .values(pending_balance=Developer.pending_balance - amount_usd)
        )

        payout = Payout(
            developer_id=developer_id,
            amount_cents=amount_cents,
            status="pending",
        )
        self._db.add(payout)
        await self._db.flush()

        logger.info(
            "ledger.payout_created",
            developer_id=str(developer_id),
            amount_cents=amount_cents,
        )
        return payout

    async def complete_payout(
        self,
        payout_id: uuid.UUID,
        transfer_ref: str,
    ) -> None:
        """Mark a payout completed and move amount to paid_balance. transfer_ref is provider-specific."""
        result = await self._db.execute(
            select(Payout).where(Payout.id == payout_id).with_for_update()
        )
        payout = result.scalar_one_or_none()
        if payout is None:
            return

        payout.status = "completed"
        # Store in the appropriate field based on provider
        if payout.provider == "wise":
            payout.wise_transfer_id = transfer_ref
        else:
            payout.razorpay_payout_id = transfer_ref

        amount_usd = Decimal(str(payout.amount_cents)) / Decimal("100")
        await self._db.execute(
            update(Developer)
            .where(Developer.id == payout.developer_id)
            .values(paid_balance=Developer.paid_balance + amount_usd)
        )
        await self._db.flush()
        logger.info("ledger.payout_completed", payout_id=str(payout_id), provider=payout.provider)

    async def fail_payout(
        self, payout_id: uuid.UUID, reason: str
    ) -> None:
        result = await self._db.execute(
            select(Payout).where(Payout.id == payout_id).with_for_update()
        )
        payout = result.scalar_one_or_none()
        if payout is None:
            return

        payout.status = "failed"
        payout.failure_reason = reason

        amount_usd = Decimal(str(payout.amount_cents)) / Decimal("100")
        await self._db.execute(
            update(Developer)
            .where(Developer.id == payout.developer_id)
            .values(pending_balance=Developer.pending_balance + amount_usd)
        )
        await self._db.flush()
        logger.warning("ledger.payout_failed", payout_id=str(payout_id), reason=reason)
