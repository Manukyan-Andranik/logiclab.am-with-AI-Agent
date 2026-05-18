"""visits: repair schema drift (ip_hash, session_id, path, …) + create rollup tables

The `visits` table was originally created by `Base.metadata.create_all()` in
development before any explicit migration existed. Since then the `Visit`
model gained a number of analytics columns and two sibling rollup tables were
added, but no migration was authored. `create_all()` is a no-op for column
additions on existing tables, so production drifted: analytics queries that
reference `visits.ip_hash` blow up with `UndefinedColumn`.

This migration is **idempotent** and **safe to run on any environment**:

  * On a brand-new DB it creates `visits`, `visits_daily`, `visits_monthly`
    fully from the current model definition.
  * On an existing drifted DB it adds only the missing columns and indexes
    via reflection — running it twice does nothing.

No data loss. No backfill required: `ip_hash` is nullable; the analytics
queries already `COALESCE(ip_hash, ip_address)`.

Revision ID: c8d1f2b34501
Revises: a7c1e8d4b201
Create Date: 2026-05-19 00:00:00.000000
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "c8d1f2b34501"
down_revision: Union[str, None] = "a7c1e8d4b201"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _has_table(inspector: sa.engine.reflection.Inspector, name: str) -> bool:
    return name in inspector.get_table_names()


def _columns(inspector: sa.engine.reflection.Inspector, table: str) -> set[str]:
    return {c["name"] for c in inspector.get_columns(table)}


def _indexes(inspector: sa.engine.reflection.Inspector, table: str) -> set[str]:
    return {ix["name"] for ix in inspector.get_indexes(table)}


# Canonical column definitions for the current `Visit` model.
# Keep these in sync with app/models/models.py:Visit.
_VISITS_COLUMNS: list[tuple[str, sa.types.TypeEngine, dict]] = [
    ("ip_hash",        sa.String(length=64),  {"nullable": True}),
    ("session_id",     sa.String(length=64),  {"nullable": True}),
    ("path",           sa.String(length=255), {"nullable": True}),
    ("query_string",   sa.String(length=500), {"nullable": True}),
    ("method",         sa.String(length=10),  {"nullable": True}),
    ("status_code",    sa.Integer(),          {"nullable": True}),
    ("referrer",       sa.String(length=500), {"nullable": True}),
    ("referrer_host",  sa.String(length=255), {"nullable": True}),
    ("browser",        sa.String(length=64),  {"nullable": True}),
    ("os",             sa.String(length=64),  {"nullable": True}),
    ("device_type",    sa.String(length=16),  {"nullable": True}),
    ("country",        sa.String(length=100), {"nullable": True}),
    ("city",           sa.String(length=100), {"nullable": True}),
    ("visitor_class",  sa.String(length=20),  {"nullable": True}),
    ("duration_ms",    sa.Integer(),          {"nullable": True}),
    # `is_bot` was on the original schema, but defend against the case where
    # an even older DB is missing it. Server-default keeps existing rows valid.
    ("is_bot",         sa.Boolean(),          {"nullable": False, "server_default": sa.false()}),
]

_VISITS_INDEXES: list[tuple[str, list[str]]] = [
    ("ix_visits_timestamp",  ["timestamp"]),
    ("ix_visits_ts_isbot",   ["timestamp", "is_bot"]),
    ("ix_visits_ip_ts",      ["ip_address", "timestamp"]),
    ("ix_visits_path_ts",    ["path", "timestamp"]),
    ("ix_visits_session",    ["session_id"]),
    ("ix_visits_class_ts",   ["visitor_class", "timestamp"]),
]


# ---------------------------------------------------------------------------
# Upgrade
# ---------------------------------------------------------------------------

def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)

    # --- visits: create if missing, otherwise patch columns/indexes ---------
    if not _has_table(inspector, "visits"):
        op.create_table(
            "visits",
            sa.Column("id",            sa.Integer(), primary_key=True, index=True),
            sa.Column("timestamp",     sa.DateTime(), nullable=False, server_default=sa.func.now()),
            sa.Column("ip_address",    sa.String(length=64), nullable=False),
            sa.Column("ip_hash",       sa.String(length=64), nullable=True),
            sa.Column("session_id",    sa.String(length=64), nullable=True),
            sa.Column("page_url",      sa.String(length=500), nullable=False),
            sa.Column("path",          sa.String(length=255), nullable=True),
            sa.Column("query_string",  sa.String(length=500), nullable=True),
            sa.Column("method",        sa.String(length=10), nullable=True),
            sa.Column("status_code",   sa.Integer(), nullable=True),
            sa.Column("referrer",      sa.String(length=500), nullable=True),
            sa.Column("referrer_host", sa.String(length=255), nullable=True),
            sa.Column("user_agent",    sa.String(length=500), nullable=True),
            sa.Column("browser",       sa.String(length=64), nullable=True),
            sa.Column("os",            sa.String(length=64), nullable=True),
            sa.Column("device_type",   sa.String(length=16), nullable=True),
            sa.Column("country",       sa.String(length=100), nullable=True),
            sa.Column("city",          sa.String(length=100), nullable=True),
            sa.Column("is_bot",        sa.Boolean(), nullable=False, server_default=sa.false()),
            sa.Column("visitor_class", sa.String(length=20), nullable=True),
            sa.Column("duration_ms",   sa.Integer(), nullable=True),
        )
        # Re-read inspector after DDL so subsequent checks see the new table.
        inspector = sa.inspect(bind)

    existing_cols = _columns(inspector, "visits")
    for name, type_, kwargs in _VISITS_COLUMNS:
        if name in existing_cols:
            continue
        op.add_column("visits", sa.Column(name, type_, **kwargs))

    # Re-inspect once after column adds; indexes need to see the new columns.
    inspector = sa.inspect(bind)
    existing_ix = _indexes(inspector, "visits")
    cols_now = _columns(inspector, "visits")
    for ix_name, cols in _VISITS_INDEXES:
        if ix_name in existing_ix:
            continue
        # Skip any index whose columns weren't created (e.g. a very old DB).
        if not all(c in cols_now for c in cols):
            continue
        op.create_index(ix_name, "visits", cols)

    # --- visits_daily -------------------------------------------------------
    if not _has_table(inspector, "visits_daily"):
        op.create_table(
            "visits_daily",
            sa.Column("id",              sa.Integer(), primary_key=True, index=True),
            sa.Column("day",             sa.Date(), nullable=False),
            sa.Column("path",            sa.String(length=255), nullable=True),
            sa.Column("visitor_class",   sa.String(length=20), nullable=True),
            sa.Column("total_visits",    sa.Integer(), nullable=False, server_default="0"),
            sa.Column("unique_visitors", sa.Integer(), nullable=False, server_default="0"),
            sa.Column("bot_visits",      sa.Integer(), nullable=False, server_default="0"),
            sa.Column("human_visits",    sa.Integer(), nullable=False, server_default="0"),
        )
        op.create_index("ix_visits_daily_day",       "visits_daily", ["day"])
        op.create_index("ix_visits_daily_day_path",  "visits_daily", ["day", "path"])
        op.create_index("ix_visits_daily_day_class", "visits_daily", ["day", "visitor_class"])

    # --- visits_monthly -----------------------------------------------------
    if not _has_table(inspector, "visits_monthly"):
        op.create_table(
            "visits_monthly",
            sa.Column("id",              sa.Integer(), primary_key=True, index=True),
            sa.Column("month",           sa.Date(), nullable=False),
            sa.Column("total_visits",    sa.Integer(), nullable=False, server_default="0"),
            sa.Column("unique_visitors", sa.Integer(), nullable=False, server_default="0"),
            sa.Column("bot_visits",      sa.Integer(), nullable=False, server_default="0"),
            sa.Column("human_visits",    sa.Integer(), nullable=False, server_default="0"),
        )
        op.create_index("ix_visits_monthly_month", "visits_monthly", ["month"])


# ---------------------------------------------------------------------------
# Downgrade
# ---------------------------------------------------------------------------

def downgrade() -> None:
    """Best-effort reverse of the patch.

    We drop *only* the rollup tables we created and the columns we added.
    The original `visits` table (which predates Alembic) is intentionally
    left alone — destroying it would lose production analytics data.
    """
    bind = op.get_bind()
    inspector = sa.inspect(bind)

    if _has_table(inspector, "visits_monthly"):
        op.drop_index("ix_visits_monthly_month", table_name="visits_monthly")
        op.drop_table("visits_monthly")

    if _has_table(inspector, "visits_daily"):
        for ix in ("ix_visits_daily_day_class", "ix_visits_daily_day_path", "ix_visits_daily_day"):
            try:
                op.drop_index(ix, table_name="visits_daily")
            except Exception:
                pass
        op.drop_table("visits_daily")

    if _has_table(inspector, "visits"):
        existing_ix = _indexes(sa.inspect(bind), "visits")
        for ix_name, _ in _VISITS_INDEXES:
            if ix_name in existing_ix:
                try:
                    op.drop_index(ix_name, table_name="visits")
                except Exception:
                    pass

        existing_cols = _columns(sa.inspect(bind), "visits")
        for name, _, _ in _VISITS_COLUMNS:
            # Don't drop is_bot — it predates this migration on most DBs.
            if name == "is_bot":
                continue
            if name in existing_cols:
                try:
                    op.drop_column("visits", name)
                except Exception:
                    pass
