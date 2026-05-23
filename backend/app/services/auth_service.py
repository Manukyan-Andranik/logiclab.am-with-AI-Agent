"""Shared authentication helpers for consolidated login endpoints."""

from datetime import timedelta

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from ..core.config import settings
from ..core.security import verify_password, create_access_token
from ..models.models import UserPersonal
from ..schemas.schemas import LoginRequest, UserRole


def authenticate_and_issue_token(
    db: Session,
    credentials: LoginRequest,
    *,
    required_role: UserRole | None = None,
) -> dict:
    """
    Validate credentials and return a JWT payload.

    When required_role is set (e.g. STUDENT), only that role may log in.
    """
    query = db.query(UserPersonal).filter(UserPersonal.email == credentials.email)
    if required_role is not None:
        query = query.filter(UserPersonal.role == required_role)

    user = query.first()

    if not user or not verify_password(credentials.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is inactive",
        )

    if credentials.role is not None and user.role != credentials.role:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
        )

    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.email, "role": user.role.value},
        expires_delta=access_token_expires,
    )

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "role": user.role,
    }
