from celery import Celery
from celery.schedules import crontab

from app.config import settings

celery_app = Celery(
    "spinads",
    broker=settings.CELERY_BROKER_URL,
    backend=settings.REDIS_URL,
    include=["app.tasks.impression_tasks", "app.tasks.payout_tasks"],
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    task_track_started=True,
    task_acks_late=True,
    worker_prefetch_multiplier=1,
    task_reject_on_worker_lost=True,
    beat_schedule={
        "sync-auction-from-db": {
            "task": "app.tasks.impression_tasks.sync_auction_from_db",
            "schedule": crontab(minute=0),
        },
    },
)
