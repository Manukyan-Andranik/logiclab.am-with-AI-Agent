"""Serialize grading payloads for API responses."""

from __future__ import annotations

from typing import Any, Dict, List, Optional

from .normalization import legacy_float
from .types import AttemptGradeSummary, QuestionGradeOutcome


def question_outcome_to_admin(q: Dict[str, Any], outcome: Optional[QuestionGradeOutcome], ea: Any) -> Dict[str, Any]:
    earned = None
    correctness = None
    feedback = None
    if outcome:
        earned = legacy_float(outcome.earned_points) if outcome.earned_points is not None else None
        correctness = outcome.correctness
        feedback = outcome.feedback
    elif ea:
        earned = legacy_float(
            __import__("decimal").Decimal(str(ea.points_awarded))
            if ea.points_awarded is not None
            else (ea.earned_points if hasattr(ea, "earned_points") else None)
        )
        if hasattr(ea, "correctness") and ea.correctness:
            correctness = ea.correctness.value if hasattr(ea.correctness, "value") else str(ea.correctness)

    return {
        "question_id": q.get("id"),
        "earned_points": earned,
        "max_points": float(q.get("points", 0)),
        "correctness": correctness,
        "feedback": feedback or (ea.grader_feedback if ea else None),
        "rubric_result": ea.rubric_result if ea else None,
    }


def summary_to_dict(summary: AttemptGradeSummary) -> Dict[str, Any]:
    return {
        "score": legacy_float(summary.earned_points),
        "max_score": legacy_float(summary.max_points),
        "earned_points": legacy_float(summary.earned_points),
        "max_points": legacy_float(summary.max_points),
        "auto_score": legacy_float(summary.auto_score),
        "manual_score": legacy_float(summary.manual_score),
        "grading_status": summary.grading_status,
        "pending_manual_count": summary.pending_manual_count,
        "answered_count": summary.answered_count,
        "attempt_status": summary.attempt_status,
        "integrity_score": summary.integrity_score,
        "integrity_flags": summary.integrity_flags,
    }
