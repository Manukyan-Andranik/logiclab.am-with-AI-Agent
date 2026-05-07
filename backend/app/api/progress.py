"""Shared progress calculation helpers (used by /student/dashboard and admin endpoints)."""
from collections import defaultdict
from typing import Any, Dict, List, Set
from sqlalchemy import or_
from sqlalchemy.orm import Session

from ..models.models import Chapter, Lesson, MaterialAccess


def compute_course_progress(db: Session, student_id: int, course_id: int) -> Dict[str, Any]:
    """Compute a student's progress for a single course.

    progress.percentage = accessed_lessons / total_lessons * 100,
    where a lesson is counted as "accessed" if the student has any MaterialAccess
    record covering it — either directly (lesson_id) or transitively through a
    chapter-level grant (chapter_id with lesson_id null).
    """
    chapter_ids: List[int] = [
        r[0] for r in db.query(Chapter.id).filter(Chapter.course_id == course_id).all()
    ]

    chapter_lessons: Dict[int, Set[int]] = defaultdict(set)
    all_lessons: Set[int] = set()
    if chapter_ids:
        for lesson_id, chapter_id in db.query(Lesson.id, Lesson.chapter_id).filter(
            Lesson.chapter_id.in_(chapter_ids)
        ).all():
            chapter_lessons[chapter_id].add(lesson_id)
            all_lessons.add(lesson_id)

    total_lessons = len(all_lessons)
    total_chapters = len(chapter_ids)

    granted_lesson_ids: Set[int] = set()
    granted_chapter_ids: Set[int] = set()

    if chapter_ids or all_lessons:
        access_filters = []
        if chapter_ids:
            access_filters.append(MaterialAccess.chapter_id.in_(chapter_ids))
        if all_lessons:
            access_filters.append(MaterialAccess.lesson_id.in_(list(all_lessons)))
        combined = or_(*access_filters) if len(access_filters) > 1 else access_filters[0]

        records = db.query(MaterialAccess).filter(
            MaterialAccess.student_id == student_id,
            combined,
        ).all()

        for access in records:
            if access.lesson_id is not None and access.lesson_id in all_lessons:
                granted_lesson_ids.add(access.lesson_id)
                if access.chapter_id is not None:
                    granted_chapter_ids.add(access.chapter_id)
            elif access.chapter_id is not None and access.chapter_id in chapter_lessons:
                granted_chapter_ids.add(access.chapter_id)
                granted_lesson_ids.update(chapter_lessons[access.chapter_id])

    accessed_count = len(granted_lesson_ids)
    percentage = (
        round((accessed_count / total_lessons * 100), 2) if total_lessons > 0 else 0.0
    )

    return {
        "total_lessons": total_lessons,
        "total_chapters": total_chapters,
        "available_lessons": accessed_count,
        "accessed_lessons": accessed_count,
        "accessed_chapters": len(granted_chapter_ids),
        "percentage": percentage,
    }
