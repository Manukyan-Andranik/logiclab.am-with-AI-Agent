# app/api/endpoints/instructors.py
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload
from typing import List, Optional
from ...core.database import get_db
from ...core.cloudinary import delete_cloudinary_by_url
from ...core.security import get_password_hash
from ...models.models import Instructor, UserPersonal, Course, CourseInstructor
from ...schemas.schemas import (
    InstructorCreate, InstructorUpdate, InstructorResponse,
    UserRole
)
from ..deps import get_current_admin

router = APIRouter()

@router.get("/", response_model=List[InstructorResponse])
async def get_instructors(
    skip: int = 0,
    limit: int = 100,
    is_active: Optional[bool] = None,
    db: Session = Depends(get_db)
):
    """Get all instructors (public endpoint)"""
    query = db.query(Instructor).options(joinedload(Instructor.user))
    
    if is_active is not None:
        query = query.filter(Instructor.is_active == is_active)
    
    instructors = query.offset(skip).limit(limit).all()
    return instructors

@router.get("/{instructor_id}", response_model=InstructorResponse)
async def get_instructor(
    instructor_id: int,
    db: Session = Depends(get_db)
):
    """Get single instructor by ID"""
    instructor = db.query(Instructor).options(
        joinedload(Instructor.user)
    ).filter(Instructor.id == instructor_id).first()
    
    if not instructor or not instructor.user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Instructor not found"
        )
    
    return instructor

@router.get("/{instructor_id}/courses")
async def get_instructor_courses(
    instructor_id: int,
    db: Session = Depends(get_db)
):
    """Get all courses taught by instructor"""
    instructor = db.query(Instructor).options(
        joinedload(Instructor.courses)
    ).filter(Instructor.id == instructor_id).first()
    
    if not instructor:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Instructor not found"
        )
    
    return {
        "instructor_id": instructor_id,
        "instructor_name": f"{instructor.user.first_name} {instructor.user.last_name}",
        "courses": instructor.courses
    }

@router.post("/", response_model=InstructorResponse, status_code=status.HTTP_201_CREATED)
async def create_instructor(
    instructor_data: InstructorCreate,
    db: Session = Depends(get_db),
    current_admin = Depends(get_current_admin)
):
    """Create new instructor (Admin only)"""
    # Check if email already exists
    existing_user = db.query(UserPersonal).filter(
        UserPersonal.email == instructor_data.email
    ).first()
    
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    # Create user account
    new_user = UserPersonal(
        first_name=instructor_data.first_name,
        last_name=instructor_data.last_name,
        email=instructor_data.email,
        phone=instructor_data.phone,
        password_hash=get_password_hash(instructor_data.password),
        role=UserRole.INSTRUCTOR,
        profile_image=instructor_data.profile_image,
        social_links=instructor_data.social_links or {},
        is_active=True
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    # Create instructor profile
    new_instructor = Instructor(
        user_id=new_user.id,
        bio=instructor_data.bio,
        skills=instructor_data.skills or [],
        proficiency=instructor_data.proficiency or [],
        is_active=True
    )
    db.add(new_instructor)
    db.commit()
    db.refresh(new_instructor)
    
    return new_instructor

@router.put("/{instructor_id}", response_model=InstructorResponse)
async def update_instructor(
    instructor_id: int,
    instructor_data: InstructorUpdate,
    db: Session = Depends(get_db),
    current_admin = Depends(get_current_admin)
):
    """Update instructor (Admin only)"""
    instructor = db.query(Instructor).options(
        joinedload(Instructor.user)
    ).filter(Instructor.id == instructor_id).first()
    
    if not instructor:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Instructor not found"
        )
    
    # Check email uniqueness if it's being changed
    if instructor_data.email and instructor_data.email != instructor.user.email:
        existing_user = db.query(UserPersonal).filter(
            UserPersonal.email == instructor_data.email
        ).first()
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered by another user"
            )
        instructor.user.email = instructor_data.email

    # Update password if provided
    if instructor_data.password:
        instructor.user.password_hash = get_password_hash(instructor_data.password)
    
    # Update instructor profile fields
    if instructor_data.bio is not None:
        instructor.bio = instructor_data.bio
    if instructor_data.skills is not None:
        instructor.skills = instructor_data.skills
    if instructor_data.proficiency is not None:
        instructor.proficiency = instructor_data.proficiency
    if instructor_data.is_active is not None:
        instructor.is_active = instructor_data.is_active
        instructor.user.is_active = instructor_data.is_active
    
    # Update user personal info
    if instructor_data.first_name is not None:
        instructor.user.first_name = instructor_data.first_name
    if instructor_data.last_name is not None:
        instructor.user.last_name = instructor_data.last_name
    if instructor_data.phone is not None:
        instructor.user.phone = instructor_data.phone
    if instructor_data.profile_image is not None:
        old_img = instructor.user.profile_image
        new_img = instructor_data.profile_image
        if old_img and old_img != new_img:
            delete_cloudinary_by_url(old_img)
        instructor.user.profile_image = new_img
    if instructor_data.social_links is not None:
        instructor.user.social_links = instructor_data.social_links
    
    db.commit()
    db.refresh(instructor)
    return instructor

