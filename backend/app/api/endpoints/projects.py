# app/api/endpoints/projects.py
import logging
from pathlib import Path

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, status, File, UploadFile
from pydantic import BaseModel
from sqlalchemy.orm import Session, joinedload
from typing import Any, Dict, List, Optional
from ...core.database import get_db
from ...core.cloudinary import delete_cloudinary_urls, delete_removed_cloudinary_urls
from ...core.email import email_service
from ...models.models import Enrollment, Project, Course, Student, UserPersonal
from ...schemas.schemas import (
    MultilingualText,
    ProjectCreate,
    ProjectUpdate,
    ProjectResponse,
    UserRole,
)
from ..deps import get_current_admin, get_current_student, get_current_user_optional
from ...core.cloudinary import upload_image
from ...core.config import settings
from ...core.image_webp import raster_image_to_webp

logger = logging.getLogger(__name__)
router = APIRouter()


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
_ALLOWED_IMAGE_EXTS = {".jpg", ".jpeg", ".png", ".gif", ".webp", ".heic", ".heif"}


def _multilingual_dict(value: Optional[MultilingualText]) -> Optional[Dict[str, str]]:
    """Drop the multilingual object if all language fields are blank."""
    if value is None:
        return None
    d = value.model_dump()
    if any((d.get(k) or "").strip() for k in ("en", "ru", "hy")):
        return d
    return None


def _upload_project_image_bytes(file: UploadFile, raw: bytes) -> str:
    ext = Path(file.filename or "").suffix.lower()
    if ext and ext not in _ALLOWED_IMAGE_EXTS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Allowed image types: jpg, jpeg, png, gif, webp, heic, heif",
        )
    if len(raw) > settings.MAX_UPLOAD_SIZE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File too large",
        )
    try:
        webp_buf = raster_image_to_webp(raw)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e)) from e
    url = upload_image(webp_buf, folder="projects")
    if not url:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to upload image",
        )
    return url


def _localized(text: Any, prefer: tuple = ("hy", "en", "ru")) -> str:
    """Best-effort pick a human-readable label from a multilingual JSON field."""
    if isinstance(text, dict):
        for lang in prefer:
            v = (text.get(lang) or "").strip()
            if v:
                return v
        for v in text.values():
            if v:
                return str(v).strip()
        return ""
    return str(text or "").strip()


def _project_owner_contact(db: Session, project: Project) -> Optional[tuple[str, str]]:
    """Return (email, first_name) for the student who owns the project, or None.

    Note: we intentionally do NOT filter on UserPersonal.is_active — inactive
    students should still receive their own project's publish notification.
    """
    if not project.student_id:
        return None
    row = (
        db.query(UserPersonal.email, UserPersonal.first_name)
        .join(Student, Student.user_id == UserPersonal.id)
        .filter(Student.id == project.student_id)
        .first()
    )
    if not row or not row.email:
        return None
    return (row.email, row.first_name or "")


class StudentProjectCreate(BaseModel):
    """Student-side payload — student/course are inferred from the auth token
    and the student's enrollments, so they can't impersonate someone else."""
    course_id: int
    title: MultilingualText
    description: MultilingualText
    subtitle: Optional[MultilingualText] = None
    image_urls: Optional[List[str]] = None
    links: Optional[Dict[str, str]] = None

@router.post("/upload-image", response_model=dict)
async def upload_project_image(
    file: UploadFile = File(...),
    current_admin = Depends(get_current_admin)
):
    """Upload an image to Cloudinary as WebP (Admin only)."""
    ext = Path(file.filename or "").suffix.lower()
    if ext not in {".jpg", ".jpeg", ".png", ".gif", ".webp", ".heic", ".heif"}:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Allowed image types: jpg, jpeg, png, gif, webp, heic, heif",
        )
    
    # Reset cursor in case it was read elsewhere (though unlikely here, it's safer)
    await file.seek(0)
    raw = await file.read()
    
    if len(raw) > settings.MAX_UPLOAD_SIZE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File too large",
        )
    try:
        webp_buf = raster_image_to_webp(raw)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e)) from e

    url = upload_image(webp_buf, folder="projects")
    if not url:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to upload image"
        )
    return {"url": url}

