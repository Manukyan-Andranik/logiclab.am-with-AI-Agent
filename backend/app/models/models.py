# models.py
from sqlalchemy import Column, Date, Index, Integer, String, Boolean, DateTime, Float, ForeignKey, Text, JSON, Enum as SQLEnum
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
import enum

Base = declarative_base()


def _utc_now() -> datetime:
    """Timezone-aware UTC timestamp.

    Replaces the deprecated ``datetime.utcnow`` (removed direction in Python 3.12+).
    The value is timezone-aware; for ``DateTime`` columns without
    ``timezone=True`` SQLAlchemy will strip the tzinfo at write time, so the
    on-disk format is unchanged and no Alembic migration is required.
    """
    return datetime.now(timezone.utc)

# Enums
class UserRole(str, enum.Enum):
    ADMIN = "admin"
    STUDENT = "student"
    INSTRUCTOR = "instructor"

class RegistrationStatus(str, enum.Enum):
    PENDING = "pending"
    CONFIRMED = "confirmed"
    COMPLETED = "completed"
    REJECTED = "rejected"

class StudentStatus(str, enum.Enum):
    PENDING = "pending"
    CONFIRMED = "confirmed"
    COMPLETED = "completed"
    REJECTED = "rejected"

# Models
class UserPersonal(Base):
    __tablename__ = "user_personal"
    
    id = Column(Integer, primary_key=True, index=True)
    first_name = Column(String(100), nullable=False)
    last_name = Column(String(100), nullable=False)
    email = Column(String(255), unique=True, nullable=False, index=True)
    phone = Column(String(20))
    profile_image = Column(String(500))
    password_hash = Column(String(255), nullable=False)
    role = Column(SQLEnum(UserRole), nullable=False)
    social_links = Column(JSON, default={})  # {linkedin, github, web}
    country = Column(String(100))
    city = Column(String(100))
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=_utc_now)
    updated_at = Column(DateTime, default=_utc_now, onupdate=_utc_now)
    
    # Relationships
    student = relationship("Student", back_populates="user", uselist=False)
    instructor = relationship("Instructor", back_populates="user", uselist=False)


class Student(Base):
    __tablename__ = "students"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("user_personal.id", ondelete="CASCADE"), unique=True)
    course_id = Column(Integer, ForeignKey("courses.id"), nullable=True)
    last_chapter_id = Column(Integer, ForeignKey("chapters.id", ondelete="SET NULL"), nullable=True)
    last_lesson_id = Column(Integer, ForeignKey("lessons.id", ondelete="SET NULL"), nullable=True)
    status = Column(SQLEnum(RegistrationStatus), default=RegistrationStatus.PENDING)

    created_at = Column(DateTime, default=_utc_now)
    
    # Relationships
    user = relationship("UserPersonal", back_populates="student")
    course = relationship("Course", foreign_keys=[course_id])
    registrations = relationship("Registration", back_populates="student")
    material_access = relationship("MaterialAccess", back_populates="student")
    projects = relationship("Project", back_populates="student")
    exam_attempts = relationship("ExamAttempt", back_populates="student")
    enrollments = relationship(
        "Enrollment",
        back_populates="student",
        cascade="all, delete-orphan",
    )


class Instructor(Base):
    __tablename__ = "instructors"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("user_personal.id", ondelete="CASCADE"), unique=True)
    bio = Column(Text)
    skills = Column(JSON, default=[])  # List of skills
    proficiency = Column(JSON, default=[])  # List of technologies
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=_utc_now)
    updated_at = Column(DateTime, default=_utc_now, onupdate=_utc_now)
    
    # Relationships
    user = relationship("UserPersonal", back_populates="instructor")
    courses = relationship("Course", secondary="course_instructors", back_populates="instructors")

class Course(Base):
    __tablename__ = "courses"
    id = Column(Integer, primary_key=True, index=True)
    slug = Column(String(255), unique=True, index=True)
    title = Column(JSON, nullable=False)  # {en, ru, hy}
    description = Column(JSON, nullable=False)  # {en, ru, hy}
    curriculum_url = Column(String(500))
    order_index = Column(Integer, nullable=False, default=0, unique=True)
    # curiculum is a dict, keys is a string values is a string
    curriculum = Column(JSON, default={})
    icon_url = Column(String(500))
    hero_video_url = Column(String(500))
    duration_months = Column(Integer)
    start_date = Column(DateTime)
    schedule = Column(JSON)  # {monday: "8:00 AM - 8:00 PM", ...}
    monthly_payment = Column(Float)
    total_payment = Column(Float)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=_utc_now)
    updated_at = Column(DateTime, default=_utc_now, onupdate=_utc_now)
     
    # Relationships
    instructors = relationship("Instructor", secondary="course_instructors", back_populates="courses")
    chapters = relationship("Chapter", back_populates="course", cascade="all, delete-orphan")
    registrations = relationship("Registration", back_populates="course")
    projects = relationship("Project", back_populates="course")
    exams = relationship("Exam", back_populates="course", cascade="all, delete-orphan")

