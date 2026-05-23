from __future__ import annotations

from typing import Any, Dict

from ..base import BaseQuestionGrader
from ..types import CORRECTNESS_PENDING, QuestionGradeOutcome


class EssayGrader(BaseQuestionGrader):
    question_type = "essay"

    def grade(self, question: Dict[str, Any], answer_data: Any) -> QuestionGradeOutcome:
        max_pts = self.max_points(question)
        return QuestionGradeOutcome(
            question_id=question.get("id", ""),
            earned_points=None,
            max_points=max_pts,
            correctness=CORRECTNESS_PENDING,
            is_correct_legacy=None,
        )