@router.get("/", response_model=List[ProjectResponse])
async def get_projects(
    skip: int = 0,
    limit: int = 100,
    course_id: Optional[int] = None,
    is_published: Optional[bool] = None,
    is_featured: Optional[bool] = None,
    db: Session = Depends(get_db),
    current_user: Optional[UserPersonal] = Depends(get_current_user_optional),
):
    """List projects. Public: published only. Admin (Bearer): may include unpublished."""
    query = db.query(Project).options(
        joinedload(Project.student).joinedload(Student.user),
        joinedload(Project.course)
    )
    is_admin = current_user is not None and current_user.role == UserRole.ADMIN
    if not is_admin:
        query = query.filter(Project.is_published == True)
    elif is_published is not None:
        query = query.filter(Project.is_published == is_published)

    if course_id:
        query = query.filter(Project.course_id == course_id)
    
    if is_featured is not None:
        query = query.filter(Project.is_featured == is_featured)
    
    projects = query.order_by(
        Project.is_featured.desc(),
        Project.created_at.desc()
    ).offset(skip).limit(limit).all()
    
    # Apply default image fallbacks
    for project in projects:
        if not project.image_urls:
            project.image_urls = [settings.DEFAULT_PROJECT_IMAGE]
            
    return projects

@router.get("/featured", response_model=List[ProjectResponse])
async def get_featured_projects(
    limit: int = 6,
    db: Session = Depends(get_db)
):
    """Get featured projects for homepage"""
    projects = db.query(Project).options(
        joinedload(Project.student).joinedload(Student.user),
        joinedload(Project.course)
    ).filter(
        Project.is_published == True,
        Project.is_featured == True
    ).order_by(Project.created_at.desc()).limit(limit).all()
    
    # Apply default image fallbacks
    for project in projects:
        if not project.image_urls:
            project.image_urls = [settings.DEFAULT_PROJECT_IMAGE]
            
    return projects

# ---------------------------------------------------------------------------
# STUDENT self-service endpoints
# Declared BEFORE /{project_id} so the literal "/me" path is matched first.
# ---------------------------------------------------------------------------
@router.get("/me", response_model=List[ProjectResponse])
async def list_my_projects(
    db: Session = Depends(get_db),
    current_student: Student = Depends(get_current_student),
):
    """List projects owned by the currently authenticated student."""
    projects = (
        db.query(Project)
        .options(
            joinedload(Project.student).joinedload(Student.user),
            joinedload(Project.course),
        )
        .filter(Project.student_id == current_student.id)
        .order_by(Project.created_at.desc())
        .all()
    )
    for p in projects:
        if not p.image_urls:
            p.image_urls = [settings.DEFAULT_PROJECT_IMAGE]
    return projects


@router.post("/me", response_model=ProjectResponse, status_code=status.HTTP_201_CREATED)
async def create_my_project(
    payload: StudentProjectCreate,
    db: Session = Depends(get_db),
    current_student: Student = Depends(get_current_student),
):
    """Create a project on behalf of the currently authenticated student.

    The project is stored unpublished — an admin must approve and publish it
    via the existing /projects/{id}/toggle-published endpoint.
    """
    # Course must exist AND the student must be enrolled in it (or legacy
    # course_id match) — prevents cross-course submissions.
    course = db.query(Course).filter(Course.id == payload.course_id).first()
    if not course:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Course not found")

    enrolled = (
        db.query(Enrollment.id)
        .filter(
            Enrollment.student_id == current_student.id,
            Enrollment.course_id == payload.course_id,
        )
        .first()
    )
    if not enrolled and current_student.course_id != payload.course_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not enrolled in this course",
        )

    new_project = Project(
        course_id=payload.course_id,
        student_id=current_student.id,
        title=payload.title.model_dump(),
        subtitle=_multilingual_dict(payload.subtitle),
        description=payload.description.model_dump(),
        image_urls=payload.image_urls or [],
        links=payload.links or {},
        is_featured=False,
        is_published=False,
    )
    db.add(new_project)
    db.commit()
    db.refresh(new_project)
    # Eager-load relations for the response_model serializer.
    new_project = (
        db.query(Project)
        .options(
            joinedload(Project.student).joinedload(Student.user),
            joinedload(Project.course),
        )
        .filter(Project.id == new_project.id)
        .first()
    )
    if not new_project.image_urls:
        new_project.image_urls = [settings.DEFAULT_PROJECT_IMAGE]
    return new_project


