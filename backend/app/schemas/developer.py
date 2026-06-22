import uuid
from decimal import Decimal

from pydantic import BaseModel, EmailStr, Field


class DeveloperBase(BaseModel):
    email: EmailStr
    name: str | None = None


class DeveloperCreate(DeveloperBase):
    device_id: str = Field(..., max_length=64)


class DeveloperResponse(DeveloperBase):
    id: uuid.UUID
    device_id: str
    pending_balance: Decimal
    paid_balance: Decimal
    blocked: bool
    created_at: str

    model_config = {"from_attributes": True}


class DeveloperBalance(BaseModel):
    pending_balance: Decimal
    paid_balance: Decimal
    today_earned: Decimal
    week_earned: Decimal
    hourly_cap_cents: int
    daily_cap_cents: int

    model_config = {"from_attributes": True}


class DeveloperEarnings(BaseModel):
    period: str
    total_earned: Decimal
    impression_earned: Decimal
    click_earned: Decimal
    impression_count: int
    click_count: int
    avg_cpm: Decimal
    # Each point: { label, earned, impression_earned, click_earned, impression_count, click_count }
    data_points: list[dict[str, object]]


class DeveloperReferral(BaseModel):
    referral_code: str
    referral_url: str
    referral_count: int
    total_bonus_cents: int
