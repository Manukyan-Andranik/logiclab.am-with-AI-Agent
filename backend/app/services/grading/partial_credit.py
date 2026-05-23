"""
Partial credit calculators for multi-part questions.

Formulas (deterministic, Decimal):
- multiple_choice proportional: (correct_selected / total_correct) * max - wrong * penalty
- matching: (correct_pairs / total_pairs) * max
- fill_blank: (correct_blanks / total_blanks) * max
"""

from __future__ import annotations

from decimal import Decimal
from typing import Any, Dict, List, Set

from .normalization import clamp_points, to_decimal


def score_multiple_choice(
    correct_ids: Set[str],
    answer_ids: Set[str],
    max_points: Decimal,
    *,
    partial_credit: bool,
    negative_marking: bool,
    penalty_per_wrong: Decimal,
) -> tuple[Decimal, str]:
    """Score multiple choice with optional partial credit and penalties."""
    if not correct_ids:
        return Decimal("0"), "incorrect"

    if answer_ids == correct_ids:
        return max_points, "correct"

    if not answer_ids:
        return Decimal("0"), "incorrect"

    correct_selected = len(answer_ids & correct_ids)
    wrong_selected = len(answer_ids - correct_ids)
    total_correct = len(correct_ids)

    if not partial_credit:
        return Decimal("0"), "incorrect"

    ratio = to_decimal(correct_selected) / to_decimal(total_correct)
    earned = max_points * ratio

    if negative_marking and wrong_selected > 0:
        penalty = penalty_per_wrong * to_decimal(wrong_selected)
        if penalty_per_wrong <= 1:
            earned -= max_points * penalty
        else:
            earned -= penalty

    earned = clamp_points(earned, max_points)

    if earned <= 0:
        return Decimal("0"), "incorrect"
    if earned >= max_points:
        return max_points, "correct"
    return earned, "partial"


def score_matching(
    correct_matches: Dict[str, str],
    answer_matches: Dict[str, str],
    max_points: Decimal,
    *,
    partial_credit: bool,
) -> tuple[Decimal, str]:
    if not correct_matches:
        return Decimal("0"), "incorrect"

    total = len(correct_matches)
    correct_count = sum(
        1 for left, right in correct_matches.items() if answer_matches.get(left) == right
    )

    if correct_count == total and total > 0:
        return max_points, "correct"
    if correct_count == 0:
        return Decimal("0"), "incorrect"

    if not partial_credit:
        return Decimal("0"), "incorrect"

    earned = max_points * to_decimal(correct_count) / to_decimal(total)
    earned = clamp_points(earned, max_points)
    return earned, "partial" if earned < max_points else "correct"


def score_fill_blank(
    blanks: List[Dict[str, Any]],
    answer_map: Dict[str, str],
    max_points: Decimal,
    *,
    partial_credit: bool,
) -> tuple[Decimal, str]:
    if not blanks:
        return Decimal("0"), "incorrect"

    per_blank = max_points / to_decimal(len(blanks))
    earned = Decimal("0")
    any_answered = False

    for blank in blanks:
        bid = blank.get("id")
        if not bid:
            continue
        user = (answer_map.get(bid) or "").strip().lower()
        if not user:
            continue
        any_answered = True
        acceptable = blank.get("acceptable_answers") or blank.get("answers") or []
        if isinstance(acceptable, str):
            acceptable = [acceptable]
        normalized = [str(a).strip().lower() for a in acceptable]
        if user in normalized:
            earned += per_blank

    earned = clamp_points(earned, max_points)
    if earned >= max_points:
        return max_points, "correct"
    if earned > 0:
        return earned, "partial" if partial_credit else "incorrect"
    return Decimal("0"), "incorrect" if any_answered else "incorrect"
