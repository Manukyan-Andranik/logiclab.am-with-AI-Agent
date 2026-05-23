from __future__ import annotations

from typing import Any, Dict, Set

from ..base import BaseQuestionGrader
from ..normalization import to_decimal
from ..partial_credit import score_multiple_choice
from ..types import QuestionGradeOutcome


class MultipleChoiceGrader(BaseQuestionGrader):
    question_type = "multiple_choice"

    def grade(self, question: Dict[str, Any], answer_data: Any) -> QuestionGradeOutcome:
        max_pts = self.max_points(question)
        correct_ids: Set[str] = set(question.get("correct_answer_ids") or [])
        answer_ids: Set[str] = set(answer_data if isinstance(answer_data, list) else [])

        earned, correctness = score_multiple_choice(
            correct_ids,
            answer_ids,
            max_pts,
            partial_credit=bool(question.get("partial_credit")),
            negative_marking=bool(question.get("negative_marking")),
            penalty_per_wrong=to_decimal(question.get("penalty_per_wrong", 0)),
        )
        is_correct = correctness == "correct"
        return QuestionGradeOutcome(
            question_id=question.get("id", ""),
            earned_points=earned,
            max_points=max_pts,
            correctness=correctness,
            is_correct_legacy=is_correct if correctness != "partial" else False,
            grading_details={
                "correct_selected": len(answer_ids & correct_ids),
                "wrong_selected": len(answer_ids - correct_ids),
                "total_correct": len(correct_ids),
            },
        )
