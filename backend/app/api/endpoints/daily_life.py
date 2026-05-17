# app/api/endpoints/daily_life.py
import logging
from typing import Any, List, Optional
from datetime import datetime, timezone

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, status
from sqlalchemy.orm import Session

from ...core.database import SessionLocal, get_db
from ...core.cloudinary import (
    delete_cloudinary_by_url,
    delete_cloudinary_urls,
    delete_removed_cloudinary_urls,
)
from ...core.email import email_service
from ...models.models import DailyLife, UserPersonal, UserRole
from ...schemas.schemas import DailyLifeCreate, DailyLifeUpdate, DailyLifeResponse
from ..deps import get_current_admin

logger = logging.getLogger(__name__)
router = APIRouter()


def _localized_title(value: Any) -> str:
    """Best-effort multilingual-dict → single string."""
    if isinstance(value, dict):
        for lang in ("hy", "en", "ru"):
            v = (value.get(lang) or "").strip()
            if v:
                return v
        for v in value.values():
            if v:
                return str(v).strip()
        return ""
    return str(value or "")


async def _broadcast_daily_life_published(story_id: int, title_label: str) -> None:
    """Send the 'new daily life story' email to every active student.

    Runs inside a FastAPI BackgroundTask — opens its own short-lived session
    so it doesn't reuse the request-scoped one (which is closed by the time
    the task runs).
    """
    session: Session = SessionLocal()
    try:
        recipients = (
            session.query(UserPersonal.email, UserPersonal.first_name)
            .filter(
                UserPersonal.role == UserRole.STUDENT,
                UserPersonal.is_active.is_(True),
                UserPersonal.email.isnot(None),
            )
            .all()
        )
    finally:
        try:
            session.close()
        except Exception:
            pass

    sent = 0
    for email, first_name in recipients:
        if not email:
            continue
        try:
            ok = await email_service.send_daily_life_published(
                email, first_name or "", title_label, story_id,
            )
            if ok:
                sent += 1
        except Exception:
            logger.exception("daily_life broadcast: failed to email %s", email)
    logger.info(
        "daily_life broadcast: story_id=%s recipients=%d sent=%d",
        story_id, len(recipients), sent,
    )

@router.get("/", response_model=List[DailyLifeResponse])
async def get_daily_life_stories(
    skip: int = 0,
    limit: int = 100,
    is_published: Optional[bool] = True,
    db: Session = Depends(get_db)
):
    """Get all daily life stories (public endpoint shows only published)"""
    query = db.query(DailyLife)
    
    if is_published is not None:
        query = query.filter(DailyLife.is_published == is_published)
    
    stories = query.order_by(
        DailyLife.published_date.desc()
    ).offset(skip).limit(limit).all()
    
    return stories

@router.get("/admin/list", response_model=List[DailyLifeResponse])
async def list_all_daily_life_admin(
    skip: int = 0,
    limit: int = 50,
    is_published: Optional[bool] = None,
    db: Session = Depends(get_db),
    current_admin = Depends(get_current_admin)
):
    """Get all daily life stories (published and unpublished) for admin (Admin only)"""
    query = db.query(DailyLife)
    
    if is_published is not None:
        query = query.filter(DailyLife.is_published == is_published)

    
    total = query.count()
    stories = query.order_by(
        DailyLife.published_date.desc()
    ).offset(skip).limit(limit).all()
    
    return stories

@router.get("/featured")
async def get_featured_daily_life(
    limit: int = 10,
    db: Session = Depends(get_db)
):
    """Get featured daily life stories for homepage"""
    stories = db.query(DailyLife).filter(
        DailyLife.is_published == True
    ).order_by(
        DailyLife.published_date.desc()
    ).limit(limit).all()
    
    return stories

@router.get("/{story_id}", response_model=DailyLifeResponse)
async def get_daily_life(
    story_id: int,
    db: Session = Depends(get_db)
):
    """Get single daily life story by ID"""
    story = db.query(DailyLife).filter(DailyLife.id == story_id).first()
    
    if not story:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Story not found"
        )
    
    if not story.is_published:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Story not found"
        )
    
    return story

@router.post("/", response_model=DailyLifeResponse, status_code=status.HTTP_201_CREATED)
async def create_daily_life(
    story_data: DailyLifeCreate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_admin = Depends(get_current_admin)
):
    """Create new daily life story (Admin only).

    If the story is created already published, every active student gets a
    notification email (non-blocking via BackgroundTasks).
    """
    new_story = DailyLife(
        title=story_data.title.model_dump(),
        subtitle=story_data.subtitle.model_dump() if story_data.subtitle else None,
        description=story_data.description.model_dump(),
        image_urls=story_data.image_urls or [],
        video_url=story_data.video_url,
        is_published=story_data.is_published,
        published_date=datetime.now(timezone.utc)
    )
    db.add(new_story)
    db.commit()
    db.refresh(new_story)

    if new_story.is_published:
        background_tasks.add_task(
            _broadcast_daily_life_published,
            new_story.id,
            _localized_title(new_story.title),
        )

    return new_story

@router.put("/{story_id}", response_model=DailyLifeResponse)
async def update_daily_life(
    story_id: int,
    story_data: DailyLifeUpdate,
    db: Session = Depends(get_db),
    current_admin = Depends(get_current_admin)
):
    """Update daily life story (Admin only)"""
    story = db.query(DailyLife).filter(DailyLife.id == story_id).first()
    
    if not story:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Story not found"
        )
    
    update_data = story_data.model_dump(exclude_unset=True)

    if "image_urls" in update_data and update_data["image_urls"] is not None:
        delete_removed_cloudinary_urls(story.image_urls or [], update_data["image_urls"])
    if "video_url" in update_data:
        old_v, new_v = story.video_url, update_data["video_url"]
        if old_v and old_v != new_v:
            delete_cloudinary_by_url(old_v)

    for field, value in update_data.items():
        if value is not None:
            setattr(story, field, value)
    
    db.commit()
    db.refresh(story)
    return story

@router.delete("/{story_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_daily_life(
    story_id: int,
    db: Session = Depends(get_db),
    current_admin = Depends(get_current_admin)
):
    """Delete daily life story (Admin only)"""
    story = db.query(DailyLife).filter(DailyLife.id == story_id).first()
    
    if not story:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Daily life story not found"
        )

    delete_cloudinary_urls(story.image_urls or [])
    delete_cloudinary_by_url(story.video_url)

    db.delete(story)
    db.commit()
    return None

@router.patch("/{story_id}/toggle-published", response_model=DailyLifeResponse)
async def toggle_daily_life_published(
    story_id: int,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_admin = Depends(get_current_admin)
):
    """Toggle daily life story published status (Admin only).

    On a False → True transition, every active student gets a notification
    email (non-blocking via BackgroundTasks).
    """
    prior = db.query(DailyLife.id, DailyLife.is_published).filter(
        DailyLife.id == story_id
    ).first()
    if not prior:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Daily life story not found"
        )
    was_published = bool(prior.is_published)

    db.query(DailyLife).filter(DailyLife.id == story_id).update(
        {DailyLife.is_published: ~DailyLife.is_published},
        synchronize_session=False,
    )
    db.commit()

    story = db.query(DailyLife).filter(DailyLife.id == story_id).first()

    if story and story.is_published and not was_published:
        background_tasks.add_task(
            _broadcast_daily_life_published,
            story.id,
            _localized_title(story.title),
        )

    return story