class CourseInstructor(Base):
    __tablename__ = "course_instructors"
    
    id = Column(Integer, primary_key=True, index=True)
    course_id = Column(Integer, ForeignKey("courses.id", ondelete="CASCADE"))
    instructor_id = Column(Integer, ForeignKey("instructors.id", ondelete="CASCADE"))
    created_at = Column(DateTime, default=_utc_now)

class Chapter(Base):
    __tablename__ = "chapters"
    
    id = Column(Integer, primary_key=True, index=True)
    course_id = Column(Integer, ForeignKey("courses.id", ondelete="CASCADE"))
    title = Column(String(255), nullable=False)
    order_index = Column(Integer, nullable=False)
    created_at = Column(DateTime, default=_utc_now)
    # Relationships
    course = relationship("Course", back_populates="chapters")
    lessons = relationship("Lesson", back_populates="chapter", cascade="all, delete-orphan", passive_deletes=True)
    materials = relationship("Material", back_populates="chapter", cascade="all, delete-orphan", passive_deletes=True)
    material_access = relationship(
        "MaterialAccess",
        back_populates="chapter",
        cascade="all, delete-orphan",
        passive_deletes=True
    )
    __table_args__ = (
        Index("ix_chapters_course_id", "course_id"),
    )

class Lesson(Base):
    __tablename__ = "lessons"
    
    id = Column(Integer, primary_key=True, index=True)
    chapter_id = Column(Integer, ForeignKey("chapters.id", ondelete="CASCADE"))
    title = Column(String(255), nullable=False)
    order_index = Column(Integer, nullable=False)
    resource_links = Column(JSON, default=[])  # [{name, url}, ...]
    created_at = Column(DateTime, default=_utc_now)
    updated_at = Column(DateTime, default=_utc_now, onupdate=_utc_now)
    
    @property
    def effective_links(self):
        if self.materials:
            return self.materials.links
        return self.resource_links or []

    # Relationships
    chapter = relationship("Chapter", back_populates="lessons")
    materials = relationship("Material", back_populates="lesson", uselist=False, cascade="all, delete-orphan", passive_deletes=True)
    material_access = relationship(
        "MaterialAccess",
        back_populates="lesson",
        cascade="all, delete-orphan",
        passive_deletes=True
    )
    __table_args__ = (
        Index("ix_lessons_chapter_id", "chapter_id"),
    )

class Material(Base):
    __tablename__ = "materials"
    
    id = Column(Integer, primary_key=True, index=True)
    chapter_id = Column(Integer, ForeignKey("chapters.id", ondelete="CASCADE"), nullable=False)
    lesson_id = Column(Integer, ForeignKey("lessons.id", ondelete="CASCADE"), nullable=False)
    links = Column(JSON, default=[])  # [{name, url}, ...]
    created_at = Column(DateTime, default=_utc_now)
    updated_at = Column(DateTime, default=_utc_now, onupdate=_utc_now)
    
    # Relationships
    chapter = relationship("Chapter", back_populates="materials")
    lesson = relationship("Lesson", back_populates="materials")


class Registration(Base):
    __tablename__ = "registrations"
    
    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("students.id"))
    course_id = Column(Integer, ForeignKey("courses.id"))
    status = Column(SQLEnum(RegistrationStatus), default=RegistrationStatus.PENDING)
    message = Column(Text)
    registration_date = Column(DateTime, default=_utc_now)
    updated_at = Column(DateTime, default=_utc_now, onupdate=_utc_now)
    
    # Relationships
    student = relationship("Student", back_populates="registrations")
    course = relationship("Course", back_populates="registrations")


