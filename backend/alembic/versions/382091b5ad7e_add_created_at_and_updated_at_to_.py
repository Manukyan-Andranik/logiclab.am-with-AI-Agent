"""add created_at and updated_at to materials

Revision ID: 382091b5ad7e
Revises: f21a9b8c3a01
Create Date: 2026-03-10 20:00:32.273051

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '382091b5ad7e'
down_revision: Union[str, None] = 'f21a9b8c3a01'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade():
    op.add_column('materials', sa.Column('created_at', sa.DateTime(), server_default=sa.func.now()))
    op.add_column('materials', sa.Column('updated_at', sa.DateTime(), server_default=sa.func.now()))

def downgrade():
    op.drop_column('materials', 'created_at')
    op.drop_column('materials', 'updated_at')