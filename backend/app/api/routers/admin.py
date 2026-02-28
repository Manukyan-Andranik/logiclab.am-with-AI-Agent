from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload
from typing import List, Optional
from datetime import datetime
import secrets
from sqlalchemy import or_

from ...core.database import get_db
from ...core.email import email_service
from ...core.security import get_password_hash
from ...models.models import (
    Student, UserPersonal, Registration, MaterialAccess,
    Lesson, Chapter, Course, EmailLog, Instructor, Project
)
from ...schemas.schemas import (
    StudentResponse, StudentUpdate, UserRole,
    RegistrationResponse, RegistrationUpdate, RegistrationStatus, RegisterRequest, RegistrationListResponse
)
from ..deps import get_current_admin, get_current_student

router = APIRouter(prefix="/admin", tags=["Admin"])

@router.get("/dashboard")
async def admin_dashboard(
    db: Session = Depends(get_db),
    _current_admin = Depends(get_current_admin)
):
    """Get dashboard statistics for admin panel - parity with logiclab.am"""
    
    total_courses = db.query(Course).count()
    active_courses = db.query(Course).filter(Course.is_active == True).count()
    
    total_instructors = db.query(Instructor).count()
    active_instructors = db.query(Instructor).filter(Instructor.is_active == True).count()
    
    total_students = db.query(Student).count()
    total_registrations = db.query(Registration).count()
    pending_registrations = db.query(Registration).filter(
        Registration.status == RegistrationStatus.PENDING
    ).count()
    confirmed_registrations = db.query(Registration).filter(
        Registration.status == RegistrationStatus.CONFIRMED
    ).count()
    completed_registrations = db.query(Registration).filter(
        Registration.status == RegistrationStatus.COMPLETED
    ).count()
    rejected_registrations = db.query(Registration).filter(
        Registration.status == RegistrationStatus.REJECTED
    ).count()
    
    total_projects = db.query(Project).count()
    published_projects = db.query(Project).filter(Project.is_published == True).count()
    
    # Build course-level stats for dashboard (parity with logiclab.am)
    all_courses = db.query(Course).options(
        joinedload(Course.instructors).joinedload(Instructor.user)
    ).all()
    courses_with_stats = []
    for c in all_courses:
        title = c.title.get("en", "") if isinstance(c.title, dict) else str(c.title)
        courses_with_stats.append({
            "id": str(c.id),
            "title": title,
            "is_active": c.is_active,
            "pending_count": db.query(Registration).filter(
                Registration.course_id == c.id,
                Registration.status == RegistrationStatus.PENDING
            ).count(),
            "confirmed_count": db.query(Registration).filter(
                Registration.course_id == c.id,
                Registration.status == RegistrationStatus.CONFIRMED
            ).count(),
            "rejected_count": db.query(Registration).filter(
                Registration.course_id == c.id,
                Registration.status == RegistrationStatus.REJECTED
            ).count(),
            "completed_count": db.query(Registration).filter(
                Registration.course_id == c.id,
                Registration.status == RegistrationStatus.COMPLETED
            ).count(),
            "instructor": ", ".join(
                i.user.first_name + " " + i.user.last_name
                for i in c.instructors
            ) if c.instructors else "—",
        })
    
    return {
        "total_courses": total_courses,
        "total_students": total_students,
        "total_registrations": total_registrations,
        "total_instructors": total_instructors,
        "total_ml_projects": total_projects,
        "courses": courses_with_stats,
        "recent_visitors": [],
        "courses_summary": {
            "total": total_courses,
            "active": active_courses,
            "inactive": total_courses - active_courses
        },
        "instructors": {
            "total": total_instructors,
            "active": active_instructors,
            "inactive": total_instructors - active_instructors
        },
        "students": {"total": total_students},
        "registrations": {
            "total": total_registrations,
            "pending": pending_registrations,
            "confirmed": confirmed_registrations,
            "completed": completed_registrations,
            "rejected": rejected_registrations
        },
        "projects": {
            "total": total_projects,
            "published": published_projects,
            "drafts": total_projects - published_projects
        }
    }

@router.get("/students", response_model=List[StudentResponse])
async def get_all_students_admin(
    skip: int = 0,
    limit: int = 100,
    course_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_admin = Depends(get_current_admin)
):
    """Get all students (Admin only)"""
    query = db.query(Student).options(
        joinedload(Student.user),
        joinedload(Student.course),
    )
    
    if course_id is not None:
        query = query.filter(Student.course_id == course_id) 
    
    students = query.offset(skip).limit(limit).all()
    return students

@router.get("/students/{student_id}", response_model=StudentResponse)
async def get_student_admin(
    student_id: int,
    db: Session = Depends(get_db),
    current_admin = Depends(get_current_admin)
):
    """Get single student by ID (Admin only)"""
    student = db.query(Student).options(
        joinedload(Student.user),
        joinedload(Student.course)
    ).filter(Student.id == student_id).first()
    
    if not student:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Student not found"
        )
    
    return student

