"""
Exam API — admin management and student exam-taking flow.
"""

from __future__ import annotations

import json
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional

from fastapi import (
    APIRouter,
    BackgroundTasks,
    Depends,
    File,
    Form,
    HTTPException,
    Query,
    Request,
    UploadFile,
    status,
)
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field
from sqlalchemy import and_, desc
from sqlalchemy.orm import Session, joinedload

from ...api.deps import get_current_admin, get_current_student
from ...core.config import settings
from ...core.database import SessionLocal, get_db
from ...core.email import email_service
from ...models.exams import (
    AttemptStatus,
    Exam,
    ExamAttempt,
    ExamAnswer,
    ExamStatus,
    ExamSubmission,
)
from ...models.models import Enrollment, EnrollmentStatus, Registration, Student, UserPersonal
from ...schemas.exams import ExamJSONSchema
from ...services.exam_service import ExamService
from ...services.grading.statistics import compute_exam_statistics
from ...services.grading.anti_cheat import analyze_attempt_integrity

router = APIRouter(prefix="/exams", tags=["Exams"])


async def _send_exam_submission_emails_and_mark(
    submission_id: int,
    *,
    admin_email: Optional[str],
    student_email: Optional[str],
    submission_data: Dict[str, Any],
    json_file_path: str,
    score: Optional[float],
    max_score: Optional[float],
    score_percent: Optional[float],
    pending_manual_count: int,
) -> None:
    """Background: send admin + student emails and persist email_sent on submission."""
    results = await email_service.send_exam_submission_emails(
        admin_email=admin_email,
        student_email=student_email,
        submission_data=submission_data,
        json_file_path=json_file_path,
        score=score,
        max_score=max_score,
        score_percent=score_percent,
        pending_manual_count=pending_manual_count,
    )
    db = SessionLocal()
    try:
        sub = db.query(ExamSubmission).filter(ExamSubmission.id == submission_id).first()
        if sub:
            sub.email_sent = bool(results.get("admin") or results.get("student"))
            sub.email_sent_at = ExamService.naive_utc()
            if admin_email:
                sub.email_recipient = admin_email
            db.commit()
    finally:
        db.close()


# ---------- Request / response models ----------


class ExamMetadataUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    instructions: Optional[str] = None
    duration_minutes: Optional[int] = Field(None, ge=1, le=480)
    max_attempts: Optional[int] = Field(None, ge=1, le=20)
    is_final: Optional[bool] = None
    pass_score_percentage: Optional[int] = Field(None, ge=0, le=100)
    access_token: Optional[str] = None
    allowed_student_ids: Optional[List[int]] = None
    allow_navigation: Optional[bool] = None
    allow_review: Optional[bool] = None
    status: Optional[str] = None
    questions: Optional[Dict[str, Any]] = None


class SaveAnswerBody(BaseModel):
    question_id: str
    answer_value: Optional[Any] = None


class SubmitExamBody(BaseModel):
    answers: Optional[Dict[str, Any]] = None


class StartExamBody(BaseModel):
    access_token: Optional[str] = None


class AuditBody(BaseModel):
    action: str
    details: Optional[Dict[str, Any]] = None


class QuestionGradeInput(BaseModel):
    question_id: str
    points_awarded: Optional[float] = Field(None, ge=0)
    feedback: Optional[str] = None
    rubric_scores: Optional[Dict[str, float]] = None


class SaveGradingBody(BaseModel):
    grades: List[QuestionGradeInput]


class RegradeBody(BaseModel):
    reason: Optional[str] = None


def _exam_to_admin_dict(exam: Exam) -> dict:
    qdata = exam.questions if isinstance(exam.questions, dict) else {}
    return {
        "id": exam.id,
        "course_id": exam.course_id,
        "title": exam.title,
        "description": exam.description,
        "instructions": exam.instructions,
        "status": exam.status.value if hasattr(exam.status, "value") else exam.status,
        "start_time": ExamService.ensure_aware(exam.start_time).isoformat() if exam.start_time else None,
        "end_time": ExamService.ensure_aware(exam.end_time).isoformat() if exam.end_time else None,
        "duration_minutes": exam.duration_minutes,
        "max_attempts": exam.max_attempts,
        "is_final": exam.is_final,
        "pass_score_percentage": exam.pass_score_percentage,
        "total_points": exam.total_points,
        "question_count": ExamService.count_questions(qdata),
        "allow_navigation": exam.allow_navigation,
        "allow_review": exam.allow_review,
        "access_token": exam.access_token,
        "allowed_student_ids": exam.allowed_student_ids or [],
        "created_at": exam.created_at.isoformat() if exam.created_at else None,
    }


