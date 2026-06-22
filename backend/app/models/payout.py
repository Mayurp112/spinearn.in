import uuid

from sqlalchemy import ForeignKey, Index, Integer, Text, func, text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Payout(Base):
    __tablename__ = "payouts"
    __table_args__ = (
        Index(
            "uq_payout_developer_pending",
            "developer_id",
            unique=True,
            postgresql_where=text("status = 'pending'"),
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, server_default=func.gen_random_uuid()
    )
    developer_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("developers.id", ondelete="RESTRICT"), nullable=False, index=True
    )
    amount_cents: Mapped[int] = mapped_column(Integer, nullable=False)

    # Payment provider: razorpay | wise
    provider: Mapped[str] = mapped_column(Text, default="razorpay", nullable=False)

    # Razorpay fields
    razorpay_payout_id: Mapped[str | None] = mapped_column(Text, nullable=True)
    # Amount paid in INR paise (for Razorpay payouts)
    amount_inr_paise: Mapped[int | None] = mapped_column(Integer, nullable=True)

    # Wise fields
    wise_transfer_id: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Legacy Stripe fields — kept as nullable columns, no longer written
    stripe_transfer_id: Mapped[str | None] = mapped_column(Text, nullable=True)
    stripe_payout_id: Mapped[str | None] = mapped_column(Text, nullable=True)

    # status: pending | processing | completed | failed
    status: Mapped[str] = mapped_column(Text, default="pending", nullable=False, index=True)
    failure_reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    requested_at: Mapped[str] = mapped_column(server_default=func.now(), nullable=False)
    completed_at: Mapped[str | None] = mapped_column(nullable=True)

    developer: Mapped["Developer"] = relationship(  # type: ignore[name-defined]  # noqa: F821
        "Developer", back_populates="payouts"
    )

    def __repr__(self) -> str:
        return f"<Payout id={self.id} amount={self.amount_cents} status={self.status}>"
