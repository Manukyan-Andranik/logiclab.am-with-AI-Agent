"""Base question grader interface."""

from __future__ import annotations

from abc import ABC, abstractmethod
from decimal import Decimal
from typing import Any, Dict

from .types import QuestionGradeOutcome


class BaseQuestionGrader(ABC):
    """Interface for per-question-type graders."""

    question_type: str

    @abstractmethod
    def grade(self, question: Dict[str, Any], answer_data: Any) -> QuestionGradeOutcome:
        """Grade one question deterministically."""

    def max_points(self, question: Dict[str, Any]) -> Decimal:
        from .normalization import to_decimal

        return to_decimal(question.get("points", 0))
