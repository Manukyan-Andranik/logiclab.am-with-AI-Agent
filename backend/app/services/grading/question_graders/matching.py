from __future__ import annotations

from typing import Any, Dict

from ..base import BaseQuestionGrader
from ..partial_credit import score_matching
from ..types import QuestionGradeOutcome


class MatchingGrader(BaseQuestionGrader):
    question_type = "matching"

    def grade(self, question: Dict[str, Any], answer_data: Any) -> QuestionGradeOutcome:
        max_pts = self.max_points(question)
        correct = question.get("correct_matches") or {}
        if not isinstance(answer_data, dict):
            answer_data = {}
        earned, correctness = score_matching(
            correct,
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
            grading_details={"pairs_correct": float(earned / max_pts) if max_pts else 0},
        )
