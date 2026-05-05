# app/api/endpoints/daily_life.py
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime, timezone
from ...core.database import get_db
from ...models.models import DailyLife
from ...schemas.schemas import DailyLifeCreate, DailyLifeUpdate, DailyLifeResponse
from ..deps import get_current_admin

router = APIRouter()

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
    
    stories = query.order_by(
        DailyLife.published_date.desc()
    ).offset(skip).limit(limit).all()
    
    return stories

@router.get("/featured", response_model=List[DailyLifeResponse])
async def get_featured_daily_life(
    limit: int = 3,
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
    db: Session = Depends(get_db),
    current_admin = Depends(get_current_admin)
):
    """Create new daily life story (Admin only)"""
    # Create daily life story
    new_story = DailyLife(
        title=story_data.title.dict(),
        description=story_data.description.dict(),
        image_urls=story_data.image_urls or [],
        is_published=story_data.is_published,
        published_date=datetime.now(timezone.utc)  # Set published date when story is created
    )
    db.add(new_story)
    db.commit()
    db.refresh(new_story)
    
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
    
    # Update fields
    update_data = story_data.dict(exclude_unset=True)
    
    # Handle multilingual fields - convert to dict if needed
    if 'title' in update_data and update_data['title']:
        if isinstance(update_data['title'], dict):
            update_data['title'] = update_data['title']
        else:
            update_data['title'] = update_data['title'].dict()
    
    if 'description' in update_data and update_data['description']:
        if isinstance(update_data['description'], dict):
            update_data['description'] = update_data['description']
        else:
            update_data['description'] = update_data['description'].dict()
    
    for field, value in update_data.items():
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
    
    db.delete(story)
    db.commit()
    return None

@router.patch("/{story_id}/toggle-published", response_model=DailyLifeResponse)
async def toggle_daily_life_published(
    story_id: int,
    db: Session = Depends(get_db),
    current_admin = Depends(get_current_admin)
):
    """Toggle daily life story published status (Admin only)"""
    story = db.query(DailyLife).filter(DailyLife.id == story_id).first()
    
    if not story:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Daily life story not found"
        )
    
    story.is_published = not story.is_published
    db.commit()
    db.refresh(story)
    return story
