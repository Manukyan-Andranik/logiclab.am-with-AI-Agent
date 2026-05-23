"""grading engine schema enhancements

Revision ID: d4e5f6a7b801
Revises: c3a8f1d90234
Create Date: 2026-05-23

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "d4e5f6a7b801"
down_revision: Union[str, None] = "c3a8f1d90234"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _pg_enum(name: str, *values: str) -> postgresql.ENUM:
    """PostgreSQL ENUM with create_type=False (caller must .create() first)."""
    return postgresql.ENUM(*values, name=name, create_type=False)


def _create_pg_enums() -> None:
    """Create enum types before ADD COLUMN (PostgreSQL requires type to exist)."""
    bind = op.get_bind()
    for enum in (
        _pg_enum(
            "gradingstatus",
            "pending",
            "in_progress",
            "partially_graded",
            "completed",
            "failed",
        ),
        _pg_enum(
            "questioncorrectness",
            "correct",
            "incorrect",
            "partial",
            "pending_review",
        ),
        _pg_enum(
            "integrityflagtype",
            "tab_switch",
            "rapid_submission",
            "impossible_time",
            "ip_change",
            "paste_detected",
            "multiple_devices",
        ),
        _pg_enum("integrityseverity", "info", "low", "medium", "high", "critical"),
    ):
        enum.create(bind, checkfirst=True)


def _drop_pg_enums() -> None:
    bind = op.get_bind()
    for name in (
        "integrityseverity",
        "integrityflagtype",
        "questioncorrectness",
        "gradingstatus",
    ):
        postgresql.ENUM(name=name).drop(bind, checkfirst=True)


def _column_exists(table: str, column: str) -> bool:
    bind = op.get_bind()
    insp = sa.inspect(bind)
    return column in {c["name"] for c in insp.get_columns(table)}


def _table_exists(table: str) -> bool:
    bind = op.get_bind()
    return table in sa.inspect(bind).get_table_names()


def upgrade() -> None:
    _create_pg_enums()

    gradingstatus = _pg_enum(
        "gradingstatus",
        "pending",
        "in_progress",
        "partially_graded",
        "completed",
        "failed",
    )
    questioncorrectness = _pg_enum(
        "questioncorrectness",
        "correct",
        "incorrect",
        "partial",
        "pending_review",
    )
    integrityflagtype = _pg_enum(
        "integrityflagtype",
        "tab_switch",
        "rapid_submission",
        "impossible_time",
        "ip_change",
        "paste_detected",
        "multiple_devices",
    )
    integrityseverity = _pg_enum(
        "integrityseverity", "info", "low", "medium", "high", "critical"
    )

    # exam_attempts — grading lifecycle
    if not _column_exists("exam_attempts", "grading_status"):
        op.add_column(
            "exam_attempts",
            sa.Column("grading_status", gradingstatus, nullable=True),
        )
    for col_name, col_type in (
        ("grading_version", sa.Integer()),
        ("requires_manual_review", sa.Boolean()),
        ("auto_score", sa.Numeric(10, 2)),
        ("manual_score", sa.Numeric(10, 2)),
        ("final_score", sa.Numeric(10, 2)),
        ("max_points", sa.Numeric(10, 2)),
        ("earned_points", sa.Numeric(10, 2)),
        ("integrity_score", sa.Integer()),
        ("graded_at", sa.DateTime()),
        ("graded_by_id", sa.Integer()),
        ("grading_metadata", sa.JSON()),
    ):
        if not _column_exists("exam_attempts", col_name):
            op.add_column("exam_attempts", sa.Column(col_name, col_type, nullable=True))

    # Set server defaults where needed (separate step for PG compatibility)
    op.execute(
        "ALTER TABLE exam_attempts "
        "ALTER COLUMN grading_version SET DEFAULT 1"
    )
    op.execute(
        "ALTER TABLE exam_attempts "
        "ALTER COLUMN requires_manual_review SET DEFAULT false"
    )

    bind = op.get_bind()
    fk_names = {fk["name"] for fk in sa.inspect(bind).get_foreign_keys("exam_attempts")}
    if "fk_exam_attempts_graded_by" not in fk_names:
        op.create_foreign_key(
            "fk_exam_attempts_graded_by",
            "exam_attempts",
            "user_personal",
            ["graded_by_id"],
            ["id"],
        )

    idx_names = {i["name"] for i in sa.inspect(bind).get_indexes("exam_attempts")}
    if "ix_exam_attempts_grading_status" not in idx_names:
        op.create_index(
            "ix_exam_attempts_grading_status",
            "exam_attempts",
            ["grading_status"],
        )

    # exam_answers — detailed grading
    if not _column_exists("exam_answers", "correctness"):
        op.add_column(
            "exam_answers",
            sa.Column("correctness", questioncorrectness, nullable=True),
        )
    for col_name, col_type in (
        ("is_manually_graded", sa.Boolean()),
        ("grader_feedback", sa.Text()),
        ("rubric_result", sa.JSON()),
        ("grading_details", sa.JSON()),
        ("earned_points", sa.Numeric(10, 2)),
    ):
        if not _column_exists("exam_answers", col_name):
            op.add_column("exam_answers", sa.Column(col_name, col_type, nullable=True))

    op.execute(
        "ALTER TABLE exam_answers "
        "ALTER COLUMN is_manually_graded SET DEFAULT false"
    )

    # Alter max_points to Numeric if still float (Postgres)
    conn = op.get_bind()
    max_pts_col = next(
        (c for c in sa.inspect(conn).get_columns("exam_answers") if c["name"] == "max_points"),
        None,
    )
    if max_pts_col and str(max_pts_col.get("type", "")).lower().find("float") >= 0:
        op.alter_column(
            "exam_answers",
            "max_points",
            existing_type=sa.Float(),
            type_=sa.Numeric(10, 2),
            postgresql_using="max_points::numeric",
        )

    # exams — is_final if missing
    exam_cols = {c["name"] for c in sa.inspect(conn).get_columns("exams")}
    if "is_final" not in exam_cols:
        op.add_column("exams", sa.Column("is_final", sa.Boolean(), server_default=sa.text("false")))
    if "pass_score_percentage" not in exam_cols:
        op.add_column(
            "exams",
            sa.Column("pass_score_percentage", sa.Integer(), server_default=sa.text("70")),
        )

    total_pts_col = next(
        (c for c in sa.inspect(conn).get_columns("exams") if c["name"] == "total_points"),
        None,
    )
    if total_pts_col and str(total_pts_col.get("type", "")).lower().find("float") >= 0:
        op.alter_column(
            "exams",
            "total_points",
            existing_type=sa.Float(),
            type_=sa.Numeric(10, 2),
            postgresql_using="total_points::numeric",
        )

    if not _table_exists("exam_grading_history"):
        op.create_table(
            "exam_grading_history",
            sa.Column("id", sa.Integer(), nullable=False),
            sa.Column("attempt_id", sa.Integer(), nullable=False),
            sa.Column("grading_version", sa.Integer(), nullable=False),
            sa.Column("previous_score", sa.Numeric(10, 2), nullable=True),
            sa.Column("new_score", sa.Numeric(10, 2), nullable=False),
            sa.Column("changed_by_id", sa.Integer(), nullable=True),
            sa.Column("reason", sa.String(length=500), nullable=True),
            sa.Column("snapshot", sa.JSON(), nullable=True),
            sa.Column("created_at", sa.DateTime(), nullable=True),
            sa.ForeignKeyConstraint(
                ["attempt_id"], ["exam_attempts.id"], ondelete="CASCADE"
            ),
            sa.ForeignKeyConstraint(["changed_by_id"], ["user_personal.id"]),
            sa.PrimaryKeyConstraint("id"),
        )

    if not _table_exists("exam_integrity_flags"):
        op.create_table(
            "exam_integrity_flags",
            sa.Column("id", sa.Integer(), nullable=False),
            sa.Column("attempt_id", sa.Integer(), nullable=False),
            sa.Column("flag_type", integrityflagtype, nullable=False),
            sa.Column("severity", integrityseverity, nullable=True),
            sa.Column("flag_metadata", sa.JSON(), nullable=True),
            sa.Column("created_at", sa.DateTime(), nullable=True),
            sa.ForeignKeyConstraint(
                ["attempt_id"], ["exam_attempts.id"], ondelete="CASCADE"
            ),
            sa.PrimaryKeyConstraint("id"),
        )


def downgrade() -> None:
    if _table_exists("exam_integrity_flags"):
        op.drop_table("exam_integrity_flags")
    if _table_exists("exam_grading_history"):
        op.drop_table("exam_grading_history")

    bind = op.get_bind()
    idx_names = {i["name"] for i in sa.inspect(bind).get_indexes("exam_attempts")}
    if "ix_exam_attempts_grading_status" in idx_names:
        op.drop_index("ix_exam_attempts_grading_status", table_name="exam_attempts")

    fk_names = {fk["name"] for fk in sa.inspect(bind).get_foreign_keys("exam_attempts")}
    if "fk_exam_attempts_graded_by" in fk_names:
        op.drop_constraint("fk_exam_attempts_graded_by", "exam_attempts", type_="foreignkey")

    for col in (
        "grading_metadata",
        "graded_by_id",
        "graded_at",
        "integrity_score",
        "earned_points",
        "max_points",
        "final_score",
        "manual_score",
        "auto_score",
        "requires_manual_review",
        "grading_version",
        "grading_status",
    ):
        if _column_exists("exam_attempts", col):
            op.drop_column("exam_attempts", col)

    for col in (
        "earned_points",
        "grading_details",
        "rubric_result",
        "grader_feedback",
        "is_manually_graded",
        "correctness",
    ):
        if _column_exists("exam_answers", col):
            op.drop_column("exam_answers", col)

    _drop_pg_enums()
