import time
from collections.abc import Callable

import redis.asyncio as aioredis
import structlog
from fastapi import Request, Response, status
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware

logger = structlog.get_logger(__name__)

RATE_LIMIT_RULES: dict[str, tuple[int, int]] = {
    "/api/v1/ads/": (60, 60),
    "/api/v1/metrics/": (120, 60),
    "/api/v1/auth/": (10, 60),
}


class RateLimitMiddleware(BaseHTTPMiddleware):
    def __init__(self, app: object, redis_url: str) -> None:
        super().__init__(app)  # type: ignore[arg-type]
        self._redis_url = redis_url
        self._redis: aioredis.Redis | None = None

    async def _get_redis(self) -> aioredis.Redis:
        if self._redis is None:
            self._redis = aioredis.from_url(self._redis_url, decode_responses=True)
        return self._redis

    def _get_rate_limit(self, path: str) -> tuple[int, int] | None:
        for prefix, limits in RATE_LIMIT_RULES.items():
            if path.startswith(prefix):
                return limits
        return None

    def _get_identifier(self, request: Request) -> str:
        device_id = request.headers.get("X-Device-ID")
        if device_id:
            return f"device:{device_id}"
        client_ip = request.client.host if request.client else "unknown"
        return f"ip:{client_ip}"

    async def dispatch(self, request: Request, call_next: Callable) -> Response:  # type: ignore[override]
        limits = self._get_rate_limit(request.url.path)
        if limits is None:
            return await call_next(request)

        max_requests, window_seconds = limits
        identifier = self._get_identifier(request)
        parts = request.url.path.split("/")
        route_segment = parts[3] if len(parts) > 3 else "root"
        redis_key = f"rl:{route_segment}:{identifier}"

        try:
            redis = await self._get_redis()
            now = int(time.time())
            window_start = now - window_seconds

            pipe = redis.pipeline()
            pipe.zremrangebyscore(redis_key, 0, window_start)
            pipe.zadd(redis_key, {str(now) + f":{id(request)}": now})
            pipe.zcard(redis_key)
            pipe.expire(redis_key, window_seconds)
            results = await pipe.execute()
            count: int = results[2]

            if count > max_requests:
                retry_after = window_seconds
                logger.warning(
                    "rate_limit.exceeded",
                    identifier=identifier,
                    path=request.url.path,
                    count=count,
                    limit=max_requests,
                )
                return JSONResponse(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    content={"detail": "Rate limit exceeded"},
                    headers={"Retry-After": str(retry_after)},
                )
        except Exception as exc:
            logger.error("rate_limit.redis_error", error=str(exc))

        return await call_next(request)