class MaterialAccess(Base):
    __tablename__ = "material_access"
    
    id = Column(Integer, primary_key=True, index=True)
    chapter_id = Column(Integer, ForeignKey("chapters.id", ondelete="CASCADE"), nullable=True)
    lesson_id = Column(Integer, ForeignKey("lessons.id", ondelete="CASCADE"), nullable=True)
    resource_link_index = Column(Integer, nullable=True)  # Index of the resource link in lesson.resource_links
    student_id = Column(Integer, ForeignKey("students.id", ondelete="CASCADE"), nullable=False)
    granted_at = Column(DateTime, default=_utc_now)
    accessed_at = Column(DateTime, nullable=True)
    
    # Relationships
    chapter = relationship("Chapter", back_populates="material_access")
    lesson = relationship("Lesson", back_populates="material_access")
    student = relationship("Student", back_populates="material_access")

    __table_args__ = (
        # Hot paths: progress.py filters by (student_id, chapter_id IN …)
        # and (student_id, lesson_id IN …). Composite indexes turn these
        # from sequential scans into index range scans.
        Index("ix_material_access_student_chapter", "student_id", "chapter_id"),
        Index("ix_material_access_student_lesson", "student_id", "lesson_id"),
        Index("ix_material_access_student_lesson_resource", "student_id", "lesson_id", "resource_link_index"),
    )


class Project(Base):
    __tablename__ = "projects"
    
    id = Column(Integer, primary_key=True, index=True)
    course_id = Column(Integer, ForeignKey("courses.id"))
    student_id = Column(Integer, ForeignKey("students.id"))
    title = Column(JSON, nullable=False)  # {en, ru, hy}
    subtitle = Column(JSON, nullable=True)  # {en, ru, hy}
    description = Column(JSON, nullable=False)  # {en, ru, hy}
    image_urls = Column(JSON, default=[])
    links = Column(JSON, default={})  # {github, web, colab}
    is_featured = Column(Boolean, default=False)
    is_published = Column(Boolean, default=False)
    created_at = Column(DateTime, default=_utc_now)
    updated_at = Column(DateTime, default=_utc_now, onupdate=_utc_now)
    
    # Relationships
    course = relationship("Course", back_populates="projects")
    student = relationship("Student", back_populates="projects")


class DailyLife(Base):
    """
    Daily Life Story model.
    Displays inspiring daily life stories and achievements.
    Used in the "Daily Life" section on the home page.
    """
    __tablename__ = "daily_life"
    
    id = Column(Integer, primary_key=True, index=True)
    title = Column(JSON, nullable=False)  # {en, ru, hy} - Story title
    subtitle = Column(JSON, nullable=True)  # {en, ru, hy} - Story subtitle
    description = Column(JSON, nullable=False)  # {en, ru, hy} - Story description/narrative
    image_urls = Column(JSON, default=[])  # List of image URLs
    video_url = Column(String(500), nullable=True)  # Optional video URL
    published_date = Column(DateTime, default=_utc_now)  # When story was published
    is_published = Column(Boolean, default=False)  # Admin can control visibility
    created_at = Column(DateTime, default=_utc_now)  # When story was created


class EmailLog(Base):
    __tablename__ = "email_logs"
    
    id = Column(Integer, primary_key=True, index=True)
    recipient_email = Column(String(255), nullable=False)
    subject = Column(String(500), nullable=False)
    body = Column(Text, nullable=False)
    status = Column(String(50), default="sent")  # sent/failed
    sent_at = Column(DateTime, default=_utc_now)
    error_message = Column(Text, nullable=True)

class VisitorClass(str, enum.Enum):
    """Three-way visitor classification used across analytics."""
    HUMAN = "human"
    VERIFIED_BOT = "verified_bot"
    SUSPICIOUS_BOT = "suspicious_bot"


class Visit(Base):
    __tablename__ = "visits"

    id = Column(Integer, primary_key=True, index=True)
    timestamp = Column(DateTime, default=_utc_now, nullable=False)

    # Network
    ip_address = Column(String(64), nullable=False)
    ip_hash = Column(String(64), nullable=True)            # SHA-256 of (ip+salt), for unique counting under anonymization
    session_id = Column(String(64), nullable=True)         # rolling hash (ip + UA + day-bucket) for visit grouping

    # Request
    page_url = Column(String(500), nullable=False)
    path = Column(String(255), nullable=True)              # normalized path (query stripped) — primary group-by key
    query_string = Column(String(500), nullable=True)
    method = Column(String(10), nullable=True)
    status_code = Column(Integer, nullable=True)
    referrer = Column(String(500), nullable=True)
    referrer_host = Column(String(255), nullable=True)     # source bucket: "google.com", "(direct)", etc.

    # User-Agent derived
    user_agent = Column(String(500), nullable=True)
    browser = Column(String(64), nullable=True)
    os = Column(String(64), nullable=True)
    device_type = Column(String(16), nullable=True)        # "mobile" | "tablet" | "desktop" | "bot"

    # Geo (filled by an upstream proxy header or a geo provider; nullable)
    country = Column(String(100), nullable=True)
    city = Column(String(100), nullable=True)

    # Classification
    is_bot = Column(Boolean, default=False, nullable=False)              # kept for backwards compat
    visitor_class = Column(String(20), nullable=True)                    # values from VisitorClass

    # Duration / engagement (optional, may be filled by a JS ping)
    duration_ms = Column(Integer, nullable=True)

    __table_args__ = (
        Index("ix_visits_timestamp", "timestamp"),
        Index("ix_visits_ts_isbot", "timestamp", "is_bot"),
        Index("ix_visits_ip_ts", "ip_address", "timestamp"),
        Index("ix_visits_path_ts", "path", "timestamp"),
        Index("ix_visits_session", "session_id"),
        Index("ix_visits_class_ts", "visitor_class", "timestamp"),
    )


