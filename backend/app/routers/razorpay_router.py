"""
Razorpay router — handles Indian advertiser payments and developer payout onboarding.

Flow (advertiser):
  1. POST /razorpay/orders        → create Razorpay order, return order_id + key
  2. Frontend opens Razorpay checkout popup
  3. On success, frontend calls POST /razorpay/verify-payment
  4. Backend verifies signature → activates campaign
  5. Razorpay also fires webhook → /webhooks/razorpay (idempotent backup)

Flow (developer payout onboarding):
  1. POST /razorpay/onboard/bank  → add bank account
     OR
     POST /razorpay/onboard/upi   → add UPI VPA
  2. Developer can now request payouts via /payouts
"""

import uuid
from typing import Annotated

import structlog
from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.database import get_db
from app.deps import CurrentDeveloperDep
from app.models.campaign import Campaign
from app.schemas.razorpay_schemas import (
    RazorpayBankOnboardRequest,
    RazorpayOnboardResponse,
    RazorpayOrderRequest,
    RazorpayOrderResponse,
    RazorpayUpiOnboardRequest,
    RazorpayVerifyPaymentRequest,
    RazorpayVerifyPaymentResponse,
)
from app.services.razorpay_service import RazorpayService
from app.utils.country import usd_cents_to_inr_paise

logger = structlog.get_logger(__name__)
router = APIRouter(prefix="/razorpay", tags=["razorpay"])


# ── Advertiser: create order ──────────────────────────────────────────────────

@router.post("/orders", response_model=RazorpayOrderResponse)
async def create_razorpay_order(
    body: RazorpayOrderRequest,
    request: Request,
    developer: CurrentDeveloperDep,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> RazorpayOrderResponse:
    """Create a Razorpay order for an advertiser campaign payment."""
    result = await db.execute(
        select(Campaign).where(Campaign.id == uuid.UUID(body.campaign_id))
    )
    campaign = result.scalar_one_or_none()
    if campaign is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Campaign not found")

    # Prevent double-payment
    if campaign.status == "active":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Campaign is already active and paid",
        )

    # Calculate total cost: bid_cpm * impressions_purchased / 1000
    total_usd_cents = int(float(campaign.bid_cpm) * campaign.impressions_purchased / 1000 * 100)
    amount_paise = usd_cents_to_inr_paise(total_usd_cents, settings.USD_TO_INR_RATE)

    razorpay_svc = RazorpayService()
    try:
        order = await razorpay_svc.create_order(
            amount_inr_paise=amount_paise,
            campaign_id=str(campaign.id),
        )
    except Exception as exc:
        logger.error("razorpay.order.failed", campaign_id=body.campaign_id, error=str(exc))
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Failed to create Razorpay order. Please try again.",
        ) from exc

    return RazorpayOrderResponse(
        order_id=order["id"],
        amount_paise=amount_paise,
        currency="INR",
        key_id=settings.RAZORPAY_KEY_ID,
    )


# ── Advertiser: verify payment after checkout ─────────────────────────────────

@router.post("/verify-payment", response_model=RazorpayVerifyPaymentResponse)
async def verify_razorpay_payment(
    body: RazorpayVerifyPaymentRequest,
    developer: CurrentDeveloperDep,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> RazorpayVerifyPaymentResponse:
    """
    Verify Razorpay payment signature and activate campaign.
    Called by frontend immediately after checkout success callback.
    Webhook also handles this (idempotent).
    """
    razorpay_svc = RazorpayService()

    # Verify signature — prevents forged activation requests
    if not razorpay_svc.verify_payment_signature(
        order_id=body.razorpay_order_id,
        payment_id=body.razorpay_payment_id,
        signature=body.razorpay_signature,
    ):
        logger.warning(
            "razorpay.verify.invalid_signature",
            order_id=body.razorpay_order_id,
            payment_id=body.razorpay_payment_id,
        )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid payment signature. Contact support.",
        )

    result = await db.execute(
        select(Campaign).where(Campaign.id == uuid.UUID(body.campaign_id))
    )
    campaign = result.scalar_one_or_none()
    if campaign is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Campaign not found")

    if campaign.status == "active":
        # Already activated (possibly by webhook) — idempotent
        return RazorpayVerifyPaymentResponse(status="already_active", campaign_id=body.campaign_id)

    campaign.status = "active"
    campaign.stripe_payment_id = body.razorpay_payment_id  # reuse field for payment ref
    await db.commit()

    # Place bid in auction
    from app.deps import get_redis
    from app.services.auction import AuctionService
    redis = await get_redis()
    auction = AuctionService(redis=redis, db=db)
    await auction.place_bid(body.campaign_id, float(campaign.bid_cpm))

    logger.info("razorpay.payment.verified", campaign_id=body.campaign_id)
    return RazorpayVerifyPaymentResponse(status="activated", campaign_id=body.campaign_id)


