# app/api/endpoints/enrollments.py
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload
from typing import List, Optional
from datetime import datetime, timezone

from ...core.database import get_db
from ...models.models import Enrollment, Student, Course, Certificate # Import models
from ...schemas.schemas import (
    EnrollmentResponse,
    EnrollmentCreate,
    EnrollmentUpdate,
    EnrollmentListResponse,
    EnrollmentStatusEnum # Import the enum
)
from ..deps import get_current_admin

router = APIRouter()

@router.get("/", response_model=EnrollmentListResponse)
async def get_enrollments(
    skip: int = 0,
    limit: int = 100,
    student_id: Optional[int] = None,
    course_id: Optional[int] = None,
    status_filter: Optional[EnrollmentStatusEnum] = None,
    is_completed: Optional[bool] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db),
    current_admin = Depends(get_current_admin)
):
    """Get all enrollment records (Admin only)"""
    query = db.query(Enrollment).options(
        joinedload(Enrollment.student).joinedload(Student.user),
        joinedload(Enrollment.course),
        joinedload(Enrollment.certificate)
    )
    
    if student_id:
        query = query.filter(Enrollment.student_id == student_id)
    if course_id:
        query = query.filter(Enrollment.course_id == course_id)
    if status_filter:
        query = query.filter(Enrollment.status == status_filter)
    if is_completed is not None:
        query = query.filter(Enrollment.is_completed == is_completed)
    
    if search:
        search_term = f"%{search.lower()}%"
        query = query.join(Enrollment.student).join(Student.user).join(Enrollment.course).filter(
            (Student.user.first_name.ilike(search_term)) |
            (Student.user.last_name.ilike(search_term)) |
            (Student.user.email.ilike(search_term)) |
            (Course.title.ilike(search_term)) # Assuming Course.title is JSON and needs specific handling if searching multilingual
        )
            
    total = query.count()
    enrollments = query.order_by(Enrollment.enrolled_date.desc()).offset(skip).limit(limit).all()
    
    return EnrollmentListResponse(data=[EnrollmentResponse.model_validate(e) for e in enrollments], total=total)

@router.get("/{enrollment_id}", response_model=EnrollmentResponse)
async def get_enrollment(
    enrollment_id: int,
    db: Session = Depends(get_db),
    current_admin = Depends(get_current_admin)
):
    """Get a single enrollment by ID (Admin only)"""
    enrollment = db.query(Enrollment).options(
        joinedload(Enrollment.student).joinedload(Student.user),
        joinedload(Enrollment.course),
        joinedload(Enrollment.certificate)
    ).filter(Enrollment.id == enrollment_id).first()
    
    if not enrollment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Enrollment not found"
        )
    return enrollment

@router.post("/", status_code=status.HTTP_201_CREATED, response_model=EnrollmentResponse)
async def create_enrollment(
    enrollment_data: EnrollmentCreate,
    db: Session = Depends(get_db),
    current_admin = Depends(get_current_admin)
):
    """Create a new enrollment (Admin only)"""
    # Check if student and course exist
    student = db.query(Student).filter(Student.id == enrollment_data.student_id).first()
    if not student:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Student not found")
    
    course = db.query(Course).filter(Course.id == enrollment_data.course_id).first()
    if not course:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Course not found")

    # Check for duplicate enrollment for the same student and course
    existing_enrollment = db.query(Enrollment).filter(
        Enrollment.student_id == enrollment_data.student_id,
        Enrollment.course_id == enrollment_data.course_id
    ).first()
    if existing_enrollment:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Student is already enrolled in this course"
        )

    new_enrollment = Enrollment(**enrollment_data.model_dump())
    db.add(new_enrollment)
    db.commit()
    db.refresh(new_enrollment)
    return new_enrollment

@router.put("/{enrollment_id}", response_model=EnrollmentResponse)
async def update_enrollment(
    enrollment_id: int,
    enrollment_data: EnrollmentUpdate,
    db: Session = Depends(get_db),
    current_admin = Depends(get_current_admin)
):
    """Update an existing enrollment (Admin only)"""
    enrollment = db.query(Enrollment).options(
        joinedload(Enrollment.student).joinedload(Student.user),
        joinedload(Enrollment.course),
        joinedload(Enrollment.certificate)
    ).filter(Enrollment.id == enrollment_id).first()
    
    if not enrollment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Enrollment not found"
        )
    
    for key, value in enrollment_data.model_dump(exclude_unset=True).items():
        setattr(enrollment, key, value)
    
    # Handle is_completed status update based on progress
    if enrollment_data.progress == 100:
        enrollment.is_completed = True
        if not enrollment.completed_date:
            enrollment.completed_date = datetime.now(timezone.utc)
    elif enrollment_data.progress is not None and enrollment_data.progress < 100:
        enrollment.is_completed = False
        enrollment.completed_date = None # Clear completed date if progress is not 100
    
    db.commit()
    db.refresh(enrollment)
    return enrollment

@router.delete("/{enrollment_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_enrollment(
    enrollment_id: int,
    db: Session = Depends(get_db),
    current_admin = Depends(get_current_admin)
):
    """Delete an enrollment record (Admin only)"""
    enrollment = db.query(Enrollment).filter(Enrollment.id == enrollment_id).first()
    
    if not enrollment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Enrollment not found"
        )
    
    db.delete(enrollment)
    db.commit()
    return None
