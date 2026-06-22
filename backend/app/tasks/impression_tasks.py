import asyncio

import structlog
from celery import Task

from app.database import AsyncSessionLocal
from app.deps import get_redis
from app.services.auction import AuctionService
from app.tasks.celery_app import celery_app

logger = structlog.get_logger(__name__)


class ImpressionTask(Task):  # type: ignore[type-arg]
    abstract = True


@celery_app.task(
    bind=True,
    base=ImpressionTask,
    max_retries=3,
    default_retry_delay=5,
    name="app.tasks.impression_tasks.process_impression",
)
def process_impression(self: Task, impression_data: dict) -> dict:  # type: ignore[type-arg]
    async def _run() -> dict:  # type: ignore[type-arg]
        from app.services.impression import ImpressionService

        async with AsyncSessionLocal() as db:
            redis = await get_redis()
            service = ImpressionService(db=db, redis=redis)
            result = await service.record_impression(
                impression_id=impression_data["impression_id"],
                campaign_id=impression_data["campaign_id"],
                developer_id=impression_data["developer_id"],
                surface=impression_data["surface"],
                duration_ms=impression_data["duration_ms"],
                ip_address=impression_data.get("ip_address"),
            )
            return result

    try:
        return asyncio.get_event_loop().run_until_complete(_run())
    except Exception as exc:
        logger.error("impression_task.failed", error=str(exc), data=impression_data)
        raise self.retry(exc=exc, countdown=5 * (2 ** self.request.retries)) from exc


@celery_app.task(name="app.tasks.impression_tasks.sync_auction_from_db")
def sync_auction_from_db() -> dict:  # type: ignore[return]
    async def _run() -> dict:  # type: ignore[return]
        async with AsyncSessionLocal() as db:
            redis = await get_redis()
            auction = AuctionService(redis=redis, db=db)
            count = await auction.sync_from_db()
            logger.info("auction.synced", campaign_count=count)
            return {"synced": count}

    return asyncio.get_event_loop().run_until_complete(_run())
