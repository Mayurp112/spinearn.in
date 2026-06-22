import secrets
import string
from datetime import datetime, timedelta, timezone
from typing import Annotated

import structlog
from fastapi import APIRouter, Cookie, Depends, Header, HTTPException, Response, status
from jose import jwt
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.database import get_db
from app.deps import get_redis
from app.models.developer import Developer
from app.services.github_auth import GitHubAuthError, exchange_github_code
from app.services.google_auth import GoogleAuthError, verify_google_id_token

import redis.asyncio as aioredis

logger = structlog.get_logger(__name__)
router = APIRouter(prefix="/auth", tags=["auth"])


class GoogleAuthRequest(BaseModel):
    id_token: str
    ref_code: str | None = None


class GitHubAuthRequest(BaseModel):
    code: str
    redirect_uri: str
    ref_code: str | None = None


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int
    developer_id: str
    email: str


def _generate_referral_code() -> str:
    alphabet = string.ascii_uppercase + string.digits
    return "".join(secrets.choice(alphabet) for _ in range(8))


async def _resolve_referrer(db: AsyncSession, ref_code: str | None) -> "Developer | None":
    if not ref_code:
        return None
    result = await db.execute(select(Developer).where(Developer.referral_code == ref_code))
    return result.scalar_one_or_none()


def _create_access_token(developer_id: str) -> str:
    expire = datetime.now(tz=timezone.utc) + timedelta(
        minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES
    )
    return jwt.encode(
        {"sub": developer_id, "exp": expire, "type": "access"},
        settings.SECRET_KEY,
        algorithm=settings.ALGORITHM,
    )


def _create_refresh_token(developer_id: str) -> str:
    expire = datetime.now(tz=timezone.utc) + timedelta(
        days=settings.REFRESH_TOKEN_EXPIRE_DAYS
    )
    return jwt.encode(
        {"sub": developer_id, "exp": expire, "type": "refresh"},
        settings.SECRET_KEY,
        algorithm=settings.ALGORITHM,
    )


@router.post("/google", response_model=TokenResponse, status_code=status.HTTP_200_OK)
async def google_auth(
    body: GoogleAuthRequest,
    response: Response,
    db: Annotated[AsyncSession, Depends(get_db)],
    x_device_id: Annotated[str | None, Header(alias="X-Device-ID")] = None,
) -> TokenResponse:
    try:
        payload = await verify_google_id_token(body.id_token)
    except GoogleAuthError as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(exc)) from exc

    result = await db.execute(select(Developer).where(Developer.google_id == payload.sub))
    developer = result.scalar_one_or_none()

    device_id = x_device_id or payload.sub

    if developer is None:
        result2 = await db.execute(select(Developer).where(Developer.email == payload.email))
        developer = result2.scalar_one_or_none()

    referrer = await _resolve_referrer(db, body.ref_code)

    if developer is None:
        developer = Developer(
            google_id=payload.sub,
            email=payload.email,
            name=payload.name,
            device_id=device_id,
            referral_code=_generate_referral_code(),
            referred_by_id=referrer.id if referrer else None,
        )
        db.add(developer)
        await db.flush()
    else:
        developer.google_id = payload.sub
        developer.name = payload.name or developer.name
        if x_device_id and developer.device_id != x_device_id:
            developer.device_id = x_device_id
        if not developer.referral_code:
            developer.referral_code = _generate_referral_code()

    await db.commit()
    await db.refresh(developer)

    access_token = _create_access_token(str(developer.id))
    refresh_token = _create_refresh_token(str(developer.id))

    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        httponly=True,
        secure=settings.is_production,
        samesite="lax",
        max_age=settings.REFRESH_TOKEN_EXPIRE_DAYS * 86400,
        path="/api/v1/auth",
    )

    logger.info("auth.google_login", developer_id=str(developer.id), email=developer.email)

    return TokenResponse(
        access_token=access_token,
        expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        developer_id=str(developer.id),
        email=developer.email,
    )