def _parse_exam_json(raw: dict) -> ExamJSONSchema:
    try:
        return ExamJSONSchema.model_validate(raw)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid exam JSON: {e}") from e


def _student_course_ids(db: Session, student: Student) -> List[int]:
    ids: List[int] = []
    if student.course_id:
        ids.append(student.course_id)
    regs = (
        db.query(Registration.course_id)
        .filter(Registration.student_id == student.id)
        .distinct()
        .all()
    )
    for (cid,) in regs:
        if cid and cid not in ids:
            ids.append(cid)
    enrollments = (
        db.query(Enrollment.course_id)
        .filter(
            Enrollment.student_id == student.id,
            Enrollment.status.in_(
                [
                    EnrollmentStatus.ACTIVE,
                    EnrollmentStatus.PENDING,
                    EnrollmentStatus.COMPLETED,
                ]
            ),
        )
        .distinct()
        .all()
    )
    for (cid,) in enrollments:
        if cid and cid not in ids:
            ids.append(cid)
    return ids


# ============ ADMIN ============


@router.post("/admin/upload", status_code=status.HTTP_201_CREATED)
async def upload_exam_json(
    course_id: int = Form(...),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_admin: UserPersonal = Depends(get_current_admin),
):
    """Create exam from uploaded JSON file."""
    if not file.filename or not file.filename.lower().endswith(".json"):
        raise HTTPException(status_code=400, detail="Only .json exam files are allowed")

    raw_bytes = await file.read()
    if len(raw_bytes) > 2 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="JSON file too large (max 2MB)")

    try:
        raw = json.loads(raw_bytes.decode("utf-8"))
    except json.JSONDecodeError as e:
        raise HTTPException(status_code=400, detail=f"Invalid JSON: {e}") from e

    if not isinstance(raw, dict):
        raise HTTPException(status_code=400, detail="Exam JSON must be an object")

    raw.pop("start_time", None)
    raw.pop("end_time", None)

    exam_json = _parse_exam_json(raw)
    if ExamService.count_questions(raw) < 1:
        raise HTTPException(status_code=400, detail="Exam must contain at least one question")

    exam = Exam(
        course_id=course_id,
        title=exam_json.title,
        description=exam_json.description,
        instructions=exam_json.instructions,
        start_time=None,
        end_time=None,
        duration_minutes=exam_json.duration_minutes,
        max_attempts=exam_json.max_attempts,
        is_final=exam_json.is_final,
        pass_score_percentage=exam_json.pass_score_percentage,
        allow_navigation=exam_json.settings.allow_navigation,
        allow_review=exam_json.settings.allow_review_before_submit,
        show_answers_after=exam_json.settings.show_correct_answers,
        randomize_questions=exam_json.settings.randomize_questions,
        randomize_options=exam_json.settings.randomize_options,
        allowed_student_ids=exam_json.allowed_student_ids,
        access_token=exam_json.access_token,
        questions=raw,
        total_points=exam_json.get_total_points(),
        created_by_user_id=current_admin.id,
        status=ExamStatus.DRAFT,
    )
    db.add(exam)
    db.commit()
    db.refresh(exam)
    ExamService.log_audit(db, exam.id, "exam_created", "admin", current_admin.id)
    return _exam_to_admin_dict(exam)


@router.get("/admin/list")
async def list_exams_admin(
    course_id: Optional[int] = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    _admin: UserPersonal = Depends(get_current_admin),
):
    query = db.query(Exam)
    if course_id is not None:
        query = query.filter(Exam.course_id == course_id)
    total = query.count()
    exams = query.order_by(desc(Exam.created_at)).offset(skip).limit(limit).all()
    return {"data": [_exam_to_admin_dict(e) for e in exams], "total": total}


@router.get("/admin/{exam_id}")
async def get_exam_admin(
    exam_id: int,
    db: Session = Depends(get_db),
    _admin: UserPersonal = Depends(get_current_admin),
):
    exam = db.query(Exam).filter(Exam.id == exam_id).first()
    if not exam:
        raise HTTPException(status_code=404, detail="Exam not found")
    data = _exam_to_admin_dict(exam)
    data["questions"] = exam.questions
    return data


