import httpx
import structlog

logger = structlog.get_logger(__name__)

GOOGLE_TOKENINFO_URL = "https://oauth2.googleapis.com/tokeninfo"


class GoogleAuthError(Exception):
    pass


class GoogleTokenPayload:
    def __init__(
        self,
        sub: str,
        email: str,
        name: str | None,
        picture: str | None,
        email_verified: bool,
    ) -> None:
        self.sub = sub
        self.email = email
        self.name = name
        self.picture = picture
        self.email_verified = email_verified


async def verify_google_id_token(id_token: str) -> GoogleTokenPayload:
    async with httpx.AsyncClient(timeout=10.0) as client:
        try:
            response = await client.get(
                GOOGLE_TOKENINFO_URL,
                params={"id_token": id_token},
            )
        except httpx.RequestError as exc:
            logger.error("google_auth.network_error", error=str(exc))
            raise GoogleAuthError("Failed to contact Google token endpoint") from exc

    if response.status_code != 200:
        logger.warning("google_auth.invalid_token", status=response.status_code)
        raise GoogleAuthError("Invalid Google ID token")

    data = response.json()

    sub: str | None = data.get("sub")
    email: str | None = data.get("email")
    email_verified: str = data.get("email_verified", "false")

    if not sub or not email:
        raise GoogleAuthError("Token missing required fields: sub, email")

    if email_verified.lower() != "true":
        raise GoogleAuthError("Google account email is not verified")

    return GoogleTokenPayload(
        sub=sub,
        email=email,
        name=data.get("name"),
        picture=data.get("picture"),
        email_verified=True,
    )
