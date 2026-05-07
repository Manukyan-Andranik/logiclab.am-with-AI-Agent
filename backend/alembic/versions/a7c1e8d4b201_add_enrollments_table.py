"""add enrollments table

Revision ID: a7c1e8d4b201
Revises: 91c3d4e5f6a7
Create Date: 2026-05-08 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a7c1e8d4b201'
down_revision: Union[str, None] = '91c3d4e5f6a7'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


enrollment_status = sa.Enum(
    'PENDING', 'ACTIVE', 'COMPLETED', 'DROPPED',
    name='enrollmentstatus',
)


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)

    # Create the enum type explicitly (PG only — SQLite/MySQL ignore).
    if bind.dialect.name == 'postgresql':
        enrollment_status.create(bind, checkfirst=True)

    if 'enrollments' in inspector.get_table_names():
        return

    op.create_table(
        'enrollments',
        sa.Column('id', sa.Integer(), primary_key=True, index=True),
        sa.Column('student_id', sa.Integer(), sa.ForeignKey('students.id'), nullable=False),
        sa.Column('course_id', sa.Integer(), sa.ForeignKey('courses.id'), nullable=False),
        sa.Column(
            'status',
            enrollment_status if bind.dialect.name == 'postgresql' else sa.String(length=32),
            nullable=True,
            server_default='PENDING',
        ),
        sa.Column('progress', sa.Integer(), nullable=True, server_default='0'),
        sa.Column('enrolled_date', sa.DateTime(), nullable=True, server_default=sa.func.now()),
        sa.Column('completed_date', sa.DateTime(), nullable=True),
        sa.Column('is_completed', sa.Boolean(), nullable=True, server_default=sa.false()),
        sa.Column('certificate_id', sa.Integer(), sa.ForeignKey('certificates.id'), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True, server_default=sa.func.now()),
        sa.Column(
            'updated_at',
            sa.DateTime(),
            nullable=True,
            server_default=sa.func.now(),
        ),
    )
    op.create_index('ix_enrollments_student_id', 'enrollments', ['student_id'])
    op.create_index('ix_enrollments_course_id', 'enrollments', ['course_id'])


def downgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)

    if 'enrollments' in inspector.get_table_names():
        op.drop_index('ix_enrollments_course_id', table_name='enrollments')
        op.drop_index('ix_enrollments_student_id', table_name='enrollments')
        op.drop_table('enrollments')

    if bind.dialect.name == 'postgresql':
        enrollment_status.drop(bind, checkfirst=True)
