import uuid
from decimal import Decimal

from sqlalchemy import ForeignKey, Index, Integer, Numeric, Text, func
from sqlalchemy.dialects.postgresql import INET, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Impression(Base):
    __tablename__ = "impressions"

    impression_id: Mapped[str] = mapped_column(Text, primary_key=True)
    campaign_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("campaigns.id", ondelete="RESTRICT"), nullable=False
    )
    developer_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("developers.id", ondelete="RESTRICT"), nullable=False
    )
    surface: Mapped[str] = mapped_column(Text, nullable=False)
    duration_ms: Mapped[int] = mapped_column(Integer, nullable=False)
    developer_earn: Mapped[Decimal] = mapped_column(Numeric(10, 6), nullable=False)
    platform_earn: Mapped[Decimal] = mapped_column(Numeric(10, 6), nullable=False)
    ip_address: Mapped[str | None] = mapped_column(INET, nullable=True)
    confirmed_at: Mapped[str] = mapped_column(server_default=func.now(), nullable=False)

    campaign: Mapped["Campaign"] = relationship(  # type: ignore[name-defined]  # noqa: F821
        "Campaign", back_populates="impressions"
    )
    developer: Mapped["Developer"] = relationship(  # type: ignore[name-defined]  # noqa: F821
        "Developer", back_populates="impressions"
    )
    click: Mapped["Click | None"] = relationship(  # type: ignore[name-defined]  # noqa: F821
        "Click", back_populates="impression", uselist=False
    )

    __table_args__ = (
        Index("ix_impressions_developer_confirmed", "developer_id", "confirmed_at"),
        Index("ix_impressions_campaign_confirmed", "campaign_id", "confirmed_at"),
    )

    def __repr__(self) -> str:
        return f"<Impression id={self.impression_id} dev={self.developer_id}>"
