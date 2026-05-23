# app/api/endpoints/auth.py
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from datetime import datetime, timedelta, timezone
from ...core.database import get_db
from ...core.security import verify_password, get_password_hash
from ...core.config import settings
from ...core.rate_limit import (
    rate_limit_auth_instructor_register,
    rate_limit_auth_login,
    rate_limit_auth_password_reset,
    rate_limit_auth_register,
)
from ...core.email import email_service
from ...models.models import UserPersonal, Instructor, PasswordResetToken
from ...schemas.schemas import (
    LoginRequest,
    Token,
    RegisterRequest,
    UserRole,
    InstructorCreate,
    ChangePasswordRequest,
)
import secrets
from ..deps import get_current_user, get_current_admin
from ...services.auth_service import authenticate_and_issue_token
from ...services.registration_service import create_student_registration

router = APIRouter()


class PasswordResetRequestBody(BaseModel):
    email: str = Field(min_length=3, max_length=255)


class PasswordResetConfirmBody(BaseModel):
    token: str = Field(min_length=16, max_length=255)
    new_password: str = Field(min_length=6, max_length=128)


@router.post("/login", response_model=Token)
async def login(
    credentials: LoginRequest,
    db: Session = Depends(get_db),
    _rate_limit: Annotated[None, Depends(rate_limit_auth_login)] = None,
):
    """
    Canonical login for all roles.

    Pass optional ``role`` (``admin`` | ``student``) to restrict which accounts may sign in.
    """
    required = credentials.role
    return authenticate_and_issue_token(db, credentials, required_role=required)


@router.post("/register", status_code=status.HTTP_201_CREATED)
async def register(
    registration: RegisterRequest,
    db: Session = Depends(get_db),
    _rate_limit: Annotated[None, Depends(rate_limit_auth_register)] = None,
):
    """Canonical public student registration."""
    return await create_student_registration(db, registration)


@router.post("/admin/create-admin")
async def create_admin(
    email: str,
    password: str,
    first_name: str,
    last_name: str,
    db: Session = Depends(get_db),
    current_admin: UserPersonal = Depends(get_current_admin),
):
    """Create a new admin user. Only existing admins may call this."""
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


@router.post("/instructor/register")
async def create_instructor(
    data: InstructorCreate,
    db: Session = Depends(get_db),
    _rate_limit: Annotated[None, Depends(rate_limit_auth_instructor_register)] = None,
):
    """Public instructor registration (no auth)."""
    existing_user = db.query(UserPersonal).filter(
        UserPersonal.email == data.email
    ).first()

    if existing_user:
        raise HTTPException(
            status_code=400,
            detail="Email already registered"
        )

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
async def password_reset_request(
    body: PasswordResetRequestBody,
    db: Session = Depends(get_db),
    _rate_limit: Annotated[None, Depends(rate_limit_auth_password_reset)] = None,
):
    """Request password reset — always returns same message (no email enumeration)."""
    generic = {"message": "If the email exists, a reset link has been sent"}
    user = db.query(UserPersonal).filter(UserPersonal.email == body.email).first()
    if not user:
        return generic

    now = datetime.now(timezone.utc)
    db.query(PasswordResetToken).filter(
        PasswordResetToken.user_id == user.id,
        PasswordResetToken.is_used.is_(False),
    ).update({"is_used": True}, synchronize_session=False)

    reset_token = secrets.token_urlsafe(32)
    expires_at = now + timedelta(hours=1)
    db.add(
        PasswordResetToken(
            user_id=user.id,
            token=reset_token,
            expires_at=expires_at.replace(tzinfo=None),
        )
    )
    db.commit()

    display_name = f"{user.first_name or ''} {user.last_name or ''}".strip() or user.email
    reset_link = f"{settings.FRONTEND_URL}/reset-password?token={reset_token}"
    await email_service.send_password_reset_email(user.email, display_name, reset_link)

    return generic


@router.post("/password-reset-confirm")
async def password_reset_confirm(
    body: PasswordResetConfirmBody,
    db: Session = Depends(get_db),
    _rate_limit: Annotated[None, Depends(rate_limit_auth_password_reset)] = None,
):
    """Set new password using a valid reset token."""
    row = (
        db.query(PasswordResetToken)
        .filter(
            PasswordResetToken.token == body.token,
            PasswordResetToken.is_used.is_(False),
        )
        .first()
    )
    if not row:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired reset link",
        )

    expires = row.expires_at
    if expires.tzinfo is None:
        expires = expires.replace(tzinfo=timezone.utc)
    if expires < datetime.now(timezone.utc):
        row.is_used = True
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired reset link",
        )

    user = db.query(UserPersonal).filter(UserPersonal.id == row.user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid reset link")

    user.password_hash = get_password_hash(body.new_password)
    row.is_used = True
    db.commit()

    return {"message": "Password updated successfully"}


@router.post("/change-password")
async def change_password(
    body: ChangePasswordRequest,
    current_user: UserPersonal = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Change password for the authenticated user (JSON body)."""
    if not verify_password(body.current_password, current_user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Incorrect current password",
        )

    current_user.password_hash = get_password_hash(body.new_password)
    db.commit()

    return {"message": "Password changed successfully"}
