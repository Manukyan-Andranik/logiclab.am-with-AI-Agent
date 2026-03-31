"""add order_index to course and prepare for materials relationships

Revision ID: d710a3c0fd29
Revises: 9b52e28de463
Create Date: 2026-03-09 16:04:02.664950

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "d710a3c0fd29"
down_revision: Union[str, None] = "9b52e28de463"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _column_exists(table_name: str, column_name: str) -> bool:
    """Utility to check if a column exists before adding/dropping."""
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    columns = [col["name"] for col in inspector.get_columns(table_name)]
    return column_name in columns


def upgrade() -> None:
    """Upgrade schema."""
    # Safely add order_index to courses if it doesn't exist yet
    if not _column_exists("courses", "order_index"):
        op.add_column("courses", sa.Column("order_index", sa.Integer(), nullable=False))


def downgrade() -> None:
    """Downgrade schema."""
    # Safely drop order_index if present
    if _column_exists("courses", "order_index"):
        op.drop_column("courses", "order_index")
