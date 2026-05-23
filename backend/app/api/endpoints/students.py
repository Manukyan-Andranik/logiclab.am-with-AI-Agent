from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload
from typing import List, Optional
from datetime import datetime, timezone
from ...core.database import get_db
from ...models.models import (
    Student, UserPersonal, Registration, MaterialAccess,
    Lesson, Chapter, Course, Material
)

from ...schemas.schemas import StudentResponse, StudentUpdate, UserRole
from ..deps import get_current_admin, get_current_student, get_current_user

router = APIRouter()

@router.get("/{student_id}", response_model=StudentResponse)
async def get_student_info(
    student_id: int,
    db: Session = Depends(get_db),
    current_user: UserPersonal = Depends(get_current_user),
):
    """Get student profile (admin: any student; student: own profile only)."""
    if current_user.role == UserRole.ADMIN:
        pass
    elif current_user.role == UserRole.STUDENT:
        own = db.query(Student).filter(Student.user_id == current_user.id).first()
        if not own or own.id != student_id:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Student not found",
            )
    else:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions",
        )

    student = db.query(Student).options(
        joinedload(Student.user),
        joinedload(Student.course)
    ).filter(Student.id == student_id).first()

    if not student:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Student not found")

    return student

@router.get("/me", response_model=StudentResponse)
async def get_current_student_info(
    current_student: Student = Depends(get_current_student),
    db: Session = Depends(get_db)
):
    """Get current student's information"""
    student = db.query(Student).options(
        joinedload(Student.user),
        joinedload(Student.course)
    ).filter(Student.id == current_student.id).first()
    
    return student

@router.get("/me/materials")
async def get_my_materials(
    current_student: Student = Depends(get_current_student),
    db: Session = Depends(get_db)
):
    """Get materials (chapters + lessons) accessible to current student"""
    if not current_student.course_id:
        return {
            "message": "No course assigned yet",
            "materials": []
        }
    
    # Get all lessons this student has access to
    accesses = db.query(MaterialAccess).filter(
        MaterialAccess.student_id == current_student.id,
        MaterialAccess.lesson_id.isnot(None)
    ).all()
    
    allowed_lesson_ids = [a.lesson_id for a in accesses]
    
    # Get chapters for the course
    chapters = db.query(Chapter).options(
        joinedload(Chapter.lessons).joinedload(Lesson.materials)
    ).filter(
        Chapter.course_id == current_student.course_id
    ).order_by(Chapter.order_index).all()
    
    materials_list = []
    
    for chapter in chapters:
        visible_lessons = []
        for lesson in sorted(chapter.lessons, key=lambda l: l.order_index):
            if lesson.id in allowed_lesson_ids:
                # Prefer links from Material table, fallback to lesson.resource_links
                material_links = []
                if lesson.materials:
                    material_links = lesson.materials.links
                else:
                    material_links = lesson.resource_links or []
                
                visible_lessons.append({
                    "lesson_id": lesson.id,
                    "lesson_title": lesson.title,
                    "lesson_description": getattr(lesson, "description", ""),
                    "lesson_order": lesson.order_index,
                    "resource_links": material_links,
                })
        
        if visible_lessons:
            materials_list.append({
                "chapter_id": chapter.id,
                "chapter_title": chapter.title,
                "chapter_order": chapter.order_index,
                "lessons": visible_lessons
            })
    
    return {
        "student_id": current_student.id,
        "course_id": current_student.course_id,
        "materials": materials_list
    }

@router.get("/me/progress")
async def get_my_progress(
    current_student: Student = Depends(get_current_student),
    db: Session = Depends(get_db)
):
    """Get current student's progress (based on lessons)"""
    if not current_student.course_id:
        return {
            "message": "No course assigned yet",
            "progress": None
        }
    
    material_accesses = db.query(MaterialAccess).options(
        joinedload(MaterialAccess.chapter).joinedload(Chapter.lessons),
        joinedload(MaterialAccess.lesson).joinedload(Lesson.chapter).joinedload(Chapter.lessons),
    ).filter(MaterialAccess.student_id == current_student.id).all()

    granted_lesson_ids = set()
    for access in material_accesses:
        if access.lesson is not None:
            chapter = access.lesson.chapter
            lessons_for_access = [access.lesson]
        elif access.chapter is not None:
            chapter = access.chapter
            lessons_for_access = sorted(chapter.lessons, key=lambda l: l.order_index)
        else:
            continue
        if chapter is None:
            continue
        for l in lessons_for_access:
            granted_lesson_ids.add(l.id)

    total_lessons = len(granted_lesson_ids)

    accessed_records = db.query(MaterialAccess).options(
        joinedload(MaterialAccess.chapter).joinedload(Chapter.lessons),
        joinedload(MaterialAccess.lesson),
    ).filter(
        MaterialAccess.student_id == current_student.id,
        MaterialAccess.accessed_at.isnot(None),
    ).all()

    accessed_lesson_ids = set()
    for access in accessed_records:
        if access.lesson_id:
            accessed_lesson_ids.add(access.lesson_id)
        elif access.chapter_id and access.chapter:
            for lesson in access.chapter.lessons:
                accessed_lesson_ids.add(lesson.id)

    accessed_lessons_count = len(accessed_lesson_ids & granted_lesson_ids)
    progress_percentage = (
        (accessed_lessons_count / total_lessons * 100) if total_lessons > 0 else 0
    )
    
    return {
        "student_id": current_student.id,
        "course_id": current_student.course_id,
        "total_lessons": total_lessons,
        "accessed_lessons": accessed_lessons_count,
        "progress_percentage": round(progress_percentage, 2),
        "last_chapter_id": current_student.last_chapter_id,
        "last_lesson_id": current_student.last_lesson_id
    }

@router.post("/me/materials/chapters/{chapter_id}/mark-accessed")
async def mark_chapter_accessed(
    chapter_id: int,
    current_student: Student = Depends(get_current_student),
    db: Session = Depends(get_db)
):
    """Student marks a chapter as accessed (all lesson- and chapter-level rows for that chapter)."""
    accesses = (
        db.query(MaterialAccess)
        .filter(
            MaterialAccess.student_id == current_student.id,
            MaterialAccess.chapter_id == chapter_id,
        )
        .all()
    )

    if not accesses:
        raise HTTPException(status_code=403, detail="Access denied to this chapter")

    now = datetime.now(timezone.utc)
    for access in accesses:
        if access.accessed_at is None:
            access.accessed_at = now

    # Auto-update student's current position to this chapter
    student = db.query(Student).filter(Student.id == current_student.id).first()
    if student:
        student.last_chapter_id = chapter_id
        first_lesson = (
            db.query(Lesson)
            .filter(Lesson.chapter_id == chapter_id)
            .order_by(Lesson.order_index)
            .first()
        )
        if first_lesson:
            student.last_lesson_id = first_lesson.id

    db.commit()
    for access in accesses:
        db.refresh(access)

    from ..progress import invalidate_progress_cache
    invalidate_progress_cache(current_student.id)

    return {
        "message": "Chapter marked as accessed",
        "accessed_at": max(a.accessed_at for a in accesses if a.accessed_at),
    }
