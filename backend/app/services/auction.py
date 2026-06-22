from __future__ import annotations

import structlog
from tenacity import retry, stop_after_attempt, wait_exponential
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

import redis.asyncio as aioredis

from app.models.campaign import Campaign

logger = structlog.get_logger(__name__)

AUCTION_KEY = "auction:active"
MAX_STALE_PURGE = 10  # guard against pathological Redis state


class AuctionService:
    def __init__(self, redis: aioredis.Redis, db: AsyncSession) -> None:
        self._redis = redis
        self._db = db

    @retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=0.1, max=2))
    async def get_winning_ad(self) -> Campaign | None:
        """
        Return the highest-bidding active campaign.
        Uses iteration (not recursion) to purge stale Redis entries so a
        depleted auction set cannot cause unbounded call-stack growth.
        """
        for _ in range(MAX_STALE_PURGE):
            results: list[tuple[str, float]] = await self._redis.zrevrangebyscore(
                AUCTION_KEY, "+inf", "-inf", start=0, num=1, withscores=True
            )
            if not results:
                return None

            campaign_id_str, _score = results[0]

            result = await self._db.execute(
                select(Campaign).where(
                    Campaign.id == campaign_id_str,
                    Campaign.status == "active",
                )
            )
            campaign = result.scalar_one_or_none()

            if campaign is not None:
                return campaign

            # Stale entry — remove it and try the next highest bid
            await self.remove_campaign(campaign_id_str)
            logger.warning("auction.stale_campaign_removed", campaign_id=campaign_id_str)

        logger.error("auction.too_many_stale_campaigns", limit=MAX_STALE_PURGE)
        return None

    @retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=0.1, max=2))
    async def place_bid(self, campaign_id: str, bid_cpm: float) -> None:
        await self._redis.zadd(AUCTION_KEY, {campaign_id: bid_cpm})
        logger.info("auction.bid_placed", campaign_id=campaign_id, bid_cpm=bid_cpm)

    @retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=0.1, max=2))
    async def remove_campaign(self, campaign_id: str) -> None:
        await self._redis.zrem(AUCTION_KEY, campaign_id)
        logger.info("auction.campaign_removed", campaign_id=campaign_id)

    @retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=0.1, max=2))
    async def get_auction_position(self, campaign_id: str) -> int:
        rank: int | None = await self._redis.zrevrank(AUCTION_KEY, campaign_id)
        return rank if rank is not None else -1

    @retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=0.1, max=2))
    async def get_all_bids(self) -> list[dict[str, object]]:
        results: list[tuple[str, float]] = await self._redis.zrevrangebyscore(
            AUCTION_KEY, "+inf", "-inf", withscores=True
        )
        return [
            {"campaign_id": cid, "bid_cpm": score, "position": idx}
            for idx, (cid, score) in enumerate(results)
        ]

    async def sync_from_db(self) -> int:
        result = await self._db.execute(
            select(Campaign).where(Campaign.status == "active")
        )
        campaigns = result.scalars().all()

        pipe = self._redis.pipeline()
        pipe.delete(AUCTION_KEY)
        for campaign in campaigns:
            pipe.zadd(AUCTION_KEY, {str(campaign.id): float(campaign.bid_cpm)})
        await pipe.execute()

        logger.info("auction.synced_from_db", campaign_count=len(campaigns))
        return len(campaigns)
