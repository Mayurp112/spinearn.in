"""Public stats and leaderboard endpoints — no authentication required."""
import json
from datetime import datetime, timedelta, timezone

import redis.asyncio as aioredis
from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from sqlalchemy import TIMESTAMP, cast, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.deps import get_redis

router = APIRouter(prefix="/public", tags=["public"])

# ─── Helpers ─────────────────────────────────────────────────────

def _ts(col):
    """Cast confirmed_at column to TIMESTAMP WITH TIME ZONE."""
    return cast(col, TIMESTAMP(timezone=True))


def _flag(code: str | None) -> str:
    if not code or len(code) != 2:
        return "🌍"
    return "".join(chr(ord(c) + 127_397) for c in code.upper())


def _mask_name(name: str | None) -> str:
    if not name:
        return "Anonymous"
    parts = name.strip().split()
    if len(parts) >= 2:
        return f"{parts[0]} {parts[1][0]}."
    return parts[0][:8]


def _initials(name: str | None) -> str:
    if not name:
        return "??"
    parts = name.strip().split()
    if len(parts) >= 2:
        return (parts[0][0] + parts[-1][0]).upper()
    return parts[0][:2].upper()


def _seconds_ago(confirmed_at) -> str:
    if confirmed_at is None:
        return "—"
    if not isinstance(confirmed_at, datetime):
        try:
            confirmed_at = datetime.fromisoformat(str(confirmed_at))
        except Exception:
            return "—"
    now = datetime.now(timezone.utc)
    if confirmed_at.tzinfo is None:
        confirmed_at = confirmed_at.replace(tzinfo=timezone.utc)
    delta = int((now - confirmed_at).total_seconds())
    if delta < 60:
        return f"{delta}s"
    if delta < 3600:
        return f"{delta // 60}m"
    return f"{delta // 3600}h"


CPM_BUCKETS = [
    ("$0–1",  0.0,  1.0,  "#6366f1"),
    ("$1–2",  1.0,  2.0,  "#3b82f6"),
    ("$2–3",  2.0,  3.0,  "#06b6d4"),
    ("$3–4",  3.0,  4.0,  "#10b981"),
    ("$4–5",  4.0,  5.0,  "#84cc16"),
    ("$5–6",  5.0,  6.0,  "#f59e0b"),
    ("$6–7",  6.0,  7.0,  "#f97316"),
    ("$7+",   7.0, None,  "#ef4444"),
]

STATIC_CATEGORIES = [
    {"label": "DevTools",     "pct": 42.0, "color": "#3b82f6"},
    {"label": "Fintech",      "pct": 18.0, "color": "#10b981"},
    {"label": "DevOps",       "pct": 15.0, "color": "#6366f1"},
    {"label": "API / Infra",  "pct": 12.0, "color": "#f59e0b"},
    {"label": "Productivity", "pct":  8.0, "color": "#ec4899"},
    {"label": "Other",        "pct":  5.0, "color": "#6b7280"},
]

# ─── Response schemas ─────────────────────────────────────────────

class OverviewResponse(BaseModel):
    total_impressions: int
    active_campaigns: int
    developers_earning: int
    avg_cpm_today: float


class ImpressionChartResponse(BaseModel):
    period: str
    data: list[int]
    labels: list[str]
    total: int


class CpmBucket(BaseModel):
    label: str
    count: int
    color: str


class CategoryItem(BaseModel):
    label: str
    pct: float
    color: str


class CampaignsResponse(BaseModel):
    cpm_distribution: list[CpmBucket]
    categories: list[CategoryItem]


class FeedItem(BaseModel):
    brand: str
    initials: str
    loc: str
    earned: str
    ago: str
    total_impressions: int


class FeedResponse(BaseModel):
    items: list[FeedItem]
    impressions_per_second: float


class LeaderEntry(BaseModel):
    rank: int
    name: str
    initials: str
    loc: str
    earned: float
    impressions: int
    referrals: int
    badge: str | None


