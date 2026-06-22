"""Initial schema

Revision ID: 001
Revises:
Create Date: 2026-01-01 00:00:00.000000

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ── developers ──────────────────────────────────────────────────────────
    op.create_table(
        "developers",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            server_default=sa.text("gen_random_uuid()"),
            nullable=False,
        ),
        sa.Column("google_id", sa.Text(), nullable=True),
        sa.Column("email", sa.Text(), nullable=False),
        sa.Column("name", sa.Text(), nullable=True),
        sa.Column("device_id", sa.Text(), nullable=False),
        sa.Column("stripe_account_id", sa.Text(), nullable=True),
        sa.Column("stripe_onboarded", sa.Boolean(), server_default="false", nullable=False),
        sa.Column("pending_balance", sa.Numeric(12, 6), server_default="0", nullable=False),
        sa.Column("paid_balance", sa.Numeric(12, 6), server_default="0", nullable=False),
        sa.Column("hourly_cap_cents", sa.Integer(), server_default="50", nullable=False),
        sa.Column("daily_cap_cents", sa.Integer(), server_default="500", nullable=False),
        sa.Column("blocked", sa.Boolean(), server_default="false", nullable=False),
        sa.Column(
            "created_at",
            sa.TIMESTAMP(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.TIMESTAMP(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("google_id"),
        sa.UniqueConstraint("email"),
        sa.UniqueConstraint("device_id"),
    )
    op.create_index("ix_developers_email", "developers", ["email"])
    op.create_index("ix_developers_device_id", "developers", ["device_id"])

    # ── advertisers ─────────────────────────────────────────────────────────
    op.create_table(
        "advertisers",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            server_default=sa.text("gen_random_uuid()"),
            nullable=False,
        ),
        sa.Column("email", sa.Text(), nullable=False),
        sa.Column("name", sa.Text(), nullable=True),
        sa.Column("stripe_customer_id", sa.Text(), nullable=True),
        sa.Column(
            "created_at",
            sa.TIMESTAMP(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.TIMESTAMP(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("email"),
    )
    op.create_index("ix_advertisers_email", "advertisers", ["email"])

    # ── campaigns ────────────────────────────────────────────────────────────
    op.create_table(
        "campaigns",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            server_default=sa.text("gen_random_uuid()"),
            nullable=False,
        ),
        sa.Column("advertiser_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("creative_text", sa.Text(), nullable=False),
        sa.Column("destination_url", sa.Text(), nullable=False),
        sa.Column("bid_cpm", sa.Numeric(10, 4), nullable=False),
        sa.Column("click_multiplier", sa.Integer(), server_default="50", nullable=False),
        sa.Column("impressions_purchased", sa.Integer(), nullable=False),
        sa.Column("impressions_served", sa.Integer(), server_default="0", nullable=False),
        sa.Column("clicks_count", sa.Integer(), server_default="0", nullable=False),
        sa.Column("total_spend", sa.Numeric(10, 4), server_default="0", nullable=False),
        sa.Column("status", sa.Text(), server_default="pending_payment", nullable=False),
        sa.Column("stripe_payment_id", sa.Text(), nullable=True),
        sa.Column(
            "created_at",
            sa.TIMESTAMP(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.TIMESTAMP(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["advertiser_id"], ["advertisers.id"], ondelete="RESTRICT"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_campaigns_advertiser_id", "campaigns", ["advertiser_id"])
    op.create_index("ix_campaigns_status", "campaigns", ["status"])

    # ── impressions ──────────────────────────────────────────────────────────
    op.create_table(
        "impressions",
        sa.Column("impression_id", sa.Text(), nullable=False),
        sa.Column("campaign_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("developer_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("surface", sa.Text(), nullable=False),
        sa.Column("duration_ms", sa.Integer(), nullable=False),
        sa.Column("developer_earn", sa.Numeric(10, 6), nullable=False),
        sa.Column("platform_earn", sa.Numeric(10, 6), nullable=False),
        sa.Column("ip_address", postgresql.INET(), nullable=True),
        sa.Column(
            "confirmed_at",
            sa.TIMESTAMP(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["campaign_id"], ["campaigns.id"], ondelete="RESTRICT"),
        sa.ForeignKeyConstraint(["developer_id"], ["developers.id"], ondelete="RESTRICT"),
        sa.PrimaryKeyConstraint("impression_id"),
    )
    op.create_index(
        "ix_impressions_developer_confirmed",
        "impressions",
        ["developer_id", "confirmed_at"],
    )
    op.create_index(
        "ix_impressions_campaign_confirmed",
        "impressions",
        ["campaign_id", "confirmed_at"],
    )

    # ── clicks ───────────────────────────────────────────────────────────────
    op.create_table(
        "clicks",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            server_default=sa.text("gen_random_uuid()"),
            nullable=False,
        ),
        sa.Column("impression_id", sa.Text(), nullable=False),
        sa.Column("campaign_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("developer_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("developer_earn", sa.Numeric(10, 6), nullable=False),
        sa.Column("platform_earn", sa.Numeric(10, 6), nullable=False),
        sa.Column(
            "clicked_at",
            sa.TIMESTAMP(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["campaign_id"], ["campaigns.id"], ondelete="RESTRICT"),
        sa.ForeignKeyConstraint(["developer_id"], ["developers.id"], ondelete="RESTRICT"),
        sa.ForeignKeyConstraint(
            ["impression_id"], ["impressions.impression_id"], ondelete="RESTRICT"
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("impression_id"),
    )
    op.create_index(
        "ix_clicks_developer_clicked", "clicks", ["developer_id", "clicked_at"]
    )

    # ── payouts ──────────────────────────────────────────────────────────────
    op.create_table(
        "payouts",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            server_default=sa.text("gen_random_uuid()"),
            nullable=False,
        ),
        sa.Column("developer_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("amount_cents", sa.Integer(), nullable=False),
        sa.Column("stripe_transfer_id", sa.Text(), nullable=True),
        sa.Column("stripe_payout_id", sa.Text(), nullable=True),
        sa.Column("status", sa.Text(), server_default="pending", nullable=False),
        sa.Column("failure_reason", sa.Text(), nullable=True),
        sa.Column(
            "requested_at",
            sa.TIMESTAMP(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column("completed_at", sa.TIMESTAMP(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["developer_id"], ["developers.id"], ondelete="RESTRICT"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_payouts_developer_id", "payouts", ["developer_id"])
    op.create_index("ix_payouts_status", "payouts", ["status"])


def downgrade() -> None:
    op.drop_table("payouts")
    op.drop_table("clicks")
    op.drop_table("impressions")
    op.drop_table("campaigns")
    op.drop_table("advertisers")
    op.drop_table("developers")
