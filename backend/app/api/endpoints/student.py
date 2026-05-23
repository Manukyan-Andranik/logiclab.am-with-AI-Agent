from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy.orm import Session, joinedload
from ...core.database import get_db
from ...core.cloudinary import delete_cloudinary_by_url
from ...core.rate_limit import rate_limit_auth_login
from ...models.models import Student
from ...schemas.schemas import (
    LoginRequest,
    Token,
    StudentDashboardResponse,
    StudentResponse,
    StudentSelfProfileUpdate,
    UserRole,
)
from ..deps import get_current_student
from ..dashboard import build_student_dashboard
from ...services.auth_service import authenticate_and_issue_token

router = APIRouter(prefix="/student", tags=["Student"])

DEPRECATION_HEADER = (
    "POST /api/auth/login with {\"role\": \"student\"} is canonical; "
    "/api/student/login will be removed in a future release."
)


@router.post(
    "/login",
    response_model=Token,
    deprecated=True,
    summary="[Deprecated] Student login — use POST /auth/login with role=student",
)
async def student_login(
    credentials: LoginRequest,
    response: Response,
    db: Session = Depends(get_db),
    _rate_limit: Annotated[None, Depends(rate_limit_auth_login)] = None,
):
    response.headers["Deprecation"] = "true"
    response.headers["Link"] = '</api/auth/login>; rel="successor-version"'
    response.headers["X-API-Warning"] = DEPRECATION_HEADER
    creds = credentials.model_copy(update={"role": UserRole.STUDENT})
    return authenticate_and_issue_token(db, creds, required_role=UserRole.STUDENT)


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