class LeaderboardResponse(BaseModel):
    period: str
    entries: list[LeaderEntry]
    total_developers: int


# ─── Endpoints ───────────────────────────────────────────────────

@router.get("/stats/overview", response_model=OverviewResponse)
async def get_overview(
    db: AsyncSession = Depends(get_db),
    redis: aioredis.Redis = Depends(get_redis),
) -> OverviewResponse:
    cache_key = "public:overview"
    cached = await redis.get(cache_key)
    if cached:
        return OverviewResponse(**json.loads(cached))

    from app.models.advertiser import Advertiser
    from app.models.campaign import Campaign
    from app.models.developer import Developer
    from app.models.impression import Impression

    total_impr = await db.scalar(select(func.count(Impression.impression_id)))
    active_camps = await db.scalar(
        select(func.count(Campaign.id)).where(Campaign.status == "active")
    )
    devs_earning = await db.scalar(
        select(func.count(Developer.id)).where(
            Developer.has_first_impression.is_(True),
            Developer.blocked.is_(False),
        )
    )
    avg_cpm_row = await db.scalar(
        select(func.avg(Campaign.bid_cpm)).where(Campaign.status == "active")
    )

    result = OverviewResponse(
        total_impressions=int(total_impr or 0),
        active_campaigns=int(active_camps or 0),
        developers_earning=int(devs_earning or 0),
        avg_cpm_today=round(float(avg_cpm_row or 0), 2),
    )
    await redis.setex(cache_key, 60, json.dumps(result.model_dump()))
    return result


@router.get("/stats/impressions", response_model=ImpressionChartResponse)
async def get_impression_chart(
    period: str = Query("24h", pattern="^(24h|7d|30d)$"),
    db: AsyncSession = Depends(get_db),
    redis: aioredis.Redis = Depends(get_redis),
) -> ImpressionChartResponse:
    from app.models.impression import Impression

    cache_key = f"public:impressions:{period}"
    cached = await redis.get(cache_key)
    if cached:
        return ImpressionChartResponse(**json.loads(cached))
    now = datetime.now(timezone.utc)

    if period == "24h":
        from_dt = now - timedelta(hours=24)
        trunc_unit = "hour"
        slots = 24
        step = timedelta(hours=1)
        base = now.replace(minute=0, second=0, microsecond=0) - timedelta(hours=23)
        labels = ["12am", "3am", "6am", "9am", "12pm", "3pm", "6pm", "9pm", "12am"]
    elif period == "7d":
        from_dt = now - timedelta(days=7)
        trunc_unit = "day"
        slots = 7
        step = timedelta(days=1)
        base = now.replace(hour=0, minute=0, second=0, microsecond=0) - timedelta(days=6)
        labels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
    else:
        from_dt = now - timedelta(days=30)
        trunc_unit = "day"
        slots = 30
        step = timedelta(days=1)
        base = now.replace(hour=0, minute=0, second=0, microsecond=0) - timedelta(days=29)
        labels = []

    rows = await db.execute(
        select(
            func.date_trunc(trunc_unit, _ts(Impression.confirmed_at)).label("bucket"),
            func.count(Impression.impression_id).label("n"),
        )
        .where(_ts(Impression.confirmed_at) >= from_dt)
        .group_by("bucket")
        .order_by("bucket")
    )
    bucket_map: dict[datetime, int] = {}
    for r in rows:
        if isinstance(r.bucket, datetime):
            b = r.bucket.replace(tzinfo=timezone.utc) if r.bucket.tzinfo is None else r.bucket
            bucket_map[b.replace(minute=0, second=0, microsecond=0) if trunc_unit == "hour" else b.replace(hour=0, minute=0, second=0, microsecond=0)] = int(r.n)

    data: list[int] = []
    for i in range(slots):
        slot_dt = base + step * i
        slot_dt = slot_dt.replace(tzinfo=timezone.utc) if slot_dt.tzinfo is None else slot_dt
        data.append(bucket_map.get(slot_dt, 0))

    result_chart = ImpressionChartResponse(
        period=period,
        data=data,
        labels=labels,
        total=sum(data),
    )
    ttl = 60 if period == "24h" else 300
    await redis.setex(cache_key, ttl, json.dumps(result_chart.model_dump()))
    return result_chart


