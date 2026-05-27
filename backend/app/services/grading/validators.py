"""
Strict answer validation — never trust frontend payloads.

Rejects malformed types, unknown options, duplicates, and oversize text.
"""

from __future__ import annotations

from typing import Any, Dict, List, Optional, Set

from .exceptions import ValidationError

MAX_SHORT_ANSWER_LEN = 500
MAX_ESSAY_LEN = 50000
MAX_CODE_LEN = 100000


def _option_ids(question: Dict[str, Any]) -> Set[str]:
    opts = question.get("options") or []
    return {o["id"] for o in opts if isinstance(o, dict) and "id" in o}


def validate_answer(question: Dict[str, Any], answer_data: Any) -> Any:
    """
    Validate and normalize answer_data for a question.
    Returns sanitized answer or raises ValidationError.
    """
    qtype = question.get("type") or ""
    if answer_data is None:
        return None

    if qtype == "single_choice":
        if not isinstance(answer_data, str):
            raise ValidationError("single_choice answer must be a string option id")
        valid = _option_ids(question)
        if valid and answer_data not in valid:
            raise ValidationError(f"Invalid option id: {answer_data}")
        return answer_data

    if qtype == "multiple_choice":
        if not isinstance(answer_data, list):
            raise ValidationError("multiple_choice answer must be a list of option ids")
        valid = _option_ids(question)
        seen: List[str] = []
        for item in answer_data:
            if not isinstance(item, str):
                raise ValidationError("multiple_choice options must be strings")
            if item in seen:
                raise ValidationError("Duplicate selection not allowed")
            seen.append(item)
            if valid and item not in valid:
                raise ValidationError(f"Invalid option id: {item}")
        return seen

    if qtype == "true_false":
        if not isinstance(answer_data, bool):
            raise ValidationError("true_false answer must be boolean")
        return answer_data

    if qtype == "short_answer":
        if not isinstance(answer_data, str):
            raise ValidationError("short_answer must be a string")
        text = answer_data.strip()
        max_len = int(question.get("max_length", MAX_SHORT_ANSWER_LEN))
        if len(text) > max_len:
            raise ValidationError(f"Answer exceeds max length ({max_len})")
        return text

    if qtype == "essay":
        if not isinstance(answer_data, str):
            raise ValidationError("essay must be a string")
        if len(answer_data) > MAX_ESSAY_LEN:
            raise ValidationError("Essay exceeds maximum length")
        return answer_data

    if qtype == "code":
        if not isinstance(answer_data, str):
            raise ValidationError("code answer must be a string")
        if len(answer_data) > MAX_CODE_LEN:
            raise ValidationError("Code answer exceeds maximum length")
        return answer_data

    if qtype == "mathematical":
        math_type = question.get("math_type", "expression")
        
        if math_type in ("expression", "number"):
            if not isinstance(answer_data, str):
                raise ValidationError(f"mathematical ({math_type}) answer must be a string")
            return answer_data.strip()[:2000]
            
        if math_type == "choice":
            if not isinstance(answer_data, list):
                raise ValidationError("mathematical (choice) answer must be a list of option ids")
            valid = _option_ids(question)
            seen: List[str] = []
            for item in answer_data:
                if not isinstance(item, str):
                    raise ValidationError("choice options must be strings")
                if item in seen:
                    raise ValidationError("Duplicate selection not allowed")
                seen.append(item)
                if valid and item not in valid:
                    raise ValidationError(f"Invalid option id: {item}")
            return seen
            
        if math_type == "matrix":
            if not isinstance(answer_data, dict):
                raise ValidationError("matrix answer must be an object {rows, cols, data}")
            rows = answer_data.get("rows")
            cols = answer_data.get("cols")
            data = answer_data.get("data")
            if not isinstance(rows, int) or not isinstance(cols, int):
                raise ValidationError("matrix rows and cols must be integers")
            if not isinstance(data, list) or len(data) != rows:
                raise ValidationError(f"matrix data must be a list of {rows} rows")
            for row in data:
                if not isinstance(row, list) or len(row) != cols:
                    raise ValidationError(f"each matrix row must be a list of {cols} columns")
            return answer_data

        return str(answer_data).strip()[:2000]

    if qtype == "matching":
        if not isinstance(answer_data, dict):
            raise ValidationError("matching answer must be an object mapping left_id to right_id")
        pairs = question.get("pairs") or []
        left_ids = {p.get("left_id") for p in pairs if isinstance(p, dict)}
        right_ids = {p.get("right_id") for p in pairs if isinstance(p, dict)}
        out: Dict[str, str] = {}
        for left, right in answer_data.items():
            if not isinstance(left, str) or not isinstance(right, str):
                raise ValidationError("matching keys and values must be strings")
            if left_ids and left not in left_ids:
                raise ValidationError(f"Unknown left id: {left}")
            if right_ids and right not in right_ids:
                raise ValidationError(f"Unknown right id: {right}")
            out[left] = right
        return out

    if qtype == "fill_blank":
        if not isinstance(answer_data, dict):
            raise ValidationError("fill_blank answer must be an object blank_id -> text")
        blanks = question.get("blanks") or []
        blank_ids = {b.get("id") for b in blanks if isinstance(b, dict) and b.get("id")}
        out: Dict[str, str] = {}
        for bid, val in answer_data.items():
            if not isinstance(bid, str):
                raise ValidationError("fill_blank keys must be strings")
            if blank_ids and bid not in blank_ids:
                raise ValidationError(f"Unknown blank id: {bid}")
            if not isinstance(val, str):
                raise ValidationError("fill_blank values must be strings")
            out[bid] = val.strip()[:500]
        return out

    return answer_data
