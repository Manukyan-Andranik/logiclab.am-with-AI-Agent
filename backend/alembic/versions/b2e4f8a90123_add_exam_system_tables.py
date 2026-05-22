"""add exam system tables

Revision ID: b2e4f8a90123
Revises: 20260521_add_resource_link_index_to_material_access
Create Date: 2026-05-22

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "b2e4f8a90123"
down_revision: Union[str, None] = "20260521_resource_link_index"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "exams",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("course_id", sa.Integer(), nullable=False),
        sa.Column("title", sa.String(length=500), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("instructions", sa.Text(), nullable=True),
        sa.Column("start_time", sa.DateTime(), nullable=False),
        sa.Column("end_time", sa.DateTime(), nullable=False),
        sa.Column("duration_minutes", sa.Integer(), nullable=False),
        sa.Column(
            "status",
            sa.Enum("draft", "active", "inactive", "archived", name="examstatus"),
            nullable=True,
        ),
        sa.Column("max_attempts", sa.Integer(), nullable=True),
        sa.Column("allow_navigation", sa.Boolean(), nullable=True),
        sa.Column("allow_review", sa.Boolean(), nullable=True),
        sa.Column("show_answers_after", sa.Boolean(), nullable=True),
        sa.Column("randomize_questions", sa.Boolean(), nullable=True),
        sa.Column("randomize_options", sa.Boolean(), nullable=True),
        sa.Column("allowed_student_ids", sa.JSON(), nullable=True),
        sa.Column("access_token", sa.String(length=128), nullable=True),
        sa.Column("questions", sa.JSON(), nullable=False),
        sa.Column("total_points", sa.Float(), nullable=True),
        sa.Column("created_by_user_id", sa.Integer(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.Column("updated_at", sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(["course_id"], ["courses.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["created_by_user_id"], ["user_personal.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_exams_course_id", "exams", ["course_id"], unique=False)
    op.create_index("ix_exams_status", "exams", ["status"], unique=False)
    op.create_index("ix_exams_start_time", "exams", ["start_time"], unique=False)

    op.create_table(
        "exam_attempts",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("exam_id", sa.Integer(), nullable=False),
        sa.Column("student_id", sa.Integer(), nullable=False),
        sa.Column("attempt_number", sa.Integer(), nullable=True),
        sa.Column(
            "status",
            sa.Enum("in_progress", "submitted", "graded", "abandoned", name="attemptstatus"),
            nullable=True,
        ),
        sa.Column("started_at", sa.DateTime(), nullable=True),
        sa.Column("submitted_at", sa.DateTime(), nullable=True),
        sa.Column("time_spent_seconds", sa.Integer(), nullable=True),
        sa.Column("answers", sa.JSON(), nullable=True),
        sa.Column("score", sa.Float(), nullable=True),
        sa.Column("max_score", sa.Float(), nullable=True),
        sa.Column("ip_address", sa.String(length=64), nullable=True),
        sa.Column("user_agent", sa.String(length=500), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.Column("updated_at", sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(["exam_id"], ["exams.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["student_id"], ["students.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("exam_id", "student_id", "attempt_number", name="uq_exam_student_attempt"),
    )
    op.create_index("ix_exam_attempts_exam_id", "exam_attempts", ["exam_id"], unique=False)
    op.create_index("ix_exam_attempts_student_id", "exam_attempts", ["student_id"], unique=False)
    op.create_index("ix_exam_attempts_status", "exam_attempts", ["status"], unique=False)

    op.create_table(
        "exam_answers",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("attempt_id", sa.Integer(), nullable=False),
        sa.Column("question_id", sa.String(length=64), nullable=False),
        sa.Column("answer_value", sa.JSON(), nullable=True),
        sa.Column("is_correct", sa.Boolean(), nullable=True),
        sa.Column("points_awarded", sa.Float(), nullable=True),
        sa.Column("max_points", sa.Float(), nullable=False),
        sa.Column("answered_at", sa.DateTime(), nullable=True),
        sa.Column("updated_at", sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(["attempt_id"], ["exam_attempts.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("attempt_id", "question_id", name="uq_attempt_question"),
    )
    op.create_index("ix_exam_answers_attempt_id", "exam_answers", ["attempt_id"], unique=False)

    op.create_table(
        "exam_submissions",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("exam_id", sa.Integer(), nullable=False),
        sa.Column("attempt_id", sa.Integer(), nullable=False),
        sa.Column("submission_json_path", sa.String(length=500), nullable=True),
        sa.Column("submission_pdf_path", sa.String(length=500), nullable=True),
        sa.Column("email_sent", sa.Boolean(), nullable=True),
        sa.Column("email_sent_at", sa.DateTime(), nullable=True),
        sa.Column("email_recipient", sa.String(length=255), nullable=True),
        sa.Column("submitted_at", sa.DateTime(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(["attempt_id"], ["exam_attempts.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["exam_id"], ["exams.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("attempt_id", name="uq_submission_attempt"),
    )
    op.create_index("ix_exam_submissions_exam_id", "exam_submissions", ["exam_id"], unique=False)

    op.create_table(
        "exam_audit_logs",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("exam_id", sa.Integer(), nullable=False),
        sa.Column("action", sa.String(length=64), nullable=False),
        sa.Column("actor_type", sa.String(length=32), nullable=False),
        sa.Column("actor_id", sa.Integer(), nullable=True),
        sa.Column("student_id", sa.Integer(), nullable=True),
        sa.Column("attempt_id", sa.Integer(), nullable=True),
        sa.Column("details", sa.JSON(), nullable=True),
        sa.Column("ip_address", sa.String(length=64), nullable=True),
        sa.Column("is_suspicious", sa.Boolean(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(["exam_id"], ["exams.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_exam_audit_logs_exam_id", "exam_audit_logs", ["exam_id"], unique=False)
    op.create_index("ix_exam_audit_logs_action", "exam_audit_logs", ["action"], unique=False)
    op.create_index("ix_exam_audit_logs_created_at", "exam_audit_logs", ["created_at"], unique=False)


def downgrade() -> None:
    op.drop_index("ix_exam_audit_logs_created_at", table_name="exam_audit_logs")
    op.drop_index("ix_exam_audit_logs_action", table_name="exam_audit_logs")
    op.drop_index("ix_exam_audit_logs_exam_id", table_name="exam_audit_logs")
    op.drop_table("exam_audit_logs")
    op.drop_index("ix_exam_submissions_exam_id", table_name="exam_submissions")
    op.drop_table("exam_submissions")
    op.drop_index("ix_exam_answers_attempt_id", table_name="exam_answers")
    op.drop_table("exam_answers")
    op.drop_index("ix_exam_attempts_status", table_name="exam_attempts")
    op.drop_index("ix_exam_attempts_student_id", table_name="exam_attempts")
    op.drop_index("ix_exam_attempts_exam_id", table_name="exam_attempts")
    op.drop_table("exam_attempts")
    op.drop_index("ix_exams_start_time", table_name="exams")
    op.drop_index("ix_exams_status", table_name="exams")
    op.drop_index("ix_exams_course_id", table_name="exams")
    op.drop_table("exams")