@router.post("/me/upload-image", response_model=dict)
async def upload_my_project_image(
    file: UploadFile = File(...),
    current_student: Student = Depends(get_current_student),
):
    """Upload a project image (student-authenticated)."""
    await file.seek(0)
    raw = await file.read()
    url = _upload_project_image_bytes(file, raw)
    return {"url": url}


@router.get("/{project_id}", response_model=ProjectResponse)
async def get_project(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: Optional[UserPersonal] = Depends(get_current_user_optional),
):
    """Get single project by ID (unpublished hidden unless admin or owner)."""
    project = db.query(Project).options(
        joinedload(Project.student).joinedload(Student.user),
        joinedload(Project.course)
    ).filter(Project.id == project_id).first()
    
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found"
        )

    if not project.is_published:
        allowed = False
        if current_user is not None:
            if current_user.role == UserRole.ADMIN:
                allowed = True
            elif current_user.role == UserRole.STUDENT:
                own = db.query(Student).filter(Student.user_id == current_user.id).first()
                if own and project.student_id == own.id:
                    allowed = True
        if not allowed:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Project not found",
            )
    
    # Apply default image fallbacks
    if not project.image_urls:
        project.image_urls = [settings.DEFAULT_PROJECT_IMAGE]
        
    return project

@router.post("/", response_model=ProjectResponse, status_code=status.HTTP_201_CREATED)
async def create_project(
    project_data: ProjectCreate,
    db: Session = Depends(get_db),
    current_admin = Depends(get_current_admin)
):
    """Create new project (Admin only)"""
    # Verify course exists
    course = db.query(Course).filter(Course.id == project_data.course_id).first()
    if not course:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Course not found"
        )
    
    # Verify student exists
    student = db.query(Student).filter(Student.id == project_data.student_id).first()
    if not student:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Student not found"
        )
    
    # Normalize subtitle: drop if all language values are empty
    subtitle_value = None
    if project_data.subtitle:
        sub_dict = project_data.subtitle.model_dump()
        if any((sub_dict.get(k) or "").strip() for k in ("en", "ru", "hy")):
            subtitle_value = sub_dict

    # Create project
    new_project = Project(
        course_id=project_data.course_id,
        student_id=project_data.student_id,
        title=project_data.title.model_dump(),
        subtitle=subtitle_value,
        description=project_data.description.model_dump(),
        image_urls=project_data.image_urls or [],
        links=project_data.links or {},
        is_featured=project_data.is_featured,
        is_published=project_data.is_published
    )
    db.add(new_project)
    db.commit()
    db.refresh(new_project)
    
    return new_project

@router.put("/{project_id}", response_model=ProjectResponse)
async def update_project(
    project_id: int,
    project_data: ProjectUpdate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_admin = Depends(get_current_admin)
):
    """Update project (Admin only).

    If this update is the one that publishes the project (False/NULL → True),
    the owner gets a notification email — same as toggle-published.
    """
    project = db.query(Project).filter(Project.id == project_id).first()

    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found"
        )

    was_published = bool(project.is_published)

    update_data = project_data.model_dump(exclude_unset=True)

    if "image_urls" in update_data and update_data["image_urls"] is not None:
        delete_removed_cloudinary_urls(project.image_urls or [], update_data["image_urls"])

    # subtitle is nullable — allow explicit clearing
    if "subtitle" in update_data:
        sub = update_data["subtitle"]
        if isinstance(sub, dict) and not any((sub.get(k) or "").strip() for k in ("en", "ru", "hy")):
            sub = None
        project.subtitle = sub

    for field, value in update_data.items():
        if field == "subtitle":
            continue
        if value is not None:
            setattr(project, field, value)

    db.commit()
    db.refresh(project)

    if project.is_published and not was_published:
        contact = _project_owner_contact(db, project)
        if contact is None:
            logger.warning(
                "project.publish (via update): no email recipient project_id=%s student_id=%s",
                project.id, project.student_id,
            )
        else:
            email, first_name = contact
            title = _localized(project.title) or "Project"
            logger.info(
                "project.publish (via update): queueing notification project_id=%s to=%s",
                project.id, email,
            )
            background_tasks.add_task(
                email_service.send_project_published,
                email, first_name, title, project.id,
            )

    return project