@router.get("/students/{student_id}/timeline")
async def get_student_timeline_admin(
    student_id: int,
    db: Session = Depends(get_db),
    current_admin = Depends(get_current_admin)
):
    """Get student timeline with all activities (Admin only)"""
    student = db.query(Student).options(
        joinedload(Student.user),
        joinedload(Student.course)
    ).filter(Student.id == student_id).first()
    
    if not student:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Student not found"
        )
    
    # Get registrations
    registrations = db.query(Registration).filter(
        Registration.student_id == student_id
    ).order_by(Registration.registration_date.desc()).all()
    
    # Get material (chapter) access history
    material_accesses = db.query(MaterialAccess).options(
        joinedload(MaterialAccess.chapter).joinedload(Chapter.course)
    ).filter(
        MaterialAccess.student_id == student_id
    ).order_by(MaterialAccess.granted_at.desc()).all()
    
    # Build timeline
    timeline = []
    
    for reg in registrations:
        timeline.append({
            "type": "registration",
            "date": reg.registration_date,
            "status": reg.status.value,
            "course_id": reg.course_id,
            "details": f"Registration {reg.status.value}"
        })
    
    for access in material_accesses:
        timeline.append({
            "type": "material_access",
            "date": access.granted_at,
            "chapter_id": access.chapter_id,
            "chapter_title": access.chapter.title,
            "accessed": access.accessed_at is not None,
            "accessed_at": access.accessed_at,
            "details": f"Access granted to chapter: {access.chapter.title}"
        })
    
    # Sort timeline by date
    timeline.sort(key=lambda x: x["date"], reverse=True)
    
    return {
        "student": StudentResponse.from_orm(student),
        "timeline": timeline,
        "statistics": {
            "total_registrations": len(registrations),
            "materials_granted": len(material_accesses),
            "materials_accessed": len([m for m in material_accesses if m.accessed_at]),
            "current_chapter_id": student.last_chapter_id,
            "current_lesson_id": student.last_lesson_id
        }
    }

@router.put("/students/{student_id}", response_model=StudentResponse)
async def update_student_admin(
    student_id: int,
    student_data: StudentUpdate,
    db: Session = Depends(get_db),
    current_admin = Depends(get_current_admin)
):
    """Update student (Admin only)"""
    student = db.query(Student).options(joinedload(Student.user)).filter(Student.id == student_id).first()
    
    if not student:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Student not found"
        )
    
    # Update Student specific fields
    student_fields = ['course_id', 'last_chapter_id', 'last_lesson_id']
    for field in student_fields:
        if hasattr(student_data, field) and getattr(student_data, field) is not None:
            setattr(student, field, getattr(student_data, field))
            
    # Update UserPersonal fields
    user_personal_fields = ['first_name', 'last_name', 'email', 'phone', 'profile_image', 'social_links', 'country', 'city']
    if student.user:
        for field in user_personal_fields:
            if hasattr(student_data, field) and getattr(student_data, field) is not None:
                setattr(student.user, field, getattr(student_data, field))
                
    db.commit()
    db.refresh(student)
    return student

@router.patch("/students/{student_id}/toggle-active", response_model=StudentResponse)
async def toggle_student_active_admin(
    student_id: int,
    db: Session = Depends(get_db),
    current_admin = Depends(get_current_admin)
):
    """Toggle student active status (Admin only)"""
    student = db.query(Student).filter(Student.id == student_id).first()
    
    if not student:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Student not found"
        )
    
    # student.is_active = not student.is_active
    # student.user.is_active = student.is_active
    db.commit()
    db.refresh(student)
    return student

@router.patch("/students/{student_id}/progress")
async def update_student_progress_admin(
    student_id: int,
    chapter_id: Optional[int] = None,
    lesson_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_admin = Depends(get_current_admin)
):
    """Update student progress (Admin only)"""
    student = db.query(Student).filter(Student.id == student_id).first()
    
    if not student:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Student not found"
        )
    
    if chapter_id is not None:
        student.last_chapter_id = chapter_id
    
    if lesson_id is not None:
        student.last_lesson_id = lesson_id
    
    db.commit()
    db.refresh(student)
    
    return {
        "message": "Student progress updated",
        "student_id": student_id,
        "last_chapter_id": student.last_chapter_id,
        "last_lesson_id": student.last_lesson_id
    }

