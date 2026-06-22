import uuid
from decimal import Decimal

from pydantic import BaseModel, Field


VALID_SURFACES = {"claude_code_webview", "codex_webview", "cli"}


class ImpressionRequest(BaseModel):
    impression_id: str = Field(..., min_length=1, max_length=64)
    campaign_id: str = Field(..., min_length=1, max_length=64)
    device_id: str = Field(..., min_length=1, max_length=64)
    duration_ms: int = Field(..., ge=5000, le=600000)
    surface: str = Field(..., min_length=1, max_length=32)

    @classmethod
    def validate_surface(cls, v: str) -> str:
        if v not in VALID_SURFACES:
            raise ValueError(f"surface must be one of {VALID_SURFACES}")
        return v


class ImpressionResponse(BaseModel):
    credited: bool
    reason: str | None = None
    developer_earn: Decimal | None = None
    today_balance: Decimal | None = None
    total_balance: Decimal | None = None


class ImpressionRecord(BaseModel):
    impression_id: str
    campaign_id: uuid.UUID
    surface: str
    duration_ms: int
    developer_earn: Decimal
    confirmed_at: str

    model_config = {"from_attributes": True}


class AdServeResponse(BaseModel):
    impression_id: str
    creative_text: str
    click_url: str
    ttl_ms: int
    campaign_id: uuid.UUID
