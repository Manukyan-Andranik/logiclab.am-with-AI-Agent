from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import or_
from typing import List, Optional
from datetime import datetime, timezone
from ...core.database import get_db
from ...core.email import email_service
from ...models.models import (
    Material, MaterialAccess, Chapter, Lesson, Course, Student, UserPersonal
)
from ...schemas.schemas import (
    MaterialCreate, MaterialUpdate, MaterialResponse, MaterialLink,
    MaterialAccessCreate, MaterialAccessResponse, MaterialAccessListResponse
)
from ..deps import get_current_admin

router = APIRouter()

# ---------------------------------------------------
# MATERIAL (Links) MANAGEMENT
# ---------------------------------------------------

@router.get("/lesson/{lesson_id}", response_model=MaterialResponse)
async def get_lesson_material(
    lesson_id: int,
    db: Session = Depends(get_db),
    _current_admin = Depends(get_current_admin)
):
    """Get material for a specific lesson (Admin only)"""
    # First verify lesson exists
    lesson = db.query(Lesson).filter(Lesson.id == lesson_id).first()
    
    if not lesson:
        raise HTTPException(status_code=404, detail="Lesson not found")

    material = db.query(Material).filter(Material.lesson_id == lesson_id).first()
    if not material:
        # Return empty material structure instead of 404 to support "no material" state in frontend
        return {
            "id": 0,
            "chapter_id": lesson.chapter_id,
            "lesson_id": lesson_id,
            "links": [],
            "created_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc)
        }
    return material

@router.post("", response_model=MaterialResponse)
async def create_material(
    data: MaterialCreate,
    db: Session = Depends(get_db),
    _current_admin = Depends(get_current_admin)
):
    """Create/Assign material for a lesson (Admin only)

    Note:
    - `chapter_id` in the request body is ignored and derived from the lesson
    - This ensures materials are always correctly associated with the chapter
    """
    # Check if lesson exists and derive chapter
    lesson = db.query(Lesson).filter(Lesson.id == data.lesson_id).first()
    if not lesson:
        raise HTTPException(status_code=404, detail="Lesson not found")

    # Basic server-side URL validation (defence in depth)
    invalid_links = []
    for link in data.links:
        try:
            MaterialLink(name=link.name, url=link.url)
        except Exception as exc:
            invalid_links.append({"name": link.name, "url": link.url, "error": str(exc)})

    if invalid_links:
        raise HTTPException(
            status_code=400,
            detail={"message": "One or more material links are invalid", "invalid_links": invalid_links},
        )
    
    # Check if material already exists for this lesson
    existing = db.query(Material).filter(Material.lesson_id == data.lesson_id).first()
    if existing:
        raise HTTPException(status_code=400, detail="Material already exists for this lesson. Use PUT to update.")
    
    new_material = Material(
        chapter_id=lesson.chapter_id,
        lesson_id=data.lesson_id,
        links=[{"name": link.name, "url": link.url} for link in data.links] if data.links else [],
    )
    db.add(new_material)
    db.commit()
    db.refresh(new_material)
    return new_material

@router.put("/{material_id}", response_model=MaterialResponse)
async def update_material(
    material_id: int,
    data: MaterialUpdate,
    db: Session = Depends(get_db),
    _current_admin = Depends(get_current_admin)
):
    """Update material links (Admin only)"""
    material = db.query(Material).filter(Material.id == material_id).first()
    if not material:
        raise HTTPException(status_code=404, detail="Material not found")

    if data.links is not None:
        # Validate links before saving
        invalid_links = []
        for link in data.links:
            try:
                MaterialLink(name=link.name, url=link.url)
            except Exception as exc:
                invalid_links.append({"name": link.name, "url": link.url, "error": str(exc)})

        if invalid_links:
            raise HTTPException(
                status_code=400,
                detail={"message": "One or more material links are invalid", "invalid_links": invalid_links},
            )

        material.links = [link.model_dump() for link in data.links]
    
    db.commit()
    db.refresh(material)
    return material