@router.get("/stats/campaigns", response_model=CampaignsResponse)
async def get_campaigns_stats(
    db: AsyncSession = Depends(get_db),
    redis: aioredis.Redis = Depends(get_redis),
) -> CampaignsResponse:
    from app.models.campaign import Campaign
    cache_key = "public:campaigns"
    cached = await redis.get(cache_key)
    if cached:
        data = json.loads(cached)
        return CampaignsResponse(
            cpm_distribution=[CpmBucket(**b) for b in data["cpm_distribution"]],
            categories=[CategoryItem(**c) for c in data["categories"]],
        )

    rows = await db.execute(
        select(Campaign.bid_cpm).where(Campaign.status == "active")
    )
    cpms = [float(r.bid_cpm) for r in rows]

    cpm_dist: list[CpmBucket] = []
    for label, lo, hi, color in CPM_BUCKETS:
        count = sum(1 for c in cpms if c >= lo and (hi is None or c < hi))
        cpm_dist.append(CpmBucket(label=label, count=count, color=color))

    categories = [CategoryItem(**c) for c in STATIC_CATEGORIES]

    result_camps = CampaignsResponse(cpm_distribution=cpm_dist, categories=categories)
    await redis.setex(cache_key, 120, json.dumps(result_camps.model_dump()))
    return result_camps


@router.get("/stats/feed", response_model=FeedResponse)
async def get_feed(
    limit: int = Query(10, ge=1, le=50),
    db: AsyncSession = Depends(get_db),
    redis: aioredis.Redis = Depends(get_redis),
) -> FeedResponse:
    from app.models.advertiser import Advertiser
    from app.models.campaign import Campaign
    from app.models.developer import Developer
    from app.models.impression import Impression

    cache_key = f"public:feed:{limit}"
    cached = await redis.get(cache_key)
    if cached:
        data = json.loads(cached)
        return FeedResponse(
            items=[FeedItem(**i) for i in data["items"]],
            impressions_per_second=data["impressions_per_second"],
        )

    rows = await db.execute(
        select(
            Impression.confirmed_at,
            Impression.developer_earn,
            Developer.name.label("dev_name"),
            Developer.country.label("dev_country"),
            Advertiser.name.label("brand"),
            Campaign.impressions_served.label("total_impressions"),
        )
        .join(Campaign, Impression.campaign_id == Campaign.id)
        .join(Advertiser, Campaign.advertiser_id == Advertiser.id)
        .join(Developer, Impression.developer_id == Developer.id)
        .where(Developer.blocked.is_(False))
        .order_by(_ts(Impression.confirmed_at).desc())
        .limit(limit)
    )
    items: list[FeedItem] = []
    for r in rows:
        earn = float(r.developer_earn or 0)
        items.append(FeedItem(
            brand=r.brand or "Unknown",
            initials=_initials(r.dev_name),
            loc=_flag(r.dev_country),
            earned=f"${earn:.4f}",
            ago=_seconds_ago(r.confirmed_at),
            total_impressions=int(r.total_impressions or 0),
        ))

    # Impressions-per-second over last hour
    one_hour_ago = datetime.now(timezone.utc) - timedelta(hours=1)
    count_last_hour = await db.scalar(
        select(func.count(Impression.impression_id)).where(
            _ts(Impression.confirmed_at) >= one_hour_ago
        )
    )
    ips = round((count_last_hour or 0) / 3600, 2)

    feed_result = FeedResponse(items=items, impressions_per_second=ips)
    await redis.setex(cache_key, 30, json.dumps(feed_result.model_dump()))
    return feed_result


