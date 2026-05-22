"""exam nullable window times

Revision ID: c3a8f1d90234
Revises: b2e4f8a90123
Create Date: 2026-05-22

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "c3a8f1d90234"
down_revision: Union[str, None] = "b2e4f8a90123"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.alter_column("exams", "start_time", existing_type=sa.DateTime(), nullable=True)
    op.alter_column("exams", "end_time", existing_type=sa.DateTime(), nullable=True)


def downgrade() -> None:
    op.alter_column("exams", "end_time", existing_type=sa.DateTime(), nullable=False)
    op.alter_column("exams", "start_time", existing_type=sa.DateTime(), nullable=False)
