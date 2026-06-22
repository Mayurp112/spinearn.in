from decimal import Decimal
from unittest.mock import AsyncMock, MagicMock

import pytest
import pytest_asyncio

from app.services.auction import AuctionService, AUCTION_KEY


@pytest.fixture
def redis_mock():
    r = AsyncMock()
    r.zadd = AsyncMock(return_value=1)
    r.zrem = AsyncMock(return_value=1)
    r.zrevrank = AsyncMock(return_value=0)
    r.zrevrangebyscore = AsyncMock(return_value=[])
    pipe = AsyncMock()
    pipe.delete = MagicMock(return_value=pipe)
    pipe.zadd = MagicMock(return_value=pipe)
    pipe.execute = AsyncMock(return_value=[1, 1])
    r.pipeline = MagicMock(return_value=pipe)
    return r


@pytest.mark.asyncio
async def test_place_bid(redis_mock, db):
    auction = AuctionService(redis=redis_mock, db=db)
    await auction.place_bid("campaign-123", 5.00)
    redis_mock.zadd.assert_called_once_with(AUCTION_KEY, {"campaign-123": 5.00})


@pytest.mark.asyncio
async def test_remove_campaign(redis_mock, db):
    auction = AuctionService(redis=redis_mock, db=db)
    await auction.remove_campaign("campaign-123")
    redis_mock.zrem.assert_called_once_with(AUCTION_KEY, "campaign-123")


@pytest.mark.asyncio
async def test_get_auction_position_winner(redis_mock, db):
    redis_mock.zrevrank = AsyncMock(return_value=0)
    auction = AuctionService(redis=redis_mock, db=db)
    pos = await auction.get_auction_position("campaign-123")
    assert pos == 0


@pytest.mark.asyncio
async def test_get_auction_position_not_in_auction(redis_mock, db):
    redis_mock.zrevrank = AsyncMock(return_value=None)
    auction = AuctionService(redis=redis_mock, db=db)
    pos = await auction.get_auction_position("missing-campaign")
    assert pos == -1


@pytest.mark.asyncio
async def test_get_winning_ad_empty(redis_mock, db):
    redis_mock.zrevrangebyscore = AsyncMock(return_value=[])
    auction = AuctionService(redis=redis_mock, db=db)
    result = await auction.get_winning_ad()
    assert result is None


@pytest.mark.asyncio
async def test_get_all_bids(redis_mock, db):
    redis_mock.zrevrangebyscore = AsyncMock(
        return_value=[("campaign-a", 10.0), ("campaign-b", 5.0)]
    )
    auction = AuctionService(redis=redis_mock, db=db)
    bids = await auction.get_all_bids()
    assert len(bids) == 2
    assert bids[0]["campaign_id"] == "campaign-a"
    assert bids[0]["bid_cpm"] == 10.0
    assert bids[0]["position"] == 0
    assert bids[1]["position"] == 1


@pytest.mark.asyncio
async def test_sync_from_db_active_campaigns(redis_mock, db, active_campaign):
    auction = AuctionService(redis=redis_mock, db=db)
    count = await auction.sync_from_db()
    assert count >= 1
