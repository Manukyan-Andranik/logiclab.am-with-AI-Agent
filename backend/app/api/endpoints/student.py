from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload
from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta

from ...core.database import get_db
from ...core.security import verify_password, create_access_token
from ...core.config import settings
from ...models.models import (
    Student, UserPersonal, MaterialAccess, Chapter, Course, Lesson
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
        student.user.profile_image = payload["profile_image"] or None

    db.commit()
    db.refresh(student)
    return student

@router.get("/dashboard", response_model=StudentDashboardResponse)
async def get_student_dashboard(
    current_student: Student = Depends(get_current_student),
    db: Session = Depends(get_db)
):
    """Get aggregated dashboard data for student"""
    # Re-query student with joined user to ensure all data is available for serialization
    student = db.query(Student).options(joinedload(Student.user)).filter(Student.id == current_student.id).first()
    
    # Get course
    course = None
    if student.course_id:
        course = db.query(Course).filter(Course.id == student.course_id).first()
    
    # Get materials: only granted chapters/lessons with Material.links
    materials_list = []
    if current_student.course_id:
        # Eager-load both chapter- and lesson-based accesses, along with lesson materials
        material_accesses = db.query(MaterialAccess).options(
            joinedload(MaterialAccess.chapter)
                .joinedload(Chapter.lessons)
                .joinedload(Lesson.materials),
            joinedload(MaterialAccess.lesson)
                .joinedload(Lesson.chapter)
                .joinedload(Chapter.lessons)
                .joinedload(Lesson.materials),
        ).filter(
            MaterialAccess.student_id == current_student.id
        ).all()

        # Build a structure keyed by chapter_id to aggregate granted lessons
        chapters_map: Dict[int, Dict[str, Any]] = {}
        granted_lesson_ids: set[int] = set()

        for access in material_accesses:
            # Case 1: access granted at lesson level
            if access.lesson is not None:
                lesson = access.lesson
                chapter = lesson.chapter
            # Case 2: access granted at chapter level (all lessons in chapter)
            elif access.chapter is not None:
                chapter = access.chapter
                lesson = None
            else:
                continue

            if chapter is None:
                continue

            chapter_entry = chapters_map.setdefault(
                chapter.id,
                {
                    "chapter_id": chapter.id,
                    "chapter_title": chapter.title,
                    "chapter_order": chapter.order_index,
                    "is_accessed": False,
                    "lessons": [],
                    "_lesson_ids": set(),  # internal helper to avoid duplicates
                },
            )

            # Mark chapter as accessed if any related access has accessed_at
            if access.accessed_at is not None:
                chapter_entry["is_accessed"] = True

            # Determine which lessons to expose for this access
            lessons_for_access = []
            if lesson is not None:
                lessons_for_access = [lesson]
            else:
                # Chapter-level access: all lessons in this chapter
                lessons_for_access = sorted(chapter.lessons, key=lambda l: l.order_index)

            for l in lessons_for_access:
                if l.id in chapter_entry["_lesson_ids"]:
                    continue

                # Prefer links from Material table (Lesson.materials), fall back to resource_links if any
                material_links = []
                if getattr(l, "materials", None) is not None:
                    material_links = getattr(l.materials, "links", []) or []
                else:
                    material_links = getattr(l, "resource_links", []) or []

                chapter_entry["lessons"].append(
                    {
                        "lesson_id": l.id,
                        "lesson_title": l.title,
                        "lesson_order": l.order_index,
                        "resource_links": material_links,
                    }
                )
                chapter_entry["_lesson_ids"].add(l.id)
                granted_lesson_ids.add(l.id)

        # Finalize materials_list: sort chapters and strip internal helper keys
        materials_list = sorted(
            chapters_map.values(),
            key=lambda x: x["chapter_order"],
        )
        for ch in materials_list:
            ch["lessons"].sort(key=lambda x: x["lesson_order"])
            ch.pop("_lesson_ids", None)

    # Get progress: percentage of *granted* lessons opened (not whole course)
    progress = None
    if current_student.course_id:
        total_lessons = len(granted_lesson_ids)

        accessed_records = db.query(MaterialAccess).options(
            joinedload(MaterialAccess.chapter).joinedload(Chapter.lessons),
            joinedload(MaterialAccess.lesson),
        ).filter(
            MaterialAccess.student_id == current_student.id,
            MaterialAccess.accessed_at.isnot(None),
        ).all()

        accessed_lesson_ids: set[int] = set()
        for access in accessed_records:
            if access.lesson_id:
                accessed_lesson_ids.add(access.lesson_id)
            elif access.chapter_id and access.chapter:
                for lesson in access.chapter.lessons:
                    accessed_lesson_ids.add(lesson.id)

        accessed_granted = accessed_lesson_ids & granted_lesson_ids
        accessed_lessons_count = len(accessed_granted)
        progress_percentage = (
            (accessed_lessons_count / total_lessons * 100) if total_lessons > 0 else 0
        )

        progress = {
            "total_lessons": total_lessons,
            "accessed_lessons": accessed_lessons_count,
            "percentage": round(progress_percentage, 2),
        }

    return {
        "student": current_student,
        "course": course,
        "progress": progress,
        "materials": materials_list
    }