@router.put("/admin/{exam_id}/json")
async def replace_exam_json(
    exam_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_admin: UserPersonal = Depends(get_current_admin),
):
    exam = db.query(Exam).filter(Exam.id == exam_id).first()
    if not exam:
        raise HTTPException(status_code=404, detail="Exam not found")

    raw_bytes = await file.read()
    try:
        raw = json.loads(raw_bytes.decode("utf-8"))
    except json.JSONDecodeError as e:
        raise HTTPException(status_code=400, detail=f"Invalid JSON: {e}") from e

    raw.pop("start_time", None)
    raw.pop("end_time", None)

    exam_json = _parse_exam_json(raw)
    exam.questions = raw
    exam.total_points = exam_json.get_total_points()
    exam.title = exam_json.title
    exam.description = exam_json.description
    exam.instructions = exam_json.instructions
    exam.duration_minutes = exam_json.duration_minutes
    if exam.start_time is not None:
        ExamService.sync_end_time_from_duration(exam)
    db.commit()
    ExamService.log_audit(db, exam_id, "exam_json_updated", "admin", current_admin.id)
    return {"success": True, "total_points": exam.total_points}


@router.patch("/admin/{exam_id}")
async def update_exam_metadata(
    exam_id: int,
    body: ExamMetadataUpdate,
    db: Session = Depends(get_db),
    current_admin: UserPersonal = Depends(get_current_admin),
):
    exam = db.query(Exam).filter(Exam.id == exam_id).first()
    if not exam:
        raise HTTPException(status_code=404, detail="Exam not found")

    data = body.model_dump(exclude_unset=True)
    if "status" in data:
        exam.status = ExamStatus(data["status"])
        del data["status"]

    if "questions" in data:
        questions_raw = data["questions"]
        exam_json = _parse_exam_json(questions_raw)
        exam.questions = questions_raw
        exam.total_points = exam_json.get_total_points()
        del data["questions"]

    for key, val in data.items():
        setattr(exam, key, val)

    if "duration_minutes" in data and exam.start_time is not None:
        ExamService.sync_end_time_from_duration(exam)

    db.commit()
    ExamService.log_audit(db, exam_id, "exam_updated", "admin", current_admin.id)
    return _exam_to_admin_dict(exam)


@router.patch("/admin/{exam_id}/activate")
async def activate_exam(
    exam_id: int,
    db: Session = Depends(get_db),
    current_admin: UserPersonal = Depends(get_current_admin),
):
    exam = db.query(Exam).filter(Exam.id == exam_id).first()
    if not exam:
        raise HTTPException(status_code=404, detail="Exam not found")
    ExamService.apply_exam_window(exam)
    exam.status = ExamStatus.ACTIVE
    db.commit()
    db.refresh(exam)
    ExamService.log_audit(db, exam_id, "exam_activated", "admin", current_admin.id)
    return {
        "success": True,
        "start_time": _exam_to_admin_dict(exam)["start_time"],
        "end_time": _exam_to_admin_dict(exam)["end_time"],
    }


@router.patch("/admin/{exam_id}/deactivate")
async def deactivate_exam(
    exam_id: int,
    db: Session = Depends(get_db),
    current_admin: UserPersonal = Depends(get_current_admin),
):
    exam = db.query(Exam).filter(Exam.id == exam_id).first()
    if not exam:
        raise HTTPException(status_code=404, detail="Exam not found")
    exam.status = ExamStatus.INACTIVE
    db.commit()
    ExamService.log_audit(db, exam_id, "exam_deactivated", "admin", current_admin.id)
    return {"success": True}


@router.delete("/admin/{exam_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_exam(
    exam_id: int,
    db: Session = Depends(get_db),
    current_admin: UserPersonal = Depends(get_current_admin),
):
    exam = db.query(Exam).filter(Exam.id == exam_id).first()
    if not exam:
        raise HTTPException(status_code=404, detail="Exam not found")
    db.delete(exam)
    db.commit()
    return None


