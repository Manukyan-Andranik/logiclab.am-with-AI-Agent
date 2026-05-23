from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload
from typing import List, Optional
from datetime import datetime, timezone
import secrets
from sqlalchemy import or_, select

from ...core.database import get_db
from ...core.cloudinary import delete_cloudinary_by_url, delete_cloudinary_urls
from ...core.email import email_service
from ...core.i18n import localized_label
from ...core.security import get_password_hash
from collections import defaultdict
from ...models.models import (
    Student, UserPersonal, Registration, MaterialAccess,
    Lesson, Chapter, Course, EmailLog, Instructor, Project,
    Enrollment, Certificate, RegistrationStatus as DbRegistrationStatus,
    EnrollmentStatus as DbEnrollmentStatus,
)
from ...schemas.schemas import (
    StudentResponse, StudentUpdate, StudentAdminCreate, UserRole,
    RegistrationResponse, RegistrationUpdate, RegistrationStatus, RegisterRequest, RegistrationListResponse
)
from ..deps import get_current_admin, get_current_student

try:
    from ..progress import compute_course_progress, invalidate_progress_cache
except Exception:  # pragma: no cover - defensive: prod may not have new module yet
    compute_course_progress = None  # type: ignore
    def invalidate_progress_cache(*_args, **_kwargs):  # type: ignore
        return None

try:
    from ..dashboard import build_student_dashboard
except Exception:  # pragma: no cover
    build_student_dashboard = None  # type: ignore

router = APIRouter(prefix="/admin", tags=["Admin"])


def _student_course_filter(course_id: int):
    """Students on a course via primary assignment or enrollment (SQLAlchemy 2–safe)."""
    enrolled_ids = (
        select(Enrollment.student_id)
        .where(Enrollment.course_id == course_id)
        .distinct()
    )
    return or_(Student.course_id == course_id, Student.id.in_(enrolled_ids))


