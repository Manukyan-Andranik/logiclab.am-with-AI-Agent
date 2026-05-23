"""
Exam System Models
Complete data model for the examination platform.
Supports tests, attempts, answers, submissions, and audit logs.
"""

from sqlalchemy import Column, Integer, String, Boolean, DateTime, Text, JSON, Float, Numeric, ForeignKey, Enum as SQLEnum, UniqueConstraint, Index
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
import enum

from .models import Base


def _enum_values(enum_cls: type[enum.Enum]) -> list[str]:
    """Persist str-enum .value (e.g. draft), not .name (DRAFT), for PostgreSQL native enums."""
    return [member.value for member in enum_cls]


def _utc_now() -> datetime:
    """Timezone-aware UTC timestamp."""
    return datetime.now(timezone.utc)


class ExamStatus(str, enum.Enum):
    """Exam lifecycle status."""
    DRAFT = "draft"
    ACTIVE = "active"
    INACTIVE = "inactive"
    ARCHIVED = "archived"


class AttemptStatus(str, enum.Enum):
    """Student attempt status."""
    IN_PROGRESS = "in_progress"
    SUBMITTED = "submitted"
    GRADED = "graded"
    ABANDONED = "abandoned"


class GradingStatus(str, enum.Enum):
    """Refined grading lifecycle status."""
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    PARTIALLY_GRADED = "partially_graded"
    COMPLETED = "completed"
    FAILED = "failed"


class QuestionCorrectness(str, enum.Enum):
    """Question-level correctness results."""
    CORRECT = "correct"
    INCORRECT = "incorrect"
    PARTIAL = "partial"
    PENDING_REVIEW = "pending_review"


class IntegritySeverity(str, enum.Enum):
    """Severity levels for anti-cheat flags."""
    INFO = "info"
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class IntegrityFlagType(str, enum.Enum):
    """Categories of suspicious behavior."""
    TAB_SWITCH = "tab_switch"
    RAPID_SUBMISSION = "rapid_submission"
    IMPOSSIBLE_TIME = "impossible_time"
    IP_CHANGE = "ip_change"
    PASTE_DETECTED = "paste_detected"
    MULTIPLE_DEVICES = "multiple_devices"


class QuestionType(str, enum.Enum):
    """Question type categories."""
    MULTIPLE_CHOICE = "multiple_choice"      # Multiple correct answers
    SINGLE_CHOICE = "single_choice"          # One correct answer
    ESSAY = "essay"                          # Long text response
    SHORT_ANSWER = "short_answer"            # Brief text (< 200 chars)
    MATHEMATICAL = "mathematical"            # Math expression
    CODE = "code"                            # Code snippet
    MATCHING = "matching"                    # Match pairs
    TRUE_FALSE = "true_false"                # Boolean


class Exam(Base):
    """
    Main exam/test entity.
    Stores metadata, configuration, and access control.
    """
    __tablename__ = "exams"
    
    id = Column(Integer, primary_key=True, index=True)
    course_id = Column(Integer, ForeignKey("courses.id", ondelete="CASCADE"), nullable=False)
    
    # Metadata
    title = Column(String(500), nullable=False)
    description = Column(Text, nullable=True)
    instructions = Column(Text, nullable=True)
    
    # Timing — start/end set when admin activates; duration defaults to 60 minutes
    start_time = Column(DateTime, nullable=True)
    end_time = Column(DateTime, nullable=True)
    duration_minutes = Column(Integer, nullable=False, default=60)
    
    # Configuration
    status = Column(
        SQLEnum(ExamStatus, name="examstatus", values_callable=_enum_values),
        default=ExamStatus.DRAFT,
    )
    max_attempts = Column(Integer, default=1)
    is_final = Column(Boolean, default=False)              # Is this a course-completing final exam?
    pass_score_percentage = Column(Integer, default=70)    # Percentage needed to pass/graduate
    allow_navigation = Column(Boolean, default=True)       # Can student skip/go back?
    allow_review = Column(Boolean, default=False)          # Can review before submit?
    show_answers_after = Column(Boolean, default=False)    # Show correct answers post-exam?
    randomize_questions = Column(Boolean, default=False)   # Shuffle question order?
    randomize_options = Column(Boolean, default=False)     # Shuffle answer options?
    
    # Access control
    allowed_student_ids = Column(JSON, default=[])         # List of student IDs; empty = all
    access_token = Column(String(128), nullable=True)      # Optional access code
    
    # Exam data (stored as JSON)
    questions = Column(JSON, nullable=False)               # Full exam structure
    
    # Metadata
    total_points = Column(Numeric(10, 2), default=0)       # Sum of all question points
    created_by_user_id = Column(Integer, ForeignKey("user_personal.id"), nullable=True)
    created_at = Column(DateTime, default=_utc_now)
    updated_at = Column(DateTime, default=_utc_now, onupdate=_utc_now)
    
    # Relationships
    course = relationship("Course", back_populates="exams")
    created_by = relationship("UserPersonal", foreign_keys=[created_by_user_id])
    attempts = relationship("ExamAttempt", back_populates="exam", cascade="all, delete-orphan")
    submissions = relationship("ExamSubmission", back_populates="exam", cascade="all, delete-orphan")
    audit_logs = relationship("ExamAuditLog", back_populates="exam", cascade="all, delete-orphan")
    
    __table_args__ = (
        Index("ix_exams_course_id", "course_id"),
        Index("ix_exams_status", "status"),
        Index("ix_exams_start_time", "start_time"),
    )


