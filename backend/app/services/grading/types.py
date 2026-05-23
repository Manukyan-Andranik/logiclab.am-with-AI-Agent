"""
Grading domain types.

Uses Decimal for all score math to avoid float drift.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from decimal import Decimal
from typing import Any, Dict, List, Optional


CORRECTNESS_CORRECT = "correct"
CORRECTNESS_INCORRECT = "incorrect"
CORRECTNESS_PARTIAL = "partial"
CORRECTNESS_PENDING = "pending_review"

AUTO_GRADABLE_TYPES = frozenset(
    {"single_choice", "multiple_choice", "true_false", "short_answer", "fill_blank", "matching"}
)
MANUAL_GRADABLE_TYPES = frozenset({"essay", "code"})
OPTIONAL_MANUAL_TYPES = frozenset({"mathematical"})


@dataclass(frozen=True)
class QuestionGradeOutcome:
    """Result of grading one question."""

    question_id: str
    earned_points: Optional[Decimal]
    max_points: Decimal
    correctness: str
    feedback: Optional[str] = None
    is_manually_graded: bool = False
    rubric_results: Optional[Dict[str, Decimal]] = None
    grading_details: Optional[Dict[str, Any]] = None
    is_correct_legacy: Optional[bool] = None  # backward compat for is_correct column

    def to_feedback_dict(self) -> Dict[str, Any]:
        return {
            "earned_points": float(self.earned_points) if self.earned_points is not None else None,
            "max_points": float(self.max_points),
            "feedback": self.feedback,
            "correctness": self.correctness,
        }


@dataclass
class AttemptGradeSummary:
    """Aggregated attempt grading summary."""

    earned_points: Decimal
    max_points: Decimal
    auto_score: Decimal
    manual_score: Decimal
    pending_manual_count: int
    answered_count: int
    grading_status: str
    attempt_status: str
    integrity_score: Optional[int] = None
    integrity_flags: List[Dict[str, Any]] = field(default_factory=list)