@router.delete("/{project_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_project(
    project_id: int,
    db: Session = Depends(get_db),
    current_admin = Depends(get_current_admin)
):
    """Delete project (Admin only)"""
    project = db.query(Project).filter(Project.id == project_id).first()
    
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found"
        )

    delete_cloudinary_urls(project.image_urls or [])

    db.delete(project)
    db.commit()
    return None

@router.patch("/{project_id}/toggle-published", response_model=ProjectResponse)
async def toggle_project_published(
    project_id: int,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_admin = Depends(get_current_admin)
):
    """Toggle project published status (Admin only).

    On a False → True transition, the project owner gets a notification email
    (sent via BackgroundTasks so the response is not blocked on SMTP).
    """
    prior = db.query(Project.id, Project.is_published).filter(
        Project.id == project_id
    ).first()
    if not prior:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found"
        )
    # NULL-safe: legacy rows can have is_published = NULL (model default only
    # at the Python level). Treat NULL as False so the toggle is deterministic.
    was_published = bool(prior.is_published)
    new_value = not was_published

    db.query(Project).filter(Project.id == project_id).update(
        {Project.is_published: new_value},
        synchronize_session=False,
    )
    db.commit()

    project = db.query(Project).filter(Project.id == project_id).first()

    if new_value and not was_published and project is not None:
        contact = _project_owner_contact(db, project)
        if contact is None:
            logger.warning(
                "project.publish: no email recipient project_id=%s student_id=%s",
                project.id, project.student_id,
            )
        else:
            email, first_name = contact
            title = _localized(project.title) or "Project"
            logger.info(
                "project.publish: queueing notification project_id=%s to=%s",
                project.id, email,
            )
            background_tasks.add_task(
                email_service.send_project_published,
                email, first_name, title, project.id,
            )
    return project

@router.patch("/{project_id}/toggle-featured", response_model=ProjectResponse)
async def toggle_project_featured(
    project_id: int,
    db: Session = Depends(get_db),
    current_admin = Depends(get_current_admin)
):
    """Toggle project featured status (Admin only)"""
    exists = db.query(Project.id).filter(Project.id == project_id).first()
    if not exists:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found"
        )

    db.query(Project).filter(Project.id == project_id).update(
        {Project.is_featured: ~Project.is_featured},
        synchronize_session=False,
    )
    db.commit()

    project = db.query(Project).filter(Project.id == project_id).first()
    return project

@router.get("/by-course/{course_id_or_slug}", response_model=List[ProjectResponse])
async def get_projects_by_course(
    course_id_or_slug: str,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    """Get all published projects for a specific course"""
    query = db.query(Course)
    if course_id_or_slug.isdigit():
        course = query.filter(Course.id == int(course_id_or_slug)).first()
    else:
        course = query.filter(Course.slug == course_id_or_slug).first()
    
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    
    projects = db.query(Project).options(
        joinedload(Project.student).joinedload(Student.user),
        joinedload(Project.course)
    ).filter(
        Project.course_id == course.id,
        Project.is_published == True
    ).order_by(Project.created_at.desc()).offset(skip).limit(limit).all()
    
    return projects

@router.get("/by-student/{student_id}", response_model=List[ProjectResponse])
async def get_projects_by_student(
    student_id: int,
    db: Session = Depends(get_db),
    current_admin = Depends(get_current_admin)
):
    """Get all projects by a specific student (Admin only)"""
    projects = db.query(Project).options(
        joinedload(Project.student).joinedload(Student.user),
        joinedload(Project.course)
    ).filter(
        Project.student_id == student_id
    ).order_by(Project.created_at.desc()).all()
    
    return projects

@router.get("/statistics/overview")
async def get_project_statistics(
    db: Session = Depends(get_db),
    current_admin = Depends(get_current_admin)
):
    """Get project statistics (Admin only)"""
    total = db.query(Project).count()
    published = db.query(Project).filter(Project.is_published == True).count()
    featured = db.query(Project).filter(Project.is_featured == True).count()
    drafts = total - published
    
    # Projects by course
    projects_by_course = db.query(
        Course.id,
        Course.title,
        db.func.count(Project.id).label('count')
    ).join(Project).group_by(Course.id).all()
    
    return {
        "total_projects": total,
        "published": published,
        "drafts": drafts,
        "featured": featured,
        "by_course": [
            {
                "course_id": course_id,
                "course_title": title,
                "project_count": count
            }
            for course_id, title, count in projects_by_course
        ]
    }
