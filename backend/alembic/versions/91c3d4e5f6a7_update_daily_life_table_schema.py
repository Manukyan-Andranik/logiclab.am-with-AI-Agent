"""update daily_life table schema

Revision ID: 91c3d4e5f6a7
Revises: 382091b5ad7e
Create Date: 2026-04-07 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '91c3d4e5f6a7'
down_revision: Union[str, None] = '382091b5ad7e'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade():
    # Add image_urls column if it doesn't exist
    op.add_column('daily_life', sa.Column('image_urls', sa.JSON(), nullable=True, server_default='[]'))


def downgrade():
    # Remove the columns if rolling back
    op.drop_column('daily_life', 'image_urls')
