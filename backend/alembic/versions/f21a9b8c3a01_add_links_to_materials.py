"""Add links column to materials table

Revision ID: f21a9b8c3a01
Revises: e3f4c1ef2b10
Create Date: 2026-03-10

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "f21a9b8c3a01"
down_revision: Union[str, None] = "e3f4c1ef2b10"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _column_exists(table_name: str, column_name: str) -> bool:
    """Utility to check if a column exists before adding/dropping."""
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    columns = [col["name"] for col in inspector.get_columns(table_name)]
    return column_name in columns


def upgrade() -> None:
    """Upgrade schema: ensure materials.links JSON column exists."""
    if not _column_exists("materials", "links"):
        op.add_column(
            "materials",
            sa.Column("links", sa.JSON(), nullable=False, server_default=sa.text("'[]'::jsonb")),
        )


def downgrade() -> None:
    """Downgrade schema: drop materials.links if present."""
    if _column_exists("materials", "links"):
        op.drop_column("materials", "links")