@router.get("/admin/{exam_id}/submissions")
async def list_submissions(
    exam_id: int,
    db: Session = Depends(get_db),
    _admin: UserPersonal = Depends(get_current_admin),
):
    submissions = (
        db.query(ExamSubmission)
        .filter(ExamSubmission.exam_id == exam_id)
        .options(
            joinedload(ExamSubmission.attempt)
            .joinedload(ExamAttempt.student)
            .joinedload(Student.user)
        )
        .order_by(desc(ExamSubmission.submitted_at))
        .all()
    )
    exam = db.query(Exam).filter(Exam.id == exam_id).first()
    rows = []
    for s in submissions:
        att = s.attempt
        user = att.student.user if att and att.student else None
        name = f"{user.first_name} {user.last_name}" if user else "Unknown"
        grading_status = "ungraded"
        pending_manual = 0
        if att and exam:
            summary = ExamService.recalculate_attempt_scores(db, att, exam)
            grading_status = summary["grading_status"]
            pending_manual = summary["pending_manual_count"]
        rows.append(
            {
                "id": s.id,
                "attempt_id": s.attempt_id,
                "student_id": att.student_id if att else None,
                "student_name": name,
                "student_email": user.email if user else None,
                "score": att.score if att else None,
                "max_score": att.max_score if att else None,
                "grading_status": grading_status,
                "pending_manual_count": pending_manual,
                "attempt_status": (
                    ExamService._attempt_status_value(att) if att else None
                ),
                "submitted_at": s.submitted_at.isoformat() if s.submitted_at else None,
                "time_spent_seconds": att.time_spent_seconds if att else 0,
                "email_sent": s.email_sent,
                "download_path": s.submission_json_path,
            }
        )
    db.commit()
    return {"data": rows, "total": len(rows)}


@router.get("/admin/submissions/{submission_id}/download")
async def download_submission(
    submission_id: int,
    db: Session = Depends(get_db),
    _admin: UserPersonal = Depends(get_current_admin),
):
    sub = db.query(ExamSubmission).filter(ExamSubmission.id == submission_id).first()
    if not sub or not sub.submission_json_path:
        raise HTTPException(status_code=404, detail="Submission file not found")
    try:
        path = ExamService.resolve_submission_path(sub.submission_json_path)
    except ValueError:
        raise HTTPException(status_code=404, detail="Submission file not found") from None
    if not path.is_file():
        raise HTTPException(status_code=404, detail="File missing on disk")
    return FileResponse(path, media_type="application/json", filename=path.name)


@router.get("/admin/attempts/{attempt_id}/grading")
async def get_attempt_grading(
    attempt_id: int,
    db: Session = Depends(get_db),
    _admin: UserPersonal = Depends(get_current_admin),
):
    detail = ExamService.build_grading_detail(db, attempt_id)
    if not detail:
        raise HTTPException(status_code=404, detail="Attempt not found")
    db.commit()
    return detail


@router.put("/admin/attempts/{attempt_id}/grading")
async def save_attempt_grading(
    attempt_id: int,
    body: SaveGradingBody,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_admin: UserPersonal = Depends(get_current_admin),
):
    grades = [g.model_dump(exclude_none=True) for g in body.grades]
    result = ExamService.apply_manual_grades(
        db, attempt_id, grades, graded_by_id=current_admin.id
    )
    if not result.get("success"):
        raise HTTPException(status_code=404, detail=result.get("error", "Attempt not found"))

    if result.get("grading_status") == "complete":
        attempt = (
            db.query(ExamAttempt)
            .filter(ExamAttempt.id == attempt_id)
            .options(joinedload(ExamAttempt.student).joinedload(Student.user))
            .first()
        )
        if attempt and attempt.student and attempt.student.user:
            user = attempt.student.user
            exam = db.query(Exam).filter(Exam.id == attempt.exam_id).first()
            if exam and user.email:
                background_tasks.add_task(
                    email_service.send_exam_graded_to_student,
                    user.email,
                    f"{user.first_name} {user.last_name}".strip(),
                    exam.title,
                    score=float(result.get("score") or 0),
                    max_score=float(result.get("max_score") or 0),
                    score_percent=result.get("score_percent"),
                    attempt_id=attempt_id,
                )

    return result


