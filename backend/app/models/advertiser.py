import uuid

from sqlalchemy import Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Advertiser(Base):
    __tablename__ = "advertisers"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, server_default=func.gen_random_uuid()
    )
    email: Mapped[str] = mapped_column(Text, unique=True, nullable=False, index=True)
    name: Mapped[str | None] = mapped_column(Text, nullable=True)
    stripe_customer_id: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[str] = mapped_column(server_default=func.now(), nullable=False)
    updated_at: Mapped[str] = mapped_column(
        server_default=func.now(), onupdate=func.now(), nullable=False
    )

    campaigns: Mapped[list["Campaign"]] = relationship(  # type: ignore[name-defined]  # noqa: F821
        "Campaign", back_populates="advertiser", lazy="dynamic"
    )

    def __repr__(self) -> str:
        return f"<Advertiser id={self.id} email={self.email}>"
