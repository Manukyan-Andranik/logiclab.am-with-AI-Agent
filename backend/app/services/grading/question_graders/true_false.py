from __future__ import annotations

from decimal import Decimal
from typing import Any, Dict

from ..base import BaseQuestionGrader
from ..types import QuestionGradeOutcome


class TrueFalseGrader(BaseQuestionGrader):
    question_type = "true_false"

    def grade(self, question: Dict[str, Any], answer_data: Any) -> QuestionGradeOutcome:
        max_pts = self.max_points(question)
        correct = answer_data == question.get("correct_answer")
        earned = max_pts if correct else Decimal("0")
        return QuestionGradeOutcome(
            question_id=question.get("id", ""),
            earned_points=earned,
            max_points=max_pts,
            correctness="correct" if correct else "incorrect",
            is_correct_legacy=correct,
        )
