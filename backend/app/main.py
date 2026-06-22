from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager

import structlog
from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.config import settings
from app.database import close_db, init_db
from app.deps import close_redis, get_redis
from app.middleware.logging import StructuredLoggingMiddleware, configure_structlog
from app.middleware.rate_limit import RateLimitMiddleware
from app.routers import ads, advertisers, auth, config, developers, metrics, payouts, public_stats, razorpay_router, webhooks
from app.services.auction import AuctionService

configure_structlog()
logger = structlog.get_logger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    logger.info("spinads.startup", environment=settings.ENVIRONMENT)
    await init_db()

    redis = await get_redis()
    async with __import__("app.database", fromlist=["AsyncSessionLocal"]).AsyncSessionLocal() as db:  # type: ignore[attr-defined]
        auction = AuctionService(redis=redis, db=db)
        count = await auction.sync_from_db()
        logger.info("auction.startup_sync", campaign_count=count)

    yield

    logger.info("spinads.shutdown")
    await close_db()
    await close_redis()


def create_app() -> FastAPI:
    app = FastAPI(
        title="SpinEarn API",
        description="Developer ad monetization platform for VS Code / Claude Code",
        version="1.0.0",
        docs_url="/docs" if settings.is_development else None,
        redoc_url="/redoc" if settings.is_development else None,
        openapi_url="/openapi.json" if settings.is_development else None,
        lifespan=lifespan,
    )

    # CORS
    allowed_origins = [settings.FRONTEND_URL, "vscode-webview://*", "vscode-file://*"]
    app.add_middleware(
        CORSMiddleware,
        allow_origins=allowed_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Rate limiting
    app.add_middleware(RateLimitMiddleware, redis_url=settings.REDIS_URL)

    # Structured logging
    app.add_middleware(StructuredLoggingMiddleware)

    # Routers
    prefix = "/api/v1"
    app.include_router(auth.router, prefix=prefix)
    app.include_router(ads.router, prefix=prefix)
    app.include_router(metrics.router, prefix=prefix)
    app.include_router(developers.router, prefix=prefix)
    app.include_router(advertisers.router, prefix=prefix)
    app.include_router(payouts.router, prefix=prefix)
    app.include_router(webhooks.router, prefix=prefix)
    app.include_router(config.router, prefix=prefix)
    app.include_router(razorpay_router.router, prefix=prefix)
    app.include_router(public_stats.router, prefix=prefix)

    @app.get("/health", tags=["health"])
    async def health_check() -> dict[str, object]:
        from sqlalchemy import text
        from app.database import AsyncSessionLocal

        db_ok = False
        redis_ok = False

        try:
            async with AsyncSessionLocal() as db:
                await db.execute(text("SELECT 1"))
            db_ok = True
        except Exception:
            pass

        try:
            redis = await get_redis()
            await redis.ping()
            redis_ok = True
        except Exception:
            pass

        return {
            "status": "ok" if db_ok and redis_ok else "degraded",
            "db": "ok" if db_ok else "error",
            "redis": "ok" if redis_ok else "error",
            "version": "1.0.0",
            "environment": settings.ENVIRONMENT,
        }

    @app.exception_handler(422)
    async def validation_error_handler(request: Request, exc: Exception) -> JSONResponse:
        logger.warning("validation_error", path=request.url.path, error=str(exc))
        return JSONResponse(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            content={"detail": str(exc)},
        )

    @app.exception_handler(500)
    async def internal_error_handler(request: Request, exc: Exception) -> JSONResponse:
        logger.error("internal_error", path=request.url.path, error=str(exc))
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={"detail": "Internal server error"},
        )

    return app


app = create_app()