@router.post("/admin/attempts/{attempt_id}/regrade")
async def regrade_attempt_auto(
    attempt_id: int,
    db: Session = Depends(get_db),
    current_admin: UserPersonal = Depends(get_current_admin),
):
    attempt = db.query(ExamAttempt).filter(ExamAttempt.id == attempt_id).first()
    if not attempt:
        raise HTTPException(status_code=404, detail="Attempt not found")
    result = ExamService.grade_attempt(
        db,
        attempt_id,
        only_auto=True,
        graded_by_id=current_admin.id,
        regrade=True,
    )
    if not result.get("success"):
        raise HTTPException(status_code=400, detail=result.get("error", "Regrade failed"))
    ExamService.log_audit(
        db,
        attempt.exam_id,
        "attempt_regraded",
        "admin",
        current_admin.id,
        attempt_id=attempt_id,
        details={"reason": "auto_regrade"},
    )
    return result


@router.get("/admin/{exam_id}/grading-analytics")
async def get_exam_grading_analytics(
    exam_id: int,
    db: Session = Depends(get_db),
    _admin: UserPersonal = Depends(get_current_admin),
):
    exam = db.query(Exam).filter(Exam.id == exam_id).first()
    if not exam:
        raise HTTPException(status_code=404, detail="Exam not found")
    return compute_exam_statistics(db, exam_id)


@router.get("/admin/attempts/{attempt_id}/integrity")
async def get_attempt_integrity(
    attempt_id: int,
    db: Session = Depends(get_db),
    _admin: UserPersonal = Depends(get_current_admin),
):
    attempt = db.query(ExamAttempt).filter(ExamAttempt.id == attempt_id).first()
    if not attempt:
        raise HTTPException(status_code=404, detail="Attempt not found")
    report = analyze_attempt_integrity(db, attempt)
    return {"attempt_id": attempt_id, **report}


@router.get("/admin/attempts/{attempt_id}/grading-history")
async def get_grading_history(
    attempt_id: int,
    db: Session = Depends(get_db),
    _admin: UserPersonal = Depends(get_current_admin),
):
    from ...models.exams import ExamGradingHistory

    rows = (
        db.query(ExamGradingHistory)
        .filter(ExamGradingHistory.attempt_id == attempt_id)
        .order_by(desc(ExamGradingHistory.created_at))
        .all()
    )
    return {
        "data": [
            {
                "id": r.id,
                "grading_version": r.grading_version,
                "previous_score": float(r.previous_score) if r.previous_score is not None else None,
                "new_score": float(r.new_score),
                "reason": r.reason,
                "changed_by_id": r.changed_by_id,
                "created_at": r.created_at.isoformat() if r.created_at else None,
            }
            for r in rows
        ]
    }


@router.get("/admin/{exam_id}/active-students")
async def get_active_students(
    exam_id: int,
    db: Session = Depends(get_db),
    _admin: UserPersonal = Depends(get_current_admin),
):
    now = ExamService.utc_now()
    attempts = (
        db.query(ExamAttempt)
        .filter(
            ExamAttempt.exam_id == exam_id,
            ExamAttempt.status == AttemptStatus.IN_PROGRESS,
        )
        .options(joinedload(ExamAttempt.student).joinedload(Student.user))
        .all()
    )
    return {
        "count": len(attempts),
        "students": [
            {
                "attempt_id": a.id,
                "student_id": a.student_id,
                "name": f"{a.student.user.first_name} {a.student.user.last_name}",
                "started_at": ExamService.ensure_aware(a.started_at).isoformat(),
                "elapsed_seconds": int((now - ExamService.ensure_aware(a.started_at)).total_seconds()),
            }
            for a in attempts
            if a.student and a.student.user
        ],
    }


# ============ STUDENT ============


