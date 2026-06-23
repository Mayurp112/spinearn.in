import asyncio
import uuid
from collections.abc import AsyncGenerator
from decimal import Decimal
from typing import Any
from unittest.mock import AsyncMock, MagicMock

import pytest
import pytest_asyncio
from fastapi import FastAPI
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.database import Base
from app.deps import get_db, get_redis
from app.main import create_app
from app.models.advertiser import Advertiser
from app.models.campaign import Campaign
from app.models.developer import Developer

TEST_DATABASE_URL = "postgresql+asyncpg://spinearn:spinearn_dev_password@localhost:5432/spinearn_test"


@pytest.fixture(scope="session")
def event_loop():
    loop = asyncio.new_event_loop()
    yield loop
    loop.close()


@pytest_asyncio.fixture(scope="session")
async def test_engine():
    engine = create_async_engine(TEST_DATABASE_URL, echo=False)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)
    yield engine
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    await engine.dispose()


@pytest_asyncio.fixture
async def db(test_engine) -> AsyncGenerator[AsyncSession, None]:
    factory = async_sessionmaker(bind=test_engine, expire_on_commit=False)
    async with factory() as session:
        yield session
        await session.rollback()


@pytest.fixture
def mock_redis():
    redis = AsyncMock()
    redis.sismember = AsyncMock(return_value=False)
    redis.sadd = AsyncMock(return_value=1)
    redis.expire = AsyncMock(return_value=True)
    redis.get = AsyncMock(return_value=None)
    redis.incr = AsyncMock(return_value=1)
    redis.zadd = AsyncMock(return_value=1)
    redis.zrem = AsyncMock(return_value=1)
    redis.zrevrangebyscore = AsyncMock(return_value=[])
    redis.zrevrank = AsyncMock(return_value=None)
    redis.pipeline = MagicMock(return_value=AsyncMock(
        __aenter__=AsyncMock(return_value=AsyncMock()),
        __aexit__=AsyncMock(return_value=None),
        execute=AsyncMock(return_value=[False, None, None]),
    ))
    redis.ping = AsyncMock(return_value=True)
    return redis


@pytest_asyncio.fixture
async def app(db, mock_redis) -> FastAPI:
    application = create_app()
    application.dependency_overrides[get_db] = lambda: db
    application.dependency_overrides[get_redis] = lambda: mock_redis
    return application


@pytest_asyncio.fixture
async def client(app: FastAPI) -> AsyncGenerator[AsyncClient, None]:
    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test",
    ) as ac:
        yield ac


@pytest_asyncio.fixture
async def developer(db: AsyncSession) -> Developer:
    dev = Developer(
        email=f"dev_{uuid.uuid4().hex[:8]}@test.com",
        device_id=str(uuid.uuid4()),
        name="Test Developer",
        pending_balance=Decimal("10.00"),
        paid_balance=Decimal("0"),
        hourly_cap_cents=50,
        daily_cap_cents=500,
    )
    db.add(dev)
    await db.commit()
    await db.refresh(dev)
    return dev


@pytest_asyncio.fixture
async def advertiser(db: AsyncSession) -> Advertiser:
    adv = Advertiser(email=f"adv_{uuid.uuid4().hex[:8]}@test.com", name="Test Advertiser")
    db.add(adv)
    await db.commit()
    await db.refresh(adv)
    return adv


@pytest_asyncio.fixture
async def active_campaign(db: AsyncSession, advertiser: Advertiser) -> Campaign:
    camp = Campaign(
        advertiser_id=advertiser.id,
        creative_text="Test Ad: Try SpinEarn today →",
        destination_url="https://spinearn.example.com",
        bid_cpm=Decimal("5.00"),
        impressions_purchased=1000,
        status="active",
    )
    db.add(camp)
    await db.commit()
    await db.refresh(camp)
    return camp
