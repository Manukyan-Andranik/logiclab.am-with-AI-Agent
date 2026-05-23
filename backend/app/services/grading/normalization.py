"""Decimal normalization helpers for deterministic scoring."""

from __future__ import annotations

from decimal import Decimal, ROUND_HALF_UP
from typing import Any, Optional, Union

Number = Union[int, float, str, Decimal]


def to_decimal(value: Any, default: str = "0") -> Decimal:
    """Convert numeric input to Decimal safely."""
    if value is None:
        return Decimal(default)
    if isinstance(value, Decimal):
        return value
    if isinstance(value, bool):
        return Decimal("1") if value else Decimal("0")
    if isinstance(value, (int, float)):
        return Decimal(str(value))
    if isinstance(value, str):
        s = value.strip()
        if not s:
            return Decimal(default)
        return Decimal(s)
    return Decimal(default)


def clamp_points(earned: Decimal, max_points: Decimal) -> Decimal:
    """Clamp earned points to [0, max_points]."""
    if max_points <= 0:
        return Decimal("0")
    earned = max(Decimal("0"), earned)
    return min(earned, max_points).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)


def round_score(value: Decimal, places: int = 2) -> Decimal:
    quant = Decimal("1").scaleb(-places)
    return value.quantize(quant, rounding=ROUND_HALF_UP)


def legacy_float(value: Optional[Decimal]) -> Optional[float]:
    """Expose scores as float for legacy API fields."""
    if value is None:
        return None
    return float(round_score(value))


def correctness_to_is_correct(correctness: str) -> Optional[bool]:
    if correctness == "correct":
        return True
    if correctness in ("incorrect", "partial"):
        return False
    return None
