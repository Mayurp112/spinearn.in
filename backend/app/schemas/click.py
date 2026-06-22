import uuid
from decimal import Decimal

from pydantic import BaseModel, Field


class ClickRequest(BaseModel):
    impression_id: str = Field(..., min_length=1, max_length=64)
    device_id: str = Field(..., min_length=1, max_length=64)


class ClickResponse(BaseModel):
    credited: bool
    reason: str | None = None
    click_earning: Decimal | None = None


class ClickRecord(BaseModel):
    id: uuid.UUID
    impression_id: str
    campaign_id: uuid.UUID
    developer_earn: Decimal
    clicked_at: str

    model_config = {"from_attributes": True}
