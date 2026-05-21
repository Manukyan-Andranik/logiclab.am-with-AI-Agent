"""
Add resource_link_index to material_access table

Revision ID: 20260521_resource_link_index
Revises: 91c3d4e5f6a7
Create Date: 2026-05-21 00:00:00.000000
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = '20260521_resource_link_index'
down_revision: Union[str, None] = 'c8d1f2b34501'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade():
    op.add_column('material_access', sa.Column('resource_link_index', sa.Integer(), nullable=True))
    op.create_index('ix_material_access_student_lesson_resource', 'material_access', ['student_id', 'lesson_id', 'resource_link_index'])

def downgrade():
    op.drop_index('ix_material_access_student_lesson_resource', table_name='material_access')
    op.drop_column('material_access', 'resource_link_index')
