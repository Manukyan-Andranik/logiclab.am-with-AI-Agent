"""
Print the per-course / per-status row counts in `enrollments` and `students`.
Run from the backend dir:

    python -m scripts.inspect_course_students
"""
from __future__ import annotations

import sys
from sqlalchemy import func

sys.path.insert(0, __file__.rsplit("/scripts/", 1)[0])

from app.core.database import SessionLocal  # type: ignore
from app.models.models import Enrollment, Student  # type: ignore


def _print_table(title: str, rows: list[tuple]) -> None:
    print(f"\n=== {title} ===")
    if not rows:
        print("(no rows)")
        return
    print(f"{'course_id':>10}  {'status':<12}  {'count':>6}")
    print("-" * 32)
    for course_id, status, count in rows:
        status_str = getattr(status, "value", status) if status is not None else "NULL"
        cid_str = "NULL" if course_id is None else str(course_id)
        print(f"{cid_str:>10}  {str(status_str):<12}  {count:>6}")
    print(f"{'TOTAL':>10}  {'':<12}  {sum(r[2] for r in rows):>6}")


def main() -> None:
    db = SessionLocal()
    try:
        enroll_rows = (
            db.query(Enrollment.course_id, Enrollment.status, func.count().label("c"))
            .group_by(Enrollment.course_id, Enrollment.status)
            .order_by(Enrollment.course_id, Enrollment.status)
            .all()
        )
        student_rows = (
            db.query(Student.course_id, Student.status, func.count().label("c"))
            .group_by(Student.course_id, Student.status)
            .order_by(Student.course_id, Student.status)
            .all()
        )
        _print_table("enrollments (course_id, status, count)", enroll_rows)
        _print_table("students    (course_id, status, count)", student_rows)
    finally:
        db.close()


if __name__ == "__main__":
    main()