@router.get("/leaderboard", response_model=LeaderboardResponse)
async def get_leaderboard(
    period: str = Query("month", pattern="^(month|alltime)$"),
    limit: int = Query(50, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    redis: aioredis.Redis = Depends(get_redis),
) -> LeaderboardResponse:
    from app.models.campaign import Campaign
    from app.models.developer import Developer
    from app.models.impression import Impression

    cache_key = f"public:leaderboard:{period}:{limit}"
    cached = await redis.get(cache_key)
    if cached:
        data = json.loads(cached)
        return LeaderboardResponse(
            period=data["period"],
            entries=[LeaderEntry(**e) for e in data["entries"]],
            total_developers=data["total_developers"],
        )

    total_devs = await db.scalar(
        select(func.count(Developer.id)).where(
            Developer.has_first_impression.is_(True),
            Developer.blocked.is_(False),
        )
    )

    if period == "alltime":
        # Subquery: total impression count per developer
        impr_sub = (
            select(
                Impression.developer_id,
                func.count(Impression.impression_id).label("impr_count"),
            )
            .group_by(Impression.developer_id)
            .subquery()
        )

        rows = await db.execute(
            select(
                Developer,
                (Developer.pending_balance + Developer.paid_balance).label("earned"),
                func.coalesce(impr_sub.c.impr_count, 0).label("impr_count"),
            )
            .outerjoin(impr_sub, Developer.id == impr_sub.c.developer_id)
            .where(
                Developer.has_first_impression.is_(True),
                Developer.blocked.is_(False),
            )
            .order_by((Developer.pending_balance + Developer.paid_balance).desc())
            .limit(limit)
        )
        entries: list[LeaderEntry] = []
        for rank, r in enumerate(rows, start=1):
            dev: Developer = r.Developer
            earned = float(r.earned or 0)
            referrals = int((dev.referral_bonus_cents or 0) // 100)
            entries.append(LeaderEntry(
                rank=rank,
                name=_mask_name(dev.name),
                initials=_initials(dev.name),
                loc=_flag(dev.country),
                earned=round(earned, 2),
                impressions=int(r.impr_count or 0),
                referrals=referrals,
                badge="Top Referrer" if referrals >= 10 else ("Heavy Coder" if earned > 200 else None),
            ))

    else:
        month_start = datetime.now(timezone.utc).replace(day=1, hour=0, minute=0, second=0, microsecond=0)

        monthly_sub = (
            select(
                Impression.developer_id,
                func.sum(Impression.developer_earn).label("earned"),
                func.count(Impression.impression_id).label("impr_count"),
            )
            .where(_ts(Impression.confirmed_at) >= month_start)
            .group_by(Impression.developer_id)
            .subquery()
        )

        rows = await db.execute(
            select(
                Developer,
                monthly_sub.c.earned,
                monthly_sub.c.impr_count,
            )
            .join(monthly_sub, Developer.id == monthly_sub.c.developer_id)
            .where(Developer.blocked.is_(False))
            .order_by(monthly_sub.c.earned.desc())
            .limit(limit)
        )
        entries = []
        for rank, r in enumerate(rows, start=1):
            dev: Developer = r.Developer
            earned = float(r.earned or 0)
            referrals = int((dev.referral_bonus_cents or 0) // 100)
            entries.append(LeaderEntry(
                rank=rank,
                name=_mask_name(dev.name),
                initials=_initials(dev.name),
                loc=_flag(dev.country),
                earned=round(earned, 2),
                impressions=int(r.impr_count or 0),
                referrals=referrals,
                badge="Top Referrer" if referrals >= 10 else ("Heavy Coder" if earned > 200 else None),
            ))

    lb_result = LeaderboardResponse(
        period=period,
        entries=entries,
        total_developers=int(total_devs or 0),
    )
    await redis.setex(cache_key, 120, json.dumps(lb_result.model_dump()))
    return lb_result
