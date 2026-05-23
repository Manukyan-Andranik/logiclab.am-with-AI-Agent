from __future__ import annotations

from typing import Any, Dict

from ..base import BaseQuestionGrader
from ..types import CORRECTNESS_PENDING, QuestionGradeOutcome


class CodeGrader(BaseQuestionGrader):
    """Code questions require manual review or future sandbox execution."""

    question_type = "code"

    def grade(self, question: Dict[str, Any], answer_data: Any) -> QuestionGradeOutcome:
        max_pts = self.max_points(question)
        return QuestionGradeOutcome(
            question_id=question.get("id", ""),
            earned_points=None,
            max_points=max_pts,
            correctness=CORRECTNESS_PENDING,
            is_correct_legacy=None,
        )
