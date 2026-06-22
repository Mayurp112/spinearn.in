from typing import Annotated

import structlog
from fastapi import APIRouter, Depends, Header, HTTPException, Request, status
from sqlalchemy.ext.asyncio import AsyncSession

import redis.asyncio as aioredis
from nanoid import generate

from app.config import settings
from app.database import get_db
from app.deps import CurrentDeveloperOptionalDep, DeviceIdDep, get_redis
from app.schemas.impression import AdServeResponse
from app.services.auction import AuctionService

logger = structlog.get_logger(__name__)
router = APIRouter(prefix="/ads", tags=["ads"])


@router.get(
    "/current",
    response_model=AdServeResponse,
    status_code=status.HTTP_200_OK,
    responses={204: {"description": "No active campaigns"}},
)
async def get_current_ad(
    device_id: DeviceIdDep,
    db: Annotated[AsyncSession, Depends(get_db)],
    redis: Annotated[aioredis.Redis, Depends(get_redis)],
    developer: CurrentDeveloperOptionalDep,
    request: Request,
) -> AdServeResponse:
    auction = AuctionService(redis=redis, db=db)
    campaign = await auction.get_winning_ad()

    if campaign is None:
        raise HTTPException(status_code=status.HTTP_204_NO_CONTENT)

    impression_id = f"imp_{generate(size=21)}"
    click_url = f"{settings.BACKEND_URL}/api/v1/metrics/click"

    logger.info(
        "ad.served",
        impression_id=impression_id,
        campaign_id=str(campaign.id),
        device_id=device_id,
    )

    return AdServeResponse(
        impression_id=impression_id,
        creative_text=campaign.creative_text,
        click_url=f"{settings.BACKEND_URL}/api/v1/metrics/click",
        ttl_ms=5000,
        campaign_id=campaign.id,
    )
