from decimal import Decimal
from unittest.mock import AsyncMock, patch

import pytest
import pytest_asyncio
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.developer import Developer
from app.services.ledger import LedgerService


@pytest_asyncio.fixture
async def onboarded_developer(db: AsyncSession) -> Developer:
    import uuid
    dev = Developer(
        email=f"onboarded_{uuid.uuid4().hex[:8]}@test.com",
        device_id=str(uuid.uuid4()),
        name="Onboarded Dev",
        pending_balance=Decimal("50.00"),
        paid_balance=Decimal("10.00"),
        stripe_account_id="acct_test_123",
        stripe_onboarded=True,
        hourly_cap_cents=50,
        daily_cap_cents=500,
    )
    db.add(dev)
    await db.commit()
    await db.refresh(dev)
    return dev


@pytest.mark.asyncio
async def test_deduct_for_payout_success(db: AsyncSession, onboarded_developer: Developer):
    ledger = LedgerService(db=db)
    payout = await ledger.deduct_for_payout(
        developer_id=onboarded_developer.id,
        amount_cents=1000,
    )
    await db.commit()

    assert payout.amount_cents == 1000
    assert payout.status == "pending"

    await db.refresh(onboarded_developer)
    assert onboarded_developer.pending_balance == Decimal("40.00")


@pytest.mark.asyncio
async def test_deduct_for_payout_insufficient_balance(db: AsyncSession, onboarded_developer: Developer):
    ledger = LedgerService(db=db)
    with pytest.raises(ValueError, match="Insufficient balance"):
        await ledger.deduct_for_payout(
            developer_id=onboarded_developer.id,
            amount_cents=999999,
        )


@pytest.mark.asyncio
async def test_complete_payout(db: AsyncSession, onboarded_developer: Developer):
    ledger = LedgerService(db=db)
    payout = await ledger.deduct_for_payout(
        developer_id=onboarded_developer.id,
        amount_cents=1000,
    )
    await db.flush()

    await ledger.complete_payout(
        payout_id=payout.id,
        stripe_transfer_id="tr_test_123",
    )
    await db.commit()
    await db.refresh(payout)

    assert payout.status == "completed"
    assert payout.stripe_transfer_id == "tr_test_123"


@pytest.mark.asyncio
async def test_fail_payout_refunds_balance(db: AsyncSession, onboarded_developer: Developer):
    original_balance = onboarded_developer.pending_balance
    ledger = LedgerService(db=db)
    payout = await ledger.deduct_for_payout(
        developer_id=onboarded_developer.id,
        amount_cents=1000,
    )
    await db.flush()

    await ledger.fail_payout(payout_id=payout.id, reason="Test failure")
    await db.commit()
    await db.refresh(onboarded_developer)

    assert payout.status == "failed"
    assert onboarded_developer.pending_balance == original_balance
