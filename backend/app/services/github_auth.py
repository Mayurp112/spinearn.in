import httpx
import structlog

logger = structlog.get_logger(__name__)

GITHUB_TOKEN_URL = "https://github.com/login/oauth/access_token"
GITHUB_USER_URL = "https://api.github.com/user"
GITHUB_EMAILS_URL = "https://api.github.com/user/emails"


class GitHubAuthError(Exception):
    pass


class GitHubTokenPayload:
    def __init__(self, sub: str, email: str, name: str | None, avatar_url: str | None) -> None:
        self.sub = sub
        self.email = email
        self.name = name
        self.avatar_url = avatar_url


async def exchange_github_code(
    code: str,
    redirect_uri: str,
    client_id: str,
    client_secret: str,
) -> GitHubTokenPayload:
    async with httpx.AsyncClient(timeout=10.0) as client:
        # Exchange code for access token
        try:
            token_resp = await client.post(
                GITHUB_TOKEN_URL,
                json={"client_id": client_id, "client_secret": client_secret, "code": code, "redirect_uri": redirect_uri},
                headers={"Accept": "application/json"},
            )
        except httpx.RequestError as exc:
            raise GitHubAuthError("Failed to contact GitHub token endpoint") from exc

        if token_resp.status_code != 200:
            raise GitHubAuthError("GitHub token exchange failed")

        token_data = token_resp.json()
        access_token: str | None = token_data.get("access_token")
        if not access_token:
            error = token_data.get("error_description", token_data.get("error", "unknown"))
            raise GitHubAuthError(f"GitHub denied code exchange: {error}")

        # Fetch user profile
        try:
            user_resp = await client.get(
                GITHUB_USER_URL,
                headers={"Authorization": f"Bearer {access_token}", "Accept": "application/vnd.github+json"},
            )
        except httpx.RequestError as exc:
            raise GitHubAuthError("Failed to fetch GitHub user profile") from exc

        if user_resp.status_code != 200:
            raise GitHubAuthError("Failed to retrieve GitHub user info")

        user = user_resp.json()
        github_id = str(user.get("id", ""))
        name: str | None = user.get("name") or user.get("login")
        avatar_url: str | None = user.get("avatar_url")
        email: str | None = user.get("email")

        # GitHub may hide the primary email — fetch it explicitly
        if not email:
            try:
                emails_resp = await client.get(
                    GITHUB_EMAILS_URL,
                    headers={"Authorization": f"Bearer {access_token}", "Accept": "application/vnd.github+json"},
                )
                if emails_resp.status_code == 200:
                    for entry in emails_resp.json():
                        if entry.get("primary") and entry.get("verified"):
                            email = entry.get("email")
                            break
            except httpx.RequestError:
                pass

        if not github_id:
            raise GitHubAuthError("GitHub response missing user id")
        if not email:
            raise GitHubAuthError(
                "No verified primary email on GitHub account. "
                "Please make your primary email public or verified in GitHub settings."
            )

        logger.info("github_auth.token_exchange_ok", github_id=github_id)
        return GitHubTokenPayload(sub=github_id, email=email, name=name, avatar_url=avatar_url)