def _registration_status_to_db(s: RegistrationStatus) -> DbRegistrationStatus:
    """Map API/schema enum to SQLAlchemy model enum (same string values, different Python types)."""
    return DbRegistrationStatus(s.value)


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
        Registration.status == DbRegistrationStatus.PENDING
    ).count()
    confirmed_registrations = db.query(Registration).filter(
        Registration.status == DbRegistrationStatus.CONFIRMED
    ).count()
    completed_registrations = db.query(Registration).filter(
        Registration.status == DbRegistrationStatus.COMPLETED
    ).count()
    rejected_registrations = db.query(Registration).filter(
        Registration.status == DbRegistrationStatus.REJECTED
    ).count()
    
    total_projects = db.query(Project).count()
    published_projects = db.query(Project).filter(Project.is_published == True).count()
    
    # Build course-level stats for dashboard (parity with logiclab.am)
    from sqlalchemy import func

    all_courses = db.query(Course).options(
        joinedload(Course.instructors).joinedload(Instructor.user)
    ).all()
    reg_counts: dict[tuple[int, DbRegistrationStatus], int] = {}
    for course_id, reg_status, cnt in (
        db.query(Registration.course_id, Registration.status, func.count())
        .group_by(Registration.course_id, Registration.status)
        .all()
    ):
        reg_counts[(course_id, reg_status)] = int(cnt)

    def _reg_count(course_id: int, status: DbRegistrationStatus) -> int:
        return reg_counts.get((course_id, status), 0)

    courses_with_stats = []
    for c in all_courses:
        # Fix: Safely handle course title if it's a string or dict
        if isinstance(c.title, dict):
            title = c.title.get("en", "") or c.title.get("hy", "") or c.title.get("ru", "")
        else:
            title = str(c.title)
            
        courses_with_stats.append({
            "id": str(c.id),
            "title": title,
            "is_active": c.is_active,
            "pending_count": _reg_count(c.id, DbRegistrationStatus.PENDING),
            "confirmed_count": _reg_count(c.id, DbRegistrationStatus.CONFIRMED),
            "rejected_count": _reg_count(c.id, DbRegistrationStatus.REJECTED),
            "completed_count": _reg_count(c.id, DbRegistrationStatus.COMPLETED),
            "instructor": ", ".join(
                (
                    f"{(i.user.first_name or '').strip()} {(i.user.last_name or '').strip()}".strip()
                    if i.user
                    else "—"
                )
                for i in c.instructors
            )
            if c.instructors
            else "—",
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
        query = query.filter(_student_course_filter(course_id))

    students = query.offset(skip).limit(limit).all()
    return students

@router.get("/students/with-progress")
async def get_students_with_progress_admin(
    skip: int = 0,
    limit: int = 100,
    course_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_admin = Depends(get_current_admin),
):
    """Batched variant of GET /admin/students that also returns per-course
    progress for every student in a single round-trip.

    Designed to back the admin Students table without the previous N+1 fan-out
    (one call per row to `/students/{id}/enrollments` and `/students/{id}/dashboard`).
    Total backend queries: O(1) regardless of student count.

    Response: ``[ { ...StudentResponse fields, enrollments_summary: [...] } ]``
    where each ``enrollments_summary`` item exposes the same shape the row
    cells already consumed (``course_title``, ``course``, ``progress``).
    """
    query = db.query(Student).options(
        joinedload(Student.user),
        joinedload(Student.course),
    )

    if course_id is not None:
        query = query.filter(_student_course_filter(course_id))

    students = query.offset(skip).limit(limit).all()
    if not students:
        return []

    student_ids = [s.id for s in students]

    # 1 query — all enrollments for this page of students, with course eagerly loaded.
    enrollments = (
        db.query(Enrollment)
        .options(joinedload(Enrollment.course))
        .filter(Enrollment.student_id.in_(student_ids))
        .all()
    )
    enroll_by_student: "defaultdict[int, list]" = defaultdict(list)
    enroll_pairs = set()
    for e in enrollments:
        enroll_by_student[e.student_id].append(e)
        enroll_pairs.add((e.student_id, e.course_id))

    # Legacy: students with a `Student.course_id` but no matching Enrollment row.
    # Surface those in the payload so the table matches the rest of the admin UI,
    # but do NOT write a backfill row here (read-only endpoint).
    legacy_pairs: list = []
    legacy_course_ids: set = set()
    for s in students:
        if s.course_id and (s.id, s.course_id) not in enroll_pairs:
            legacy_pairs.append((s.id, s.course_id))
            legacy_course_ids.add(s.course_id)

    course_ids: set = {e.course_id for e in enrollments} | legacy_course_ids

    # Resolve any legacy courses we don't already have via the enrollment join.
    legacy_courses_by_id: dict = {}
    existing_course_ids = {e.course_id for e in enrollments}
    missing_course_ids = legacy_course_ids - existing_course_ids
    if missing_course_ids:
        for c in db.query(Course).filter(Course.id.in_(missing_course_ids)).all():
            legacy_courses_by_id[c.id] = c

    # 1 query — chapter→course map across every course we care about.
    chapter_to_course: dict = {}
    course_chapters: "defaultdict[int, set]" = defaultdict(set)
    if course_ids:
        for ch_id, c_id in db.query(Chapter.id, Chapter.course_id).filter(
            Chapter.course_id.in_(course_ids)
        ).all():
            chapter_to_course[ch_id] = c_id
            course_chapters[c_id].add(ch_id)

    # 1 query — lesson→chapter map for those chapters.
    lesson_to_chapter: dict = {}
    chapter_lessons: "defaultdict[int, set]" = defaultdict(set)
    if chapter_to_course:
        for l_id, ch_id in db.query(Lesson.id, Lesson.chapter_id).filter(
            Lesson.chapter_id.in_(list(chapter_to_course.keys()))
        ).all():
            lesson_to_chapter[l_id] = ch_id
            chapter_lessons[ch_id].add(l_id)

    course_total_lessons = {
        c_id: sum(len(chapter_lessons[ch_id]) for ch_id in chs)
        for c_id, chs in course_chapters.items()
    }
    course_total_chapters = {c_id: len(chs) for c_id, chs in course_chapters.items()}

    # 1 query — all MaterialAccess rows for these students touching these scopes.
    granted_lessons: "defaultdict[tuple, set]" = defaultdict(set)
    granted_chapters: "defaultdict[tuple, set]" = defaultdict(set)
    access_filters = []
    if chapter_to_course:
        access_filters.append(MaterialAccess.chapter_id.in_(list(chapter_to_course.keys())))
    if lesson_to_chapter:
        access_filters.append(MaterialAccess.lesson_id.in_(list(lesson_to_chapter.keys())))
    if access_filters:
        combined = or_(*access_filters) if len(access_filters) > 1 else access_filters[0]
        accesses = db.query(MaterialAccess).filter(
            MaterialAccess.student_id.in_(student_ids),
            combined,
        ).all()
        for a in accesses:
            sid = a.student_id
            # Lesson-level grant (chapter-level grants are expanded below).
            if a.lesson_id is not None and a.lesson_id in lesson_to_chapter:
                ch_id = lesson_to_chapter[a.lesson_id]
                c_id = chapter_to_course.get(ch_id)
                if c_id is None:
                    continue
                granted_lessons[(sid, c_id)].add(a.lesson_id)
                if a.chapter_id is not None:
                    granted_chapters[(sid, c_id)].add(a.chapter_id)
            elif a.chapter_id is not None and a.chapter_id in chapter_to_course:
                c_id = chapter_to_course[a.chapter_id]
                granted_chapters[(sid, c_id)].add(a.chapter_id)
                granted_lessons[(sid, c_id)].update(chapter_lessons[a.chapter_id])

    def _progress(student_id: int, c_id: int) -> dict:
        total_lessons = course_total_lessons.get(c_id, 0)
        total_chapters = course_total_chapters.get(c_id, 0)
        accessed_lessons = len(granted_lessons.get((student_id, c_id), set()))
        accessed_chapters = len(granted_chapters.get((student_id, c_id), set()))
        pct = round(accessed_lessons / total_lessons * 100, 2) if total_lessons else 0.0
        return {
            "percentage": pct,
            "accessed_lessons": accessed_lessons,
            "available_lessons": accessed_lessons,
            "total_lessons": total_lessons,
            "accessed_chapters": accessed_chapters,
            "total_chapters": total_chapters,
        }

    def _course_card(c) -> dict:
        return {
            "id": c.id,
            "title": c.title,
            "slug": c.slug,
            "icon_url": c.icon_url,
            "duration_months": c.duration_months,
        }

    def _student_payload(s) -> dict:
        # Mirror the StudentResponse shape consumed by the admin UI without
        # introducing a new Pydantic schema (avoids a schema bump for a
        # read-only superset).
        u = s.user
        c = s.course
        return {
            "id": s.id,
            "user_id": s.user_id,
            "course_id": s.course_id,
            "status": s.status.value if s.status else None,
            "created_at": s.created_at.isoformat() if s.created_at else None,
            "user": {
                "id": u.id,
                "first_name": u.first_name,
                "last_name": u.last_name,
                "email": u.email,
                "phone": u.phone,
                "profile_image": u.profile_image,
                "city": u.city,
                "country": u.country,
                "is_active": u.is_active,
                "role": u.role.value if u.role else None,
                "created_at": u.created_at.isoformat() if u.created_at else None,
            } if u else None,
            "course": _course_card(c) if c else None,
        }

    result = []
    for s in students:
        enr_payload = []
        seen = set()
        for e in enroll_by_student.get(s.id, []):
            seen.add(e.course_id)
            c = e.course
            enr_payload.append({
                "enrollment_id": e.id,
                "course_id": e.course_id,
                "course_title": c.title if c else None,
                "course": _course_card(c) if c else None,
                "enrollment_status": e.status.value if e.status else None,
                "progress": _progress(s.id, e.course_id),
            })
        # Legacy course_id surfacing.
        if s.course_id and s.course_id not in seen:
            c = legacy_courses_by_id.get(s.course_id) or s.course
            if c is not None:
                enr_payload.append({
                    "enrollment_id": None,
                    "course_id": s.course_id,
                    "course_title": c.title,
                    "course": _course_card(c),
                    "enrollment_status": "active",
                    "progress": _progress(s.id, s.course_id),
                })

        payload = _student_payload(s)
        payload["enrollments_summary"] = enr_payload
        result.append(payload)

    return result


@router.post("/create-student")
async def create_student_admin(
    data: StudentAdminCreate,
    db: Session = Depends(get_db),
    current_admin=Depends(get_current_admin),
):
    """Create a student account directly (Admin only). Returns temp password."""
    existing = db.query(UserPersonal).filter(UserPersonal.email == data.email).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered",
        )

    course = db.query(Course).filter(Course.id == data.course_id).first()
    if not course:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Course not found")

    temp_password = secrets.token_urlsafe(12)
    user = UserPersonal(
        first_name=data.first_name,
        last_name=data.last_name,
        email=data.email,
        password_hash=get_password_hash(temp_password),
        role=UserRole.STUDENT,
        is_active=True,
    )
    db.add(user)
    db.flush()

    student = Student(
        user_id=user.id,
        course_id=data.course_id,
        status=DbRegistrationStatus.CONFIRMED,
    )
    db.add(student)
    db.flush()

    enrollment = Enrollment(
        student_id=student.id,
        course_id=data.course_id,
        status=DbEnrollmentStatus.ACTIVE,
        enrolled_date=datetime.now(timezone.utc),
    )
    db.add(enrollment)

    db.commit()
    db.refresh(student)

    return {"student_id": student.id, "temp_password": temp_password}


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
    
    # Get material (chapter / lesson) access history
    material_accesses = db.query(MaterialAccess).options(
        joinedload(MaterialAccess.chapter).joinedload(Chapter.course),
        joinedload(MaterialAccess.lesson),
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
        # Lesson-only access has chapter_id == None — guard against missing chapter relation.
        chapter_title = access.chapter.title if access.chapter else None
        lesson_title = getattr(getattr(access, "lesson", None), "title", None)
        if lesson_title:
            details = f"Access granted to lesson: {lesson_title}"
        elif chapter_title:
            details = f"Access granted to chapter: {chapter_title}"
        else:
            details = "Access granted"
        timeline.append({
            "type": "material_access",
            "date": access.granted_at,
            "chapter_id": access.chapter_id,
            "lesson_id": access.lesson_id,
            "chapter_title": chapter_title,
            "lesson_title": lesson_title,
            "accessed": access.accessed_at is not None,
            "accessed_at": access.accessed_at,
            "details": details,
        })

    # Sort timeline by date — guard against null dates from legacy rows.
    timeline.sort(key=lambda x: x["date"] or datetime.min, reverse=True)
    
    return {
        "student": StudentResponse.model_validate(student),
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

    # Use exclude_unset so callers can clear nullable fields by sending null,
    # but PATCH-style omissions still leave existing values alone.
    _upd = student_data.model_dump(exclude_unset=True)
    if student.user and "profile_image" in _upd:
        _old_pi = student.user.profile_image
        _new_pi = _upd["profile_image"]
        if _old_pi and _old_pi != _new_pi:
            delete_cloudinary_by_url(_old_pi)

    # Update Student-specific fields. course_id == 0 / negative is invalid; skip.
    student_fields = {'course_id', 'last_chapter_id', 'last_lesson_id'}
    for field, value in _upd.items():
        if field in student_fields:
            setattr(student, field, value)

    # Update UserPersonal fields. Driving from _upd lets explicit nulls through,
    # which is required to clear optional fields like phone/city/country/profile_image.
    user_personal_fields = {'first_name', 'last_name', 'email', 'phone', 'profile_image',
                            'social_links', 'country', 'city'}
    if student.user:
        for field, value in _upd.items():
            if field in user_personal_fields:
                setattr(student.user, field, value)
                
    db.commit()
    db.refresh(student)
    return student

@router.patch("/students/{student_id}/toggle-active", response_model=StudentResponse)
async def toggle_student_active_admin(
    student_id: int,
    db: Session = Depends(get_db),
    current_admin = Depends(get_current_admin)
):
    """Toggle student user active status (Admin only)"""
    student = db.query(Student).options(joinedload(Student.user)).filter(Student.id == student_id).first()

    if not student:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Student not found"
        )

    if student.user:
        # Atomic UPDATE on the linked UserPersonal row so concurrent toggles
        # can't both compute their NOT from the same stale value.
        db.query(UserPersonal).filter(UserPersonal.id == student.user.id).update(
            {UserPersonal.is_active: ~UserPersonal.is_active},
            synchronize_session=False,
        )
    db.commit()
    db.refresh(student)
    return student

@router.post("/students/{student_id}/reset-password")
async def reset_student_password_admin(
    student_id: int,
    body: dict,
    db: Session = Depends(get_db),
    current_admin = Depends(get_current_admin),
):
    """Set a new password for a student (Admin only)"""
    new_password = body.get("new_password", "").strip()
    if len(new_password) < 6:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password must be at least 6 characters",
        )

    student = db.query(Student).options(joinedload(Student.user)).filter(Student.id == student_id).first()
    if not student:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Student not found")
    if not student.user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Student user account not found")

    student.user.password_hash = get_password_hash(new_password)
    db.commit()
    return {"message": "Password updated successfully"}

@router.delete("/students/{student_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_student_admin(
    student_id: int,
    db: Session = Depends(get_db),
    current_admin = Depends(get_current_admin)
):
    """Delete student and their user account (Admin only)"""
    try:
        student = db.query(Student).filter(Student.id == student_id).first()
        if not student:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Student not found"
            )
        
        user_id = student.user_id

        for proj in db.query(Project).filter(Project.student_id == student_id).all():
            delete_cloudinary_urls(proj.image_urls or [])

        # Delete related records to avoid foreign key violations
        # Order matters! Delete from tables with foreign keys first
        db.query(Registration).filter(Registration.student_id == student_id).delete(synchronize_session=False)
        db.query(MaterialAccess).filter(MaterialAccess.student_id == student_id).delete(synchronize_session=False)
        invalidate_progress_cache(student_id)
        db.query(Enrollment).filter(Enrollment.student_id == student_id).delete(synchronize_session=False)
        db.query(Project).filter(Project.student_id == student_id).delete(synchronize_session=False)
        db.query(Certificate).filter(Certificate.student_id == student_id).delete(synchronize_session=False)

        # Finally delete the student record
        db.delete(student)

        # Also delete the user account
        if user_id:
            user = db.query(UserPersonal).filter(UserPersonal.id == user_id).first()
            if user:
                delete_cloudinary_by_url(user.profile_image)
                db.delete(user)
        
        db.commit()
        return None
    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete student: {str(e)}"
        )

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
    """Mark a chapter as accessed/grant access (Admin only).

    On a brand-new grant the student is notified by email. An already-existing
    access record is treated as an "update" and does NOT re-notify.
    """
    # Verify student exists (load user for the email below)
    student = (
        db.query(Student)
        .options(joinedload(Student.user))
        .filter(Student.id == student_id)
        .first()
    )
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    # Verify chapter exists (load course for the email body)
    chapter = (
        db.query(Chapter)
        .options(joinedload(Chapter.course))
        .filter(Chapter.id == chapter_id)
        .first()
    )
    if not chapter:
        raise HTTPException(status_code=404, detail="Chapter not found")

    # Check if access already exists (chapter-level access)
    existing = db.query(MaterialAccess).filter(
        MaterialAccess.student_id == student_id,
        MaterialAccess.chapter_id == chapter_id,
        MaterialAccess.lesson_id.is_(None)
    ).first()

    if existing:
        if existing.accessed_at is None:
            existing.accessed_at = datetime.now(timezone.utc)
            db.commit()
            invalidate_progress_cache(student_id)
        return {"message": "Access updated", "access_id": existing.id}

    # Create new access
    material_access = MaterialAccess(
        chapter_id=chapter_id,
        student_id=student_id,
        accessed_at=datetime.now(timezone.utc)
    )
    db.add(material_access)
    db.commit()
    db.refresh(material_access)
    invalidate_progress_cache(student_id)

    email_sent = False
    if (
        student.user is not None
        and student.user.email
        and student.user.is_active
    ):
        course_title = localized_label(chapter.course.title if chapter.course else "")
        email_sent = await email_service.send_material_access_granted(
            student.user.email,
            student.user.first_name or "",
            localized_label(chapter.title),
            course_title,
        )

    return {
        "message": "Material (chapter) access granted",
        "access_id": material_access.id,
        "email_sent": email_sent,
    }

