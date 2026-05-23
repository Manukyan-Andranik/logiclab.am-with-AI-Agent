"""
Legacy registration alias — use POST /auth/register instead.

Kept for backward compatibility with older clients; delegates to the same service.
"""

from typing import Annotated

from fastapi import APIRouter, Depends, Response, status
from sqlalchemy.orm import Session

from ...core.database import get_db
from ...core.rate_limit import rate_limit_auth_register
from ...schemas.schemas import RegisterRequest
from ...services.registration_service import create_student_registration

router = APIRouter()

DEPRECATION_HEADER = (
    "POST /api/auth/register is the canonical registration endpoint; "
    "/api/registrations/public will be removed in a future release."
)


@router.post(
    "/public",
    status_code=status.HTTP_201_CREATED,
    deprecated=True,
    summary="[Deprecated] Public registration — use POST /auth/register",
)
async def public_create_registration(
    data: RegisterRequest,
    response: Response,
    db: Session = Depends(get_db),
    _rate_limit: Annotated[None, Depends(rate_limit_auth_register)] = None,
):
    response.headers["Deprecation"] = "true"
    response.headers["Link"] = '</api/auth/register>; rel="successor-version"'
    response.headers["X-API-Warning"] = DEPRECATION_HEADER
    return await create_student_registration(db, data)
