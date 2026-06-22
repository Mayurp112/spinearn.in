"""Add GitHub auth and avatar_url to developers

Revision ID: 003
Revises: 002
Create Date: 2026-06-17 00:01:00.000000

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "003"
down_revision: Union[str, None] = "002"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("developers", sa.Column("github_id", sa.Text(), nullable=True))
    op.add_column("developers", sa.Column("avatar_url", sa.Text(), nullable=True))
    op.create_index("ix_developers_github_id", "developers", ["github_id"], unique=True)


def downgrade() -> None:
    op.drop_index("ix_developers_github_id", table_name="developers")
    op.drop_column("developers", "avatar_url")
    op.drop_column("developers", "github_id")
