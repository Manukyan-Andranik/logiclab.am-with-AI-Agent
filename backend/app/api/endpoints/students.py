from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload
from typing import List, Optional
from datetime import datetime
from ...core.database import get_db
from ...models.models import (
    Student, UserPersonal, Registration, MaterialAccess,
    Lesson, Chapter, Course
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
    
    material_accesses = db.query(MaterialAccess).options(
        joinedload(MaterialAccess.chapter).joinedload(Chapter.lessons)
    ).filter(
        MaterialAccess.student_id == current_student.id
    ).all()
    
    materials_by_chapter = {}
    
    for access in material_accesses:
        chapter = access.chapter
        if chapter.id not in materials_by_chapter:
            materials_by_chapter[chapter.id] = {
                "chapter_id": chapter.id,
                "chapter_title": chapter.title,
                "chapter_order": chapter.order_index,
                "granted_at": access.granted_at,
                "accessed_at": access.accessed_at,
                "is_accessed": access.accessed_at is not None,
                "lessons": []
            }
        for lesson in sorted(chapter.lessons, key=lambda l: l.order_index):
            materials_by_chapter[chapter.id]["lessons"].append({
                "lesson_id": lesson.id,
                "lesson_title": lesson.title,
                "lesson_description": lesson.description,
                "lesson_order": lesson.order_index,
                "resource_links": lesson.resource_links or [],
            })
    
    materials_list = sorted(
        materials_by_chapter.values(),
        key=lambda x: x["chapter_order"]
    )
    
    for ch in materials_list:
        ch["lessons"].sort(key=lambda x: x["lesson_order"])
    
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
    """Get current student's progress (material = chapter)"""
    if not current_student.course_id:
        return {
            "message": "No course assigned yet",
            "progress": None
        }
    
    total_chapters = db.query(Chapter).filter(
        Chapter.course_id == current_student.course_id
    ).count()
    
    total_lessons = db.query(Lesson).join(Chapter).filter(
        Chapter.course_id == current_student.course_id
    ).count()
    
    accessed_materials = db.query(MaterialAccess).filter(
        MaterialAccess.student_id == current_student.id,
        MaterialAccess.accessed_at.isnot(None)
    ).count()
    
    granted_materials = db.query(MaterialAccess).filter(
        MaterialAccess.student_id == current_student.id
    ).count()
    
    # Progress by chapters (material = chapter)
    progress_percentage = (accessed_materials / total_chapters * 100) if total_chapters > 0 else 0
    
    return {
        "student_id": current_student.id,
        "course_id": current_student.course_id,
        "total_chapters": total_chapters,
        "total_lessons": total_lessons,
        "granted_materials": granted_materials,
        "accessed_materials": accessed_materials,
        "progress_percentage": round(progress_percentage, 2),
        "last_chapter_id": current_student.last_chapter_id,
        "last_lesson_id": current_student.last_lesson_id
    }
