from fastapi import APIRouter
from pydantic import BaseModel

from app.config import settings

router = APIRouter(prefix="/config", tags=["config"])


class EarningCaps(BaseModel):
    hourly_max_cents: int
    daily_max_cents: int


class RemoteConfig(BaseModel):
    global_kill_switch: bool
    poll_interval_ms: int
    min_impression_duration_ms: int
    earning_caps: EarningCaps
    supported_surfaces: list[str]


_KILL_SWITCH = False


@router.get("", response_model=RemoteConfig)
async def get_config() -> RemoteConfig:
    return RemoteConfig(
        global_kill_switch=_KILL_SWITCH,
        poll_interval_ms=60000,
        min_impression_duration_ms=5000,
        earning_caps=EarningCaps(
            hourly_max_cents=settings.HOURLY_CAP_CENTS,
            daily_max_cents=settings.DAILY_CAP_CENTS,
        ),
        supported_surfaces=["claude_code_webview", "codex_webview", "cli"],
    )
