"""
Modular grading engine for the exam platform.

Architecture:
- validators: strict answer validation before grading
- question_graders: per-type deterministic scoring (Decimal)
- engine: orchestrates grading, persistence, regrading, integrity
- statistics: exam-level analytics for instructors
"""

from .types import QuestionGradeOutcome, AttemptGradeSummary

__all__ = ["GradingEngine", "QuestionGradeOutcome", "AttemptGradeSummary"]


def __getattr__(name: str):
    if name == "GradingEngine":
        from .engine import GradingEngine
        return GradingEngine
    raise AttributeError(name)
