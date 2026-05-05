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
    student = db.query(Student).options(joinedload(Student.user)).filter(Student.id == current_student.id).first()

    # Collect all Enrollment records for this student
    enrollments = db.query(Enrollment).options(
        joinedload(Enrollment.course)
    ).filter(Enrollment.student_id == current_student.id).all()

    enrolled_course_map: Dict[int, Any] = {e.course_id: e for e in enrollments}

    # Backward-compat fallback: student.course_id set but no Enrollment record
    if student.course_id and student.course_id not in enrolled_course_map:
        legacy_course = db.query(Course).filter(Course.id == student.course_id).first()
        if legacy_course:
            enrolled_course_map[student.course_id] = None  # None = legacy, no Enrollment record

    courses_data = []

    for course_id, enrollment in enrolled_course_map.items():
        course = enrollment.course if enrollment is not None else db.query(Course).filter(Course.id == course_id).first()
        if course is None:
            continue

        # Collect IDs for filtering MaterialAccess by course
        chapter_ids = [r[0] for r in db.query(Chapter.id).filter(Chapter.course_id == course_id).all()]
        lesson_ids = [r[0] for r in db.query(Lesson.id).join(Chapter).filter(Chapter.course_id == course_id).all()]

        if not chapter_ids:
            courses_data.append({
                "course_id": course_id,
                "course": {"id": course.id, "title": course.title, "slug": course.slug, "icon_url": course.icon_url, "duration_months": course.duration_months},
                "enrollment_id": enrollment.id if enrollment else None,
                "enrollment_status": enrollment.status.value if enrollment else "active",
                "progress": {"total_lessons": 0, "total_chapters": 0, "available_lessons": 0, "accessed_lessons": 0, "accessed_chapters": 0, "percentage": 0.0},
                "materials": [],
            })
            continue

        access_filter = []
        if chapter_ids:
            access_filter.append(MaterialAccess.chapter_id.in_(chapter_ids))
        if lesson_ids:
            access_filter.append(MaterialAccess.lesson_id.in_(lesson_ids))
        combined_filter = or_(*access_filter) if len(access_filter) > 1 else access_filter[0]

        material_accesses = db.query(MaterialAccess).options(
            joinedload(MaterialAccess.chapter).joinedload(Chapter.lessons).joinedload(Lesson.materials),
            joinedload(MaterialAccess.lesson).joinedload(Lesson.chapter).joinedload(Chapter.lessons).joinedload(Lesson.materials),
        ).filter(
            MaterialAccess.student_id == current_student.id,
            combined_filter
        ).all()

        chapters_map: Dict[int, Dict[str, Any]] = {}
        granted_lesson_ids: set[int] = set()

        for access in material_accesses:
            if access.lesson is not None:
                lesson = access.lesson
                chapter = lesson.chapter
            elif access.chapter is not None:
                chapter = access.chapter
                lesson = None
            else:
                continue

            if chapter is None or chapter.course_id != course_id:
                continue

            chapter_entry = chapters_map.setdefault(
                chapter.id,
                {"chapter_id": chapter.id, "chapter_title": chapter.title, "chapter_order": chapter.order_index,
                 "is_accessed": False, "lessons": [], "_lesson_ids": set()},
            )

            if access.accessed_at is not None:
                chapter_entry["is_accessed"] = True

            lessons_for_access = [lesson] if lesson is not None else sorted(chapter.lessons, key=lambda l: l.order_index)

            for l in lessons_for_access:
                if l.id in chapter_entry["_lesson_ids"]:
                    continue
                material_links = (getattr(l.materials, "links", []) or []) if getattr(l, "materials", None) else (getattr(l, "resource_links", []) or [])
                chapter_entry["lessons"].append({"lesson_id": l.id, "lesson_title": l.title, "lesson_order": l.order_index, "resource_links": material_links})
                chapter_entry["_lesson_ids"].add(l.id)
                granted_lesson_ids.add(l.id)

        materials_list = sorted(chapters_map.values(), key=lambda x: x["chapter_order"])
        for ch in materials_list:
            ch["lessons"].sort(key=lambda x: x["lesson_order"])
            ch.pop("_lesson_ids", None)

        # Progress
        total_course_lessons = len(lesson_ids)
        total_course_chapters = len(chapter_ids)
        available_lessons_count = len(granted_lesson_ids)

        accessed_records = db.query(MaterialAccess).options(
            joinedload(MaterialAccess.chapter).joinedload(Chapter.lessons),
            joinedload(MaterialAccess.lesson),
        ).filter(
            MaterialAccess.student_id == current_student.id,
            MaterialAccess.accessed_at.isnot(None),
            combined_filter
        ).all()

        accessed_lesson_ids: set[int] = set()
        accessed_chapter_ids: set[int] = set()
        for access in accessed_records:
            if access.chapter_id:
                accessed_chapter_ids.add(access.chapter_id)
            if access.lesson_id:
                accessed_lesson_ids.add(access.lesson_id)
                if access.lesson:
                    accessed_chapter_ids.add(access.lesson.chapter_id)
            elif access.chapter_id and access.chapter:
                for lesson in access.chapter.lessons:
                    accessed_lesson_ids.add(lesson.id)

        accessed_lessons_count = len(accessed_lesson_ids & granted_lesson_ids)
        progress_percentage = (accessed_lessons_count / total_course_lessons * 100) if total_course_lessons > 0 else 0

        courses_data.append({
            "course_id": course_id,
            "course": {"id": course.id, "title": course.title, "slug": course.slug, "icon_url": course.icon_url, "duration_months": course.duration_months},
            "enrollment_id": enrollment.id if enrollment else None,
            "enrollment_status": enrollment.status.value if enrollment else "active",
            "progress": {
                "total_lessons": total_course_lessons,
                "total_chapters": total_course_chapters,
                "available_lessons": available_lessons_count,
                "accessed_lessons": accessed_lessons_count,
                "accessed_chapters": len(accessed_chapter_ids),
                "percentage": round(progress_percentage, 2),
            },
            "materials": materials_list,
        })

    return {"student": current_student, "courses": courses_data}
