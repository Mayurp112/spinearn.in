import structlog
import httpx
from fastapi import Request

logger = structlog.get_logger(__name__)

INDIA_CODE = "IN"
_LOCAL_IPS = {"127.0.0.1", "::1", "0.0.0.0", "localhost"}


def _extract_ip(request: Request) -> str:
    """Extract real client IP, respecting X-Forwarded-For from trusted proxies."""
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "127.0.0.1"


async def detect_country(ip: str) -> str:
    """
    Detect ISO 3166-1 alpha-2 country code from IP address.
    Returns 'US' as safe fallback (→ Wise) if detection fails.
    Local IPs return 'IN' for dev convenience.
    """
    if ip in _LOCAL_IPS:
        return INDIA_CODE

    try:
        async with httpx.AsyncClient(timeout=3.0) as client:
            resp = await client.get(
                f"http://ip-api.com/json/{ip}",
                params={"fields": "status,countryCode"},
            )
            if resp.status_code == 200:
                data = resp.json()
                if data.get("status") == "success":
                    return data.get("countryCode", "US")
    except Exception as exc:
        logger.warning("country_detect.failed", ip=ip, error=str(exc))

    return "US"  # Safe fallback → Wise


def get_payment_provider(country: str) -> str:
    """Route Indian users to Razorpay, everyone else to Wise."""
    return "razorpay" if country == INDIA_CODE else "wise"


def usd_cents_to_inr_paise(cents: int, rate: float) -> int:
    """Convert USD cents to INR paise using given exchange rate."""
    return max(100, int(cents * rate))  # minimum 1 INR paise = 100 paise