@router.get("/students/{student_id}/dashboard")
async def get_student_dashboard_admin(
    student_id: int,
    db: Session = Depends(get_db),
    current_admin = Depends(get_current_admin),
):
    """Return the same dashboard payload (student + per-course progress + materials)
    that /student/dashboard returns for the logged-in student, but for any student.
    """
    student = db.query(Student).filter(Student.id == student_id).first()
    if not student:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Student not found")
    if build_student_dashboard is None:
        raise HTTPException(status_code=503, detail="Dashboard helper not deployed")
    return build_student_dashboard(db, student_id)


@router.get("/students/{student_id}/enrollments")
async def get_student_enrollments_admin(
    student_id: int,
    db: Session = Depends(get_db),
    current_admin = Depends(get_current_admin)
):
    """Get all course enrollments for a student (Admin only)"""
    student = db.query(Student).filter(Student.id == student_id).first()
    if not student:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Student not found")

    enrollments = db.query(Enrollment).options(
        joinedload(Enrollment.course)
    ).filter(Enrollment.student_id == student_id).all()

    dirty = False
    # Backfill: if the student has a legacy course_id but no Enrollment row for it, create one.
    if student.course_id and not any(e.course_id == student.course_id for e in enrollments):
        legacy_course = db.query(Course).filter(Course.id == student.course_id).first()
        if legacy_course:
            backfill = Enrollment(
                student_id=student_id,
                course_id=student.course_id,
                status=DbEnrollmentStatus.ACTIVE,
                enrolled_date=datetime.now(timezone.utc),
            )
            db.add(backfill)
            db.flush()
            enrollments = db.query(Enrollment).options(
                joinedload(Enrollment.course)
            ).filter(Enrollment.student_id == student_id).all()
            dirty = True

    data = []
    for e in enrollments:
        if compute_course_progress is None:
            prog = {
                "total_lessons": 0,
                "total_chapters": 0,
                "available_lessons": 0,
                "accessed_lessons": 0,
                "accessed_chapters": 0,
                "percentage": float(e.progress or 0),
            }
        else:
            prog = compute_course_progress(db, student_id, e.course_id)

        progress_int = int(prog["percentage"])
        if progress_int != (e.progress or 0):
            e.progress = progress_int
            dirty = True
        should_be_completed = (
            prog["total_lessons"] > 0
            and prog["available_lessons"] >= prog["total_lessons"]
        )
        if should_be_completed != bool(e.is_completed):
            e.is_completed = should_be_completed
            dirty = True

        data.append({
            "id": e.id,
            "course_id": e.course_id,
            "course_title": e.course.title if e.course else None,
            "status": e.status.value,
            "enrolled_date": e.enrolled_date,
            "is_completed": e.is_completed,
            "progress": prog,
        })

    if dirty:
        db.commit()

    return {"data": data, "total": len(enrollments)}


