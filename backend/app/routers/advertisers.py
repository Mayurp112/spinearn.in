import uuid
from decimal import Decimal
from typing import Annotated

import structlog
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

import redis.asyncio as aioredis

from app.database import get_db
from app.deps import CurrentDeveloperDep, get_redis
from app.models.advertiser import Advertiser
from app.models.campaign import Campaign
from app.schemas.campaign import (
    AuctionBid,
    CampaignCheckoutResponse,
    CampaignCreate,
    CampaignResponse,
    CampaignStats,
    CampaignUpdate,
)
from app.config import settings
from app.services.auction import AuctionService

logger = structlog.get_logger(__name__)
router = APIRouter(prefix="/campaigns", tags=["advertisers"])


async def _get_or_create_advertiser(db: AsyncSession, developer_email: str) -> Advertiser:
    result = await db.execute(select(Advertiser).where(Advertiser.email == developer_email))
    advertiser = result.scalar_one_or_none()
    if advertiser is None:
        advertiser = Advertiser(email=developer_email)
        db.add(advertiser)
        await db.flush()
    return advertiser


@router.post("", response_model=CampaignCheckoutResponse, status_code=status.HTTP_201_CREATED)
async def create_campaign(
    body: CampaignCreate,
    developer: CurrentDeveloperDep,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> CampaignCheckoutResponse:
    advertiser = await _get_or_create_advertiser(db, developer.email)
    impressions_purchased = body.impression_blocks * 1000
    total_cost = body.bid_cpm * body.impression_blocks

    campaign = Campaign(
        advertiser_id=advertiser.id,
        creative_text=body.creative_text,
        destination_url=body.destination_url,
        bid_cpm=body.bid_cpm,
        impressions_purchased=impressions_purchased,
        status="pending_payment",
    )
    db.add(campaign)
    await db.flush()

    checkout_url = f"{settings.FRONTEND_URL}/advertise/pay/{campaign.id}"
    await db.commit()
    await db.refresh(campaign)

    logger.info("campaign.created", campaign_id=str(campaign.id), advertiser=developer.email)

    return CampaignCheckoutResponse(
        campaign_id=campaign.id,
        checkout_url=checkout_url,
        total_cost_usd=total_cost,
    )


@router.get("", response_model=list[CampaignResponse])
async def list_campaigns(
    developer: CurrentDeveloperDep,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> list[CampaignResponse]:
    advertiser = await _get_or_create_advertiser(db, developer.email)
    result = await db.execute(
        select(Campaign)
        .where(Campaign.advertiser_id == advertiser.id)
        .order_by(Campaign.created_at.desc())
    )
    return [CampaignResponse.model_validate(c) for c in result.scalars().all()]


@router.get("/{campaign_id}", response_model=CampaignResponse)
async def get_campaign(
    campaign_id: uuid.UUID,
    developer: CurrentDeveloperDep,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> CampaignResponse:
    advertiser = await _get_or_create_advertiser(db, developer.email)
    result = await db.execute(
        select(Campaign).where(
            Campaign.id == campaign_id,
            Campaign.advertiser_id == advertiser.id,
        )
    )
    campaign = result.scalar_one_or_none()
    if campaign is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Campaign not found")
    return CampaignResponse.model_validate(campaign)


@router.get("/{campaign_id}/stats", response_model=CampaignStats)
async def get_campaign_stats(
    campaign_id: uuid.UUID,
    developer: CurrentDeveloperDep,
    db: Annotated[AsyncSession, Depends(get_db)],
    redis: Annotated[aioredis.Redis, Depends(get_redis)],
) -> CampaignStats:
    advertiser = await _get_or_create_advertiser(db, developer.email)
    result = await db.execute(
        select(Campaign).where(
            Campaign.id == campaign_id,
            Campaign.advertiser_id == advertiser.id,
        )
    )
    campaign = result.scalar_one_or_none()
    if campaign is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Campaign not found")

    auction = AuctionService(redis=redis, db=db)
    position = await auction.get_auction_position(str(campaign_id))
    ctr = (
        campaign.clicks_count / campaign.impressions_served
        if campaign.impressions_served > 0
        else 0.0
    )

    from datetime import datetime, timedelta, timezone

    from app.models.click import Click
    from app.models.impression import Impression

    # Fetch last 30 days of impressions (cap at 5000 rows)
    cutoff = (datetime.now(tz=timezone.utc) - timedelta(days=30)).isoformat()
    imp_result = await db.execute(
        select(Impression)
        .where(Impression.campaign_id == campaign_id, Impression.confirmed_at >= cutoff)
        .order_by(Impression.confirmed_at.desc())
        .limit(5000)
    )
    impressions = imp_result.scalars().all()

    # Daily impressions breakdown
    daily: dict[str, int] = {}
    daily_spend_map: dict[str, float] = {}
    for i in impressions:
        day = i.confirmed_at[:10]
        daily[day] = daily.get(day, 0) + 1
        daily_spend_map[day] = daily_spend_map.get(day, 0.0) + float(i.developer_earn) + float(i.platform_earn)
    daily_breakdown = [{"date": d, "impressions": v} for d, v in sorted(daily.items())]
    daily_spend = [{"date": d, "spend": round(v, 4)} for d, v in sorted(daily_spend_map.items())]

    # Hourly breakdown for last 24 hours
    cutoff_24h = (datetime.now(tz=timezone.utc) - timedelta(hours=24)).isoformat()
    hourly: dict[str, int] = {}
    for i in impressions:
        if i.confirmed_at >= cutoff_24h:
            hour = i.confirmed_at[:13]  # "YYYY-MM-DDTHH"
            hourly[hour] = hourly.get(hour, 0) + 1
    hourly_breakdown = [{"hour": h, "impressions": v} for h, v in sorted(hourly.items())]

    completion_pct = (
        round(campaign.impressions_served / campaign.impressions_purchased * 100, 2)
        if campaign.impressions_purchased > 0
        else 0.0
    )

    return CampaignStats(
        campaign_id=campaign.id,
        impressions_served=campaign.impressions_served,
        impressions_purchased=campaign.impressions_purchased,
        clicks_count=campaign.clicks_count,
        ctr=ctr,
        total_spend=campaign.total_spend,
        auction_position=position,
        daily_breakdown=daily_breakdown,
        hourly_breakdown=hourly_breakdown,
        daily_spend=daily_spend,
        completion_pct=completion_pct,
    )


@router.patch("/{campaign_id}", response_model=CampaignResponse)
async def update_campaign(
    campaign_id: uuid.UUID,
    body: CampaignUpdate,
    developer: CurrentDeveloperDep,
    db: Annotated[AsyncSession, Depends(get_db)],
    redis: Annotated[aioredis.Redis, Depends(get_redis)],
) -> CampaignResponse:
    advertiser = await _get_or_create_advertiser(db, developer.email)
    result = await db.execute(
        select(Campaign).where(
            Campaign.id == campaign_id,
            Campaign.advertiser_id == advertiser.id,
        )
    )
    campaign = result.scalar_one_or_none()
    if campaign is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Campaign not found")

    if campaign.status not in ("active", "paused"):
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=f"Cannot change status of {campaign.status} campaign")

    old_status = campaign.status
    campaign.status = body.status
    await db.commit()
    await db.refresh(campaign)

    auction = AuctionService(redis=redis, db=db)
    if body.status == "active" and old_status == "paused":
        await auction.place_bid(str(campaign_id), float(campaign.bid_cpm))
    elif body.status == "paused" and old_status == "active":
        await auction.remove_campaign(str(campaign_id))

    return CampaignResponse.model_validate(campaign)


@router.delete("/{campaign_id}", status_code=status.HTTP_204_NO_CONTENT)
async def cancel_campaign(
    campaign_id: uuid.UUID,
    developer: CurrentDeveloperDep,
    db: Annotated[AsyncSession, Depends(get_db)],
    redis: Annotated[aioredis.Redis, Depends(get_redis)],
) -> None:
    advertiser = await _get_or_create_advertiser(db, developer.email)
    result = await db.execute(
        select(Campaign).where(
            Campaign.id == campaign_id,
            Campaign.advertiser_id == advertiser.id,
        )
    )
    campaign = result.scalar_one_or_none()
    if campaign is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Campaign not found")

    campaign.status = "cancelled"
    await db.commit()

    auction = AuctionService(redis=redis, db=db)
    await auction.remove_campaign(str(campaign_id))
    logger.info("campaign.cancelled", campaign_id=str(campaign_id))


@router.get("/auction/current", response_model=list[AuctionBid])
async def get_auction(
    developer: CurrentDeveloperDep,
    db: Annotated[AsyncSession, Depends(get_db)],
    redis: Annotated[aioredis.Redis, Depends(get_redis)],
) -> list[AuctionBid]:
    auction = AuctionService(redis=redis, db=db)
    bids = await auction.get_all_bids()
    result = []
    for bid in bids:
        cid = bid["campaign_id"]
        c_result = await db.execute(select(Campaign).where(Campaign.id == cid))
        campaign = c_result.scalar_one_or_none()
        if campaign:
            result.append(AuctionBid(
                campaign_id=str(cid),
                creative_text=campaign.creative_text,
                bid_cpm=bid["bid_cpm"],
                position=bid["position"],
                impressions_remaining=campaign.impressions_purchased - campaign.impressions_served,
            ))
    return result
