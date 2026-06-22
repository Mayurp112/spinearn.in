from typing import Annotated

import structlog
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, field_validator
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.database import get_db
from app.deps import CurrentDeveloperDep
from app.models.payout import Payout
from app.schemas.payout import PayoutCreate, PayoutResponse
from app.services.ledger import LedgerService
from app.services.razorpay_service import RazorpayService
from app.services.wise_service import WiseService
from app.tasks.payout_tasks import process_payout
from app.utils.country import usd_cents_to_inr_paise

logger = structlog.get_logger(__name__)
router = APIRouter(prefix="/payouts", tags=["payouts"])

SUPPORTED_WISE_CURRENCIES = {
    "USD", "EUR", "GBP", "AUD", "CAD", "SGD", "JPY", "CHF",
    "HKD", "NZD", "SEK", "NOK", "DKK", "PLN", "CZK", "HUF",
    "MXN", "BRL", "ZAR", "AED", "MYR", "THB", "PHP", "IDR",
}


# ── Request schemas ───────────────────────────────────────────────────────────

class WiseOnboardRequest(BaseModel):
    account_holder_name: str
    currency: str                      # ISO-4217, e.g. "USD", "EUR"
    payment_type: str                  # iban | swift_code | aba | sort_code
    account_number: str | None = None  # local account number or IBAN
    iban: str | None = None
    swift_code: str | None = None      # BIC/SWIFT
    routing_number: str | None = None  # US ABA routing or UK sort code

    @field_validator("currency")
    @classmethod
    def validate_currency(cls, v: str) -> str:
        v = v.upper()
        if v not in SUPPORTED_WISE_CURRENCIES:
            raise ValueError(f"Unsupported currency. Supported: {', '.join(sorted(SUPPORTED_WISE_CURRENCIES))}")
        return v

    @field_validator("payment_type")
    @classmethod
    def validate_payment_type(cls, v: str) -> str:
        allowed = {"iban", "swift_code", "aba", "sort_code"}
        if v not in allowed:
            raise ValueError(f"payment_type must be one of: {', '.join(allowed)}")
        return v


class SwitchProviderRequest(BaseModel):
    provider: str  # "razorpay" | "wise"

    @field_validator("provider")
    @classmethod
    def validate_provider(cls, v: str) -> str:
        if v not in ("razorpay", "wise"):
            raise ValueError("provider must be 'razorpay' or 'wise'")
        return v


# ── Payout request ────────────────────────────────────────────────────────────

@router.post("", response_model=PayoutResponse, status_code=status.HTTP_201_CREATED)
async def request_payout(
    body: PayoutCreate,
    developer: CurrentDeveloperDep,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> PayoutResponse:
    """
    Request a payout via the developer's configured provider (Razorpay or Wise).

    Edge cases handled:
    - Pending payout already exists → 409
    - Payout account not set up → 400
    - Amount below minimum threshold → 400
    - Insufficient balance → 400
    """
    existing = await db.execute(
        select(Payout).where(
            Payout.developer_id == developer.id,
            Payout.status == "pending",
        )
    )
    if existing.scalar_one_or_none() is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A payout is already pending. Wait for it to complete before requesting another.",
        )

    if body.amount_cents < settings.MINIMUM_PAYOUT_CENTS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Minimum payout is ${settings.MINIMUM_PAYOUT_CENTS / 100:.2f}",
        )

    available_cents = int(float(developer.pending_balance) * 100)
    if body.amount_cents > available_cents:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Insufficient balance. Available: ${available_cents / 100:.2f}",
        )

    provider = developer.payment_provider or "razorpay"

    if provider == "wise":
        if not developer.wise_onboarded or not developer.wise_recipient_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="International payout account not set up. Add your bank details first.",
            )
    else:
        if not developer.razorpay_onboarded or not developer.razorpay_fund_account_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Payout account not set up. Add a bank account or UPI first.",
            )

    ledger = LedgerService(db=db)
    payout = await ledger.deduct_for_payout(
        developer_id=developer.id,
        amount_cents=body.amount_cents,
    )
    payout.provider = provider

    if provider == "razorpay":
        payout.amount_inr_paise = usd_cents_to_inr_paise(
            body.amount_cents, settings.USD_TO_INR_RATE
        )

    await db.commit()
    await db.refresh(payout)

    process_payout.delay(str(payout.id))
    logger.info(
        "payout.requested",
        payout_id=str(payout.id),
        developer_id=str(developer.id),
        provider=provider,
        amount_cents=body.amount_cents,
    )

    return PayoutResponse.model_validate(payout)