@router.post("/students/{student_id}/materials/chapters/{chapter_id}/mark-accessed")
async def mark_material_accessed_admin(
    student_id: int,
    chapter_id: int,
    db: Session = Depends(get_db),
    current_admin = Depends(get_current_admin)
):
    """Mark a chapter (material) as accessed by student"""
    # Verify student exists
    student = db.query(Student).filter(Student.id == student_id).first()
    if not student:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Student not found"
        )
    
    # Verify chapter exists
    chapter = db.query(Chapter).filter(Chapter.id == chapter_id).first()
    if not chapter:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Chapter not found"
        )

    # access material
    material_access = MaterialAccess(
        chapter_id=chapter_id,
        student_id=student_id
    )
    db.add(material_access)
    db.commit()
    db.refresh(material_access)

    # Verify material access record exists
    material_access = db.query(MaterialAccess).filter(
        MaterialAccess.chapter_id == chapter_id,
        MaterialAccess.student_id == student_id
    ).first()
    
    if not material_access:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Material access not found for this chapter"
        )
    
    if material_access.accessed_at is None:
        material_access.accessed_at = datetime.utcnow()
        db.commit()
    
    return {
        "message": "Material (chapter) marked as accessed",
        "chapter_id": chapter_id,
        "accessed_at": material_access.accessed_at
    }

@router.get("/registrations", response_model=RegistrationListResponse)
async def get_all_registrations_admin(
    skip: int = 0,
    limit: int = 100,
    status_filter: Optional[RegistrationStatus] = None,
    course_id: Optional[int] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db),
    current_admin = Depends(get_current_admin)
):
    """Get all registrations (Admin only)"""
    query = db.query(Registration).options(
        joinedload(Registration.student).joinedload(Student.user),
        joinedload(Registration.course)
    )
    
    if status_filter:
        query = query.filter(Registration.status == status_filter)
    
    if course_id:
        query = query.filter(Registration.course_id == course_id)
    
    if search:
        search_term = f"%{search.lower()}%"
        query = query.join(Registration.student).join(Student.user).filter(
            or_(
                UserPersonal.first_name.ilike(search_term),
                UserPersonal.last_name.ilike(search_term),
                UserPersonal.email.ilike(search_term)
            )
        )

    total = query.count()
    registrations = query.order_by(
        Registration.registration_date.desc()
    ).offset(skip).limit(limit).all()
    
    return {"data": registrations, "total": total}

@router.get("/registrations/{registration_id}", response_model=RegistrationResponse)
async def get_registration_admin(
    registration_id: int,
    db: Session = Depends(get_db),
    current_admin = Depends(get_current_admin)
):
    """Get single registration by ID (Admin only)"""
    registration = db.query(Registration).options(
        joinedload(Registration.student).joinedload(Student.user),
        joinedload(Registration.course)
    ).filter(Registration.id == registration_id).first()
    
    if not registration:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Registration not found"
        )
    
    return registration

@router.put("/registrations/{registration_id}/status")
async def update_registration_status_admin(
    registration_id: int,
    status_data: RegistrationUpdate,
    db: Session = Depends(get_db),
    current_admin = Depends(get_current_admin)
):
    """Update registration status and trigger emails (Admin only)"""
    registration = db.query(Registration).options(
        joinedload(Registration.student).joinedload(Student.user),
        joinedload(Registration.course)
    ).filter(Registration.id == registration_id).first()
    
    if not registration:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Registration not found"
        )
    
    old_status = registration.status
    new_status = status_data.status
    
    # Prevent invalid status transitions
    if old_status == RegistrationStatus.COMPLETED and new_status != RegistrationStatus.COMPLETED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot change status of completed registration"
        )
    
    # Update status
    registration.status = new_status
    db.commit()
    
    # Get student and course info
    student = registration.student
    user = student.user
    course = registration.course
    student_name = f"{user.first_name} {user.last_name}"
    course_name = course.title.get("en", "Course")
    
    # Send appropriate email based on status
    email_sent = False
    temp_password = None
    
    if new_status == RegistrationStatus.CONFIRMED:
        # Activate student account and send credentials
        user.is_active = True
        student.is_active = True
        student.course_id = registration.course_id
        
        # Generate temporary password if not already set properly
        temp_password = secrets.token_urlsafe(12)
        user.password_hash = get_password_hash(temp_password)
        
        db.commit()
        
        email_sent = await email_service.send_registration_confirmed(
            to_email=user.email,
            student_name=student_name,
            course_name=course_name,
            login_email=user.email,
            temp_password=temp_password
        )
    
    elif new_status == RegistrationStatus.COMPLETED:
        email_sent = await email_service.send_course_completed(
            to_email=user.email,
            student_name=student_name,
            course_name=course_name
        )
    
    elif new_status == RegistrationStatus.REJECTED:
        email_sent = await email_service.send_registration_rejected(
            to_email=user.email,
            student_name=student_name,
            course_name=course_name
        )
    
    # Log email
    email_log = EmailLog(
        recipient_email=user.email,
        subject=f"Registration Status: {new_status.value}",
        body=f"Status changed from {old_status.value} to {new_status.value}",
        status="sent" if email_sent else "failed",
        error_message=None if email_sent else "Email sending failed"
    )
    db.add(email_log)
    db.commit()
    
    return {
        "message": f"Registration status updated to {new_status.value}",
        "registration_id": registration_id,
        "old_status": old_status.value,
        "new_status": new_status.value,
        "email_sent": email_sent,
        "temp_password": temp_password if new_status == RegistrationStatus.CONFIRMED else None
    }