@router.post("/students/{student_id}/enrollments")
async def add_student_enrollment_admin(
    student_id: int,
    body: dict,
    db: Session = Depends(get_db),
    current_admin = Depends(get_current_admin)
):
    """Enroll a student in a course (Admin only)"""
    student = db.query(Student).filter(Student.id == student_id).first()
    if not student:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Student not found")

    course_id = body.get("course_id")
    if not course_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="course_id required")

    course = db.query(Course).filter(Course.id == course_id).first()
    if not course:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Course not found")

    existing = db.query(Enrollment).filter(
        Enrollment.student_id == student_id,
        Enrollment.course_id == course_id
    ).first()
    if existing:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Student is already enrolled in this course")

    enrollment = Enrollment(
        student_id=student_id,
        course_id=course_id,
        status=DbEnrollmentStatus.ACTIVE,
        enrolled_date=datetime.now(timezone.utc),
    )
    db.add(enrollment)

    # Set student.course_id if not already set (backward compat)
    if not student.course_id:
        student.course_id = course_id

    db.commit()
    db.refresh(enrollment)

    return {
        "id": enrollment.id,
        "course_id": enrollment.course_id,
        "course_title": course.title,
        "status": enrollment.status.value,
        "enrolled_date": enrollment.enrolled_date,
    }


