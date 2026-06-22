from datetime import datetime, timedelta, timezone
from decimal import Decimal
from typing import Annotated
from uuid import UUID

import structlog
from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.deps import CurrentDeveloperDep
from app.models.click import Click
from app.models.impression import Impression
from app.schemas.click import ClickRecord
from app.schemas.developer import DeveloperBalance, DeveloperEarnings, DeveloperReferral, DeveloperResponse
from app.schemas.impression import ImpressionRecord
from app.schemas.payout import PayoutListResponse, PayoutResponse

logger = structlog.get_logger(__name__)
router = APIRouter(prefix="/developers", tags=["developers"])


@router.get("/me", response_model=DeveloperResponse)
async def get_me(developer: CurrentDeveloperDep) -> DeveloperResponse:
    return DeveloperResponse.model_validate(developer)


@router.get("/me/balance", response_model=DeveloperBalance)
async def get_balance(
    developer: CurrentDeveloperDep,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> DeveloperBalance:
    today_start = datetime.now(tz=timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    week_start = today_start - timedelta(days=7)

    today_result = await db.execute(
        select(func.coalesce(func.sum(Impression.developer_earn), Decimal("0")))
        .where(
            Impression.developer_id == developer.id,
            Impression.confirmed_at >= today_start.isoformat(),
        )
    )
    week_result = await db.execute(
        select(func.coalesce(func.sum(Impression.developer_earn), Decimal("0")))
        .where(
            Impression.developer_id == developer.id,
            Impression.confirmed_at >= week_start.isoformat(),
        )
    )

    today_earned = today_result.scalar_one() or Decimal("0")
    week_earned = week_result.scalar_one() or Decimal("0")

    return DeveloperBalance(
        pending_balance=developer.pending_balance,
        paid_balance=developer.paid_balance,
        today_earned=today_earned,
        week_earned=week_earned,
        hourly_cap_cents=developer.hourly_cap_cents,
        daily_cap_cents=developer.daily_cap_cents,
    )


def _bucket_key(ts: str, period: str) -> str:
    ts = ts.replace(" ", "T")
    if period == "today":
        return ts[:13]  # YYYY-MM-DDTHH
    if period == "year":
        return ts[:7]   # YYYY-MM
    return ts[:10]      # YYYY-MM-DD


def _bucket_label(key: str, period: str) -> str:
    if period == "today":
        return key[11:13] + ":00"  # HH:00
    if period == "year":
        return key  # YYYY-MM
    return key[5:]  # MM-DD


@router.get("/me/earnings", response_model=DeveloperEarnings)
async def get_earnings(
    developer: CurrentDeveloperDep,
    db: Annotated[AsyncSession, Depends(get_db)],
    period: str = Query(default="week", pattern="^(today|week|month|year)$"),
) -> DeveloperEarnings:
    now = datetime.now(tz=timezone.utc)
    if period == "today":
        start = now.replace(hour=0, minute=0, second=0, microsecond=0)
        trunc = "hour"
    elif period == "week":
        start = now - timedelta(days=7)
        trunc = "day"
    elif period == "month":
        start = now - timedelta(days=30)
        trunc = "day"
    else:  # year
        start = now - timedelta(days=365)
        trunc = "month"

    from sqlalchemy import TIMESTAMP, cast

    def _ts(col):
        return cast(col, TIMESTAMP(timezone=True))

    # Aggregate impressions by bucket at DB level — no full table scan in Python
    imp_agg = await db.execute(
        select(
            func.date_trunc(trunc, _ts(Impression.confirmed_at)).label("bucket"),
            func.sum(Impression.developer_earn).label("ie"),
            func.count(Impression.impression_id).label("ic"),
        )
        .where(
            Impression.developer_id == developer.id,
            _ts(Impression.confirmed_at) >= start,
        )
        .group_by("bucket")
        .order_by("bucket")
    )
    imp_rows = imp_agg.all()

    # Aggregate clicks by bucket at DB level
    clk_agg = await db.execute(
        select(
            func.date_trunc(trunc, _ts(Click.clicked_at)).label("bucket"),
            func.sum(Click.developer_earn).label("ce"),
            func.count(Click.id).label("cc"),
        )
        .where(
            Click.developer_id == developer.id,
            _ts(Click.clicked_at) >= start,
        )
        .group_by("bucket")
        .order_by("bucket")
    )
    clk_rows = clk_agg.all()

    # Totals
    imp_total_result = await db.execute(
        select(
            func.coalesce(func.sum(Impression.developer_earn), Decimal("0")),
            func.count(Impression.impression_id),
        ).where(
            Impression.developer_id == developer.id,
            _ts(Impression.confirmed_at) >= start,
        )
    )
    imp_total_row = imp_total_result.one()
    impression_earned_total = float(imp_total_row[0] or 0)
    impression_count = int(imp_total_row[1] or 0)

    clk_total_result = await db.execute(
        select(
            func.coalesce(func.sum(Click.developer_earn), Decimal("0")),
            func.count(Click.id),
        ).where(
            Click.developer_id == developer.id,
            _ts(Click.clicked_at) >= start,
        )
    )
    clk_total_row = clk_total_result.one()
    click_earned_total = float(clk_total_row[0] or 0)
    click_count = int(clk_total_row[1] or 0)

    total_earned = impression_earned_total + click_earned_total
    avg_cpm = (impression_earned_total * 1000 / impression_count) if impression_count else 0.0

    # Merge buckets
    buckets: dict[str, dict] = {}
    for r in imp_rows:
        key = _bucket_key(str(r.bucket), period)
        if key not in buckets:
            buckets[key] = {"ie": 0.0, "ce": 0.0, "ic": 0, "cc": 0}
        buckets[key]["ie"] += float(r.ie or 0)
        buckets[key]["ic"] += int(r.ic or 0)

    for r in clk_rows:
        key = _bucket_key(str(r.bucket), period)
        if key not in buckets:
            buckets[key] = {"ie": 0.0, "ce": 0.0, "ic": 0, "cc": 0}
        buckets[key]["ce"] += float(r.ce or 0)
        buckets[key]["cc"] += int(r.cc or 0)

    data_points = [
        {
            "label": _bucket_label(k, period),
            "earned": round(v["ie"] + v["ce"], 6),
            "impression_earned": round(v["ie"], 6),
            "click_earned": round(v["ce"], 6),
            "impression_count": v["ic"],
            "click_count": v["cc"],
        }
        for k, v in sorted(buckets.items())
    ]

    return DeveloperEarnings(
        period=period,
        total_earned=Decimal(str(total_earned)),
        impression_earned=Decimal(str(impression_earned_total)),
        click_earned=Decimal(str(click_earned_total)),
        impression_count=impression_count,
        click_count=click_count,
        avg_cpm=Decimal(str(avg_cpm)),
        data_points=data_points,
    )


@router.get("/me/referral", response_model=DeveloperReferral)
async def get_referral(
    developer: CurrentDeveloperDep,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> DeveloperReferral:
    from app.models.developer import Developer as Dev
    count_result = await db.execute(
        select(func.count()).where(Dev.referred_by_id == developer.id)
    )
    referral_count = count_result.scalar_one() or 0
    referral_url = ""
    if developer.referral_code:
        from app.config import settings as cfg
        referral_url = f"{cfg.FRONTEND_URL}/?ref={developer.referral_code}"
    return DeveloperReferral(
        referral_code=developer.referral_code or "",
        referral_url=referral_url,
        referral_count=referral_count,
        total_bonus_cents=developer.referral_bonus_cents,
    )


@router.get("/me/impressions", response_model=list[ImpressionRecord])
async def get_impressions(
    developer: CurrentDeveloperDep,
    db: Annotated[AsyncSession, Depends(get_db)],
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=50, ge=1, le=100),
) -> list[ImpressionRecord]:
    result = await db.execute(
        select(Impression)
        .where(Impression.developer_id == developer.id)
        .order_by(Impression.confirmed_at.desc())
        .offset((page - 1) * limit)
        .limit(limit)
    )
    return [ImpressionRecord.model_validate(i) for i in result.scalars().all()]


@router.get("/me/clicks", response_model=list[ClickRecord])
async def get_clicks(
    developer: CurrentDeveloperDep,
    db: Annotated[AsyncSession, Depends(get_db)],
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=50, ge=1, le=100),
) -> list[ClickRecord]:
    result = await db.execute(
        select(Click)
        .where(Click.developer_id == developer.id)
        .order_by(Click.clicked_at.desc())
        .offset((page - 1) * limit)
        .limit(limit)
    )
    return [ClickRecord.model_validate(c) for c in result.scalars().all()]


@router.get("/me/payouts", response_model=PayoutListResponse)
async def get_payouts(
    developer: CurrentDeveloperDep,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> PayoutListResponse:
    from app.models.payout import Payout
    result = await db.execute(
        select(Payout)
        .where(Payout.developer_id == developer.id)
        .order_by(Payout.requested_at.desc())
    )
    payouts = result.scalars().all()
    return PayoutListResponse(
        payouts=[PayoutResponse.model_validate(p) for p in payouts],
        total=len(payouts),
    )
