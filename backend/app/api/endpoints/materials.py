# app/api/endpoints/materials.py
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import or_
from typing import List, Optional
from datetime import datetime
from ...core.database import get_db
from ...core.email import email_service
from ...models.models import (
    MaterialAccess, Chapter, Course, Student, UserPersonal
)
from ...schemas.schemas import MaterialAccessCreate, MaterialAccessResponse, MaterialAccessListResponse
from ..deps import get_current_admin

router = APIRouter()

@router.get("/", response_model=MaterialAccessListResponse)
async def get_all_material_access(
    skip: int = 0,
    limit: int = 100,
    student_id: Optional[int] = None,
    chapter_id: Optional[int] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db),
    current_admin = Depends(get_current_admin)
):
    """Get all material access records (Admin only). Material = chapter of course."""
    query = db.query(MaterialAccess).options(
        joinedload(MaterialAccess.student).joinedload(Student.user),
        joinedload(MaterialAccess.chapter)
    )
    
    if student_id:
        query = query.filter(MaterialAccess.student_id == student_id)
    
    if chapter_id:
        query = query.filter(MaterialAccess.chapter_id == chapter_id)
    
    if search:
        search_term = f"%{search.lower()}%"
        query = query.join(MaterialAccess.chapter).join(MaterialAccess.student).join(Student.user).filter(
            or_(
                Chapter.title.ilike(search_term),
                UserPersonal.first_name.ilike(search_term),
                UserPersonal.last_name.ilike(search_term),
                UserPersonal.email.ilike(search_term)
            )
        )

    total = query.count()
    accesses = query.order_by(MaterialAccess.granted_at.desc()).offset(skip).limit(limit).all()
    
    return {"data": accesses, "total": total}

@router.post("/grant-access", status_code=status.HTTP_201_CREATED)
async def grant_material_access(
    access_data: MaterialAccessCreate,
    send_email: bool = True,
    db: Session = Depends(get_db),
    current_admin = Depends(get_current_admin)
):
    """Grant material (chapter) access to a student (Admin only)"""
    chapter = db.query(Chapter).options(
        joinedload(Chapter.course)
    ).filter(Chapter.id == access_data.chapter_id).first()
    
    if not chapter:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Chapter not found"
        )
    
    student = db.query(Student).options(
        joinedload(Student.user)
    ).filter(Student.id == access_data.student_id).first()
    
    if not student:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Student not found"
        )
    
    existing = db.query(MaterialAccess).filter(
        MaterialAccess.chapter_id == access_data.chapter_id,
        MaterialAccess.student_id == access_data.student_id
    ).first()
    
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Material access already granted for this chapter"
        )
    
    new_access = MaterialAccess(
        chapter_id=access_data.chapter_id,
        student_id=access_data.student_id
    )
    db.add(new_access)
    db.commit()
    db.refresh(new_access)
    
    if send_email:
        course_name = chapter.course.title.get("en", "Course")
        await email_service.send_material_access_granted(
            to_email=student.user.email,
            student_name=f"{student.user.first_name} {student.user.last_name}",
            chapter_title=chapter.title,
            course_name=course_name
        )
    
    return {
        "message": "Material access granted successfully",
        "access_id": new_access.id,
        "student_id": access_data.student_id,
        "chapter_id": access_data.chapter_id,
        "email_sent": send_email
    }

@router.post("/grant-access/bulk")
async def bulk_grant_material_access(
    chapter_id: int,
    student_ids: List[int],
    send_email: bool = True,
    db: Session = Depends(get_db),
    current_admin = Depends(get_current_admin)
):
    """Grant material (chapter) access to multiple students (Admin only)"""
    chapter = db.query(Chapter).options(
        joinedload(Chapter.course)
    ).filter(Chapter.id == chapter_id).first()
    
    if not chapter:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Chapter not found"
        )
    
    granted = []
    skipped = []
    course_name = chapter.course.title.get("en", "Course")
    
    for student_id in student_ids:
        student = db.query(Student).options(
            joinedload(Student.user)
        ).filter(Student.id == student_id).first()
        
        if not student:
            skipped.append({"student_id": student_id, "reason": "Student not found"})
            continue
        
        existing = db.query(MaterialAccess).filter(
            MaterialAccess.chapter_id == chapter_id,
            MaterialAccess.student_id == student_id
        ).first()
        
        if existing:
            skipped.append({"student_id": student_id, "reason": "Access already granted"})
            continue
        
        db.add(MaterialAccess(chapter_id=chapter_id, student_id=student_id))
        
        if send_email:
            await email_service.send_material_access_granted(
                to_email=student.user.email,
                student_name=f"{student.user.first_name} {student.user.last_name}",
                chapter_title=chapter.title,
                course_name=course_name
            )
        
        granted.append({"student_id": student_id, "access_granted": True})
    
    db.commit()
    
    return {
        "message": f"Bulk access granted: {len(granted)} successful, {len(skipped)} skipped",
        "chapter_id": chapter_id,
        "granted": granted,
        "skipped": skipped
    }

