from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload
from typing import List, Optional
from datetime import datetime
from ...core.database import get_db
from ...models.models import (
    Student, UserPersonal, Registration, MaterialAccess,
    Lesson, Chapter, Course, Material
)

from ...schemas.schemas import StudentResponse, StudentUpdate, UserRole
from ..deps import get_current_admin, get_current_student

router = APIRouter()

@router.get("/students/{student_id}", response_model=StudentResponse)
async def get_student_info(
    student_id: int,
    db: Session = Depends(get_db)
):
    """Get student's information"""
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
    
    # Total lessons in the course
    total_lessons = db.query(Lesson).join(Chapter).filter(
        Chapter.course_id == current_student.course_id
    ).count()
    
    # Get all granted access records that have been accessed
    accessed_records = db.query(MaterialAccess).options(
        joinedload(MaterialAccess.chapter).joinedload(Chapter.lessons),
        joinedload(MaterialAccess.lesson)
    ).filter(
        MaterialAccess.student_id == current_student.id,
        MaterialAccess.accessed_at.isnot(None)
    ).all()
    
    accessed_lesson_ids = set()
    for access in accessed_records:
        if access.lesson_id:
            accessed_lesson_ids.add(access.lesson_id)
        elif access.chapter_id and access.chapter:
            # If chapter access is marked as accessed, all lessons in it are considered accessed
            for lesson in access.chapter.lessons:
                accessed_lesson_ids.add(lesson.id)
    
    accessed_lessons_count = len(accessed_lesson_ids)
    progress_percentage = (accessed_lessons_count / total_lessons * 100) if total_lessons > 0 else 0
    
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
    """Student marks a chapter as accessed"""
    # Check if student has access to this chapter
    access = db.query(MaterialAccess).filter(
        MaterialAccess.student_id == current_student.id,
        MaterialAccess.chapter_id == chapter_id
    ).first()
    
    if not access:
        raise HTTPException(status_code=403, detail="Access denied to this chapter")
    
    if access.accessed_at is None:
        access.accessed_at = datetime.utcnow()
        db.commit()
        db.refresh(access)
    
    return {"message": "Chapter marked as accessed", "accessed_at": access.accessed_at}
