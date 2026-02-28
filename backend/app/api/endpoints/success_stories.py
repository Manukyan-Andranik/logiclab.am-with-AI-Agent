# app/api/endpoints/success_stories.py
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload
from typing import List, Optional
from ...core.database import get_db
from ...models.models import SuccessStory, Course, Student
from ...schemas.schemas import SuccessStoryCreate, SuccessStoryUpdate, SuccessStoryResponse
from ..deps import get_current_admin

router = APIRouter()

@router.get("/", response_model=List[SuccessStoryResponse])
async def get_success_stories(
    skip: int = 0,
    limit: int = 100,
    course_id: Optional[int] = None,
    is_published: Optional[bool] = True,
    db: Session = Depends(get_db)
):
    """Get all success stories (public endpoint shows only published)"""
    query = db.query(SuccessStory).options(
        joinedload(SuccessStory.student).joinedload(Student.user),
        joinedload(SuccessStory.course)
    )
    
    if is_published is not None:
        query = query.filter(SuccessStory.is_published == is_published)
    
    if course_id:
        query = query.filter(SuccessStory.course_id == course_id)
    
    stories = query.order_by(
        SuccessStory.published_date.desc()
    ).offset(skip).limit(limit).all()
    
    return stories

@router.get("/featured")
async def get_featured_success_stories(
    limit: int = 3,
    db: Session = Depends(get_db)
):
    """Get featured success stories for homepage"""
    stories = db.query(SuccessStory).options(
        joinedload(SuccessStory.student).joinedload(Student.user),
        joinedload(SuccessStory.course)
    ).filter(
        SuccessStory.is_published == True
    ).order_by(
        SuccessStory.published_date.desc()
    ).limit(limit).all()
    
    return stories

@router.get("/{story_id}", response_model=SuccessStoryResponse)
async def get_success_story(
    story_id: int,
    db: Session = Depends(get_db)
):
    """Get single success story by ID"""
    story = db.query(SuccessStory).options(
        joinedload(SuccessStory.student).joinedload(Student.user),
        joinedload(SuccessStory.course)
    ).filter(SuccessStory.id == story_id).first()
    
    if not story:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Success story not found"
        )
    
    if not story.is_published:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Success story not found"
        )
    
    return story

@router.post("/", response_model=SuccessStoryResponse, status_code=status.HTTP_201_CREATED)
async def create_success_story(
    story_data: SuccessStoryCreate,
    db: Session = Depends(get_db),
    current_admin = Depends(get_current_admin)
):
    """Create new success story (Admin only)"""
    # Verify course exists
    course = db.query(Course).filter(Course.id == story_data.course_id).first()
    if not course:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Course not found"
        )
    
    # Verify student exists
    student = db.query(Student).filter(Student.id == story_data.student_id).first()
    if not student:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Student not found"
        )
    
    # Create success story
    new_story = SuccessStory(
        course_id=story_data.course_id,
        student_id=story_data.student_id,
        title=story_data.title.dict(),
        content=story_data.content.dict(),
        image_urls=story_data.image_urls or [],
        is_published=story_data.is_published
    )
    db.add(new_story)
    db.commit()
    db.refresh(new_story)
    
    return new_story

@router.put("/{story_id}", response_model=SuccessStoryResponse)
async def update_success_story(
    story_id: int,
    story_data: SuccessStoryUpdate,
    db: Session = Depends(get_db),
    current_admin = Depends(get_current_admin)
):
    """Update success story (Admin only)"""
    story = db.query(SuccessStory).filter(SuccessStory.id == story_id).first()
    
    if not story:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Success story not found"
        )
    
    # Update fields
    update_data = story_data.dict(exclude_unset=True)
    
    # Handle multilingual fields
    if 'title' in update_data and update_data['title']:
        update_data['title'] = update_data['title']
    if 'content' in update_data and update_data['content']:
        update_data['content'] = update_data['content']
    
    for field, value in update_data.items():
        setattr(story, field, value)
    
    db.commit()
    db.refresh(story)
    return story

@router.delete("/{story_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_success_story(
    story_id: int,
    db: Session = Depends(get_db),
    current_admin = Depends(get_current_admin)
):
    """Delete success story (Admin only)"""
    story = db.query(SuccessStory).filter(SuccessStory.id == story_id).first()
    
    if not story:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Success story not found"
        )
    
    db.delete(story)
    db.commit()
    return None

@router.patch("/{story_id}/toggle-published", response_model=SuccessStoryResponse)
async def toggle_story_published(
    story_id: int,
    db: Session = Depends(get_db),
    current_admin = Depends(get_current_admin)
):
    """Toggle success story published status (Admin only)"""
    story = db.query(SuccessStory).filter(SuccessStory.id == story_id).first()
    
    if not story:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Success story not found"
        )
    
    story.is_published = not story.is_published
    db.commit()
    db.refresh(story)
    return story

@router.get("/by-course/{course_id}", response_model=List[SuccessStoryResponse])
async def get_stories_by_course(
    course_id: int,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    """Get all published success stories for a specific course"""
    stories = db.query(SuccessStory).options(
        joinedload(SuccessStory.student).joinedload(Student.user),
        joinedload(SuccessStory.course)
    ).filter(
        SuccessStory.course_id == course_id,
        SuccessStory.is_published == True
    ).order_by(SuccessStory.published_date.desc()).offset(skip).limit(limit).all()
    
    return stories

@router.get("/by-student/{student_id}", response_model=List[SuccessStoryResponse])
async def get_stories_by_student(
    student_id: int,
    db: Session = Depends(get_db),
    current_admin = Depends(get_current_admin)
):
    """Get all success stories by a specific student (Admin only)"""
    stories = db.query(SuccessStory).options(
        joinedload(SuccessStory.student).joinedload(Student.user),
        joinedload(SuccessStory.course)
    ).filter(
        SuccessStory.student_id == student_id
    ).order_by(SuccessStory.published_date.desc()).all()
    
    return stories