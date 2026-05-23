"""Score aggregation across exam answers."""

from __future__ import annotations

from decimal import Decimal
from typing import Any, Dict, List, Optional, Set

from ...models.exams import ExamAnswer, AttemptStatus, GradingStatus, QuestionCorrectness
from .normalization import legacy_float, round_score, to_decimal
from .types import (
    AUTO_GRADABLE_TYPES,
    CORRECTNESS_PENDING,
    AttemptGradeSummary,
    MANUAL_GRADABLE_TYPES,
)


def is_auto_gradable(question_type: Optional[str], question: Optional[Dict[str, Any]] = None) -> bool:
    if question and question.get("manual_grading"):
        return False
    return (question_type or "") in AUTO_GRADABLE_TYPES


def compute_exam_max_points(
    all_questions: List[Dict[str, Any]],
    exam_total_points: Optional[Any] = None,
) -> Decimal:
    """
    Total achievable score for the full exam (all questions).
    Unanswered questions count toward max_points with 0 earned.
    """
    computed = Decimal("0")
    for q in all_questions:
        qid = q.get("id")
        if not qid:
            continue
        computed += to_decimal(q.get("points", 0))

    if computed > 0:
        return round_score(computed)

    if exam_total_points is not None:
        fallback = to_decimal(exam_total_points)
        if fallback > 0:
            return round_score(fallback)

    return Decimal("0")


def _earned_from_answer(ea: ExamAnswer) -> Optional[Decimal]:
    if ea.earned_points is not None:
        return to_decimal(ea.earned_points)
    if ea.points_awarded is not None:
        return to_decimal(ea.points_awarded)
    return None


def aggregate_attempt_scores(
    exam_answers: List[ExamAnswer],
    answered_ids: Set[str],
    attempt_status: str,
    *,
    all_questions: Optional[List[Dict[str, Any]]] = None,
    exam_total_points: Optional[Any] = None,
) -> AttemptGradeSummary:
    """
    Score = sum(earned on answered questions) / sum(points on ALL exam questions).

    Skipped questions contribute 0 earned but their points count toward max_score.
    """
    answers_by_qid = {ea.question_id: ea for ea in exam_answers}
    questions = all_questions or []

    max_pts = compute_exam_max_points(questions, exam_total_points)

    earned = Decimal("0")
    auto_score = Decimal("0")
    manual_score = Decimal("0")
    pending_manual = 0

    for q in questions:
        qid = q.get("id")
        if not qid or qid not in answered_ids:
            continue
        ea = answers_by_qid.get(qid)
        if not ea:
            continue

        ep = _earned_from_answer(ea)
        if ep is not None:
            earned += ep
            if ea.is_manually_graded:
                manual_score += ep
            else:
                auto_score += ep
        else:
            correctness = ea.correctness
            cval = correctness.value if hasattr(correctness, "value") else str(correctness or "")
            if cval == CORRECTNESS_PENDING or ep is None:
                pending_manual += 1

    grading_status = "complete"
    if pending_manual > 0:
        grading_status = "pending_manual"
    if earned == 0 and max_pts > 0 and answered_ids and all(
        _earned_from_answer(answers_by_qid[qid]) is None
        for qid in answered_ids
        if qid in answers_by_qid
    ):
        grading_status = "ungraded"

    new_attempt_status = attempt_status
    if attempt_status in (AttemptStatus.SUBMITTED.value, AttemptStatus.GRADED.value):
        if pending_manual == 0:
            new_attempt_status = AttemptStatus.GRADED.value
        elif attempt_status != AttemptStatus.GRADED.value:
            new_attempt_status = AttemptStatus.SUBMITTED.value

    return AttemptGradeSummary(
        earned_points=round_score(earned),
        max_points=round_score(max_pts),
        auto_score=round_score(auto_score),
        manual_score=round_score(manual_score),
        pending_manual_count=pending_manual,
        answered_count=len(answered_ids),
        grading_status=grading_status,
        attempt_status=new_attempt_status,
    )


def sync_answer_from_outcome(ea: ExamAnswer, outcome) -> None:
    """Write grading outcome to ExamAnswer row (idempotent field update)."""
    from .normalization import correctness_to_is_correct, legacy_float

    ea.max_points = outcome.max_points
    if outcome.earned_points is not None:
        ea.earned_points = outcome.earned_points
        ea.points_awarded = legacy_float(outcome.earned_points)
    else:
        ea.earned_points = None
        ea.points_awarded = None

    try:
        ea.correctness = QuestionCorrectness(outcome.correctness)
    except ValueError:
        ea.correctness = None

    ea.is_correct = outcome.is_correct_legacy
    if outcome.grading_details:
        ea.grading_details = outcome.grading_details
    if outcome.feedback:
        ea.grader_feedback = outcome.feedback
