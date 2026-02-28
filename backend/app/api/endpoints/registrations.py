from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
import secrets 
from sqlalchemy import or_ 

from ...core.database import get_db
from ...core.email import email_service
from ...core.security import get_password_hash
from ...models.models import (
    Registration, Student, Course, UserPersonal, EmailLog
)
from ...schemas.schemas import (
    RegistrationResponse, RegistrationUpdate, RegistrationStatus, RegisterRequest, UserRole
)


router = APIRouter()

@router.post("/public", status_code=status.HTTP_201_CREATED)
async def public_create_registration(
    data: RegisterRequest,
    db: Session = Depends(get_db),
):
    """
    Public registration (no auth)
    """

    # 1. Check course
    course = db.query(Course).filter(
        Course.id == data.course_id,
        Course.is_active == True
    ).first()

    if not course:
        raise HTTPException(
            status_code=404,
            detail="Course not found"
        )

    # 2. Check if user already exists
    user = db.query(UserPersonal).filter(
        UserPersonal.email == data.email
    ).first()

    if user:
        raise HTTPException(
            status_code=400,
            detail="User with this email already registered"
        )

    # 3. Create inactive user
    user = UserPersonal(
        first_name=data.first_name,
        last_name=data.last_name,
        email=data.email,
        phone=data.phone,
        password_hash=get_password_hash(data.password),
        role=UserRole.STUDENT,
        is_active=False
    )
    db.add(user)
    db.flush()

    # 4. Create student
    student = Student(
        user_id=user.id,
        status=RegistrationStatus.PENDING
    )
    db.add(student)
    db.flush()

    # 5. Create registration
    registration = Registration(
        student_id=student.id,
        course_id=data.course_id,
        message=data.message,
        status=RegistrationStatus.PENDING
    )
    db.add(registration)

    db.commit()

    return {
        "message": "Registration submitted successfully",
        "registration_id": registration.id
    }