class ExamAttempt(Base):
    """
    Student's individual exam attempt/session.
    Tracks answer progression and time spent.
    """
    __tablename__ = "exam_attempts"
    
    id = Column(Integer, primary_key=True, index=True)
    exam_id = Column(Integer, ForeignKey("exams.id", ondelete="CASCADE"), nullable=False)
    student_id = Column(Integer, ForeignKey("students.id", ondelete="CASCADE"), nullable=False)
    
    # Attempt tracking
    attempt_number = Column(Integer, default=1)            # 1st, 2nd, 3rd attempt...
    status = Column(
        SQLEnum(AttemptStatus, name="attemptstatus", values_callable=_enum_values),
        default=AttemptStatus.IN_PROGRESS,
    )
    
    # New Grading Fields
    grading_status = Column(
        SQLEnum(GradingStatus, name="gradingstatus", values_callable=_enum_values),
        default=GradingStatus.PENDING,
    )
    grading_version = Column(Integer, default=1)
    requires_manual_review = Column(Boolean, default=False)
    
    # High-precision scores
    auto_score = Column(Numeric(10, 2), nullable=True)
    manual_score = Column(Numeric(10, 2), nullable=True)
    final_score = Column(Numeric(10, 2), nullable=True)
    
    max_points = Column(Numeric(10, 2), nullable=True)
    earned_points = Column(Numeric(10, 2), nullable=True)
    
    # Legacy Score (to be deprecated)
    score = Column(Float, nullable=True)
    max_score = Column(Float, nullable=True)
    
    # Integrity
    integrity_score = Column(Integer, nullable=True)       # 0-100 score
    
    # Audit
    graded_at = Column(DateTime, nullable=True)
    graded_by_id = Column(Integer, ForeignKey("user_personal.id"), nullable=True)
    grading_metadata = Column(JSON, nullable=True)         # Extra grading context
    
    # Timing
    started_at = Column(DateTime, default=_utc_now)
    submitted_at = Column(DateTime, nullable=True)
    time_spent_seconds = Column(Integer, default=0)        # Actual time spent
    
    # Answers storage (JSON map: question_id -> answer_data)
    answers = Column(JSON, default={})                     # {"q1": {...}, "q2": {...}, ...}
    
    # Session data
    ip_address = Column(String(64), nullable=True)
    user_agent = Column(String(500), nullable=True)
    
    created_at = Column(DateTime, default=_utc_now)
    updated_at = Column(DateTime, default=_utc_now, onupdate=_utc_now)
    
    # Relationships
    exam = relationship("Exam", back_populates="attempts")
    student = relationship("Student")
    graded_by = relationship("UserPersonal", foreign_keys=[graded_by_id])
    answers_details = relationship("ExamAnswer", back_populates="attempt", cascade="all, delete-orphan")
    submission = relationship("ExamSubmission", back_populates="attempt", uselist=False)
    grading_history = relationship("ExamGradingHistory", back_populates="attempt", cascade="all, delete-orphan")
    integrity_flags = relationship("ExamIntegrityFlag", back_populates="attempt", cascade="all, delete-orphan")
    
    __table_args__ = (
        UniqueConstraint("exam_id", "student_id", "attempt_number", name="uq_exam_student_attempt"),
        Index("ix_exam_attempts_exam_id", "exam_id"),
        Index("ix_exam_attempts_student_id", "student_id"),
        Index("ix_exam_attempts_status", "status"),
        Index("ix_exam_attempts_grading_status", "grading_status"),
    )


class ExamAnswer(Base):
    """
    Individual answer to a question.
    Immutable once submitted.
    """
    __tablename__ = "exam_answers"
    
    id = Column(Integer, primary_key=True, index=True)
    attempt_id = Column(Integer, ForeignKey("exam_attempts.id", ondelete="CASCADE"), nullable=False)
    question_id = Column(String(64), nullable=False)       # Matches question ID in exam JSON
    
    # Answer data (varies by question type)
    answer_value = Column(JSON, nullable=True)             # Stores: text, selections, code, etc.
    
    # Detailed Grading
    correctness = Column(
        SQLEnum(QuestionCorrectness, name="questioncorrectness", values_callable=_enum_values),
        nullable=True,
    )
    is_manually_graded = Column(Boolean, default=False)
    grader_feedback = Column(Text, nullable=True)
    rubric_result = Column(JSON, nullable=True)            # Rubric criteria results
    grading_details = Column(JSON, nullable=True)          # Step-by-step breakdown
    
    # High-precision scores
    earned_points = Column(Numeric(10, 2), nullable=True)
    max_points = Column(Numeric(10, 2), nullable=False)
    
    # Legacy Grading
    is_correct = Column(Boolean, nullable=True)            # Null = not graded yet
    points_awarded = Column(Float, nullable=True)          # Kept for compatibility
    
    # Timestamps
    answered_at = Column(DateTime, default=_utc_now)
    updated_at = Column(DateTime, default=_utc_now, onupdate=_utc_now)
    
    # Relationships
    attempt = relationship("ExamAttempt", back_populates="answers_details")
    
    __table_args__ = (
        UniqueConstraint("attempt_id", "question_id", name="uq_attempt_question"),
        Index("ix_exam_answers_attempt_id", "attempt_id"),
    )


