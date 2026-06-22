import uuid
from decimal import Decimal

from sqlalchemy import ForeignKey, Index, Numeric, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Click(Base):
    __tablename__ = "clicks"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, server_default=func.gen_random_uuid()
    )
    impression_id: Mapped[str] = mapped_column(
        Text, ForeignKey("impressions.impression_id", ondelete="RESTRICT"), unique=True, nullable=False
    )
    campaign_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("campaigns.id", ondelete="RESTRICT"), nullable=False
    )
    developer_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("developers.id", ondelete="RESTRICT"), nullable=False
    )
    developer_earn: Mapped[Decimal] = mapped_column(Numeric(10, 6), nullable=False)
    platform_earn: Mapped[Decimal] = mapped_column(Numeric(10, 6), nullable=False)
    clicked_at: Mapped[str] = mapped_column(server_default=func.now(), nullable=False)

    impression: Mapped["Impression"] = relationship(  # type: ignore[name-defined]  # noqa: F821
        "Impression", back_populates="click"
    )
    campaign: Mapped["Campaign"] = relationship(  # type: ignore[name-defined]  # noqa: F821
        "Campaign", back_populates="clicks"
    )
    developer: Mapped["Developer"] = relationship(  # type: ignore[name-defined]  # noqa: F821
        "Developer", back_populates="clicks"
    )

    __table_args__ = (
        Index("ix_clicks_developer_clicked", "developer_id", "clicked_at"),
    )

    def __repr__(self) -> str:
        return f"<Click id={self.id} imp={self.impression_id}>"