@router.delete("/{material_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_material(
    material_id: int,
    db: Session = Depends(get_db),
    _current_admin = Depends(get_current_admin)
):
    """Delete material record (Admin only)"""
    material = db.query(Material).filter(Material.id == material_id).first()
    if not material:
        raise HTTPException(status_code=404, detail="Material not found")
    db.delete(material)
    db.commit()
    return None

# ---------------------------------------------------
# MATERIAL ACCESS MANAGEMENT
# ---------------------------------------------------

@router.get("/access", response_model=MaterialAccessListResponse)
async def get_all_material_access(
    skip: int = 0,
    limit: int = 100,
    student_id: Optional[int] = None,
    chapter_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_admin = Depends(get_current_admin)
):
    """Get all material access records (Admin only)."""
    query = db.query(MaterialAccess).options(
        joinedload(MaterialAccess.student).joinedload(Student.user),
        joinedload(MaterialAccess.chapter)
    )
    
    if student_id:
        query = query.filter(MaterialAccess.student_id == student_id)
    
    if chapter_id:
        query = query.filter(MaterialAccess.chapter_id == chapter_id)
    
    total = query.count()
    accesses = query.order_by(MaterialAccess.granted_at.desc()).offset(skip).limit(limit).all()
    
    return {"data": accesses, "total": total}

@router.post("/grant-access", status_code=status.HTTP_201_CREATED)
async def grant_material_access(
    access_data: MaterialAccessCreate,
    db: Session = Depends(get_db),
    current_admin = Depends(get_current_admin)
):
    """Grant chapter-level or lesson-level material access (Admin only)."""
    if access_data.chapter_id is None and access_data.lesson_id is None:
        raise HTTPException(
            status_code=400,
            detail="Either chapter_id or lesson_id is required",
        )

    student = (
        db.query(Student)
        .options(joinedload(Student.user))
        .filter(Student.id == access_data.student_id)
        .first()
    )
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    if access_data.lesson_id is not None:
        lesson = (
            db.query(Lesson)
            .options(joinedload(Lesson.chapter))
            .filter(Lesson.id == access_data.lesson_id)
            .first()
        )
        if not lesson:
            raise HTTPException(status_code=404, detail="Lesson not found")

        chapter_id = lesson.chapter_id
        existing = (
            db.query(MaterialAccess)
            .filter(
                MaterialAccess.student_id == access_data.student_id,
                MaterialAccess.lesson_id == access_data.lesson_id,
            )
            .first()
        )
        if existing:
            raise HTTPException(
                status_code=400,
                detail="Access already granted for this lesson",
            )

        new_access = MaterialAccess(
            chapter_id=chapter_id,
            lesson_id=access_data.lesson_id,
            student_id=access_data.student_id,
        )
    else:
        chapter_id = access_data.chapter_id
        chapter = (
            db.query(Chapter)
            .options(joinedload(Chapter.course))
            .filter(Chapter.id == chapter_id)
            .first()
        )
        if not chapter:
            raise HTTPException(status_code=404, detail="Chapter not found")

        existing = (
            db.query(MaterialAccess)
            .filter(
                MaterialAccess.chapter_id == chapter_id,
                MaterialAccess.student_id == access_data.student_id,
                MaterialAccess.lesson_id.is_(None),
            )
            .first()
        )
        if existing:
            raise HTTPException(
                status_code=400,
                detail="Access already granted for this chapter",
            )

        new_access = MaterialAccess(
            chapter_id=chapter_id,
            student_id=access_data.student_id,
        )

    db.add(new_access)
    db.commit()
    from ..progress import invalidate_progress_cache
    invalidate_progress_cache(access_data.student_id)

    return {"message": "Access granted successfully"}

@router.delete("/revoke-access/{access_id}", status_code=status.HTTP_204_NO_CONTENT)
async def revoke_material_access(
    access_id: int,
    db: Session = Depends(get_db),
    current_admin = Depends(get_current_admin)
):
    """Revoke lesson access (Admin only)"""
    access = db.query(MaterialAccess).filter(MaterialAccess.id == access_id).first()
    if not access:
        raise HTTPException(status_code=404, detail="Access record not found")
    student_id = access.student_id
    db.delete(access)
    db.commit()
    from ..progress import invalidate_progress_cache
    invalidate_progress_cache(student_id)
    return None
