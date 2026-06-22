import uuid

from pydantic import BaseModel, Field


class PayoutCreate(BaseModel):
    amount_cents: int = Field(..., ge=1000, description="Minimum $10.00 payout")


class PayoutResponse(BaseModel):
    id: uuid.UUID
    developer_id: uuid.UUID
    amount_cents: int
    wise_transfer_id: str | None = None
    razorpay_payout_id: str | None = None
    status: str
    failure_reason: str | None = None
    requested_at: str
    completed_at: str | None = None

    model_config = {"from_attributes": True}


class PayoutOnboardResponse(BaseModel):
    onboarding_url: str
    account_id: str


class PayoutListResponse(BaseModel):
    payouts: list[PayoutResponse]
    total: int
