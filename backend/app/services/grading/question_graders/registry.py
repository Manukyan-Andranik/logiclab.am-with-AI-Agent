from __future__ import annotations

from typing import Any, Dict, Optional

from ..types import QuestionGradeOutcome
from .code import CodeGrader
from .essay import EssayGrader
from .fill_blank import FillBlankGrader
from .matching import MatchingGrader
from .mathematical import MathematicalGrader
from .multiple_choice import MultipleChoiceGrader
from .short_answer import ShortAnswerGrader
from .single_choice import SingleChoiceGrader
from .true_false import TrueFalseGrader

_GRADERS = {
    grader.question_type: grader
    for grader in (
        SingleChoiceGrader(),
        MultipleChoiceGrader(),
        TrueFalseGrader(),
        ShortAnswerGrader(),
        MathematicalGrader(),
        EssayGrader(),
        CodeGrader(),
        MatchingGrader(),
        FillBlankGrader(),
    )
}


def get_grader(question_type: Optional[str]):
    return _GRADERS.get(question_type or "")


def grade_question(question: Dict[str, Any], answer_data: Any) -> QuestionGradeOutcome:
    qtype = question.get("type")
    grader = get_grader(qtype)
    if not grader:
        from decimal import Decimal
        from ..normalization import to_decimal
        from ..types import CORRECTNESS_PENDING

        max_pts = to_decimal(question.get("points", 0))
        return QuestionGradeOutcome(
            question_id=question.get("id", ""),
            earned_points=None,
            max_points=max_pts,
            correctness=CORRECTNESS_PENDING,
            is_correct_legacy=None,
        )
    return grader.grade(question, answer_data)