# ── Developer: bank account onboarding ───────────────────────────────────────

@router.post("/onboard/bank", response_model=RazorpayOnboardResponse)
async def onboard_bank_account(
    body: RazorpayBankOnboardRequest,
    developer: CurrentDeveloperDep,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> RazorpayOnboardResponse:
    """
    Add Indian bank account for developer payouts via Razorpay Route.
    Creates Razorpay Contact (if new) then Fund Account.
    """
    if not settings.RAZORPAY_KEY_ID:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Razorpay payouts not configured for this environment",
        )

    razorpay_svc = RazorpayService()

    # Step 1: Create contact if not exists
    if not developer.razorpay_contact_id:
        try:
            contact_id = await razorpay_svc.create_contact(
                name=developer.name, email=developer.email
            )
            developer.razorpay_contact_id = contact_id
            await db.flush()
        except Exception as exc:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail="Failed to create Razorpay contact. Please try again.",
            ) from exc

    # Step 2: Create fund account
    try:
        fund_account_id = await razorpay_svc.create_fund_account_bank(
            contact_id=developer.razorpay_contact_id,
            account_number=body.account_number,
            ifsc=body.ifsc,
            account_holder_name=body.account_holder_name,
        )
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Failed to add bank account. Verify account details and try again.",
        ) from exc

    developer.razorpay_fund_account_id = fund_account_id
    developer.razorpay_onboarded = True
    developer.payment_provider = "razorpay"
    await db.commit()

    logger.info(
        "razorpay.onboard.bank.complete",
        developer_id=str(developer.id),
        fund_account_id=fund_account_id,
    )
    return RazorpayOnboardResponse(fund_account_id=fund_account_id)


# ── Developer: UPI onboarding ─────────────────────────────────────────────────

@router.post("/onboard/upi", response_model=RazorpayOnboardResponse)
async def onboard_upi(
    body: RazorpayUpiOnboardRequest,
    developer: CurrentDeveloperDep,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> RazorpayOnboardResponse:
    """Add UPI VPA for developer payouts via Razorpay Route."""
    if not settings.RAZORPAY_KEY_ID:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Razorpay payouts not configured for this environment",
        )

    razorpay_svc = RazorpayService()

    if not developer.razorpay_contact_id:
        try:
            contact_id = await razorpay_svc.create_contact(
                name=developer.name, email=developer.email
            )
            developer.razorpay_contact_id = contact_id
            await db.flush()
        except Exception as exc:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail="Failed to create Razorpay contact. Please try again.",
            ) from exc

    try:
        fund_account_id = await razorpay_svc.create_fund_account_upi(
            contact_id=developer.razorpay_contact_id,
            vpa=body.vpa,
        )
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Failed to add UPI. Verify VPA address and try again.",
        ) from exc

    developer.razorpay_fund_account_id = fund_account_id
    developer.razorpay_onboarded = True
    developer.payment_provider = "razorpay"
    await db.commit()

    logger.info(
        "razorpay.onboard.upi.complete",
        developer_id=str(developer.id),
        fund_account_id=fund_account_id,
    )
    return RazorpayOnboardResponse(fund_account_id=fund_account_id)