class ExamGradingHistory(Base):
    """
    Audit log for all grading actions on an attempt.
    Supports rollbacks and regrading transparency.
    """
    __tablename__ = "exam_grading_history"
    
    id = Column(Integer, primary_key=True, index=True)
    attempt_id = Column(Integer, ForeignKey("exam_attempts.id", ondelete="CASCADE"), nullable=False)
    grading_version = Column(Integer, nullable=False)
    
    # Score changes
    previous_score = Column(Numeric(10, 2), nullable=True)
    new_score = Column(Numeric(10, 2), nullable=False)
    
    # Metadata
    changed_by_id = Column(Integer, ForeignKey("user_personal.id"), nullable=True)
    reason = Column(String(500), nullable=True)
    snapshot = Column(JSON, nullable=True)                 # Snapshot of all scores/feedback
    
    created_at = Column(DateTime, default=_utc_now)
    
    # Relationships
    attempt = relationship("ExamAttempt", back_populates="grading_history")
    changed_by = relationship("UserPersonal")


class ExamIntegrityFlag(Base):
    """
    Suspicious activity flags generated by the grading engine.
    Used to calculate overall integrity score.
    """
    __tablename__ = "exam_integrity_flags"
    
    id = Column(Integer, primary_key=True, index=True)
    attempt_id = Column(Integer, ForeignKey("exam_attempts.id", ondelete="CASCADE"), nullable=False)
    
    flag_type = Column(
        SQLEnum(IntegrityFlagType, name="integrityflagtype", values_callable=_enum_values),
        nullable=False,
    )
    severity = Column(
        SQLEnum(IntegritySeverity, name="integrityseverity", values_callable=_enum_values),
        default=IntegritySeverity.LOW,
    )
    
    flag_metadata = Column(JSON, default={})               # Context (e.g., duration of tab switch)
    created_at = Column(DateTime, default=_utc_now)
    
    # Relationships
    attempt = relationship("ExamAttempt", back_populates="integrity_flags")



class ExamSubmission(Base):
    """
    Final submitted exam with generated report/file.
    """
    __tablename__ = "exam_submissions"
    
    id = Column(Integer, primary_key=True, index=True)
    exam_id = Column(Integer, ForeignKey("exams.id", ondelete="CASCADE"), nullable=False)
    attempt_id = Column(Integer, ForeignKey("exam_attempts.id", ondelete="CASCADE"), nullable=False)
    
    # Submission file references
    submission_json_path = Column(String(500), nullable=True)   # File path on storage
    submission_pdf_path = Column(String(500), nullable=True)    # Optional PDF export
    
    # Email tracking
    email_sent = Column(Boolean, default=False)
    email_sent_at = Column(DateTime, nullable=True)
    email_recipient = Column(String(255), nullable=True)
    
    # Metadata
    submitted_at = Column(DateTime, default=_utc_now)
    created_at = Column(DateTime, default=_utc_now)
    
    # Relationships
    exam = relationship("Exam", back_populates="submissions")
    attempt = relationship("ExamAttempt", back_populates="submission")
    
    __table_args__ = (
        UniqueConstraint("attempt_id", name="uq_submission_attempt"),
        Index("ix_exam_submissions_exam_id", "exam_id"),
    )


class ExamAuditLog(Base):
    """
    Audit trail for security and monitoring.
    Logs all exam access, modifications, and suspicious activity.
    """
    __tablename__ = "exam_audit_logs"
    
    id = Column(Integer, primary_key=True, index=True)
    exam_id = Column(Integer, ForeignKey("exams.id", ondelete="CASCADE"), nullable=False)
    
    # Action details
    action = Column(String(64), nullable=False)             # "exam_created", "exam_started", "submission", etc.
    actor_type = Column(String(32), nullable=False)         # "admin", "student", "system"
    actor_id = Column(Integer, nullable=True)               # User ID of actor
    
    # Context
    student_id = Column(Integer, nullable=True)             # If action involves a student
    attempt_id = Column(Integer, nullable=True)             # If action involves an attempt
    details = Column(JSON, default={})                      # Extra metadata
    
    # Security
    ip_address = Column(String(64), nullable=True)
    is_suspicious = Column(Boolean, default=False)          # Flag for review
    
    created_at = Column(DateTime, default=_utc_now)
    
    # Relationships
    exam = relationship("Exam", back_populates="audit_logs")
    
    __table_args__ = (
        Index("ix_exam_audit_logs_exam_id", "exam_id"),
        Index("ix_exam_audit_logs_action", "action"),
        Index("ix_exam_audit_logs_created_at", "created_at"),
    )