@router.delete("/{instructor_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_instructor(
    instructor_id: int,
    db: Session = Depends(get_db),
    current_admin = Depends(get_current_admin)
):
    """Delete instructor (Admin only)"""
    instructor = db.query(Instructor).filter(Instructor.id == instructor_id).first()
    
    if not instructor:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Instructor not found"
        )
    
    # Delete user account (will cascade to instructor profile)
    user = db.query(UserPersonal).filter(UserPersonal.id == instructor.user_id).first()
    if user:
        delete_cloudinary_by_url(user.profile_image)
        db.delete(user)
    
    db.commit()
    return None

@router.patch("/{instructor_id}/toggle-active", response_model=InstructorResponse)
async def toggle_instructor_active(
    instructor_id: int,
    db: Session = Depends(get_db),
    current_admin = Depends(get_current_admin)
):
    """Toggle instructor active status (Admin only)"""
    instructor = db.query(Instructor).filter(Instructor.id == instructor_id).first()
    if not instructor:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Instructor not found"
        )
    user_id = instructor.user_id

    # Atomic flip of Instructor.is_active, then propagate the freshly-computed
    # value to the linked UserPersonal. Both UPDATEs run in the same
    # transaction and are committed together; the in-DB NOT closes the
    # read-modify-write race that the previous Python-side toggle exposed.
    db.query(Instructor).filter(Instructor.id == instructor_id).update(
        {Instructor.is_active: ~Instructor.is_active},
        synchronize_session=False,
    )
    db.flush()
    new_value = db.query(Instructor.is_active).filter(
        Instructor.id == instructor_id
    ).scalar()
    db.query(UserPersonal).filter(UserPersonal.id == user_id).update(
        {UserPersonal.is_active: new_value},
        synchronize_session=False,
    )
    db.commit()

    instructor = db.query(Instructor).filter(Instructor.id == instructor_id).first()
    return instructor

@router.post("/{instructor_id}/courses/{course_id}", status_code=status.HTTP_201_CREATED)
async def assign_instructor_to_course(
    instructor_id: int,
    course_id: int,
    db: Session = Depends(get_db),
    current_admin = Depends(get_current_admin)
):
    """Assign instructor to course (Admin only)"""
    # Verify instructor exists
    instructor = db.query(Instructor).filter(Instructor.id == instructor_id).first()
    if not instructor:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Instructor not found"
        )
    
    # Verify course exists
    course = db.query(Course).filter(Course.id == course_id).first()
    if not course:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Course not found"
        )
    
    # Check if already assigned
    existing = db.query(CourseInstructor).filter(
        CourseInstructor.instructor_id == instructor_id,
        CourseInstructor.course_id == course_id
    ).first()
    
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Instructor already assigned to this course"
        )
    
    # Create assignment
    assignment = CourseInstructor(
        instructor_id=instructor_id,
        course_id=course_id
    )
    db.add(assignment)
    db.commit()
    
    return {
        "message": "Instructor assigned to course successfully",
        "instructor_id": instructor_id,
        "course_id": course_id
    }

@router.delete("/{instructor_id}/courses/{course_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_instructor_from_course(
    instructor_id: int,
    course_id: int,
    db: Session = Depends(get_db),
    current_admin = Depends(get_current_admin)
):
    """Remove instructor from course (Admin only)"""
    assignment = db.query(CourseInstructor).filter(
        CourseInstructor.instructor_id == instructor_id,
        CourseInstructor.course_id == course_id
    ).first()
    
    if not assignment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Assignment not found"
        )
    
    db.delete(assignment)
    db.commit()
    return None