class VisitDaily(Base):
    """Pre-aggregated per-day counters.

    Populated by the rollup job. Lets the admin overview render in O(days)
    even when the raw visits table has millions of rows.
    """
    __tablename__ = "visits_daily"

    id = Column(Integer, primary_key=True, index=True)
    day = Column(Date, nullable=False)
    path = Column(String(255), nullable=True)              # NULL = global row for the day
    visitor_class = Column(String(20), nullable=True)      # NULL = all classes
    total_visits = Column(Integer, default=0, nullable=False)
    unique_visitors = Column(Integer, default=0, nullable=False)
    bot_visits = Column(Integer, default=0, nullable=False)
    human_visits = Column(Integer, default=0, nullable=False)

    __table_args__ = (
        Index("ix_visits_daily_day", "day"),
        Index("ix_visits_daily_day_path", "day", "path"),
        Index("ix_visits_daily_day_class", "day", "visitor_class"),
    )


class VisitMonthly(Base):
    """Pre-aggregated per-month counters (built from VisitDaily)."""
    __tablename__ = "visits_monthly"

    id = Column(Integer, primary_key=True, index=True)
    month = Column(Date, nullable=False)                   # first-of-month
    total_visits = Column(Integer, default=0, nullable=False)
    unique_visitors = Column(Integer, default=0, nullable=False)
    bot_visits = Column(Integer, default=0, nullable=False)
    human_visits = Column(Integer, default=0, nullable=False)

    __table_args__ = (
        Index("ix_visits_monthly_month", "month"),
    )

class ContactMessage(Base):
    __tablename__ = "contact_messages"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    email = Column(String(255), nullable=False)
    phone = Column(String(50), nullable=True)
    message = Column(Text, nullable=False)
    is_read = Column(Boolean, default=False)
    is_resolved = Column(Boolean, default=False)
    created_at = Column(DateTime, default=_utc_now)

class Certificate(Base):
    __tablename__ = "certificates"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("students.id"))
    course_id = Column(Integer, ForeignKey("courses.id"))
    certificate_number = Column(String(100), unique=True, nullable=False)
    certificate_url = Column(String(500), nullable=True)
    issued_date = Column(DateTime, default=_utc_now)
    is_verified = Column(Boolean, default=False)
    created_at = Column(DateTime, default=_utc_now)

    # Relationships
    student = relationship("Student")
    course = relationship("Course")

# New Enum for Enrollment Status
class EnrollmentStatus(str, enum.Enum):
    PENDING = "pending"
    ACTIVE = "active"
    COMPLETED = "completed"
    DROPPED = "dropped"

class Enrollment(Base):
    __tablename__ = "enrollments"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("students.id"), nullable=False)
    course_id = Column(Integer, ForeignKey("courses.id"), nullable=False)
    status = Column(SQLEnum(EnrollmentStatus), default=EnrollmentStatus.PENDING)
    progress = Column(Integer, default=0) # Percentage
    enrolled_date = Column(DateTime, default=_utc_now)
    completed_date = Column(DateTime, nullable=True)
    is_completed = Column(Boolean, default=False)
    certificate_id = Column(Integer, ForeignKey("certificates.id"), nullable=True)
    created_at = Column(DateTime, default=_utc_now)
    updated_at = Column(DateTime, default=_utc_now, onupdate=_utc_now)

    # Relationships
    student = relationship("Student", back_populates="enrollments")
    course = relationship("Course")
    certificate = relationship("Certificate")

class PasswordResetToken(Base):
    __tablename__ = "password_reset_tokens"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("user_personal.id"), nullable=False)
    token = Column(String(255), unique=True, nullable=False)
    expires_at = Column(DateTime, nullable=False)
    is_used = Column(Boolean, default=False)
    created_at = Column(DateTime, default=_utc_now)

    user = relationship("UserPersonal")


# Exam system tables (shared Base — see models/exams.py)
from .exams import Exam, ExamAttempt, ExamAnswer, ExamSubmission, ExamAuditLog  # noqa: E402, F401

