# models.py
from sqlalchemy import Column, Integer, String, Boolean, DateTime, Float, ForeignKey, Text, JSON, Enum as SQLEnum
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship
from datetime import datetime
import enum

Base = declarative_base()

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
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    student = relationship("Student", back_populates="user", uselist=False)
    instructor = relationship("Instructor", back_populates="user", uselist=False)


class Student(Base):
    __tablename__ = "students"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("user_personal.id", ondelete="CASCADE"), unique=True)
    course_id = Column(Integer, ForeignKey("courses.id"), nullable=True)
    last_chapter_id = Column(Integer, ForeignKey("chapters.id"), nullable=True)
    last_lesson_id = Column(Integer, ForeignKey("lessons.id"), nullable=True)
    status = Column(SQLEnum(RegistrationStatus), default=RegistrationStatus.PENDING)

    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    user = relationship("UserPersonal", back_populates="student")
    course = relationship("Course", foreign_keys=[course_id])
    registrations = relationship("Registration", back_populates="student")
    material_access = relationship("MaterialAccess", back_populates="student")
    projects = relationship("Project", back_populates="student")


class Instructor(Base):
    __tablename__ = "instructors"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("user_personal.id", ondelete="CASCADE"), unique=True)
    bio = Column(Text)
    skills = Column(JSON, default=[])  # List of skills
    proficiency = Column(JSON, default=[])  # List of technologies
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
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
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
     
    # Relationships
    instructors = relationship("Instructor", secondary="course_instructors", back_populates="courses")
    chapters = relationship("Chapter", back_populates="course", cascade="all, delete-orphan")
    registrations = relationship("Registration", back_populates="course")
    projects = relationship("Project", back_populates="course")
    
class CourseInstructor(Base):
    __tablename__ = "course_instructors"
    
    id = Column(Integer, primary_key=True, index=True)
    course_id = Column(Integer, ForeignKey("courses.id", ondelete="CASCADE"))
    instructor_id = Column(Integer, ForeignKey("instructors.id", ondelete="CASCADE"))
    created_at = Column(DateTime, default=datetime.utcnow)

class Chapter(Base):
    __tablename__ = "chapters"
    
    id = Column(Integer, primary_key=True, index=True)
    course_id = Column(Integer, ForeignKey("courses.id", ondelete="CASCADE"))
    title = Column(String(255), nullable=False)
    order_index = Column(Integer, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    # Relationships
    course = relationship("Course", back_populates="chapters")
    lessons = relationship("Lesson", back_populates="chapter", cascade="all, delete-orphan")
    materials = relationship("Material", back_populates="chapter")
    material_access = relationship(
        "MaterialAccess",
        back_populates="chapter",
        cascade="all, delete-orphan",
        passive_deletes=True
    )

class Lesson(Base):
    __tablename__ = "lessons"
    
    id = Column(Integer, primary_key=True, index=True)
    chapter_id = Column(Integer, ForeignKey("chapters.id", ondelete="CASCADE"))
    title = Column(String(255), nullable=False)
    order_index = Column(Integer, nullable=False)
    resource_links = Column(JSON, default=[])  # [{name, url}, ...]
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    chapter = relationship("Chapter", back_populates="lessons")
    materials = relationship("Material", back_populates="lesson", uselist=False)

class Material(Base):
    __tablename__ = "materials"
    
    id = Column(Integer, primary_key=True, index=True)
    chapter_id = Column(Integer, ForeignKey("chapters.id", ondelete="CASCADE"), nullable=False)
    lesson_id = Column(Integer, ForeignKey("lessons.id", ondelete="CASCADE"), nullable=False)
    links = Column(JSON, default=[])  # [{name, url}, ...]
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
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
    registration_date = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    student = relationship("Student", back_populates="registrations")
    course = relationship("Course", back_populates="registrations")


class MaterialAccess(Base):
    __tablename__ = "material_access"
    
    id = Column(Integer, primary_key=True, index=True)
    chapter_id = Column(Integer, ForeignKey("chapters.id", ondelete="CASCADE"), nullable=True)
    student_id = Column(Integer, ForeignKey("students.id", ondelete="CASCADE"), nullable=False)
    granted_at = Column(DateTime, default=datetime.utcnow)
    accessed_at = Column(DateTime, nullable=True)
    
    # Relationships
    chapter = relationship("Chapter", back_populates="material_access")
    student = relationship("Student", back_populates="material_access")


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
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
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
    published_date = Column(DateTime, default=datetime.utcnow)  # When story was published
    is_published = Column(Boolean, default=False)  # Admin can control visibility
    created_at = Column(DateTime, default=datetime.utcnow)  # When story was created


class EmailLog(Base):
    __tablename__ = "email_logs"
    
    id = Column(Integer, primary_key=True, index=True)
    recipient_email = Column(String(255), nullable=False)
    subject = Column(String(500), nullable=False)
    body = Column(Text, nullable=False)
    status = Column(String(50), default="sent")  # sent/failed
    sent_at = Column(DateTime, default=datetime.utcnow)
    error_message = Column(Text, nullable=True)

class Visit(Base):
    __tablename__ = "visits"

    id = Column(Integer, primary_key=True, index=True)
    timestamp = Column(DateTime, default=datetime.utcnow)
    ip_address = Column(String(50), nullable=False)
    page_url = Column(String(500), nullable=False)
    user_agent = Column(String(500), nullable=True)
    country = Column(String(100), nullable=True)
    city = Column(String(100), nullable=True)
    referrer = Column(String(500), nullable=True)
    is_bot = Column(Boolean, default=False)

class ContactMessage(Base):
    __tablename__ = "contact_messages"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    email = Column(String(255), nullable=False)
    phone = Column(String(50), nullable=True)
    message = Column(Text, nullable=False)
    is_read = Column(Boolean, default=False)
    is_resolved = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

class Certificate(Base):
    __tablename__ = "certificates"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("students.id"))
    course_id = Column(Integer, ForeignKey("courses.id"))
    certificate_number = Column(String(100), unique=True, nullable=False)
    certificate_url = Column(String(500), nullable=True)
    issued_date = Column(DateTime, default=datetime.utcnow)
    is_verified = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

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
    enrolled_date = Column(DateTime, default=datetime.utcnow)
    completed_date = Column(DateTime, nullable=True)
    is_completed = Column(Boolean, default=False)
    certificate_id = Column(Integer, ForeignKey("certificates.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    student = relationship("Student")
    course = relationship("Course")
    certificate = relationship("Certificate")

class PasswordResetToken(Base):
    __tablename__ = "password_reset_tokens"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("user_personal.id"), nullable=False)
    token = Column(String(255), unique=True, nullable=False)
    expires_at = Column(DateTime, nullable=False)
    is_used = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("UserPersonal")

