# app/api/endpoints/auth.py
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from datetime import timedelta
from ...core.database import get_db
from ...core.security import verify_password, get_password_hash, create_access_token
from ...core.config import settings
from ...core.email import email_service
from ...models.models import UserPersonal, Student, Registration, Course, Instructor
from ...schemas.schemas import (
    LoginRequest, Token, RegisterRequest, UserRole, RegistrationStatus, InstructorCreate
)
import secrets
from ..deps import get_current_user

router = APIRouter()

@router.post("/login", response_model=Token)
async def login(
    credentials: LoginRequest,
    db: Session = Depends(get_db)
):
    """Login endpoint for all user types"""
    user = db.query(UserPersonal).filter(UserPersonal.email == credentials.email).first()
    
    if not user or not verify_password(credentials.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password"
        )
    
    # if not user.is_active:
    #     raise HTTPException(
    #         status_code=status.HTTP_403_FORBIDDEN,
    #         detail="Account is inactive"
    #     )
    
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.email, "role": user.role.value},
        expires_delta=access_token_expires
    )
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "role": user.role
    }

@router.post("/register")
async def register(
    registration: RegisterRequest,
    db: Session = Depends(get_db)
):
    """Public registration endpoint for prospective students"""
    # Check if email already exists
    existing_user = db.query(UserPersonal).filter(
        UserPersonal.email == registration.email
    ).first()
    
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    # Create user account (inactive until admin confirms)
    hashed_password = get_password_hash(registration.password)
    new_user = UserPersonal(
        first_name=registration.first_name,
        last_name=registration.last_name,
        email=registration.email,
        phone=registration.phone,
        password_hash=hashed_password,
        role=UserRole.STUDENT,
        is_active=False  # Will be activated when admin confirms
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    # Create student profile
    new_student = Student(
        user_id=new_user.id,
        course_id=registration.course_id
    )
    db.add(new_student)
    db.commit()
    db.refresh(new_student)
    
    # Create registration record
    new_registration = Registration(
        student_id=new_student.id,
        course_id=registration.course_id,
        status=RegistrationStatus.PENDING,
        message=registration.message
    )
    db.add(new_registration)
    db.commit()
    
    # Send confirmation email
    course = db.query(Course).filter(Course.id == registration.course_id).first()
    course_name = course.title.get("en", "Course") if course else "Course"
    
    await email_service.send_registration_received(
        to_email=registration.email,
        student_name=f"{registration.first_name} {registration.last_name}",
        course_name=course_name
    )
    
    return {
        "message": "Registration successful. Please wait for admin confirmation.",
        "registration_id": new_registration.id
    }

@router.post("/admin/create-admin")
async def create_admin(
    email: str,
    password: str,
    first_name: str,
    last_name: str,
    db: Session = Depends(get_db),
    # current_admin: UserPersonal = Depends(get_current_user) # Protect this endpoint
):
    """Create initial admin user (should be protected in production)"""
    existing = db.query(UserPersonal).filter(UserPersonal.email == email).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Admin already exists"
        )
    
    admin = UserPersonal(
        first_name=first_name,
        last_name=last_name,
        email=email,
        password_hash=get_password_hash(password),
        role=UserRole.ADMIN,
        is_active=True
    )
    db.add(admin)
    db.commit()
    
    return {"message": "Admin user created successfully"}

# create instructor
@router.post("/instructor/register")
async def create_instructor(
    data: InstructorCreate,
    db: Session = Depends(get_db),
):
    """Public registration (no auth)"""

    # 1. Check if email already exists
    existing_user = db.query(UserPersonal).filter(
        UserPersonal.email == data.email
    ).first()

    if existing_user:
        raise HTTPException(
            status_code=400,
            detail="Email already registered"
        )

    # 2. Create inactive user
    user = UserPersonal(
        first_name=data.first_name,
        last_name=data.last_name,
        email=data.email,
        phone=data.phone,
        password_hash=get_password_hash(data.password),
        role=UserRole.INSTRUCTOR,
        is_active=False
    )
    db.add(user)
    db.flush()

    # 3. Create instructor profile
    instructor = Instructor(
        user_id=user.id,
        bio=data.bio,
        skills=data.skills or [],
        proficiency=data.proficiency or [],
        is_active=False
    )
    db.add(instructor)
    db.commit()

    return {
        "message": "Instructor registered successfully",
        "instructor_id": instructor.id
    }

@router.post("/password-reset-request")
async def password_reset_request(email: str, db: Session = Depends(get_db)):
    """Request password reset"""
    user = db.query(UserPersonal).filter(UserPersonal.email == email).first()
    if not user:
        # Don't reveal if email exists
        return {"message": "If the email exists, a reset link has been sent"}
    
    # Generate reset token (implement token storage and expiry)
    reset_token = secrets.token_urlsafe(32)
    # TODO: Store token with expiry in database
    
    # Send email with reset link
    # TODO: Implement email service for password reset
    
    return {"message": "If the email exists, a reset link has been sent"}

@router.post("/change-password")
async def change_password(
    current_password: str,
    new_password: str,
    current_user: UserPersonal = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Change user password"""
    if not verify_password(current_password, current_user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Incorrect current password"
        )
    
    current_user.password_hash = get_password_hash(new_password)
    db.commit()
    
    return {"message": "Password changed successfully"}