@router.post("/grant-access/course")
async def grant_course_access(
    course_id: int,
    student_ids: List[int],
    send_email: bool = True,
    db: Session = Depends(get_db),
    current_admin = Depends(get_current_admin)
):
    """Grant access to all chapters (materials) of a course to multiple students (Admin only)"""
    course = db.query(Course).filter(Course.id == course_id).first()
    
    if not course:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Course not found"
        )
    
    chapters = db.query(Chapter).filter(Chapter.course_id == course_id).all()
    
    if not chapters:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No chapters found in this course"
        )
    
    total_granted = 0
    results = []
    course_name = course.title.get("en", "Course")
    
    for student_id in student_ids:
        student = db.query(Student).options(
            joinedload(Student.user)
        ).filter(Student.id == student_id).first()
        
        if not student:
            results.append({
                "student_id": student_id,
                "status": "skipped",
                "reason": "Student not found"
            })
            continue
        
        granted_chapters = 0
        
        for ch in chapters:
            existing = db.query(MaterialAccess).filter(
                MaterialAccess.chapter_id == ch.id,
                MaterialAccess.student_id == student_id
            ).first()
            
            if not existing:
                db.add(MaterialAccess(chapter_id=ch.id, student_id=student_id))
                granted_chapters += 1
                total_granted += 1
        
        if granted_chapters and send_email:
            await email_service.send_email(
                to_email=student.user.email,
                subject=f"Course Materials Available - {course_name}",
                body=f"""
                <html>
                    <body>
                        <h2>Hello {student.user.first_name},</h2>
                        <p>All course materials (chapters) for <strong>{course_name}</strong> are now available!</p>
                        <p>You have access to {len(chapters)} chapters.</p>
                        <p>Login to your student portal to access the materials.</p>
                        <br>
                        <p>Happy learning!<br>LogicLab Team</p>
                    </body>
                </html>
                """,
                html=True
            )
        
        results.append({
            "student_id": student_id,
            "status": "success",
            "chapters_granted": granted_chapters
        })
    
    db.commit()
    
    return {
        "message": f"Course access granted: {total_granted} total chapter accesses created",
        "course_id": course_id,
        "total_chapters": len(chapters),
        "students_processed": len(student_ids),
        "results": results
    }

@router.delete("/{access_id}", status_code=status.HTTP_204_NO_CONTENT)
async def revoke_material_access(
    access_id: int,
    db: Session = Depends(get_db),
    current_admin = Depends(get_current_admin)
):
    """Revoke material access (Admin only)"""
    access = db.query(MaterialAccess).filter(MaterialAccess.id == access_id).first()
    
    if not access:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Material access not found"
        )
    
    db.delete(access)
    db.commit()
    return None

@router.delete("/revoke/bulk")
async def bulk_revoke_material_access(
    chapter_id: int,
    student_ids: List[int],
    db: Session = Depends(get_db),
    current_admin = Depends(get_current_admin)
):
    """Bulk revoke material (chapter) access (Admin only)"""
    revoked = 0
    
    for student_id in student_ids:
        access = db.query(MaterialAccess).filter(
            MaterialAccess.chapter_id == chapter_id,
            MaterialAccess.student_id == student_id
        ).first()
        
        if access:
            db.delete(access)
            revoked += 1
    
    db.commit()
    
    return {
        "message": f"Revoked access for {revoked} students",
        "chapter_id": chapter_id,
        "revoked_count": revoked
    }

@router.get("/statistics")
async def get_material_access_statistics(
    course_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_admin = Depends(get_current_admin)
):
    """Get material (chapter) access statistics (Admin only)"""
    query = db.query(MaterialAccess)
    
    if course_id:
        query = query.join(Chapter).filter(Chapter.course_id == course_id)
    
    total_access = query.count()
    accessed = query.filter(MaterialAccess.isnot(None)).count()
    not_accessed = total_access - accessed  
    
    return {
        "total_access_granted": total_access,
        "materials_accessed": accessed,
        "materials_not_accessed": not_accessed,
        "access_rate": round(accessed / total_access * 100, 2) if total_access > 0 else 0
    }