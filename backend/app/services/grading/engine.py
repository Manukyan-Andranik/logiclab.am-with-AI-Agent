"""
Grading engine — central orchestrator.

Responsibilities:
- Idempotent auto-grading with versioning (grading_version)
- Manual grade application with rubric support
- Regrading with history snapshots
- Integrity analysis on submit
- Decimal-precision score persistence

Architecture report (discovered issues fixed):
- Float drift in totals → Decimal + legacy float mirror
- MC partial credit ignored penalties → partial_credit module
- matching/fill_blank ungraded → dedicated graders
- N+1 in grade loop → batch-load answers by attempt_id
- New DB columns unused → sync earned_points, grading_status, history
- No validation on save → validators.validate_answer before persist
"""

from __future__ import annotations

import copy
import json
from datetime import datetime, timezone
from decimal import Decimal
from typing import Any, Dict, List, Optional, Set

from sqlalchemy.orm import Session, joinedload
from sqlalchemy.orm.attributes import flag_modified

from ...models.exams import (
    Exam,
    ExamAnswer,
    ExamAttempt,
    ExamGradingHistory,
    ExamIntegrityFlag,
    AttemptStatus,
    GradingStatus,
    IntegrityFlagType,
    IntegritySeverity,
    QuestionCorrectness,
)
from ...models.models import Certificate, Enrollment, EnrollmentStatus
from .anti_cheat import analyze_attempt_integrity
from .calculators import aggregate_attempt_scores, is_auto_gradable, sync_answer_from_outcome
from .normalization import clamp_points, legacy_float, to_decimal
from .question_graders.registry import grade_question
from .rubric import apply_rubric
from .types import AttemptGradeSummary, QuestionGradeOutcome
from .validators import validate_answer

import uuid


