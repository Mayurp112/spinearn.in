from collections.abc import AsyncGenerator

import structlog
from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from sqlalchemy.orm import DeclarativeBase
from sqlalchemy.pool import NullPool

from app.config import settings

logger = structlog.get_logger(__name__)


class Base(DeclarativeBase):
    pass


# Engine with connection pooling (NullPool for async workers / tests use NullPool)
engine = create_async_engine(
    settings.DATABASE_URL,
    echo=settings.is_development,
    pool_pre_ping=True,
    pool_size=10,
    max_overflow=20,
    pool_recycle=3600,
)

# Session factory
AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autoflush=False,
    autocommit=False,
)


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


async def init_db() -> None:
    try:
        async with engine.begin() as conn:
            await conn.run_sync(lambda c: c.execute(c.connection.connection.cursor().execute("SELECT 1")))  # type: ignore[attr-defined]
        logger.info("database.connected", url=settings.DATABASE_URL.split("@")[-1])
    except Exception as exc:
        logger.error("database.connection_failed", error=str(exc))
        raise


async def close_db() -> None:
    await engine.dispose()
    logger.info("database.disconnected")
