"""Builds the same per-student multi-course dashboard payload that
/student/dashboard returns, so admin endpoints can reuse the exact shape.
"""
from typing import Any, Dict, List, Set, Optional
from sqlalchemy import or_
from sqlalchemy.orm import Session, joinedload

from ..models.models import Chapter, Course, Enrollment, Lesson, MaterialAccess, Student
from .progress import compute_course_progress


def build_student_dashboard(db: Session, student_id: int) -> Dict[str, Any]:
    """Return {student, courses[]} matching StudentDashboardData."""
    student = (
        db.query(Student)
        .options(joinedload(Student.user))
        .filter(Student.id == student_id)
        .first()
    )
    if student is None:
        return {"student": None, "courses": []}

    enrollments = (
        db.query(Enrollment)
        .options(joinedload(Enrollment.course), joinedload(Enrollment.certificate))
        .filter(Enrollment.student_id == student_id)
        .all()
    )

    enrolled_course_map: Dict[int, Any] = {e.course_id: e for e in enrollments}

    if student.course_id and student.course_id not in enrolled_course_map:
        legacy_course = db.query(Course).filter(Course.id == student.course_id).first()
        if legacy_course:
            enrolled_course_map[student.course_id] = None

    courses_data: List[Dict[str, Any]] = []

    for course_id, enrollment in enrolled_course_map.items():
        course = (
            enrollment.course
            if enrollment is not None
            else db.query(Course).filter(Course.id == course_id).first()
        )
        if course is None:
            continue

        chapter_ids = [
            r[0] for r in db.query(Chapter.id).filter(Chapter.course_id == course_id).all()
        ]

        materials_list: List[Dict[str, Any]] = []

        if chapter_ids:
            access_filter: List[Any] = [MaterialAccess.chapter_id.in_(chapter_ids)]
            lesson_ids = [
                r[0]
                for r in db.query(Lesson.id)
                .join(Chapter)
                .filter(Chapter.course_id == course_id)
                .all()
            ]
            if lesson_ids:
                access_filter.append(MaterialAccess.lesson_id.in_(lesson_ids))
            combined_filter = or_(*access_filter) if len(access_filter) > 1 else access_filter[0]

            material_accesses = (
                db.query(MaterialAccess)
                .options(
                    joinedload(MaterialAccess.chapter)
                    .joinedload(Chapter.lessons)
                    .joinedload(Lesson.materials),
                    joinedload(MaterialAccess.lesson)
                    .joinedload(Lesson.chapter)
                    .joinedload(Chapter.lessons)
                    .joinedload(Lesson.materials),
                )
                .filter(MaterialAccess.student_id == student_id, combined_filter)
                .all()
            )

            chapters_map: Dict[int, Dict[str, Any]] = {}
            # lesson_id -> set of granted link indices. None in set means full lesson access.
            lesson_access_map: Dict[int, Set[Optional[int]]] = {}
            # chapter_id -> boolean (True if full chapter access granted)
            chapter_access_map: Dict[int, bool] = {}

            for access in material_accesses:
                if access.lesson_id:
                    lesson_access_map.setdefault(access.lesson_id, set()).add(access.resource_link_index)
                elif access.chapter_id:
                    chapter_access_map[access.chapter_id] = True

            # Process accesses to build chapters/lessons
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
                    {
                        "chapter_id": chapter.id,
                        "chapter_title": chapter.title,
                        "chapter_order": chapter.order_index,
                        "is_accessed": False,
                        "lessons": [],
                        "_lesson_ids": set(),
                    },
                )

                if access.accessed_at is not None:
                    chapter_entry["is_accessed"] = True

                # If student has chapter-level access, they get ALL lessons in it
                if chapter_access_map.get(chapter.id):
                    lessons_for_access = sorted(chapter.lessons, key=lambda l: l.order_index)
                    is_full_chapter = True
                else:
                    lessons_for_access = [lesson] if lesson else []
                    is_full_chapter = False

                for l in lessons_for_access:
                    if l.id in chapter_entry["_lesson_ids"]:
                        continue
                    
                    full_lesson_links = l.effective_links
                    
                    # Determine which links are actually granted
                    # 1. Full chapter access -> all links
                    # 2. Full lesson access (resource_link_index is None) -> all links
                    # 3. Granular access -> only specific indices
                    
                    granted_indices = lesson_access_map.get(l.id, set())
                    has_full_lesson = is_full_chapter or (None in granted_indices)
                    
                    if has_full_lesson:
                        final_links = full_lesson_links
                    else:
                        # Filter by granted indices
                        final_links = [
                            full_lesson_links[idx] 
                            for idx in sorted(list(granted_indices)) 
                            if idx is not None and 0 <= idx < len(full_lesson_links)
                        ]
                    
                    if final_links or has_full_lesson:
                        chapter_entry["lessons"].append(
                            {
                                "lesson_id": l.id,
                                "lesson_title": l.title,
                                "lesson_order": l.order_index,
                                "resource_links": final_links,
                            }
                        )
                        chapter_entry["_lesson_ids"].add(l.id)

            materials_list = sorted(chapters_map.values(), key=lambda x: x["chapter_order"])
            for ch in materials_list:
                ch["lessons"].sort(key=lambda x: x["lesson_order"])
                ch.pop("_lesson_ids", None)

        progress = compute_course_progress(db, student_id, course_id)

        courses_data.append(
            {
                "course_id": course_id,
                "course": {
                    "id": course.id,
                    "title": course.title,
                    "slug": course.slug,
                    "icon_url": course.icon_url,
                    "duration_months": course.duration_months,
                },
                "enrollment_id": enrollment.id if enrollment else None,
                "enrollment_status": enrollment.status.value if enrollment else "active",
                "is_completed": enrollment.is_completed if enrollment else False,
                "certificate_url": enrollment.certificate.certificate_url if (enrollment and enrollment.certificate) else None,
                "progress": progress,
                "materials": materials_list,
            }
        )

    return {"student": student, "courses": courses_data}
