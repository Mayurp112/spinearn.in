from typing import Annotated
from uuid import UUID

import redis.asyncio as aioredis
import structlog
from fastapi import Depends, Header, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.database import AsyncSessionLocal, get_db
from app.models.developer import Developer

logger = structlog.get_logger(__name__)

security = HTTPBearer(auto_error=False)

# ─── Redis connection pool ───────────────────────────────────────────────────

_redis_pool: aioredis.Redis | None = None


async def get_redis() -> aioredis.Redis:
    global _redis_pool
    if _redis_pool is None:
        _redis_pool = aioredis.from_url(
            settings.REDIS_URL,
            encoding="utf-8",
            decode_responses=True,
            max_connections=50,
        )
    return _redis_pool


async def close_redis() -> None:
    global _redis_pool
    if _redis_pool is not None:
        await _redis_pool.aclose()
        _redis_pool = None


# ─── Auth dependencies ───────────────────────────────────────────────────────


def _decode_jwt(token: str) -> dict[str, object]:
    return jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])


async def get_current_developer_optional(
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(security)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> Developer | None:
    if credentials is None:
        return None
    try:
        payload = _decode_jwt(credentials.credentials)
        developer_id: str | None = payload.get("sub")
        if developer_id is None:
            return None
    except JWTError:
        return None

    result = await db.execute(select(Developer).where(Developer.id == UUID(developer_id)))
    developer = result.scalar_one_or_none()
    if developer is None or developer.blocked:
        return None
    return developer


async def get_current_developer(
    developer: Annotated[Developer | None, Depends(get_current_developer_optional)],
) -> Developer:
    if developer is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return developer


async def get_device_id(
    x_device_id: Annotated[str | None, Header(alias="X-Device-ID")] = None,
) -> str:
    if not x_device_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="X-Device-ID header is required",
        )
    if len(x_device_id) > 64:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="X-Device-ID must be at most 64 characters",
        )
    return x_device_id


# ─── Type aliases ────────────────────────────────────────────────────────────

DbDep = Annotated[AsyncSession, Depends(get_db)]
RedisDep = Annotated[aioredis.Redis, Depends(get_redis)]
CurrentDeveloperDep = Annotated[Developer, Depends(get_current_developer)]
CurrentDeveloperOptionalDep = Annotated[Developer | None, Depends(get_current_developer_optional)]
DeviceIdDep = Annotated[str, Depends(get_device_id)]