@router.get("/student/available")
async def get_available_exams(
    course_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_student: Student = Depends(get_current_student),
):
    course_ids = [course_id] if course_id else _student_course_ids(db, current_student)
    if not course_ids:
        return []

    now = ExamService.utc_now()
    exams = (
        db.query(Exam)
        .filter(
            Exam.course_id.in_(course_ids),
            Exam.status.in_(
                [ExamStatus.ACTIVE, ExamStatus.DRAFT, ExamStatus.INACTIVE]
            ),
        )
        .order_by(desc(Exam.created_at))
        .all()
    )

    exam_ids = [e.id for e in exams]
    attempts_by_exam: Dict[int, List[ExamAttempt]] = {eid: [] for eid in exam_ids}
    if exam_ids:
        all_attempts = (
            db.query(ExamAttempt)
            .filter(
                ExamAttempt.exam_id.in_(exam_ids),
                ExamAttempt.student_id == current_student.id,
            )
            .order_by(desc(ExamAttempt.id))
            .all()
        )
        for att in all_attempts:
            attempts_by_exam.setdefault(att.exam_id, []).append(att)

    repaired = False
    result = []
    for exam in exams:
        if not ExamService.student_may_access(exam, current_student.id):
            continue

        exam_status = ExamService._exam_status_value(exam)

        if ExamService.is_exam_active_status(exam) and (
            exam.start_time is None or exam.end_time is None
        ):
            ExamService.apply_exam_window(exam)
            repaired = True

        avail, msg = ExamService.availability(exam, now)
        student_attempts = attempts_by_exam.get(exam.id, [])
        attempts_count = len(student_attempts)
        in_progress = next(
            (a for a in student_attempts if a.status == AttemptStatus.IN_PROGRESS),
            None,
        )
        latest_attempt = student_attempts[0] if student_attempts else None
        student_status = ExamService.student_exam_display_status(in_progress, latest_attempt)
        has_attempt_slot = attempts_count < exam.max_attempts
        can_attempt = avail == "available" and (has_attempt_slot or in_progress is not None)

        last_score = None
        last_max_score = None
        submitted_at = None
        if latest_attempt and student_status == "submitted":
            last_score = latest_attempt.score
            last_max_score = latest_attempt.max_score
            if latest_attempt.submitted_at:
                submitted_at = ExamService.ensure_aware(latest_attempt.submitted_at).isoformat()

        result.append(
            {
                "id": exam.id,
                "course_id": exam.course_id,
                "exam_status": exam_status,
                "student_status": student_status,
                "title": exam.title,
                "description": exam.description,
                "duration_minutes": exam.duration_minutes,
                "total_points": exam.total_points,
                "start_time": ExamService.ensure_aware(exam.start_time).isoformat()
                if exam.start_time
                else None,
                "end_time": ExamService.ensure_aware(exam.end_time).isoformat()
                if exam.end_time
                else None,
                "availability": avail,
                "message": msg,
                "requires_token": bool(exam.access_token),
                "can_attempt": can_attempt,
                "attempts_used": attempts_count,
                "attempts_remaining": max(0, exam.max_attempts - attempts_count),
                "active_attempt_id": in_progress.id if in_progress else None,
                "last_score": last_score,
                "last_max_score": last_max_score,
                "submitted_at": submitted_at,
            }
        )
    if repaired:
        db.commit()
    return result


@router.post("/student/start/{exam_id}")
async def start_exam(
    exam_id: int,
    body: StartExamBody,
    request: Request,
    db: Session = Depends(get_db),
    current_student: Student = Depends(get_current_student),
):
    exam = db.query(Exam).filter(Exam.id == exam_id).first()
    if not exam:
        raise HTTPException(status_code=404, detail="Exam not found")
    if exam.status != ExamStatus.ACTIVE:
        raise HTTPException(status_code=403, detail="Exam is not active")

    now = ExamService.utc_now()
    avail, msg = ExamService.availability(exam, now)
    if avail == "waiting":
        raise HTTPException(status_code=403, detail=msg)
    if avail == "unavailable":
        raise HTTPException(status_code=403, detail=msg)

    if not ExamService.student_may_access(exam, current_student.id):
        raise HTTPException(status_code=403, detail="You are not allowed to access this exam")

    if exam.access_token and body.access_token != exam.access_token:
        raise HTTPException(status_code=403, detail="Invalid access code")

    existing = (
        db.query(ExamAttempt)
        .filter(
            ExamAttempt.exam_id == exam_id,
            ExamAttempt.student_id == current_student.id,
            ExamAttempt.status == AttemptStatus.IN_PROGRESS,
        )
        .first()
    )
    if existing:
        return _attempt_payload(existing, exam)

    attempts = (
        db.query(ExamAttempt)
        .filter(
            ExamAttempt.exam_id == exam_id,
            ExamAttempt.student_id == current_student.id,
        )
        .count()
    )
    if attempts >= exam.max_attempts:
        raise HTTPException(status_code=403, detail="Maximum attempts exceeded")

    client_ip = request.client.host if request.client else None
    attempt = ExamAttempt(
        exam_id=exam_id,
        student_id=current_student.id,
        attempt_number=attempts + 1,
        status=AttemptStatus.IN_PROGRESS,
        ip_address=client_ip,
        user_agent=request.headers.get("user-agent"),
    )
    db.add(attempt)
    db.commit()
    db.refresh(attempt)
    ExamService.log_audit(
        db,
        exam_id,
        "exam_started",
        "student",
        current_student.id,
        student_id=current_student.id,
        attempt_id=attempt.id,
        ip_address=client_ip,
    )
    return _attempt_payload(attempt, exam)


