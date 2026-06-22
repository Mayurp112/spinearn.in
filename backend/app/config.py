from pydantic import AnyHttpUrl, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore",
    )

    # Database
    DATABASE_URL: str

    # Redis
    REDIS_URL: str = "redis://localhost:6379/0"
    CELERY_BROKER_URL: str = "redis://localhost:6379/1"

    # JWT / Security
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 15
    REFRESH_TOKEN_EXPIRE_DAYS: int = 30

    # Google OAuth2
    GOOGLE_CLIENT_ID: str
    GOOGLE_CLIENT_SECRET: str

    # GitHub OAuth2
    GITHUB_CLIENT_ID: str = ""
    GITHUB_CLIENT_SECRET: str = ""

    # Razorpay (all advertiser payments + Indian developer payouts via Route)
    RAZORPAY_KEY_ID: str = ""
    RAZORPAY_KEY_SECRET: str = ""
    RAZORPAY_WEBHOOK_SECRET: str = ""
    # Razorpay X account number (source for Route payouts)
    RAZORPAY_ACCOUNT_NUMBER: str = ""

    # Wise Business (global developer payouts only — not for advertiser collection)
    WISE_API_KEY: str = ""
    WISE_PROFILE_ID: str = ""          # Wise Business profile numeric ID

    # Currency conversion (used when paying Indian developers in INR)
    USD_TO_INR_RATE: float = 83.0

    # Revenue share (platform keeps this fraction, developer gets 1 - this)
    PLATFORM_REVENUE_SHARE: float = 0.50

    # URLs
    FRONTEND_URL: str = "http://localhost:3000"
    BACKEND_URL: str = "http://localhost:8000"

    # Environment
    ENVIRONMENT: str = "development"

    # Fraud caps (cents)
    HOURLY_CAP_CENTS: int = 50
    DAILY_CAP_CENTS: int = 500

    # Minimum payout threshold (USD cents)
    MINIMUM_PAYOUT_CENTS: int = 1000

    @field_validator("PLATFORM_REVENUE_SHARE")
    @classmethod
    def validate_revenue_share(cls, v: float) -> float:
        if not 0.0 < v < 1.0:
            raise ValueError("PLATFORM_REVENUE_SHARE must be between 0 and 1")
        return v

    @property
    def developer_revenue_share(self) -> float:
        return 1.0 - self.PLATFORM_REVENUE_SHARE

    @property
    def is_production(self) -> bool:
        return self.ENVIRONMENT == "production"

    @property
    def is_development(self) -> bool:
        return self.ENVIRONMENT == "development"


settings = Settings()  # type: ignore[call-arg]
