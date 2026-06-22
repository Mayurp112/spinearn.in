import uuid
from decimal import Decimal

from sqlalchemy import Boolean, ForeignKey, Integer, Numeric, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Developer(Base):
    __tablename__ = "developers"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, server_default=func.gen_random_uuid()
    )
    google_id: Mapped[str | None] = mapped_column(Text, unique=True, nullable=True)
    github_id: Mapped[str | None] = mapped_column(Text, unique=True, nullable=True, index=True)
    email: Mapped[str] = mapped_column(Text, unique=True, nullable=False, index=True)
    name: Mapped[str | None] = mapped_column(Text, nullable=True)
    avatar_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    device_id: Mapped[str] = mapped_column(Text, unique=True, nullable=False, index=True)
    # Payment provider routing
    country: Mapped[str | None] = mapped_column(Text, nullable=True)          # ISO-3166 alpha-2
    payment_provider: Mapped[str] = mapped_column(Text, default="razorpay", nullable=False)  # razorpay | wise

    # Razorpay Route (India payouts — bank / UPI)
    razorpay_contact_id: Mapped[str | None] = mapped_column(Text, nullable=True)
    razorpay_fund_account_id: Mapped[str | None] = mapped_column(Text, nullable=True)
    razorpay_onboarded: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    # Wise Business (global developer payouts)
    wise_recipient_id: Mapped[str | None] = mapped_column(Text, nullable=True)
    wise_currency: Mapped[str | None] = mapped_column(Text, nullable=True)    # ISO-4217, e.g. "USD", "EUR"
    wise_onboarded: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    pending_balance: Mapped[Decimal] = mapped_column(
        Numeric(12, 6), default=Decimal("0"), nullable=False
    )
    paid_balance: Mapped[Decimal] = mapped_column(
        Numeric(12, 6), default=Decimal("0"), nullable=False
    )
    hourly_cap_cents: Mapped[int] = mapped_column(Integer, default=50, nullable=False)
    daily_cap_cents: Mapped[int] = mapped_column(Integer, default=500, nullable=False)
    blocked: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    # Referral system
    referral_code: Mapped[str | None] = mapped_column(Text, unique=True, nullable=True, index=True)
    referred_by_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("developers.id", ondelete="SET NULL"), nullable=True
    )
    referral_bonus_cents: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    has_first_impression: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    created_at: Mapped[str] = mapped_column(
        server_default=func.now(), nullable=False
    )
    updated_at: Mapped[str] = mapped_column(
        server_default=func.now(), onupdate=func.now(), nullable=False
    )

    impressions: Mapped[list["Impression"]] = relationship(  # type: ignore[name-defined]  # noqa: F821
        "Impression", back_populates="developer", lazy="dynamic"
    )
    clicks: Mapped[list["Click"]] = relationship(  # type: ignore[name-defined]  # noqa: F821
        "Click", back_populates="developer", lazy="dynamic"
    )
    payouts: Mapped[list["Payout"]] = relationship(  # type: ignore[name-defined]  # noqa: F821
        "Payout", back_populates="developer", lazy="dynamic"
    )

    def __repr__(self) -> str:
        return f"<Developer id={self.id} email={self.email}>"