def _attempt_status_str(attempt: ExamAttempt) -> str:
    status = attempt.status
    if isinstance(status, AttemptStatus):
        return status.value
    return str(status.value if hasattr(status, "value") else status)


def _attempt_payload(attempt: ExamAttempt, exam: Exam) -> dict:
    now = ExamService.utc_now()
    in_progress = _attempt_status_str(attempt) == AttemptStatus.IN_PROGRESS.value
    time_remaining = 0
    if in_progress:
        if exam.end_time is None:
            raise HTTPException(status_code=403, detail="Exam window is not open")
        end = ExamService.ensure_aware(exam.end_time)
        duration_deadline = ExamService.ensure_aware(attempt.started_at).timestamp() + exam.duration_minutes * 60
        window_remaining = int((end - now).total_seconds())
        duration_remaining = int(duration_deadline - now.timestamp())
        time_remaining = max(0, min(window_remaining, duration_remaining))

    qdata = exam.questions if isinstance(exam.questions, dict) else {}
    status_str = _attempt_status_str(attempt)
    return {
        "attempt_id": attempt.id,
        "attempt_status": status_str,
        "is_submitted": status_str != AttemptStatus.IN_PROGRESS.value,
        "started_at": ExamService.ensure_aware(attempt.started_at).isoformat(),
        "time_remaining_seconds": time_remaining,
        "answers": attempt.answers or {},
        "exam": {
            "id": exam.id,
            "title": exam.title,
            "instructions": exam.instructions,
            "duration_minutes": exam.duration_minutes,
            "questions": ExamService.strip_answers_for_student(qdata),
            "settings": {
                "allow_navigation": exam.allow_navigation,
                "allow_review": exam.allow_review,
                "randomize_questions": exam.randomize_questions,
                "randomize_options": exam.randomize_options,
            },
        },
    }


@router.get("/student/attempts/{attempt_id}")
async def get_attempt_status(
    attempt_id: int,
    db: Session = Depends(get_db),
    current_student: Student = Depends(get_current_student),
):
    attempt = (
        db.query(ExamAttempt)
        .filter(
            ExamAttempt.id == attempt_id,
            ExamAttempt.student_id == current_student.id,
        )
        .options(joinedload(ExamAttempt.exam))
        .first()
    )
    if not attempt:
        raise HTTPException(status_code=404, detail="Attempt not found")
    return _attempt_payload(attempt, attempt.exam)


@router.post("/student/attempts/{attempt_id}/save-answer")
async def save_answer(
    attempt_id: int,
    body: SaveAnswerBody,
    db: Session = Depends(get_db),
    current_student: Student = Depends(get_current_student),
):
    attempt = (
        db.query(ExamAttempt)
        .filter(
            ExamAttempt.id == attempt_id,
            ExamAttempt.student_id == current_student.id,
        )
        .options(joinedload(ExamAttempt.exam))
        .first()
    )
    if not attempt:
        raise HTTPException(status_code=404, detail="Attempt not found")
    if _attempt_status_str(attempt) != AttemptStatus.IN_PROGRESS.value:
        raise HTTPException(status_code=409, detail="Exam attempt is already submitted")

    exam = attempt.exam
    now = ExamService.utc_now()
    if ExamService.availability(exam, now)[0] != "available":
        raise HTTPException(status_code=403, detail="Exam window has closed")

    merged = ExamService.persist_answers_to_attempt(
        db,
        attempt,
        exam,
        {body.question_id: body.answer_value},
    )

    db.commit()
    db.refresh(attempt)
    return {
        "success": True,
        "saved_at": now.isoformat(),
        "answers": merged,
    }


