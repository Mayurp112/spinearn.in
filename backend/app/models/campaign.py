import uuid
from decimal import Decimal

from sqlalchemy import ForeignKey, Integer, Numeric, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Campaign(Base):
    __tablename__ = "campaigns"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, server_default=func.gen_random_uuid()
    )
    advertiser_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("advertisers.id", ondelete="RESTRICT"), nullable=False, index=True
    )
    creative_text: Mapped[str] = mapped_column(Text, nullable=False)
    destination_url: Mapped[str] = mapped_column(Text, nullable=False)
    bid_cpm: Mapped[Decimal] = mapped_column(Numeric(10, 4), nullable=False)
    click_multiplier: Mapped[int] = mapped_column(Integer, default=50, nullable=False)
    impressions_purchased: Mapped[int] = mapped_column(Integer, nullable=False)
    impressions_served: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    clicks_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    total_spend: Mapped[Decimal] = mapped_column(
        Numeric(10, 4), default=Decimal("0"), nullable=False
    )
    # status: active | paused | exhausted | cancelled | pending_payment
    status: Mapped[str] = mapped_column(Text, default="pending_payment", nullable=False, index=True)
    stripe_payment_id: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[str] = mapped_column(server_default=func.now(), nullable=False)
    updated_at: Mapped[str] = mapped_column(
        server_default=func.now(), onupdate=func.now(), nullable=False
    )

    advertiser: Mapped["Advertiser"] = relationship(  # type: ignore[name-defined]  # noqa: F821
        "Advertiser", back_populates="campaigns"
    )
    impressions: Mapped[list["Impression"]] = relationship(  # type: ignore[name-defined]  # noqa: F821
        "Impression", back_populates="campaign", lazy="dynamic"
    )
    clicks: Mapped[list["Click"]] = relationship(  # type: ignore[name-defined]  # noqa: F821
        "Click", back_populates="campaign", lazy="dynamic"
    )

    def __repr__(self) -> str:
        return f"<Campaign id={self.id} status={self.status} bid={self.bid_cpm}>"
