"""Fix materials table: ensure lesson_id and chapter_id exist

Revision ID: e3f4c1ef2b10
Revises: d710a3c0fd29
Create Date: 2026-03-10

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "e3f4c1ef2b10"
down_revision: Union[str, None] = "d710a3c0fd29"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _column_exists(table_name: str, column_name: str) -> bool:
  """Utility to check if a column exists before adding/dropping."""
  bind = op.get_bind()
  inspector = sa.inspect(bind)
  columns = [col["name"] for col in inspector.get_columns(table_name)]
  return column_name in columns


def upgrade() -> None:
  """Upgrade schema: ensure materials.lesson_id and materials.chapter_id exist and are linked."""
  # Ensure lesson_id column & FK exist
  if not _column_exists("materials", "lesson_id"):
    op.add_column(
      "materials",
      sa.Column("lesson_id", sa.Integer(), nullable=True),
    )
    op.create_foreign_key(
      "fk_materials_lesson_id_lessons",
      "materials",
      "lessons",
      ["lesson_id"],
      ["id"],
      ondelete="CASCADE",
    )

  # Ensure chapter_id column & FK exist
  if not _column_exists("materials", "chapter_id"):
    op.add_column(
      "materials",
      sa.Column("chapter_id", sa.Integer(), nullable=True),
    )
    op.create_foreign_key(
      "fk_materials_chapter_id_chapters",
      "materials",
      "chapters",
      ["chapter_id"],
      ["id"],
      ondelete="CASCADE",
    )

    # Best-effort backfill: derive chapter_id from lessons if lesson_id is present
    op.execute(
      """
      UPDATE materials AS m
      SET chapter_id = l.chapter_id
      FROM lessons AS l
      WHERE m.lesson_id = l.id
        AND m.chapter_id IS NULL
      """
    )


def downgrade() -> None:
  """Downgrade schema: drop chapter_id and lesson_id from materials if present."""
  bind = op.get_bind()
  inspector = sa.inspect(bind)
  fks = {fk["name"]: fk for fk in inspector.get_foreign_keys("materials")}

  # Drop chapter FK/column if we created it
  if "fk_materials_chapter_id_chapters" in fks and _column_exists("materials", "chapter_id"):
    op.drop_constraint("fk_materials_chapter_id_chapters", "materials", type_="foreignkey")
    op.drop_column("materials", "chapter_id")

  # Drop lesson FK/column if it exists (only if you want full rollback)
  if "fk_materials_lesson_id_lessons" in fks and _column_exists("materials", "lesson_id"):
    op.drop_constraint("fk_materials_lesson_id_lessons", "materials", type_="foreignkey")
    op.drop_column("materials", "lesson_id")