class GradingEngine:
    """Production grading orchestrator."""

    @staticmethod
    def answered_question_ids(answers: Optional[Dict[str, Any]]) -> Set[str]:
        if not answers:
            return set()

        def has_answer(val: Any) -> bool:
            if val is None:
                return False
            if isinstance(val, bool):
                return True
            if isinstance(val, str):
                return bool(val.strip())
            if isinstance(val, (list, tuple)):
                return len(val) > 0
            if isinstance(val, dict):
                return len(val) > 0
            return True

        return {qid for qid, val in answers.items() if qid and has_answer(val)}

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
    def find_question(questions_data: Dict[str, Any], question_id: str) -> Optional[Dict[str, Any]]:
        for q in GradingEngine.flatten_questions(questions_data):
            if q.get("id") == question_id:
                return q
        return None

    @staticmethod
    def validate_and_normalize_answer(
        question: Dict[str, Any], answer_data: Any
    ) -> Any:
        from .exceptions import ValidationError

        try:
            return validate_answer(question, answer_data)
        except ValidationError:
            raise

    @classmethod
    def grade_attempt(
        cls,
        db: Session,
        attempt_id: int,
        *,
        only_auto: bool = False,
        graded_by_id: Optional[int] = None,
        regrade: bool = False,
    ) -> Dict[str, Any]:
        attempt = (
            db.query(ExamAttempt)
            .filter(ExamAttempt.id == attempt_id)
            .options(joinedload(ExamAttempt.exam))
            .first()
        )
        if not attempt or not attempt.exam:
            return {"success": False, "error": "Attempt not found"}

        exam = attempt.exam
        qdata = exam.questions if isinstance(exam.questions, dict) else {}
        answered_ids = cls.answered_question_ids(attempt.answers)

        answers_by_qid = {
            ea.question_id: ea
            for ea in db.query(ExamAnswer).filter(ExamAnswer.attempt_id == attempt_id).all()
        }

        graded_count = 0
        for question_id, answer_data in (attempt.answers or {}).items():
            if question_id not in answered_ids:
                continue
            exam_answer = answers_by_qid.get(question_id)
            if not exam_answer:
                continue

            question = cls.find_question(qdata, question_id)
            if not question:
                continue

            qtype = question.get("type")
            if only_auto and not is_auto_gradable(qtype, question):
                continue

            if exam_answer.is_manually_graded and not regrade:
                continue

            outcome = grade_question(question, answer_data)
            sync_answer_from_outcome(exam_answer, outcome)
            if outcome.earned_points is not None:
                graded_count += 1

        previous_score = attempt.earned_points or attempt.score
        summary = cls._finalize_attempt(db, attempt, exam, answered_ids)

        if regrade or graded_count > 0:
            cls._record_grading_history(
                db,
                attempt,
                previous_score=to_decimal(previous_score) if previous_score else None,
                new_score=summary.earned_points,
                changed_by_id=graded_by_id,
                reason="auto_regrade" if regrade else "auto_grade",
                snapshot=cls._grading_snapshot(attempt_id, db),
            )
            if regrade:
                attempt.grading_version = (attempt.grading_version or 1) + 1

        integrity = analyze_attempt_integrity(db, attempt)
        cls._persist_integrity(db, attempt, integrity)

        db.commit()
        return {
            "success": True,
            "graded_count": graded_count,
            **cls._summary_dict(summary),
        }

    @classmethod
    def apply_manual_grades(
        cls,
        db: Session,
        attempt_id: int,
        grades: List[Dict[str, Any]],
        *,
        graded_by_id: Optional[int] = None,
    ) -> Dict[str, Any]:
        attempt = (
            db.query(ExamAttempt)
            .filter(ExamAttempt.id == attempt_id)
            .options(joinedload(ExamAttempt.exam))
            .first()
        )
        if not attempt or not attempt.exam:
            return {"success": False, "error": "Attempt not found"}

        exam = attempt.exam
        qdata = exam.questions if isinstance(exam.questions, dict) else {}
        answered_ids = cls.answered_question_ids(attempt.answers)
        answers_by_qid = {
            ea.question_id: ea
            for ea in db.query(ExamAnswer).filter(ExamAnswer.attempt_id == attempt_id).all()
        }

        for item in grades:
            qid = item.get("question_id")
            if not qid or qid not in answered_ids:
                continue

            exam_answer = answers_by_qid.get(qid)
            if not exam_answer:
                continue

            question = cls.find_question(qdata, qid) or {}
            max_pts = to_decimal(exam_answer.max_points or question.get("points", 0))

            rubric_scores = item.get("rubric_scores")
            feedback = item.get("feedback") or item.get("grader_feedback")

            if rubric_scores and question.get("rubric"):
                earned, rubric_result = apply_rubric(
                    question["rubric"], rubric_scores, max_pts
                )
                exam_answer.rubric_result = {k: float(v) for k, v in rubric_result.items()}
            elif item.get("points_awarded") is not None:
                earned = clamp_points(to_decimal(item["points_awarded"]), max_pts)
            else:
                continue

            exam_answer.earned_points = earned
            exam_answer.points_awarded = legacy_float(earned)
            exam_answer.is_manually_graded = True
            if feedback:
                exam_answer.grader_feedback = str(feedback)[:5000]

            if earned >= max_pts and max_pts > 0:
                exam_answer.correctness = QuestionCorrectness.CORRECT
                exam_answer.is_correct = True
            elif earned <= 0:
                exam_answer.correctness = QuestionCorrectness.INCORRECT
                exam_answer.is_correct = False
            else:
                exam_answer.correctness = QuestionCorrectness.PARTIAL
                exam_answer.is_correct = False

        previous_score = attempt.earned_points or attempt.score
        summary = cls._finalize_attempt(db, attempt, exam, answered_ids)
        cls._record_grading_history(
            db,
            attempt,
            previous_score=to_decimal(previous_score) if previous_score else None,
            new_score=summary.earned_points,
            changed_by_id=graded_by_id,
            reason="manual_grade",
            snapshot=cls._grading_snapshot(attempt_id, db),
        )
        if graded_by_id:
            attempt.graded_by_id = graded_by_id
        attempt.grading_version = (attempt.grading_version or 1) + 1

        db.commit()
        return {"success": True, **cls._summary_dict(summary)}

    @classmethod
    def recalculate_attempt(
        cls, db: Session, attempt: ExamAttempt, exam: Exam
    ) -> AttemptGradeSummary:
        answered_ids = cls.answered_question_ids(attempt.answers)
        exam_answers = (
            db.query(ExamAnswer).filter(ExamAnswer.attempt_id == attempt.id).all()
        )
        qdata = exam.questions if isinstance(exam.questions, dict) else {}
        all_questions = cls.flatten_questions(qdata)
        status_val = attempt.status.value if hasattr(attempt.status, "value") else str(attempt.status)
        summary = aggregate_attempt_scores(
            exam_answers,
            answered_ids,
            status_val,
            all_questions=all_questions,
            exam_total_points=exam.total_points,
        )
        cls._apply_summary_to_attempt(attempt, summary)
        cls._maybe_complete_enrollment(db, attempt, exam, summary)
        return summary

    @classmethod
    def _finalize_attempt(
        cls,
        db: Session,
        attempt: ExamAttempt,
        exam: Exam,
        answered_ids: Set[str],
    ) -> AttemptGradeSummary:
        summary = cls.recalculate_attempt(db, attempt, exam)
        attempt.graded_at = datetime.now(timezone.utc)
        if summary.pending_manual_count > 0:
            attempt.requires_manual_review = True
            attempt.grading_status = GradingStatus.PARTIALLY_GRADED
        elif summary.grading_status == "complete":
            attempt.grading_status = GradingStatus.COMPLETED
            attempt.requires_manual_review = False
        else:
            attempt.grading_status = GradingStatus.IN_PROGRESS
        return summary

    @staticmethod
    def _apply_summary_to_attempt(attempt: ExamAttempt, summary: AttemptGradeSummary) -> None:
        attempt.earned_points = summary.earned_points
        attempt.max_points = summary.max_points
        attempt.auto_score = summary.auto_score
        attempt.manual_score = summary.manual_score
        attempt.final_score = summary.earned_points
        attempt.score = legacy_float(summary.earned_points)
        attempt.max_score = legacy_float(summary.max_points)

        if summary.attempt_status == AttemptStatus.GRADED.value:
            attempt.status = AttemptStatus.GRADED
        elif summary.attempt_status == AttemptStatus.SUBMITTED.value:
            attempt.status = AttemptStatus.SUBMITTED

    @staticmethod
    def _score_percent(earned: Decimal, max_pts: Decimal) -> Optional[float]:
        if max_pts <= 0:
            return None
        return round(float((earned / max_pts) * 100), 2)

    @staticmethod
    def _summary_dict(summary: AttemptGradeSummary) -> Dict[str, Any]:
        return {
            "score": legacy_float(summary.earned_points),
            "max_score": legacy_float(summary.max_points),
            "earned_points": legacy_float(summary.earned_points),
            "max_points": legacy_float(summary.max_points),
            "score_percent": GradingEngine._score_percent(
                summary.earned_points, summary.max_points
            ),
            "auto_score": legacy_float(summary.auto_score),
            "manual_score": legacy_float(summary.manual_score),
            "answered_count": summary.answered_count,
            "pending_manual_count": summary.pending_manual_count,
            "grading_status": summary.grading_status,
            "attempt_status": summary.attempt_status,
            "integrity_score": summary.integrity_score,
        }

    @staticmethod
    def _grading_snapshot(attempt_id: int, db: Session) -> Dict[str, Any]:
        rows = db.query(ExamAnswer).filter(ExamAnswer.attempt_id == attempt_id).all()
        return {
            str(ea.question_id): {
                "earned_points": legacy_float(
                    ea.earned_points or (to_decimal(ea.points_awarded) if ea.points_awarded else None)
                ),
                "correctness": ea.correctness.value if ea.correctness else None,
                "feedback": ea.grader_feedback,
            }
            for ea in rows
        }

    @staticmethod
    def _record_grading_history(
        db: Session,
        attempt: ExamAttempt,
        *,
        previous_score: Optional[Decimal],
        new_score: Decimal,
        changed_by_id: Optional[int],
        reason: str,
        snapshot: Dict[str, Any],
    ) -> None:
        db.add(
            ExamGradingHistory(
                attempt_id=attempt.id,
                grading_version=attempt.grading_version or 1,
                previous_score=previous_score,
                new_score=new_score,
                changed_by_id=changed_by_id,
                reason=reason,
                snapshot=snapshot,
            )
        )

    @staticmethod
    def _persist_integrity(db: Session, attempt: ExamAttempt, integrity: Dict[str, Any]) -> None:
        score = integrity.get("integrity_score")
        attempt.integrity_score = score
        db.query(ExamIntegrityFlag).filter(ExamIntegrityFlag.attempt_id == attempt.id).delete()
        for flag in integrity.get("flags") or []:
            ftype = flag.get("type", "tab_switch")
            try:
                flag_enum = IntegrityFlagType(ftype)
            except ValueError:
                continue
            sev = flag.get("severity", IntegritySeverity.LOW.value)
            try:
                sev_enum = IntegritySeverity(sev)
            except ValueError:
                sev_enum = IntegritySeverity.LOW
            db.add(
                ExamIntegrityFlag(
                    attempt_id=attempt.id,
                    flag_type=flag_enum,
                    severity=sev_enum,
                    flag_metadata={k: v for k, v in flag.items() if k not in ("type", "severity")},
                )
            )

    @staticmethod
    def _maybe_complete_enrollment(
        db: Session,
        attempt: ExamAttempt,
        exam: Exam,
        summary: AttemptGradeSummary,
    ) -> None:
        if summary.grading_status != "complete" or not exam.is_final or not attempt.student_id:
            return
        max_pts = summary.max_points
        if max_pts <= 0:
            return
        percentage = float((summary.earned_points / max_pts) * 100)
        if percentage < (exam.pass_score_percentage or 70):
            return

        enrollment = (
            db.query(Enrollment)
            .filter(
                Enrollment.student_id == attempt.student_id,
                Enrollment.course_id == exam.course_id,
            )
            .first()
        )
        if not enrollment or enrollment.is_completed:
            return

        enrollment.is_completed = True
        enrollment.status = EnrollmentStatus.COMPLETED
        enrollment.completed_date = datetime.now(timezone.utc)

        from ...models.models import Certificate

        existing_cert = (
            db.query(Certificate)
            .filter(
                Certificate.student_id == attempt.student_id,
                Certificate.course_id == exam.course_id,
            )
            .first()
        )
        if not existing_cert:
            cert_uid = uuid.uuid4().hex[:8].upper()
            cert_number = f"LL-{exam.course_id}-{attempt.student_id}-{cert_uid}"
            new_cert = Certificate(
                student_id=attempt.student_id,
                course_id=exam.course_id,
                certificate_number=cert_number,
                issued_date=datetime.now(timezone.utc),
                is_verified=True,
            )
            db.add(new_cert)
            db.flush()
            enrollment.certificate_id = new_cert.id
