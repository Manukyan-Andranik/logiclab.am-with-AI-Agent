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

from sqlalchemy.orm import Session, joinedload
from sqlalchemy.orm.attributes import flag_modified

from ..core.config import settings
from ..models.exams import Exam, ExamAnswer, ExamAttempt, ExamAuditLog, AttemptStatus, ExamStatus
from ..models.models import Student
from .grading.engine import GradingEngine
from .grading.exceptions import ValidationError
from .grading.normalization import legacy_float, to_decimal
from .grading.calculators import is_auto_gradable
from .grading.question_graders.registry import grade_question as _grade_question_outcome


class ExamService:
    """Business logic for exams."""

    @staticmethod
    def is_auto_gradable(question_type: Optional[str], question: Optional[Dict[str, Any]] = None) -> bool:
        return is_auto_gradable(question_type, question)

    @staticmethod
    def has_answer(answer_data: Any) -> bool:
        """True when the student provided a non-empty response (skip blank/skipped items)."""
        if answer_data is None:
            return False
        if isinstance(answer_data, bool):
            return True
        if isinstance(answer_data, str):
            return bool(answer_data.strip())
        if isinstance(answer_data, (list, tuple)):
            return len(answer_data) > 0
        if isinstance(answer_data, dict):
            return len(answer_data) > 0
        return True

    @staticmethod
    def answered_question_ids(answers: Optional[Dict[str, Any]]) -> set[str]:
        return GradingEngine.answered_question_ids(answers)

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
        status_val = ExamService._exam_status_value(exam)

        if not ExamService.is_exam_active_status(exam):
            if status_val == ExamStatus.ARCHIVED.value:
                return "unavailable", "This exam has been archived"
            if status_val == ExamStatus.DRAFT.value:
                return "waiting", "Assigned to you — waiting for instructor to start"
            if status_val == ExamStatus.INACTIVE.value:
                return "waiting", "Not open yet — instructor has not started this exam"
            return "waiting", "Waiting for instructor to start the exam"

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
    def _attempt_status_value(attempt: ExamAttempt) -> str:
        status = attempt.status
        if isinstance(status, AttemptStatus):
            return status.value
        return str(status.value if hasattr(status, "value") else status)

    @staticmethod
    def student_exam_display_status(
        in_progress: Optional[ExamAttempt],
        latest_attempt: Optional[ExamAttempt],
    ) -> str:
        """
        Student-facing status for dashboard:
        unfinished | submitted | not_available
        """
        if in_progress is not None:
            return "unfinished"
        if latest_attempt is not None:
            if ExamService._attempt_status_value(latest_attempt) in (
                AttemptStatus.SUBMITTED.value,
                AttemptStatus.GRADED.value,
            ):
                return "submitted"
        return "not_available"

    @staticmethod
    def student_may_access(exam: Exam, student_id: int) -> bool:
        allowed = ExamService.normalize_allowed_student_ids(exam.allowed_student_ids)
        if allowed and student_id not in allowed:
            return False
        return True

    @staticmethod
    def flatten_questions(questions_data: Dict[str, Any]) -> List[Dict[str, Any]]:
        return GradingEngine.flatten_questions(questions_data)

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
    def submission_roots() -> tuple[Path, Path]:
        """(primary private dir, legacy public uploads/submissions for old rows)."""
        primary = Path(settings.EXAM_SUBMISSION_DIR).resolve()
        legacy = (Path(settings.UPLOAD_DIR) / "submissions").resolve()
        return primary, legacy

    @staticmethod
    def write_submission_file(submission_data: Dict[str, Any], exam_id: int, student_id: int) -> str:
        subdir = Path(settings.EXAM_SUBMISSION_DIR)
        subdir.mkdir(parents=True, exist_ok=True)
        filename = f"exam_{exam_id}_student_{student_id}_{uuid.uuid4().hex}.json"
        path = (subdir / filename).resolve()
        primary_root, _ = ExamService.submission_roots()
        if not str(path).startswith(str(primary_root)):
            raise ValueError("Invalid submission path")
        path.write_text(json.dumps(submission_data, indent=2, ensure_ascii=False), encoding="utf-8")
        return str(path)

    @staticmethod
    def resolve_submission_path(stored_path: str) -> Path:
        """Resolve stored path and ensure it stays under an allowed submission root."""
        path = Path(stored_path).resolve()
        primary_root, legacy_root = ExamService.submission_roots()
        for root in (primary_root, legacy_root):
            try:
                path.relative_to(root)
                return path
            except ValueError:
                continue
        raise ValueError("Submission path outside allowed directories")

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
            question = ExamService.find_question_in_exam(qdata, question_id)
            if question and answer_value is not None:
                try:
                    answer_value = GradingEngine.validate_and_normalize_answer(question, answer_value)
                except ValidationError:
                    continue
            merged[question_id] = answer_value
            question = ExamService.find_question_in_exam(qdata, question_id)
            max_pts = legacy_float(to_decimal(question.get("points", 0))) if question else 0.0
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
        return GradingEngine.find_question(questions_data, question_id)

    @staticmethod
    def grade_attempt(
        db: Session,
        attempt_id: int,
        *,
        only_auto: bool = False,
        graded_by_id: Optional[int] = None,
        regrade: bool = False,
    ) -> Dict[str, Any]:
        return GradingEngine.grade_attempt(
            db,
            attempt_id,
            only_auto=only_auto,
            graded_by_id=graded_by_id,
            regrade=regrade,
        )

    @staticmethod
    def recalculate_attempt_scores(
        db: Session, attempt: ExamAttempt, exam: Exam
    ) -> Dict[str, Any]:
        """Sum per-answer scores and set attempt status (submitted vs fully graded)."""
        summary = GradingEngine.recalculate_attempt(db, attempt, exam)
        score_percent = None
        if summary.max_points > 0:
            score_percent = round(
                float((summary.earned_points / summary.max_points) * 100), 2
            )
        return {
            "score": legacy_float(summary.earned_points),
            "max_score": legacy_float(summary.max_points),
            "score_percent": score_percent,
            "answered_count": summary.answered_count,
            "pending_manual_count": summary.pending_manual_count,
            "grading_status": summary.grading_status,
            "attempt_status": summary.attempt_status,
            "integrity_score": summary.integrity_score,
        }

    @staticmethod
    def _format_answer_for_display(question: Dict[str, Any], answer_data: Any) -> str:
        qtype = question.get("type")
        if answer_data is None:
            return ""
        if qtype in ("single_choice", "multiple_choice") and question.get("options"):
            opts = {o["id"]: o for o in question["options"] if isinstance(o, dict) and "id" in o}
            if qtype == "single_choice":
                opt = opts.get(answer_data)
                return opt.get("text", str(answer_data)) if opt else str(answer_data)
            if isinstance(answer_data, list):
                return "; ".join(
                    opts.get(i, {}).get("text", str(i)) if isinstance(opts.get(i), dict) else str(i)
                    for i in answer_data
                )
        if qtype == "true_false":
            return "True" if answer_data is True else "False" if answer_data is False else str(answer_data)
        if isinstance(answer_data, (dict, list)):
            return json.dumps(answer_data, ensure_ascii=False)
        return str(answer_data)

    @staticmethod
    def _question_grading_keys_for_admin(question: Dict[str, Any]) -> Dict[str, Any]:
        """Expose correct answers as human-readable values for admin graders."""
        qtype = question.get("type")
        out: Dict[str, Any] = {}

        if qtype == "single_choice" and "correct_answer_id" in question:
            out["correct_answer"] = ExamService._format_answer_for_display(
                question, question["correct_answer_id"]
            )

        elif qtype == "multiple_choice" and "correct_answer_ids" in question:
            out["correct_answers"] = ExamService._format_answer_for_display(
                question, question.get("correct_answer_ids", [])
            )

        elif qtype == "true_false" and "correct_answer" in question:
            val = question["correct_answer"]
            out["correct_answer"] = "True" if val is True else "False" if val is False else str(val)

        elif qtype == "short_answer" and question.get("correct_answers"):
            answers = question["correct_answers"]
            if isinstance(answers, list):
                out["correct_answers"] = "; ".join(str(a) for a in answers)
            else:
                out["correct_answers"] = str(answers)

        elif qtype == "mathematical" and question.get("correct_answer_latex"):
            out["correct_answer"] = str(question["correct_answer_latex"])

        elif qtype == "matching" and question.get("correct_matches"):
            matches = question["correct_matches"]
            pairs = question.get("pairs") or []
            left_by_id = {
                p["left_id"]: p.get("left_text", p["left_id"])
                for p in pairs
                if isinstance(p, dict) and p.get("left_id")
            }
            right_by_id = {
                p["right_id"]: p.get("right_text", p["right_id"])
                for p in pairs
                if isinstance(p, dict) and p.get("right_id")
            }
            if isinstance(matches, dict):
                lines = []
                for left_id, right_id in matches.items():
                    left = left_by_id.get(left_id, left_id)
                    right = right_by_id.get(right_id, right_id)
                    lines.append(f"{left} → {right}")
                out["correct_matches"] = lines if lines else matches
            else:
                out["correct_matches"] = matches

        elif qtype == "fill_blank" and question.get("blanks"):
            blank_lines = []
            for blank in question["blanks"]:
                if not isinstance(blank, dict):
                    continue
                bid = blank.get("id", "")
                acceptable = blank.get("acceptable_answers") or blank.get("answers") or []
                if isinstance(acceptable, str):
                    acceptable = [acceptable]
                blank_lines.append(
                    {bid or "blank": "; ".join(str(a) for a in acceptable)}
                    if acceptable
                    else {bid or "blank": "—"}
                )
            if blank_lines:
                out["blanks"] = blank_lines

        elif qtype in ("essay", "code"):
            if question.get("rubric"):
                out["rubric"] = [
                    {
                        "criterion": r.get("description") or r.get("criterion") or r.get("id"),
                        "max_points": r.get("max_points") or r.get("points"),
                    }
                    for r in question["rubric"]
                    if isinstance(r, dict)
                ]
            out["note"] = "Manual grading — see rubric or assign points"

        if not out:
            # Fallback: resolve any ID fields through option text where possible
            for key in (
                "correct_answer_id",
                "correct_answer_ids",
                "correct_answer",
                "correct_answers",
                "correct_answer_latex",
                "correct_matches",
            ):
                if key in question:
                    raw = question[key]
                    if key.endswith("_id") or key.endswith("_ids"):
                        out[key.replace("_id", "").replace("_ids", "s") or "correct_answer"] = (
                            ExamService._format_answer_for_display(question, raw)
                        )
                    else:
                        out[key] = raw

        return out

    @staticmethod
    def build_grading_detail(db: Session, attempt_id: int) -> Optional[Dict[str, Any]]:
        attempt = (
            db.query(ExamAttempt)
            .filter(ExamAttempt.id == attempt_id)
            .options(
                joinedload(ExamAttempt.exam),
                joinedload(ExamAttempt.student).joinedload(Student.user),
                joinedload(ExamAttempt.answers_details),
            )
            .first()
        )
        if not attempt or not attempt.exam:
            return None

        exam = attempt.exam
        user = attempt.student.user if attempt.student else None
        name = f"{user.first_name} {user.last_name}".strip() if user else "Unknown"

        answers_by_q = {ea.question_id: ea for ea in (attempt.answers_details or [])}
        questions_out: List[Dict[str, Any]] = []

        answered_ids = ExamService.answered_question_ids(attempt.answers)
        for question in ExamService.flatten_questions(
            exam.questions if isinstance(exam.questions, dict) else {}
        ):
            qid = question.get("id")
            if not qid or qid not in answered_ids:
                continue
            ea = answers_by_q.get(qid)
            qtype = question.get("type")
            questions_out.append(
                {
                    "question_id": qid,
                    "type": qtype,
                    "question_text": question.get("question_text", ""),
                    "question_latex": question.get("question_latex"),
                    "points": float(question.get("points", 0)),
                    "options": question.get("options"),
                    "auto_gradable": ExamService.is_auto_gradable(qtype),
                    "answer_keys": ExamService._question_grading_keys_for_admin(question),
                    "student_answer": attempt.answers.get(qid),
                    "student_answer_display": ExamService._format_answer_for_display(
                        question, attempt.answers.get(qid)
                    ),
                    "points_awarded": legacy_float(
                        ea.earned_points or (to_decimal(ea.points_awarded) if ea and ea.points_awarded is not None else None)
                    )
                    if ea
                    else None,
                    "earned_points": legacy_float(ea.earned_points) if ea and ea.earned_points is not None else None,
                    "max_points": legacy_float(to_decimal(ea.max_points)) if ea else float(question.get("points", 0)),
                    "is_correct": ea.is_correct if ea else None,
                    "correctness": (
                        ea.correctness.value if ea and ea.correctness and hasattr(ea.correctness, "value") else None
                    ),
                    "feedback": ea.grader_feedback if ea else None,
                    "rubric_result": ea.rubric_result if ea else None,
                }
            )

        summary = ExamService.recalculate_attempt_scores(db, attempt, exam)

        return {
            "attempt_id": attempt.id,
            "exam_id": exam.id,
            "exam_title": exam.title,
            "student_id": attempt.student_id,
            "student_name": name,
            "student_email": user.email if user else None,
            "submitted_at": (
                ExamService.ensure_aware(attempt.submitted_at).isoformat()
                if attempt.submitted_at
                else None
            ),
            "time_spent_seconds": attempt.time_spent_seconds,
            "grading_version": attempt.grading_version,
            "integrity_score": attempt.integrity_score,
            "questions": questions_out,
            **summary,
        }

    @staticmethod
    def apply_manual_grades(
        db: Session,
        attempt_id: int,
        grades: List[Dict[str, Any]],
        *,
        graded_by_id: Optional[int] = None,
    ) -> Dict[str, Any]:
        result = GradingEngine.apply_manual_grades(
            db, attempt_id, grades, graded_by_id=graded_by_id
        )
        if result.get("success"):
            attempt = db.query(ExamAttempt).filter(ExamAttempt.id == attempt_id).first()
            if attempt:
                ExamService.log_audit(
                    db,
                    attempt.exam_id,
                    "attempt_graded",
                    "admin",
                    actor_id=graded_by_id,
                    details={"attempt_id": attempt_id, **result},
                )
        return result

    @staticmethod
    def student_result_payload(db: Session, attempt_id: int, student_id: int) -> Optional[Dict[str, Any]]:
        """Score summary for students (no correct answers)."""
        detail = ExamService.build_grading_detail(db, attempt_id)
        if not detail:
            return None
        attempt = db.query(ExamAttempt).filter(ExamAttempt.id == attempt_id).first()
        if not attempt or attempt.student_id != student_id:
            return None
        if ExamService._attempt_status_value(attempt) == AttemptStatus.IN_PROGRESS.value:
            return None

        questions = []
        for q in detail["questions"]:
            pending = (
                q.get("correctness") == "pending_review"
                or (q["points_awarded"] is None and not q["auto_gradable"])
            )
            questions.append(
                {
                    "question_id": q["question_id"],
                    "type": q["type"],
                    "question_text": q["question_text"],
                    "points": q["points"],
                    "points_awarded": q.get("earned_points", q["points_awarded"]),
                    "earned_points": q.get("earned_points", q["points_awarded"]),
                    "max_points": q["max_points"],
                    "is_correct": q["is_correct"],
                    "correctness": q.get("correctness"),
                    "feedback": q.get("feedback"),
                    "pending_review": pending,
                }
            )

        max_score = detail["max_score"]
        score = detail["score"]
        score_percent = (
            round(float(score / max_score * 100), 2)
            if max_score and max_score > 0 and score is not None
            else None
        )
        return {
            "attempt_id": detail["attempt_id"],
            "exam_id": detail["exam_id"],
            "exam_title": detail["exam_title"],
            "score": score,
            "max_score": max_score,
            "score_percent": score_percent,
            "earned_points": detail.get("earned_points", score),
            "max_points": detail.get("max_points", max_score),
            "grading_status": detail["grading_status"],
            "pending_manual_count": detail["pending_manual_count"],
            "attempt_status": detail["attempt_status"],
            "submitted_at": detail["submitted_at"],
            "integrity_score": detail.get("integrity_score"),
            "questions": questions,
        }

    @staticmethod
    def grade_answer(
        question: Dict[str, Any], answer_data: Any
    ) -> Tuple[Optional[bool], Optional[float]]:
        """Return (is_correct, points). points=None means manual grading required."""
        outcome = _grade_question_outcome(question, answer_data)
        pts = legacy_float(outcome.earned_points) if outcome.earned_points is not None else None
        return outcome.is_correct_legacy, pts