@router.post("/student/attempts/{attempt_id}/submit")
async def submit_exam(
    attempt_id: int,
    body: SubmitExamBody,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_student: Student = Depends(get_current_student),
):
    attempt = (
        db.query(ExamAttempt)
        .filter(
            ExamAttempt.id == attempt_id,
            ExamAttempt.student_id == current_student.id,
            ExamAttempt.status == AttemptStatus.IN_PROGRESS,
        )
        .options(joinedload(ExamAttempt.exam))
        .first()
    )
    if not attempt:
        raise HTTPException(status_code=404, detail="Attempt not found or already submitted")

    exam = attempt.exam
    now = ExamService.utc_now()

    if body.answers:
        ExamService.persist_answers_to_attempt(db, attempt, exam, body.answers)
        db.flush()

    attempt.submitted_at = now
    attempt.status = AttemptStatus.SUBMITTED
    attempt.time_spent_seconds = int(
        (now - ExamService.ensure_aware(attempt.started_at)).total_seconds()
    )

    user = db.query(UserPersonal).filter(UserPersonal.id == current_student.user_id).first()
    student_name = f"{user.first_name} {user.last_name}" if user else "Student"
    student_email = user.email if user else ""

    submission_data = {
        "exam_id": exam.id,
        "exam_title": exam.title,
        "student_id": current_student.id,
        "student_name": student_name,
        "student_email": student_email,
        "attempt_id": attempt.id,
        "attempt_number": attempt.attempt_number,
        "started_at": ExamService.ensure_aware(attempt.started_at).isoformat(),
        "submitted_at": now.isoformat(),
        "time_spent_seconds": attempt.time_spent_seconds,
        "answers": attempt.answers or {},
    }

    file_path = ExamService.write_submission_file(
        submission_data, exam.id, current_student.id
    )
    admin_email = settings.ADMIN_EMAIL or settings.SMTP_FROM_EMAIL

    submission = ExamSubmission(
        exam_id=exam.id,
        attempt_id=attempt_id,
        submission_json_path=file_path,
        email_recipient=admin_email,
    )
    db.add(submission)
    db.commit()
    db.refresh(submission)

    grade_result = ExamService.grade_attempt(db, attempt_id)
    db.refresh(attempt)

    score_percent = grade_result.get("score_percent")
    if score_percent is None and attempt.max_score and attempt.max_score > 0:
        score_percent = round(float(attempt.score or 0) / float(attempt.max_score) * 100, 2)

    background_tasks.add_task(
        _send_exam_submission_emails_and_mark,
        submission.id,
        admin_email=admin_email,
        student_email=student_email or None,
        submission_data=submission_data,
        json_file_path=file_path,
        score=attempt.score,
        max_score=attempt.max_score,
        score_percent=score_percent,
        pending_manual_count=grade_result.get("pending_manual_count", 0),
    )

    ExamService.log_audit(
        db,
        exam.id,
        "exam_submitted",
        "student",
        current_student.id,
        student_id=current_student.id,
        attempt_id=attempt_id,
    )

    return {
        "success": True,
        "submission_id": submission.id,
        "time_spent_seconds": attempt.time_spent_seconds,
        "score": attempt.score,
        "max_score": attempt.max_score,
        "grading_status": grade_result.get("grading_status"),
        "pending_manual_count": grade_result.get("pending_manual_count", 0),
        "attempt_status": grade_result.get("attempt_status"),
    }


@router.get("/student/attempts/{attempt_id}/result")
async def get_student_attempt_result(
    attempt_id: int,
    db: Session = Depends(get_db),
    current_student: Student = Depends(get_current_student),
):
    payload = ExamService.student_result_payload(db, attempt_id, current_student.id)
    if not payload:
        raise HTTPException(status_code=404, detail="Result not available")
    return payload


@router.post("/student/attempts/{attempt_id}/audit")
async def log_student_audit(
    attempt_id: int,
    body: AuditBody,
    request: Request,
    db: Session = Depends(get_db),
    current_student: Student = Depends(get_current_student),
):
    """Optional: tab blur, fullscreen exit, etc."""
    attempt = (
        db.query(ExamAttempt)
        .filter(
            ExamAttempt.id == attempt_id,
            ExamAttempt.student_id == current_student.id,
        )
        .first()
    )
    if not attempt:
        raise HTTPException(status_code=404, detail="Attempt not found")

    suspicious = body.action in ("tab_hidden", "fullscreen_exit", "paste_attempt")
    ExamService.log_audit(
        db,
        attempt.exam_id,
        body.action,
        "student",
        current_student.id,
        student_id=current_student.id,
        attempt_id=attempt_id,
        details=body.details,
        is_suspicious=suspicious,
        ip_address=request.client.host if request.client else None,
    )
    return {"logged": True}
