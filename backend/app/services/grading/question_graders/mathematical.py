from __future__ import annotations

from decimal import Decimal, InvalidOperation
from typing import Any, Dict, Optional

from ..base import BaseQuestionGrader
from ..normalization import to_decimal
from ..types import CORRECTNESS_PENDING, QuestionGradeOutcome


class MathematicalGrader(BaseQuestionGrader):
    """
    Mathematical grading: exact LaTeX match or numeric tolerance.
    manual_grading=true forces pending_review.
    """

    question_type = "mathematical"

    def grade(self, question: Dict[str, Any], answer_data: Any) -> QuestionGradeOutcome:
        max_pts = self.max_points(question)
        qid = question.get("id", "")

        if question.get("manual_grading"):
            return QuestionGradeOutcome(
                question_id=qid,
                earned_points=None,
                max_points=max_pts,
                correctness=CORRECTNESS_PENDING,
                is_correct_legacy=None,
            )

        expected = str(question.get("correct_answer_latex", "")).strip()
        user = str(answer_data).strip()
        if not expected or not user:
            return QuestionGradeOutcome(
                question_id=qid,
                earned_points=None,
                max_points=max_pts,
                correctness=CORRECTNESS_PENDING,
                is_correct_legacy=None,
            )

        if user == expected or user.lower() == expected.lower():
            return QuestionGradeOutcome(
                question_id=qid,
                earned_points=max_pts,
                max_points=max_pts,
                correctness="correct",
                is_correct_legacy=True,
            )

        tolerance = to_decimal(question.get("decimal_tolerance", "0.01"))
        if self._numeric_match(expected, user, tolerance):
            return QuestionGradeOutcome(
                question_id=qid,
                earned_points=max_pts,
                max_points=max_pts,
                correctness="correct",
                is_correct_legacy=True,
                grading_details={"match": "numeric_tolerance"},
            )

        return QuestionGradeOutcome(
            question_id=qid,
            earned_points=Decimal("0"),
            max_points=max_pts,
            correctness="incorrect",
            is_correct_legacy=False,
        )

    @staticmethod
    def _numeric_match(expected: str, user: str, tolerance: Decimal) -> bool:
        try:
            exp_val = Decimal(expected.replace(",", ""))
            user_val = Decimal(user.replace(",", ""))
        except (InvalidOperation, ValueError):
            return False
        return abs(exp_val - user_val) <= tolerance