# ── Provider info ─────────────────────────────────────────────────────────────

@router.get("/provider")
async def get_payout_provider(developer: CurrentDeveloperDep) -> dict[str, str | bool]:
    """Return the developer's payout provider and onboarding status for the payout setup UI."""
    provider = developer.payment_provider or "razorpay"
    if provider == "wise":
        onboarded = bool(developer.wise_onboarded)
    else:
        onboarded = bool(developer.razorpay_onboarded)
    return {
        "provider": provider,
        "onboarded": onboarded,
        "country": developer.country or "",
    }


@router.patch("/provider")
async def switch_payout_provider(
    body: SwitchProviderRequest,
    developer: CurrentDeveloperDep,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> dict[str, str]:
    """Allow a developer to switch between Razorpay (India) and Wise (global)."""
    developer.payment_provider = body.provider
    await db.commit()
    logger.info(
        "payout.provider_switched",
        developer_id=str(developer.id),
        provider=body.provider,
    )
    return {"provider": body.provider}


# ── Wise onboarding ───────────────────────────────────────────────────────────

@router.post("/onboard/wise", status_code=status.HTTP_200_OK)
async def onboard_wise(
    body: WiseOnboardRequest,
    developer: CurrentDeveloperDep,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> dict[str, str | bool]:
    """
    Register a global developer's bank account with Wise and store the recipient ID.
    Supports IBAN, SWIFT, US ACH, and UK sort code account types.
    """
    # Validate required fields per payment type
    if body.payment_type == "iban" and not body.iban:
        raise HTTPException(status_code=400, detail="iban is required for payment_type 'iban'")
    if body.payment_type == "swift_code" and not (body.account_number and body.swift_code):
        raise HTTPException(status_code=400, detail="account_number and swift_code are required for payment_type 'swift_code'")
    if body.payment_type == "aba" and not (body.account_number and body.routing_number):
        raise HTTPException(status_code=400, detail="account_number and routing_number are required for payment_type 'aba'")
    if body.payment_type == "sort_code" and not (body.account_number and body.routing_number):
        raise HTTPException(status_code=400, detail="account_number and routing_number (sort code) are required for payment_type 'sort_code'")

    wise_svc = WiseService()
    try:
        recipient_id = await wise_svc.create_recipient(
            account_holder_name=body.account_holder_name,
            currency=body.currency,
            payment_type=body.payment_type,
            account_number=body.account_number,
            iban=body.iban,
            swift_code=body.swift_code,
            routing_number=body.routing_number,
        )
    except Exception as exc:
        logger.error("wise.onboard.failed", developer_id=str(developer.id), error=str(exc))
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Failed to register bank account with Wise: {exc}",
        ) from exc

    developer.wise_recipient_id = recipient_id
    developer.wise_currency = body.currency.upper()
    developer.wise_onboarded = True
    developer.payment_provider = "wise"
    await db.commit()

    logger.info(
        "wise.onboard.completed",
        developer_id=str(developer.id),
        recipient_id=recipient_id,
        currency=body.currency,
    )
    return {
        "wise_recipient_id": recipient_id,
        "currency": body.currency.upper(),
        "provider": "wise",
        "onboarded": True,
    }
