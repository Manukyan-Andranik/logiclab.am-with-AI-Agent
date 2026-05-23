"""Grading-specific exceptions."""


class GradingError(Exception):
    """Base grading error."""


class ValidationError(GradingError):
    """Answer payload failed validation."""


class QuestionNotFoundError(GradingError):
    """Question ID not present in exam JSON."""


class AttemptNotGradableError(GradingError):
    """Attempt is not in a state that allows grading."""
