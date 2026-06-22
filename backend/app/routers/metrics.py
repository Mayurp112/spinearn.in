import uuid
from typing import Annotated

import structlog
from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import select, update
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

import redis.asyncio as aioredis
from decimal import Decimal

from app.database import get_db
from app.deps import CurrentDeveloperOptionalDep, DeviceIdDep, get_redis
from app.models.campaign import Campaign
from app.models.click import Click
from app.models.developer import Developer
from app.models.impression import Impression
from app.schemas.click import ClickRequest, ClickResponse
from app.schemas.impression import ImpressionRequest, ImpressionResponse
from app.services.impression import ImpressionService

logger = structlog.get_logger(__name__)
router = APIRouter(prefix="/metrics", tags=["metrics"])


@router.post("/impression", response_model=ImpressionResponse, status_code=status.HTTP_200_OK)
async def record_impression(
    body: ImpressionRequest,
    request: Request,
    db: Annotated[AsyncSession, Depends(get_db)],
    redis: Annotated[aioredis.Redis, Depends(get_redis)],
    developer: CurrentDeveloperOptionalDep,
) -> ImpressionResponse:
    dev_result = await db.execute(
        select(Developer).where(Developer.device_id == body.device_id)
    )
    dev = dev_result.scalar_one_or_none()

    if dev is None and developer is not None:
        dev = developer

    if dev is None:
        return ImpressionResponse(credited=False, reason="developer_not_registered")

    ip_address = request.client.host if request.client else None

    service = ImpressionService(db=db, redis=redis)
    result = await service.record_impression(
        impression_id=body.impression_id,
        campaign_id=body.campaign_id,
        developer_id=dev.id,
        surface=body.surface,
        duration_ms=body.duration_ms,
        ip_address=ip_address,
    )

    return ImpressionResponse(**result)


@router.post("/impression/confirm", response_model=ImpressionResponse, status_code=status.HTTP_200_OK)
async def confirm_impression(
    body: dict[str, object],
    request: Request,
    db: Annotated[AsyncSession, Depends(get_db)],
    redis: Annotated[aioredis.Redis, Depends(get_redis)],
    developer: CurrentDeveloperOptionalDep,
) -> ImpressionResponse:
    impression_id = str(body.get("impression_id", ""))
    device_id = str(body.get("device_id", ""))
    campaign_id = str(body.get("campaign_id", ""))
    duration_ms = int(body.get("duration_ms", 5000))
    surface = str(body.get("surface", "cli"))

    if not all([impression_id, device_id, campaign_id]):
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Missing required fields")

    dev_result = await db.execute(select(Developer).where(Developer.device_id == device_id))
    dev = dev_result.scalar_one_or_none()
    if dev is None and developer is not None:
        dev = developer
    if dev is None:
        return ImpressionResponse(credited=False, reason="developer_not_registered")

    ip_address = request.client.host if request.client else None
    service = ImpressionService(db=db, redis=redis)
    result = await service.record_impression(
        impression_id=impression_id,
        campaign_id=campaign_id,
        developer_id=dev.id,
        surface=surface,
        duration_ms=duration_ms,
        ip_address=ip_address,
    )
    return ImpressionResponse(**result)


@router.post("/click", response_model=ClickResponse, status_code=status.HTTP_200_OK)
async def record_click(
    body: ClickRequest,
    db: Annotated[AsyncSession, Depends(get_db)],
    developer: CurrentDeveloperOptionalDep,
) -> ClickResponse:
    imp_result = await db.execute(
        select(Impression).where(Impression.impression_id == body.impression_id)
    )
    impression = imp_result.scalar_one_or_none()
    if impression is None:
        return ClickResponse(credited=False, reason="impression_not_found")

    dev_result = await db.execute(
        select(Developer).where(Developer.device_id == body.device_id)
    )
    dev = dev_result.scalar_one_or_none()
    if dev is None and developer is not None:
        dev = developer
    if dev is None:
        return ClickResponse(credited=False, reason="developer_not_registered")

    campaign_result = await db.execute(
        select(Campaign).where(Campaign.id == impression.campaign_id)
    )
    campaign = campaign_result.scalar_one_or_none()
    if campaign is None:
        return ClickResponse(credited=False, reason="campaign_not_found")

    click_earn = impression.developer_earn * campaign.click_multiplier
    platform_earn = impression.platform_earn * campaign.click_multiplier

    try:
        click = Click(
            impression_id=body.impression_id,
            campaign_id=impression.campaign_id,
            developer_id=dev.id,
            developer_earn=click_earn,
            platform_earn=platform_earn,
        )
        db.add(click)
        await db.execute(
            update(Developer)
            .where(Developer.id == dev.id)
            .values(pending_balance=Developer.pending_balance + click_earn)
        )
        await db.execute(
            update(Campaign)
            .where(Campaign.id == campaign.id)
            .values(clicks_count=Campaign.clicks_count + 1)
        )
        await db.commit()
    except IntegrityError:
        await db.rollback()
        return ClickResponse(credited=False, reason="already_clicked")

    logger.info(
        "click.credited",
        impression_id=body.impression_id,
        developer_id=str(dev.id),
        click_earn=str(click_earn),
    )

    return ClickResponse(credited=True, click_earning=click_earn)
