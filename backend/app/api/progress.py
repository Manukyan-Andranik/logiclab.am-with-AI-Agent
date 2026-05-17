"""Shared progress calculation helpers (used by /student/dashboard and admin endpoints).

Performance notes
-----------------
This module is one of the hottest read paths on the platform: every dashboard
render, every admin students refresh, and every materials poll calls it.
On LiteSpeed (limited child workers) the original implementation issued
three separate queries per call and was dominating worker CPU + DB time.

Optimizations applied:
  1. Two queries (instead of three) — chapter+lesson topology fetched in one
     joined query, plus a single narrow MaterialAccess scan.
  2. Process-local TTL cache keyed by (student_id, course_id).
     - 30 s TTL: absorbs React Query refetches, StrictMode double-mounts and
       admin list re-renders; short enough that user-visible progress changes
       show up promptly.
     - `invalidate_progress_cache(student_id, course_id=None)` is exposed so
       write paths (mark-accessed, grant/revoke) can clear stale entries
       immediately.
  3. Thread-safe (RLock) — FastAPI sync routes execute in a thread pool.

The set-math semantics are intentionally preserved bit-for-bit:
  • A MaterialAccess row with `lesson_id` set is a lesson-level grant
    (the row's `chapter_id` is informational only).
  • A row with `chapter_id` set and `lesson_id` NULL is a chapter-level
    grant — all lessons in that chapter become accessed.
"""
from __future__ import annotations

import threading
import time
from collections import defaultdict
from typing import Any, Dict, List, Optional, Set, Tuple

from sqlalchemy.orm import Session

from ..models.models import Chapter, Lesson, MaterialAccess


# ----------------------------------------------------------------------------
# In-process TTL cache
# ----------------------------------------------------------------------------
_CACHE_TTL_SECONDS = 30.0
_CACHE_MAX_ENTRIES = 4096

_cache: Dict[Tuple[int, int], Tuple[float, Dict[str, Any]]] = {}
_cache_lock = threading.RLock()


def _cache_get(key: Tuple[int, int]) -> Optional[Dict[str, Any]]:
    with _cache_lock:
        entry = _cache.get(key)
        if entry is None:
            return None
        expires_at, value = entry
        if expires_at < time.monotonic():
            _cache.pop(key, None)
            return None
        return value


def _cache_set(key: Tuple[int, int], value: Dict[str, Any]) -> None:
    with _cache_lock:
        if len(_cache) >= _CACHE_MAX_ENTRIES:
            drop = max(1, _CACHE_MAX_ENTRIES // 10)
            for k in list(_cache.keys())[:drop]:
                _cache.pop(k, None)
        _cache[key] = (time.monotonic() + _CACHE_TTL_SECONDS, value)


def invalidate_progress_cache(student_id: int, course_id: Optional[int] = None) -> None:
    """Drop cached progress for a student (optionally scoped to one course).

    Call this from any write path that changes MaterialAccess rows
    (mark-accessed, grant/revoke, enrollment changes, etc).
    """
    with _cache_lock:
        if course_id is not None:
            _cache.pop((student_id, course_id), None)
        else:
            for k in [k for k in _cache if k[0] == student_id]:
                _cache.pop(k, None)


def clear_progress_cache() -> None:
    """Clear the entire cache (admin/test helper)."""
    with _cache_lock:
        _cache.clear()


# ----------------------------------------------------------------------------
# Core computation
# ----------------------------------------------------------------------------
def compute_course_progress(
    db: Session,
    student_id: int,
    course_id: int,
    *,
    use_cache: bool = True,
) -> Dict[str, Any]:
    """Compute a student's progress for a single course."""
    cache_key = (student_id, course_id)
    if use_cache:
        cached = _cache_get(cache_key)
        if cached is not None:
            return cached

    # --- 1. Course topology: chapters + their lessons in a single joined
    # query. We pull only the IDs (no ORM objects) to keep this cheap. ---
    topo_rows = (
        db.query(Chapter.id, Lesson.id)
        .outerjoin(Lesson, Lesson.chapter_id == Chapter.id)
        .filter(Chapter.course_id == course_id)
        .all()
    )

    chapter_lessons: Dict[int, Set[int]] = defaultdict(set)
    all_chapter_ids: Set[int] = set()
    all_lessons: Set[int] = set()
    for chapter_id, lesson_id in topo_rows:
        all_chapter_ids.add(chapter_id)
        if lesson_id is not None:
            chapter_lessons[chapter_id].add(lesson_id)
            all_lessons.add(lesson_id)

    total_chapters = len(all_chapter_ids)
    total_lessons = len(all_lessons)

    if total_chapters == 0 and total_lessons == 0:
        result = {
            "total_lessons": 0,
            "total_chapters": 0,
            "available_lessons": 0,
            "accessed_lessons": 0,
            "accessed_chapters": 0,
            "percentage": 0.0,
        }
        if use_cache:
            _cache_set(cache_key, result)
        return result

    # --- 2. Narrow MaterialAccess scan: only the columns we need, scoped
    # to this student and to chapters/lessons that belong to this course. ---
    chapter_id_list: List[int] = list(all_chapter_ids)
    lesson_id_list: List[int] = list(all_lessons)

    access_q = db.query(MaterialAccess.chapter_id, MaterialAccess.lesson_id).filter(
        MaterialAccess.student_id == student_id
    )
    # Restrict to this course: row must reference a chapter OR a lesson in
    # this course's topology. Branch on what we have to keep the SQL minimal.
    if chapter_id_list and lesson_id_list:
        from sqlalchemy import or_
        access_q = access_q.filter(
            or_(
                MaterialAccess.chapter_id.in_(chapter_id_list),
                MaterialAccess.lesson_id.in_(lesson_id_list),
            )
        )
    elif chapter_id_list:
        access_q = access_q.filter(MaterialAccess.chapter_id.in_(chapter_id_list))
    else:
        access_q = access_q.filter(MaterialAccess.lesson_id.in_(lesson_id_list))

    granted_lesson_ids: Set[int] = set()
    granted_chapter_ids: Set[int] = set()

    for ma_chapter_id, ma_lesson_id in access_q.all():
        # Lesson-level grant takes precedence (matches original semantics).
        if ma_lesson_id is not None and ma_lesson_id in all_lessons:
            granted_lesson_ids.add(ma_lesson_id)
            if ma_chapter_id is not None:
                granted_chapter_ids.add(ma_chapter_id)
        elif ma_chapter_id is not None and ma_chapter_id in chapter_lessons:
            granted_chapter_ids.add(ma_chapter_id)
            granted_lesson_ids.update(chapter_lessons[ma_chapter_id])

    accessed_count = len(granted_lesson_ids)
    percentage = (
        round((accessed_count / total_lessons * 100), 2) if total_lessons > 0 else 0.0
    )

    result = {
        "total_lessons": total_lessons,
        "total_chapters": total_chapters,
        "available_lessons": accessed_count,
        "accessed_lessons": accessed_count,
        "accessed_chapters": len(granted_chapter_ids),
        "percentage": percentage,
    }

    if use_cache:
        _cache_set(cache_key, result)
    return result
