"""
Exam service — validation, grading, student-safe payloads, submission files.
"""

from __future__ import annotations

import copy
import json
import uuid
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

from sqlalchemy.orm import Session
from sqlalchemy.orm.attributes import flag_modified

from ..core.config import settings
from ..models.exams import Exam, ExamAnswer, ExamAttempt, ExamAuditLog, ExamStatus


class ExamService:
    """Business logic for exams."""

    @staticmethod
    def utc_now() -> datetime:
        return datetime.now(timezone.utc)

    @staticmethod
    def ensure_aware(dt: datetime) -> datetime:
        if dt.tzinfo is None:
            return dt.replace(tzinfo=timezone.utc)
        return dt.astimezone(timezone.utc)

    @staticmethod
    def naive_utc(dt: Optional[datetime] = None) -> datetime:
        """Naive UTC for DateTime columns without timezone=True."""
        return ExamService.ensure_aware(dt or ExamService.utc_now()).replace(tzinfo=None)

    @staticmethod
    def is_exam_active_status(exam: Exam) -> bool:
        return ExamService._exam_status_value(exam).lower() == ExamStatus.ACTIVE.value

    @staticmethod
    def normalize_allowed_student_ids(raw: Any) -> List[int]:
        if not raw:
            return []
        if isinstance(raw, str):
            try:
                raw = json.loads(raw)
            except json.JSONDecodeError:
                return []
        if not isinstance(raw, list):
            return []
        out: List[int] = []
        for item in raw:
            try:
                out.append(int(item))
            except (TypeError, ValueError):
                continue
        return out

    @staticmethod
    def apply_exam_window(exam: Exam, start: Optional[datetime] = None) -> None:
        """Set start_time and end_time from start + duration_minutes."""
        start_naive = ExamService.naive_utc(start)
        exam.start_time = start_naive
        exam.end_time = start_naive + timedelta(minutes=exam.duration_minutes)

    @staticmethod
    def sync_end_time_from_duration(exam: Exam) -> None:
        """Recalculate end_time when duration changes during an active window."""
        if exam.start_time is not None:
            ExamService.apply_exam_window(exam, exam.start_time)

    @staticmethod
    def _exam_status_value(exam: Exam) -> str:
        status = exam.status
        if isinstance(status, ExamStatus):
            return status.value
        return str(status.value if hasattr(status, "value") else status)

    @staticmethod
    def availability(exam: Exam, now: Optional[datetime] = None) -> Tuple[str, str]:
        """Return (status, message): waiting | available | unavailable."""
        now_naive = ExamService.naive_utc(now)

        if ExamService.is_exam_active_status(exam):
            if exam.start_time is None or exam.end_time is None:
                return "available", "Exam is open"
            end_naive = ExamService.naive_utc(exam.end_time)
            if now_naive > end_naive:
                return "unavailable", "Exam period has ended"
            mins_left = max(0, int((end_naive - now_naive).total_seconds() // 60))
            return "available", f"Exam is open — {mins_left} min remaining"

        if exam.start_time is None or exam.end_time is None:
            return "waiting", "Waiting for instructor to start the exam"

        end_naive = ExamService.naive_utc(exam.end_time)
        if now_naive > end_naive:
            return "unavailable", "Exam period has ended"

        start_naive = ExamService.naive_utc(exam.start_time)
        if now_naive < start_naive:
            return "waiting", f"Starts at {ExamService.ensure_aware(exam.start_time).isoformat()}"
        return "available", "Exam is open"

    @staticmethod
    def student_may_access(exam: Exam, student_id: int) -> bool:
        allowed = ExamService.normalize_allowed_student_ids(exam.allowed_student_ids)
        if allowed and student_id not in allowed:
            return False
        return True

    @staticmethod
    def flatten_questions(questions_data: Dict[str, Any]) -> List[Dict[str, Any]]:
        if not isinstance(questions_data, dict):
            return []
        out: List[Dict[str, Any]] = []
        for q in questions_data.get("questions") or []:
            if isinstance(q, dict):
                out.append(q)
        for section in questions_data.get("sections") or []:
            if not isinstance(section, dict):
                continue
            for q in section.get("questions") or []:
                if isinstance(q, dict):
                    out.append(q)
        return out

    @staticmethod
    def count_questions(questions_data: Dict[str, Any]) -> int:
        return len(ExamService.flatten_questions(questions_data))

    @staticmethod
    def strip_answers_for_student(questions_data: Dict[str, Any]) -> Dict[str, Any]:
        """Remove grading keys before sending exam JSON to students."""
        data = copy.deepcopy(questions_data)

        def scrub(q: Dict[str, Any]) -> None:
            for key in (
                "correct_answer_id",
                "correct_answer_ids",
                "correct_answer",
                "correct_answers",
                "correct_answer_latex",
                "correct_matches",
                "test_cases",
            ):
                q.pop(key, None)

        for q in data.get("questions") or []:
            if isinstance(q, dict):
                scrub(q)
        for section in data.get("sections") or []:
            if not isinstance(section, dict):
                continue
            for q in section.get("questions") or []:
                if isinstance(q, dict):
                    scrub(q)
        return data

    @staticmethod
    def log_audit(
        db: Session,
        exam_id: int,
        action: str,
        actor_type: str,
        actor_id: Optional[int] = None,
        student_id: Optional[int] = None,
        attempt_id: Optional[int] = None,
        details: Optional[Dict[str, Any]] = None,
        is_suspicious: bool = False,
        ip_address: Optional[str] = None,
    ) -> None:
        log = ExamAuditLog(
            exam_id=exam_id,
            action=action,
            actor_type=actor_type,
            actor_id=actor_id,
            student_id=student_id,
            attempt_id=attempt_id,
            details=details or {},
            is_suspicious=is_suspicious,
            ip_address=ip_address,
        )
        db.add(log)
        db.commit()

    @staticmethod
    def write_submission_file(submission_data: Dict[str, Any], exam_id: int, student_id: int) -> str:
        subdir = Path(settings.UPLOAD_DIR) / "submissions"
        subdir.mkdir(parents=True, exist_ok=True)
        filename = f"exam_{exam_id}_student_{student_id}_{uuid.uuid4().hex}.json"
        path = subdir / filename
        path.write_text(json.dumps(submission_data, indent=2, ensure_ascii=False), encoding="utf-8")
        return str(path)

    @staticmethod
    def persist_answers_to_attempt(
        db: Session,
        attempt: ExamAttempt,
        exam: Exam,
        answers: Dict[str, Any],
    ) -> Dict[str, Any]:
        """Merge answers into attempt JSON and exam_answers rows."""
        qdata = exam.questions if isinstance(exam.questions, dict) else {}
        merged = dict(attempt.answers or {})
        for question_id, answer_value in answers.items():
            if not question_id:
                continue
            merged[question_id] = answer_value
            question = ExamService.find_question_in_exam(qdata, question_id)
            max_pts = float(question.get("points", 0)) if question else 0.0
            exam_answer = (
                db.query(ExamAnswer)
                .filter(
                    ExamAnswer.attempt_id == attempt.id,
                    ExamAnswer.question_id == question_id,
                )
                .first()
            )
            if not exam_answer:
                db.add(
                    ExamAnswer(
                        attempt_id=attempt.id,
                        question_id=question_id,
                        answer_value=answer_value,
                        max_points=max_pts,
                    )
                )
            else:
                exam_answer.answer_value = answer_value
                flag_modified(exam_answer, "answer_value")
        attempt.answers = merged
        flag_modified(attempt, "answers")
        return merged

    @staticmethod
    def find_question_in_exam(questions_data: Dict[str, Any], question_id: str) -> Optional[Dict[str, Any]]:
        for q in ExamService.flatten_questions(questions_data):
            if q.get("id") == question_id:
                return q
        return None

    @staticmethod
    def grade_attempt(db: Session, attempt_id: int) -> Dict[str, Any]:
        attempt = db.query(ExamAttempt).filter(ExamAttempt.id == attempt_id).first()
        if not attempt:
            return {"success": False, "error": "Attempt not found"}

        exam = attempt.exam
        total_score = 0.0
        max_score = 0.0
        graded_count = 0

        for question_id, answer_data in (attempt.answers or {}).items():
            question = ExamService.find_question_in_exam(exam.questions, question_id)
            if not question:
                continue
            is_correct, points = ExamService.grade_answer(question, answer_data)
            max_score += float(question.get("points", 0))
            total_score += float(points or 0)
            graded_count += 1

            exam_answer = (
                db.query(ExamAnswer)
                .filter(
                    ExamAnswer.attempt_id == attempt_id,
                    ExamAnswer.question_id == question_id,
                )
                .first()
            )
            if exam_answer:
                exam_answer.is_correct = is_correct
                exam_answer.points_awarded = points
                exam_answer.max_points = float(question.get("points", 0))

        attempt.score = total_score
        attempt.max_score = max_score
        db.commit()
        return {
            "success": True,
            "score": total_score,
            "max_score": max_score,
            "graded_count": graded_count,
        }

    @staticmethod
    def grade_answer(question: Dict[str, Any], answer_data: Any) -> Tuple[Optional[bool], float]:
        question_type = question.get("type")
        points_max = float(question.get("points", 0))

        if question_type == "single_choice":
            correct = answer_data == question.get("correct_answer_id")
            return (correct, points_max if correct else 0.0)

        if question_type == "multiple_choice":
            correct_ids = set(question.get("correct_answer_ids", []))
            answer_ids = set(answer_data if isinstance(answer_data, list) else [])
            if correct_ids == answer_ids:
                return (True, points_max)
            if question.get("partial_credit") and answer_ids.issubset(correct_ids) and answer_ids:
                partial = points_max * len(answer_ids) / len(correct_ids)
                return (False, partial)
            return (False, 0.0)

        if question_type == "true_false":
            correct = answer_data == question.get("correct_answer")
            return (correct, points_max if correct else 0.0)

        if question_type == "short_answer":
            correct_answers = [str(a).lower().strip() for a in question.get("correct_answers", [])]
            user_answer = str(answer_data).lower().strip()
            correct = user_answer in correct_answers
            return (correct, points_max if correct else 0.0)

        return (None, 0.0)
