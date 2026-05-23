from __future__ import annotations

from typing import Any, Dict

from ..base import BaseQuestionGrader
from ..partial_credit import score_fill_blank
from ..types import QuestionGradeOutcome


class FillBlankGrader(BaseQuestionGrader):
    question_type = "fill_blank"

    def grade(self, question: Dict[str, Any], answer_data: Any) -> QuestionGradeOutcome:
        max_pts = self.max_points(question)
        blanks = question.get("blanks") or []
        if not isinstance(answer_data, dict):
            answer_data = {}
        earned, correctness = score_fill_blank(
            blanks,
            answer_data,
            max_pts,
            partial_credit=bool(question.get("partial_credit", True)),
        )
        return QuestionGradeOutcome(
            question_id=question.get("id", ""),
            earned_points=earned,
            max_points=max_pts,
            correctness=correctness,
            is_correct_legacy=correctness == "correct",
        )