@router.post("/github", response_model=TokenResponse, status_code=status.HTTP_200_OK)
async def github_auth(
    body: GitHubAuthRequest,
    response: Response,
    db: Annotated[AsyncSession, Depends(get_db)],
    x_device_id: Annotated[str | None, Header(alias="X-Device-ID")] = None,
) -> TokenResponse:
    if not settings.GITHUB_CLIENT_ID or not settings.GITHUB_CLIENT_SECRET:
        raise HTTPException(status_code=status.HTTP_501_NOT_IMPLEMENTED, detail="GitHub auth not configured")

    try:
        payload = await exchange_github_code(
            code=body.code,
            redirect_uri=body.redirect_uri,
            client_id=settings.GITHUB_CLIENT_ID,
            client_secret=settings.GITHUB_CLIENT_SECRET,
        )
    except GitHubAuthError as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(exc)) from exc

    # Find existing developer by github_id or email
    result = await db.execute(select(Developer).where(Developer.github_id == payload.sub))
    developer = result.scalar_one_or_none()

    if developer is None:
        result2 = await db.execute(select(Developer).where(Developer.email == payload.email))
        developer = result2.scalar_one_or_none()

    device_id = x_device_id or payload.sub

    referrer = await _resolve_referrer(db, body.ref_code)

    if developer is None:
        developer = Developer(
            github_id=payload.sub,
            email=payload.email,
            name=payload.name,
            avatar_url=payload.avatar_url,
            device_id=device_id,
            referral_code=_generate_referral_code(),
            referred_by_id=referrer.id if referrer else None,
        )
        db.add(developer)
        await db.flush()
    else:
        developer.github_id = payload.sub
        developer.name = payload.name or developer.name
        developer.avatar_url = payload.avatar_url or developer.avatar_url
        if x_device_id and developer.device_id != x_device_id:
            developer.device_id = x_device_id
        if not developer.referral_code:
            developer.referral_code = _generate_referral_code()

    await db.commit()
    await db.refresh(developer)

    access_token = _create_access_token(str(developer.id))
    refresh_token = _create_refresh_token(str(developer.id))

    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        httponly=True,
        secure=settings.is_production,
        samesite="lax",
        max_age=settings.REFRESH_TOKEN_EXPIRE_DAYS * 86400,
        path="/api/v1/auth",
    )

    logger.info("auth.github_login", developer_id=str(developer.id), email=developer.email)

    return TokenResponse(
        access_token=access_token,
        expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        developer_id=str(developer.id),
        email=developer.email,
    )


@router.post("/refresh", response_model=TokenResponse, status_code=status.HTTP_200_OK)
async def refresh_token(
    response: Response,
    db: Annotated[AsyncSession, Depends(get_db)],
    refresh_token: Annotated[str | None, Cookie()] = None,
) -> TokenResponse:
    if not refresh_token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="No refresh token")

    try:
        from jose import JWTError
        payload = jwt.decode(refresh_token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        if payload.get("type") != "refresh":
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token type")
        developer_id: str = payload["sub"]
    except Exception as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token") from exc

    result = await db.execute(select(Developer).where(Developer.id == developer_id))
    developer = result.scalar_one_or_none()
    if developer is None or developer.blocked:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Developer not found")

    new_access = _create_access_token(str(developer.id))
    new_refresh = _create_refresh_token(str(developer.id))

    response.set_cookie(
        key="refresh_token",
        value=new_refresh,
        httponly=True,
        secure=settings.is_production,
        samesite="lax",
        max_age=settings.REFRESH_TOKEN_EXPIRE_DAYS * 86400,
        path="/api/v1/auth",
    )

    return TokenResponse(
        access_token=new_access,
        expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        developer_id=str(developer.id),
        email=developer.email,
    )


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
async def logout(response: Response) -> None:
    response.delete_cookie(key="refresh_token", path="/api/v1/auth")
