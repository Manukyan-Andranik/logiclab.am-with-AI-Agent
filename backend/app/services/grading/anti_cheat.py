"""
Anti-cheat signal generation from audit logs and attempt timing.

Does NOT auto-fail — only produces review signals and integrity_score (0-100).
"""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from sqlalchemy.orm import Session

from ...models.exams import ExamAttempt, ExamAuditLog, IntegrityFlagType, IntegritySeverity


def _utc_now() -> datetime:
    return datetime.now(timezone.utc)


def analyze_attempt_integrity(
    db: Session,
    attempt: ExamAttempt,
    *,
    min_seconds_per_question: int = 3,
    tab_switch_threshold: int = 5,
    rapid_answer_threshold: int = 20,
) -> Dict[str, Any]:
    """
    Analyze audit logs and attempt metadata; return integrity_score and flags.
    """
    flags: List[Dict[str, Any]] = []
    penalty = 0

    logs = (
        db.query(ExamAuditLog)
        .filter(ExamAuditLog.attempt_id == attempt.id)
        .order_by(ExamAuditLog.created_at)
        .all()
    )

    tab_switches = sum(1 for log in logs if log.action in ("tab_hidden", "fullscreen_exit"))
    if tab_switches >= tab_switch_threshold:
        penalty += 15
        flags.append(
            {
                "type": IntegrityFlagType.TAB_SWITCH.value,
                "severity": IntegritySeverity.MEDIUM.value,
                "count": tab_switches,
                "message": f"Frequent tab switches ({tab_switches})",
            }
        )
    elif tab_switches > 0:
        penalty += min(10, tab_switches * 2)
        flags.append(
            {
                "type": IntegrityFlagType.TAB_SWITCH.value,
                "severity": IntegritySeverity.LOW.value,
                "count": tab_switches,
            }
        )

    paste_attempts = sum(1 for log in logs if log.action == "paste_attempt")
    if paste_attempts > 0:
        penalty += min(20, paste_attempts * 5)
        flags.append(
            {
                "type": IntegrityFlagType.PASTE_DETECTED.value,
                "severity": IntegritySeverity.MEDIUM.value,
                "count": paste_attempts,
            }
        )

    refresh_count = sum(1 for log in logs if log.action in ("page_refresh", "reload"))
    if refresh_count >= 3:
        penalty += 10
        flags.append(
            {
                "type": "repeated_refresh",
                "severity": IntegritySeverity.LOW.value,
                "count": refresh_count,
            }
        )

    answers = attempt.answers or {}
    answered = [k for k, v in answers.items() if v is not None and v != "" and v != [] and v != {}]
    time_spent = attempt.time_spent_seconds or 0

    if len(answered) > 0 and time_spent > 0:
        sec_per_q = time_spent / len(answered)
        if sec_per_q < min_seconds_per_question and len(answered) >= 5:
            penalty += 20
            flags.append(
                {
                    "type": IntegrityFlagType.IMPOSSIBLE_TIME.value,
                    "severity": IntegritySeverity.HIGH.value,
                    "seconds_per_question": round(sec_per_q, 2),
                    "message": "Unusually fast completion",
                }
            )

    save_actions = sum(1 for log in logs if log.action in ("save_answer", "answer_saved"))
    if save_actions > rapid_answer_threshold * 2:
        penalty += 8
        flags.append(
            {
                "type": IntegrityFlagType.RAPID_SUBMISSION.value,
                "severity": IntegritySeverity.LOW.value,
                "save_events": save_actions,
            }
        )

    if time_spent < 30 and len(answered) >= 10:
        penalty += 25
        flags.append(
            {
                "type": IntegrityFlagType.IMPOSSIBLE_TIME.value,
                "severity": IntegritySeverity.CRITICAL.value,
                "message": "Very short exam duration with many answers",
            }
        )

    integrity_score = max(0, min(100, 100 - penalty))
    return {"integrity_score": integrity_score, "flags": flags}
