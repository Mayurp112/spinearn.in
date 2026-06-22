from decimal import Decimal
from unittest.mock import AsyncMock, MagicMock

import pytest

from app.services.impression import ImpressionService


def _make_redis_mock(already_seen: bool = False, hourly_cents: int = 0, daily_cents: int = 0):
    r = AsyncMock()
    r.sismember = AsyncMock(return_value=already_seen)
    r.sadd = AsyncMock(return_value=1)
    r.expire = AsyncMock(return_value=True)
    r.incr = AsyncMock(return_value=hourly_cents + 1)

    pipe = AsyncMock()
    pipe.get = MagicMock(return_value=pipe)
    pipe.execute = AsyncMock(return_value=[str(hourly_cents) if hourly_cents else None, str(daily_cents) if daily_cents else None])
    pipe.sadd = MagicMock(return_value=pipe)
    pipe.expire = MagicMock(return_value=pipe)
    pipe.incr = MagicMock(return_value=pipe)

    r.pipeline = MagicMock(return_value=pipe)
    return r


@pytest.mark.asyncio
async def test_impression_already_recorded(db, developer, active_campaign):
    redis = _make_redis_mock(already_seen=True)
    service = ImpressionService(db=db, redis=redis)
    result = await service.record_impression(
        impression_id="imp_test_001",
        campaign_id=str(active_campaign.id),
        developer_id=developer.id,
        surface="cli",
        duration_ms=5000,
        ip_address="127.0.0.1",
    )
    assert result["credited"] is False
    assert result["reason"] == "already_recorded"


@pytest.mark.asyncio
async def test_impression_credited_successfully(db, developer, active_campaign):
    redis = _make_redis_mock(already_seen=False, hourly_cents=0, daily_cents=0)

    pipe2 = AsyncMock()
    pipe2.sadd = MagicMock(return_value=pipe2)
    pipe2.expire = MagicMock(return_value=pipe2)
    pipe2.incr = MagicMock(return_value=pipe2)
    pipe2.execute = AsyncMock(return_value=[1, True, 1, True, 1, True])
    redis.pipeline = MagicMock(side_effect=[
        MagicMock(
            get=MagicMock(),
            execute=AsyncMock(return_value=[None, None]),
            sadd=MagicMock(),
        ),
        pipe2,
    ])

    service = ImpressionService(db=db, redis=redis)
    result = await service.record_impression(
        impression_id="imp_test_002",
        campaign_id=str(active_campaign.id),
        developer_id=developer.id,
        surface="cli",
        duration_ms=5000,
        ip_address="127.0.0.1",
    )
    assert result["credited"] is True
    assert "developer_earn" in result
    assert Decimal(str(result["developer_earn"])) > 0


@pytest.mark.asyncio
async def test_impression_hourly_cap_exceeded(db, developer, active_campaign):
    redis = _make_redis_mock(already_seen=False, hourly_cents=50, daily_cents=0)
    service = ImpressionService(db=db, redis=redis)
    result = await service.record_impression(
        impression_id="imp_test_003",
        campaign_id=str(active_campaign.id),
        developer_id=developer.id,
        surface="cli",
        duration_ms=5000,
        ip_address="127.0.0.1",
    )
    assert result["credited"] is False
    assert "cap" in result.get("reason", "")


@pytest.mark.asyncio
async def test_impression_campaign_not_found(db, developer):
    redis = _make_redis_mock(already_seen=False)
    import uuid
    service = ImpressionService(db=db, redis=redis)
    result = await service.record_impression(
        impression_id="imp_test_004",
        campaign_id=str(uuid.uuid4()),
        developer_id=developer.id,
        surface="cli",
        duration_ms=5000,
        ip_address=None,
    )
    assert result["credited"] is False
    assert result["reason"] == "campaign_not_found"
