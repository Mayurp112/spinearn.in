"""Add referral system to developers

Revision ID: 004
Revises: 003
Create Date: 2026-06-17 00:02:00.000000

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "004"
down_revision: Union[str, None] = "003"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("developers", sa.Column("referral_code", sa.Text(), nullable=True))
    op.add_column(
        "developers",
        sa.Column(
            "referred_by_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("developers.id", ondelete="SET NULL"),
            nullable=True,
        ),
    )
    op.add_column("developers", sa.Column("referral_bonus_cents", sa.Integer(), nullable=False, server_default="0"))
    op.add_column("developers", sa.Column("has_first_impression", sa.Boolean(), nullable=False, server_default="false"))
    op.create_index("ix_developers_referral_code", "developers", ["referral_code"], unique=True)


def downgrade() -> None:
    op.drop_index("ix_developers_referral_code", table_name="developers")
    op.drop_column("developers", "has_first_impression")
    op.drop_column("developers", "referral_bonus_cents")
    op.drop_column("developers", "referred_by_id")
    op.drop_column("developers", "referral_code")
