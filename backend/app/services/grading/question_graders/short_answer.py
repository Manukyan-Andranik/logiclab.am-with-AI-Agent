from __future__ import annotations

from decimal import Decimal
from typing import Any, Dict, List

from ..base import BaseQuestionGrader
from ..types import QuestionGradeOutcome


class ShortAnswerGrader(BaseQuestionGrader):
    question_type = "short_answer"

    def grade(self, question: Dict[str, Any], answer_data: Any) -> QuestionGradeOutcome:
        max_pts = self.max_points(question)
        acceptable: List[str] = [
            str(a).lower().strip() for a in (question.get("correct_answers") or [])
        ]
        user = str(answer_data).lower().strip()
        correct = user in acceptable
        earned = max_pts if correct else Decimal("0")
        return QuestionGradeOutcome(
            question_id=question.get("id", ""),
            earned_points=earned,
            max_points=max_pts,
            correctness="correct" if correct else "incorrect",
            is_correct_legacy=correct,
        )
