"""Rubric scoring for manual grading."""

from __future__ import annotations

from decimal import Decimal
from typing import Any, Dict, List, Optional

from .normalization import clamp_points, to_decimal


def apply_rubric(
    rubric: List[Dict[str, Any]],
    criterion_scores: Dict[str, Any],
    max_question_points: Decimal,
) -> tuple[Decimal, Dict[str, Decimal]]:
    """
    Sum rubric criterion scores and clamp to question max.
    criterion_scores: {criterion_id: points}
    """
    total = Decimal("0")
    results: Dict[str, Decimal] = {}

    rubric_by_id = {}
    for item in rubric:
        cid = item.get("id") or item.get("criterion")
        if cid:
            rubric_by_id[str(cid)] = item

    for cid, raw in (criterion_scores or {}).items():
        key = str(cid)
        pts = to_decimal(raw)
        if key in rubric_by_id:
            cap = to_decimal(rubric_by_id[key].get("max_points", rubric_by_id[key].get("points", 0)))
            pts = clamp_points(pts, cap)
        results[key] = pts
        total += pts

    total = clamp_points(total, max_question_points)
    return total, results
