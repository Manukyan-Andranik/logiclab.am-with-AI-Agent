"""
Exam grading analytics for instructors.
"""

from __future__ import annotations

from decimal import Decimal
from statistics import median
from typing import Any, Dict, List, Optional

from sqlalchemy.orm import Session, joinedload

from ...models.exams import Exam, ExamAnswer, ExamAttempt, AttemptStatus
from ..exam_service import ExamService
from .normalization import legacy_float, to_decimal


def compute_exam_statistics(db: Session, exam_id: int) -> Dict[str, Any]:
    """Aggregate scores and per-question difficulty for a graded exam."""
    exam = db.query(Exam).filter(Exam.id == exam_id).first()
    if not exam:
        return {"error": "Exam not found"}

    attempts = (
        db.query(ExamAttempt)
        .filter(
            ExamAttempt.exam_id == exam_id,
            ExamAttempt.status.in_([AttemptStatus.SUBMITTED, AttemptStatus.GRADED]),
        )
        .options(joinedload(ExamAttempt.answers_details))
        .all()
    )

    percentages: List[float] = []
    question_stats: Dict[str, Dict[str, Any]] = {}

    for att in attempts:
        max_pts = to_decimal(att.max_score or att.max_points or 0)
        score = to_decimal(att.score or att.earned_points or att.final_score or 0)
        if max_pts > 0:
            percentages.append(float((score / max_pts) * 100))

        for ea in att.answers_details or []:
            qid = ea.question_id
            if qid not in question_stats:
                question_stats[qid] = {
                    "question_id": qid,
                    "attempts": 0,
                    "total_earned": Decimal("0"),
                    "total_max": Decimal("0"),
                    "missed_count": 0,
                }
            st = question_stats[qid]
            st["attempts"] += 1
            earned = to_decimal(ea.earned_points or ea.points_awarded or 0)
            max_q = to_decimal(ea.max_points or 0)
            st["total_earned"] += earned
            st["total_max"] += max_q
            if earned <= 0 or ea.is_correct is False:
                st["missed_count"] += 1

    pass_threshold = exam.pass_score_percentage or 70
    pass_count = sum(1 for p in percentages if p >= pass_threshold)
    total_attempts = len(attempts)

    qmeta: Dict[str, Dict[str, Any]] = {}
    if isinstance(exam.questions, dict):
        for q in ExamService.flatten_questions(exam.questions):
            qid = q.get("id")
            if qid:
                qmeta[qid] = {
                    "question_text": (q.get("question_text") or "")[:200],
                    "type": q.get("type"),
                    "points": float(q.get("points", 0)),
                }

    per_question = []
    for qid, st in question_stats.items():
        avg_pct = 0.0
        if st["total_max"] > 0 and st["attempts"] > 0:
            avg_pct = float((st["total_earned"] / st["total_max"]) * 100)
        meta = qmeta.get(qid, {})
        per_question.append(
            {
                "question_id": qid,
                "question_text": meta.get("question_text") or qid,
                "type": meta.get("type"),
                "points": meta.get("points"),
                "average_percent": round(avg_pct, 2),
                "difficulty_index": round(100 - avg_pct, 2),
                "missed_rate": round(st["missed_count"] / max(1, st["attempts"]) * 100, 2),
                "attempts": st["attempts"],
            }
        )

    per_question.sort(key=lambda x: x["difficulty_index"], reverse=True)

    exam_title = exam.title
    return {
        "exam_id": exam_id,
        "exam_title": exam_title,
        "total_attempts": total_attempts,
        "average_score_percent": round(sum(percentages) / len(percentages), 2) if percentages else None,
        "median_score_percent": round(median(percentages), 2) if percentages else None,
        "pass_rate_percent": round(pass_count / total_attempts * 100, 2) if total_attempts else None,
        "pass_threshold": pass_threshold,
        "most_missed_questions": per_question[:10],
        "question_analytics": per_question,
        "score_distribution": _score_buckets(percentages),
    }


def _score_buckets(percentages: List[float]) -> Dict[str, int]:
    buckets = {"0-49": 0, "50-69": 0, "70-89": 0, "90-100": 0}
    for p in percentages:
        if p < 50:
            buckets["0-49"] += 1
        elif p < 70:
            buckets["50-69"] += 1
        elif p < 90:
            buckets["70-89"] += 1
        else:
            buckets["90-100"] += 1
    return buckets