@router.delete("/students/{student_id}/enrollments/{enrollment_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_student_enrollment_admin(
    student_id: int,
    enrollment_id: int,
    db: Session = Depends(get_db),
    current_admin = Depends(get_current_admin)
):
    """Remove a course enrollment from a student (Admin only)"""
    enrollment = db.query(Enrollment).filter(
        Enrollment.id == enrollment_id,
        Enrollment.student_id == student_id
    ).first()
    if not enrollment:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Enrollment not found")

    course_id = enrollment.course_id
    student = db.query(Student).filter(Student.id == student_id).first()

    # Cascade-revoke any chapter/lesson MaterialAccess belonging to this course —
    # otherwise stale access rows linger and the Access tab still shows them.
    chapter_ids = [cid for (cid,) in db.query(Chapter.id).filter(Chapter.course_id == course_id).all()]
    lesson_ids = []
    if chapter_ids:
        lesson_ids = [lid for (lid,) in db.query(Lesson.id).filter(Lesson.chapter_id.in_(chapter_ids)).all()]

    if chapter_ids or lesson_ids:
        db.query(MaterialAccess).filter(
            MaterialAccess.student_id == student_id,
            or_(
                MaterialAccess.chapter_id.in_(chapter_ids) if chapter_ids else False,
                MaterialAccess.lesson_id.in_(lesson_ids) if lesson_ids else False,
            ),
        ).delete(synchronize_session=False)

    # If the student's legacy course_id pointed at this course, clear it —
    # otherwise get_student_enrollments_admin's backfill silently re-creates
    # the enrollment we just removed.
    if student and student.course_id == course_id:
        student.course_id = None
        # Move legacy course_id to the next remaining enrollment, if any,
        # so existing logic that relies on it still works.
        next_enrollment = db.query(Enrollment).filter(
            Enrollment.student_id == student_id,
            Enrollment.id != enrollment_id,
        ).order_by(Enrollment.enrolled_date.asc()).first()
        if next_enrollment:
            student.course_id = next_enrollment.course_id

    # Also clear last_chapter/last_lesson pointers if they belonged to the course we removed.
    if student and student.last_chapter_id and student.last_chapter_id in chapter_ids:
        student.last_chapter_id = None
    if student and student.last_lesson_id and student.last_lesson_id in lesson_ids:
        student.last_lesson_id = None

    db.delete(enrollment)
    db.commit()
    return None


