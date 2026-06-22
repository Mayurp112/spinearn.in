from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_get_current_ad_no_campaigns(client: AsyncClient, mock_redis):
    mock_redis.zrevrangebyscore = AsyncMock(return_value=[])
    response = await client.get(
        "/api/v1/ads/current",
        headers={"X-Device-ID": "test-device-001"},
    )
    assert response.status_code == 204


@pytest.mark.asyncio
async def test_get_current_ad_missing_device_id(client: AsyncClient):
    response = await client.get("/api/v1/ads/current")
    assert response.status_code == 400


@pytest.mark.asyncio
async def test_get_current_ad_returns_ad(client: AsyncClient, mock_redis, active_campaign):
    mock_redis.zrevrangebyscore = AsyncMock(
        return_value=[(str(active_campaign.id), float(active_campaign.bid_cpm))]
    )
    response = await client.get(
        "/api/v1/ads/current",
        headers={"X-Device-ID": "test-device-002"},
    )
    assert response.status_code in (200, 204)
    if response.status_code == 200:
        data = response.json()
        assert "impression_id" in data
        assert "creative_text" in data
        assert "click_url" in data
        assert data["ttl_ms"] == 5000


@pytest.mark.asyncio
async def test_health_check(client: AsyncClient):
    response = await client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert "status" in data
    assert "version" in data
