from __future__ import annotations

import uuid
from datetime import datetime, timezone
from decimal import Decimal

import redis.asyncio as aioredis
import structlog
from sqlalchemy import select, update
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.models.campaign import Campaign
from app.models.developer import Developer
from app.models.impression import Impression

logger = structlog.get_logger(__name__)

SEEN_TTL_SECONDS = 2 * 24 * 3600  # 2 days per shard


class ImpressionService:
    def __init__(self, db: AsyncSession, redis: aioredis.Redis) -> None:
        self._db = db
        self._redis = redis

    async def record_impression(
        self,
        impression_id: str,
        campaign_id: str,
        developer_id: uuid.UUID,
        surface: str,
        duration_ms: int,
        ip_address: str | None,
    ) -> dict[str, object]:
        # 1. Idempotency check — sharded daily key avoids unbounded set growth
        seen_key = f"impressions:seen:{datetime.now(tz=timezone.utc).strftime('%Y-%m-%d')}"
        already_seen = await self._redis.sismember(seen_key, impression_id)
        if already_seen:
            return {"credited": False, "reason": "already_recorded"}

        # 2. Fetch campaign
        campaign_result = await self._db.execute(
            select(Campaign).where(Campaign.id == uuid.UUID(campaign_id), Campaign.status == "active")
        )
        campaign = campaign_result.scalar_one_or_none()
        if campaign is None:
            return {"credited": False, "reason": "campaign_not_found"}

        # 3. Check fraud caps via Redis
        now = datetime.now(tz=timezone.utc)
        hourly_key = f"earn:hourly:{developer_id}:{now.strftime('%Y-%m-%d-%H')}"
        daily_key = f"earn:daily:{developer_id}:{now.strftime('%Y-%m-%d')}"

        pipe = self._redis.pipeline()
        pipe.get(hourly_key)
        pipe.get(daily_key)
        hourly_str, daily_str = await pipe.execute()

        hourly_cents = int(hourly_str or 0)
        daily_cents = int(daily_str or 0)

        # 4. Fetch developer caps
        dev_result = await self._db.execute(
            select(Developer).where(Developer.id == developer_id).with_for_update(nowait=True)
        )
        developer = dev_result.scalar_one_or_none()
        if developer is None or developer.blocked:
            return {"credited": False, "reason": "developer_not_found"}

        # Calculate earnings
        cpm = float(campaign.bid_cpm)
        raw_earn_per_imp = cpm / 1000.0
        developer_earn = Decimal(str(raw_earn_per_imp * settings.developer_revenue_share)).quantize(
            Decimal("0.000001")
        )
        platform_earn = Decimal(str(raw_earn_per_imp * settings.PLATFORM_REVENUE_SHARE)).quantize(
            Decimal("0.000001")
        )

        developer_earn_cents = int(float(developer_earn) * 100)

        if hourly_cents + developer_earn_cents > developer.hourly_cap_cents:
            return {"credited": False, "reason": "hourly_cap_exceeded"}
        if daily_cents + developer_earn_cents > developer.daily_cap_cents:
            return {"credited": False, "reason": "daily_cap_exceeded"}

        # 5. DB transaction
        try:
            impression = Impression(
                impression_id=impression_id,
                campaign_id=uuid.UUID(campaign_id),
                developer_id=developer_id,
                surface=surface,
                duration_ms=duration_ms,
                developer_earn=developer_earn,
                platform_earn=platform_earn,
                ip_address=ip_address,
            )
            self._db.add(impression)

            await self._db.execute(
                update(Developer)
                .where(Developer.id == developer_id)
                .values(pending_balance=Developer.pending_balance + developer_earn)
            )
            await self._db.execute(
                update(Campaign)
                .where(Campaign.id == uuid.UUID(campaign_id))
                .values(
                    impressions_served=Campaign.impressions_served + 1,
                    total_spend=Campaign.total_spend + developer_earn + platform_earn,
                )
            )

            # Mark exhausted if campaign is fully served
            if campaign.impressions_served + 1 >= campaign.impressions_purchased:
                await self._db.execute(
                    update(Campaign)
                    .where(Campaign.id == uuid.UUID(campaign_id))
                    .values(status="exhausted")
                )

            # Referral bonus: credit referrer $1 on referred developer's first impression
            if not developer.has_first_impression:
                await self._db.execute(
                    update(Developer)
                    .where(Developer.id == developer_id)
                    .values(has_first_impression=True)
                )
                if developer.referred_by_id is not None:
                    bonus = Decimal("1.00")  # $1.00 referral bonus credited to referrer
                    await self._db.execute(
                        update(Developer)
                        .where(Developer.id == developer.referred_by_id)
                        .values(
                            pending_balance=Developer.pending_balance + bonus,
                            referral_bonus_cents=Developer.referral_bonus_cents + 100,
                        )
                    )
                    logger.info(
                        "referral.bonus_credited",
                        referrer_id=str(developer.referred_by_id),
                        referred_id=str(developer_id),
                    )

            await self._db.flush()
            await self._db.commit()

        except IntegrityError:
            await self._db.rollback()
            return {"credited": False, "reason": "already_recorded"}

        # 6. Update Redis seen set and cap counters
        pipe2 = self._redis.pipeline()
        pipe2.sadd(seen_key, impression_id)
        pipe2.expire(seen_key, SEEN_TTL_SECONDS)
        pipe2.incr(hourly_key)
        pipe2.expire(hourly_key, 3600)
        pipe2.incr(daily_key)
        pipe2.expire(daily_key, 86400)
        await pipe2.execute()

        # Refresh developer balance for response
        await self._db.refresh(developer)

        logger.info(
            "impression.credited",
            impression_id=impression_id,
            developer_id=str(developer_id),
            developer_earn=str(developer_earn),
        )

        return {
            "credited": True,
            "developer_earn": developer_earn,
            "today_balance": developer.pending_balance,
            "total_balance": developer.pending_balance + developer.paid_balance,
        }