@router.delete("/students/access/{access_id}", status_code=status.HTTP_204_NO_CONTENT)
async def revoke_student_access_admin(
    access_id: int,
    db: Session = Depends(get_db),
    current_admin = Depends(get_current_admin)
):
    """Revoke student material/lesson access (Admin only)"""
    access = db.query(MaterialAccess).filter(MaterialAccess.id == access_id).first()
    if not access:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Access record not found"
        )
    db.delete(access)
    db.commit()
    return None

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
    new_status = _registration_status_to_db(status_data.status)

    # Prevent invalid status transitions
    if old_status == DbRegistrationStatus.COMPLETED and new_status != DbRegistrationStatus.COMPLETED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot change status of completed registration"
        )

    student = registration.student
    user = student.user if student else None
    course = registration.course

    if not student or not user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Registration is missing a linked student or user account",
        )

    if not course:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Registration is missing a linked course",
        )

    # Update status (must use DB enum, not Pydantic enum — avoids ORM/PostgreSQL errors)
    registration.status = new_status
    db.commit()

    student_name = f"{user.first_name} {user.last_name}"
    
    # Fix: Safely handle course title
    if isinstance(course.title, dict):
        course_name = course.title.get("en", "Course")
    else:
        course_name = str(course.title)
    
    # Send appropriate email based on status
    email_sent = False
    temp_password = None
    
    if new_status == DbRegistrationStatus.CONFIRMED:
        # Activate student account and send credentials
        user.is_active = True
        student.course_id = registration.course_id
        student.status = DbRegistrationStatus.CONFIRMED

        # Only (re)issue a temp password on the *transition* into CONFIRMED.
        # Re-confirming an already-confirmed registration must not overwrite
        # the student's current password.
        if old_status != DbRegistrationStatus.CONFIRMED:
            temp_password = secrets.token_urlsafe(12)
            user.password_hash = get_password_hash(temp_password)

        db.commit()

        email_sent = await email_service.send_registration_confirmed(
            to_email=user.email,
            student_name=student_name,
            course_name=course_name,
            login_email=user.email,
            temp_password=temp_password
        ) if temp_password else True
    
    elif new_status == DbRegistrationStatus.COMPLETED:
        email_sent = await email_service.send_course_completed(
            to_email=user.email,
            student_name=student_name,
            course_name=course_name
        )
    
    elif new_status == DbRegistrationStatus.REJECTED:
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
        "temp_password": temp_password if new_status == DbRegistrationStatus.CONFIRMED else None
    }

