"""Shared student registration logic (canonical for /auth/register)."""

import secrets

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from ..core.email import email_service
from ..core.security import get_password_hash
from ..models.models import UserPersonal, Student, Registration, Course
from ..schemas.schemas import RegisterRequest, UserRole, RegistrationStatus


async def create_student_registration(db: Session, data: RegisterRequest) -> dict:
    """
    Create inactive student + pending registration and send confirmation email.

    Raises HTTPException on validation or persistence errors.
    """
    if not data.course_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="course_id is required",
        )

    course = (
        db.query(Course)
        .filter(Course.id == data.course_id, Course.is_active.is_(True))
        .first()
    )
    if not course:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Course not found",
        )

    existing_user = db.query(UserPersonal).filter(UserPersonal.email == data.email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered",
        )

    password = data.password or secrets.token_urlsafe(12)
    hashed_password = get_password_hash(password)

    try:
        new_user = UserPersonal(
            first_name=data.first_name,
            last_name=data.last_name,
            email=data.email,
            phone=data.phone,
            password_hash=hashed_password,
            role=UserRole.STUDENT,
            is_active=False,
        )
        db.add(new_user)
        db.flush()

        new_student = Student(
            user_id=new_user.id,
            course_id=data.course_id,
        )
        db.add(new_student)
        db.flush()

        new_registration = Registration(
            student_id=new_student.id,
            course_id=data.course_id,
            status=RegistrationStatus.PENDING,
            message=data.message,
        )
        db.add(new_registration)
        db.flush()

        db.commit()
        db.refresh(new_registration)
    except Exception:
        db.rollback()
        raise

    course_name = course.title.get("en", "Course") if course.title else "Course"
    await email_service.send_registration_received(
        to_email=data.email,
        student_name=f"{data.first_name} {data.last_name}",
        course_name=course_name,
    )

    return {
        "message": "Registration successful. Please wait for admin confirmation.",
        "registration_id": new_registration.id,
    }
