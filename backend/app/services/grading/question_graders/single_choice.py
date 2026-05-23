from __future__ import annotations

from typing import Any, Dict

from ..base import BaseQuestionGrader
from ..types import QuestionGradeOutcome


class SingleChoiceGrader(BaseQuestionGrader):
    question_type = "single_choice"

    def grade(self, question: Dict[str, Any], answer_data: Any) -> QuestionGradeOutcome:
        from decimal import Decimal

        max_pts = self.max_points(question)
        correct = answer_data == question.get("correct_answer_id")
        earned = max_pts if correct else Decimal("0")
        correctness = "correct" if correct else "incorrect"
        return QuestionGradeOutcome(
            question_id=question.get("id", ""),
            earned_points=earned,
            max_points=max_pts,
            correctness=correctness,
            is_correct_legacy=correct,
        )
