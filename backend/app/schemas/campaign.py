import uuid
from decimal import Decimal

from pydantic import BaseModel, Field, HttpUrl, field_validator


class CampaignCreate(BaseModel):
    creative_text: str = Field(..., min_length=1, max_length=80)
    destination_url: str = Field(..., min_length=10, max_length=2048)
    bid_cpm: Decimal = Field(..., gt=Decimal("0.01"), le=Decimal("999.9999"))
    impression_blocks: int = Field(..., ge=1, le=10000)

    @field_validator("destination_url")
    @classmethod
    def validate_https_url(cls, v: str) -> str:
        if not v.startswith("https://"):
            raise ValueError("destination_url must be an HTTPS URL")
        return v

    @field_validator("creative_text")
    @classmethod
    def validate_creative_text(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("creative_text cannot be empty or whitespace")
        return v


class CampaignUpdate(BaseModel):
    status: str = Field(..., pattern="^(active|paused)$")


class CampaignResponse(BaseModel):
    id: uuid.UUID
    advertiser_id: uuid.UUID
    creative_text: str
    destination_url: str
    bid_cpm: Decimal
    click_multiplier: int
    impressions_purchased: int
    impressions_served: int
    clicks_count: int
    total_spend: Decimal
    status: str
    created_at: str
    updated_at: str

    model_config = {"from_attributes": True}


class CampaignStats(BaseModel):
    campaign_id: uuid.UUID
    impressions_served: int
    impressions_purchased: int
    clicks_count: int
    ctr: float
    total_spend: Decimal
    auction_position: int
    daily_breakdown: list[dict[str, object]]
    hourly_breakdown: list[dict[str, object]]
    daily_spend: list[dict[str, object]]
    completion_pct: float


class CampaignCheckoutResponse(BaseModel):
    campaign_id: uuid.UUID
    checkout_url: str
    total_cost_usd: Decimal


class AuctionBid(BaseModel):
    campaign_id: str
    creative_text: str
    bid_cpm: float
    position: int
    impressions_remaining: int
