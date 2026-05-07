from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import or_
from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta

from ...core.database import get_db
from ...core.cloudinary import delete_cloudinary_by_url
from ...core.security import verify_password, create_access_token
from ...core.config import settings
from ...models.models import (
    Student, UserPersonal, MaterialAccess, Chapter, Course, Lesson, Enrollment
)
from ...schemas.schemas import (
    LoginRequest,
    Token,
    StudentDashboardResponse,
    StudentResponse,
    StudentSelfProfileUpdate,
    UserRole,
)
from ..deps import get_current_student
from ..progress import compute_course_progress
from ..dashboard import build_student_dashboard

router = APIRouter(prefix="/student", tags=["Student"])

@router.post("/login", response_model=Token)
async def student_login(
    credentials: LoginRequest,
    db: Session = Depends(get_db)
):
    """Student-specific login endpoint"""
    user = db.query(UserPersonal).filter(
        UserPersonal.email == credentials.email,
        UserPersonal.role == UserRole.STUDENT
    ).first()
    
    if not user or not verify_password(credentials.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password"
        )
    
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is inactive"
        )
    
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

@router.get("/me", response_model=StudentResponse)
async def get_student_me(
    current_student: Student = Depends(get_current_student),
    db: Session = Depends(get_db),
):
    """Get current student information"""
    return (
        db.query(Student)
        .options(joinedload(Student.user))
        .filter(Student.id == current_student.id)
        .first()
    )


@router.patch("/me/profile", response_model=StudentResponse)
async def update_student_profile(
    data: StudentSelfProfileUpdate,
    current_student: Student = Depends(get_current_student),
    db: Session = Depends(get_db),
):
    """Update the current student's profile (allowed fields only)."""
    student = (
        db.query(Student)
        .options(joinedload(Student.user))
        .filter(Student.id == current_student.id)
        .first()
    )
    if student is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Student not found")

    payload = data.model_dump(exclude_unset=True)
    if "profile_image" in payload:
        old_img = student.user.profile_image
        new_img = payload["profile_image"]
        new_stored = new_img if new_img else None
        if old_img and old_img != new_stored:
            delete_cloudinary_by_url(old_img)
        student.user.profile_image = new_stored

    db.commit()
    db.refresh(student)
    return student

@router.get("/dashboard", response_model=StudentDashboardResponse)
async def get_student_dashboard(
    current_student: Student = Depends(get_current_student),
    db: Session = Depends(get_db)
):
    """Get aggregated dashboard data for student (multi-course)"""
    payload = build_student_dashboard(db, current_student.id)
    if payload["student"] is None:
        return {"student": current_student, "courses": []}
    return payload