@router.delete("/registrations/{registration_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_registration_admin(
    registration_id: int,
    db: Session = Depends(get_db),
    current_admin = Depends(get_current_admin)
):
    """Delete registration (Admin only)"""
    registration = db.query(Registration).filter(
        Registration.id == registration_id
    ).first()
    
    if not registration:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Registration not found"
        )
    
    db.delete(registration)
    db.commit()
    return None

@router.get("/registrations/{registration_id}/email-logs")
async def get_registration_email_logs_admin(
    registration_id: int,
    db: Session = Depends(get_db),
    current_admin = Depends(get_current_admin)
):
    """Get email logs for a registration (Admin only)"""
    registration = db.query(Registration).options(
        joinedload(Registration.student).joinedload(Student.user)
    ).filter(Registration.id == registration_id).first()
    
    if not registration:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Registration not found"
        )
    
    user_email = registration.student.user.email
    
    email_logs = db.query(EmailLog).filter(
        EmailLog.recipient_email == user_email
    ).order_by(EmailLog.sent_at.desc()).all()
    
    return {
        "registration_id": registration_id,
        "student_email": user_email,
        "logs": [
            {
                "id": log.id,
                "subject": log.subject,
                "status": log.status,
                "sent_at": log.sent_at,
                "error_message": log.error_message
            }
            for log in email_logs
        ]
    }

@router.post("/registrations/bulk-status-update")
async def bulk_update_registration_status_admin(
    registration_ids: List[int],
    new_status: RegistrationStatus,
    db: Session = Depends(get_db),
    current_admin = Depends(get_current_admin)
):
    """Bulk update registration statuses (Admin only)"""
    updated = []
    failed = []
    
    for reg_id in registration_ids:
        try:
            registration = db.query(Registration).options(
                joinedload(Registration.student).joinedload(Student.user),
                joinedload(Registration.course)
            ).filter(Registration.id == reg_id).first()
            
            if not registration:
                failed.append({
                    "registration_id": reg_id,
                    "error": "Registration not found"
                })
                continue
            
            # Update status
            old_status = registration.status
            registration.status = new_status
            
            # Handle confirmed status
            if new_status == RegistrationStatus.CONFIRMED:
                student = registration.student
                user = student.user
                user.is_active = True
                student.is_active = True
                student.course_id = registration.course_id
                
                temp_password = secrets.token_urlsafe(12)
                user.password_hash = get_password_hash(temp_password)
                
                course_name = registration.course.title.get("en", "Course")
                await email_service.send_registration_confirmed(
                    to_email=user.email,
                    student_name=f"{user.first_name} {user.last_name}",
                    course_name=course_name,
                    login_email=user.email,
                    temp_password=temp_password
                )
            
            db.commit()
            updated.append({
                "registration_id": reg_id,
                "old_status": old_status.value,
                "new_status": new_status.value
            })
        
        except Exception as e:
            db.rollback()
            failed.append({
                "registration_id": reg_id,
                "error": str(e)
            })
    
    return {
        "message": f"Bulk update completed: {len(updated)} successful, {len(failed)} failed",
        "updated": updated,
        "failed": failed
    }

@router.get("/registrations/statistics/overview")
async def get_registration_statistics_admin(
    db: Session = Depends(get_db),
    current_admin = Depends(get_current_admin)
):
    """Get registration statistics overview (Admin only)"""
    total = db.query(Registration).count()
    pending = db.query(Registration).filter(
        Registration.status == RegistrationStatus.PENDING
    ).count()
    confirmed = db.query(Registration).filter(
        Registration.status == RegistrationStatus.CONFIRMED
    ).count()
    completed = db.query(Registration).filter(
        Registration.status == RegistrationStatus.COMPLETED
    ).count()
    rejected = db.query(Registration).filter(
        Registration.status == RegistrationStatus.REJECTED
    ).count()
    
    return {
        "total": total,
        "pending": pending,
        "confirmed": confirmed,
        "completed": completed,
        "rejected": rejected,
        "breakdown": {
            "pending_percentage": round(pending / total * 100, 2) if total > 0 else 0,
            "confirmed_percentage": round(confirmed / total * 100, 2) if total > 0 else 0,
            "completed_percentage": round(completed / total * 100, 2) if total > 0 else 0,
            "rejected_percentage": round(rejected / total * 100, 2) if total > 0 else 0
        }
    }