@router.delete("/registrations/{registration_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_registration_admin(
    registration_id: int,
    db: Session = Depends(get_db),
    current_admin = Depends(get_current_admin)
):
    """Delete registration (Admin only)"""
    try:
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
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete registration: {str(e)}"
        )

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
    db_new_status = _registration_status_to_db(new_status)

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
            registration.status = db_new_status
            
            # Handle confirmed status
            if db_new_status == DbRegistrationStatus.CONFIRMED:
                student = registration.student
                user = student.user if student else None
                if not student or not user:
                    raise ValueError("Missing student or user for this registration")
                user.is_active = True
                student.course_id = registration.course_id
                student.status = DbRegistrationStatus.CONFIRMED

                # Only issue a new temp password on the actual transition into
                # CONFIRMED — never overwrite an already-confirmed student's password.
                temp_password = None
                if old_status != DbRegistrationStatus.CONFIRMED:
                    temp_password = secrets.token_urlsafe(12)
                    user.password_hash = get_password_hash(temp_password)

                # Fix: Safely handle course title
                if isinstance(registration.course.title, dict):
                    course_name = registration.course.title.get("en", "Course")
                else:
                    course_name = str(registration.course.title)

                if temp_password:
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
                "new_status": db_new_status.value
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
        Registration.status == DbRegistrationStatus.PENDING
    ).count()
    confirmed = db.query(Registration).filter(
        Registration.status == DbRegistrationStatus.CONFIRMED
    ).count()
    completed = db.query(Registration).filter(
        Registration.status == DbRegistrationStatus.COMPLETED
    ).count()
    rejected = db.query(Registration).filter(
        Registration.status == DbRegistrationStatus.REJECTED
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
