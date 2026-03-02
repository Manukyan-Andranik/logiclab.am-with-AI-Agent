from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session, joinedload
from typing import List, Optional, Union
from ...core.database import get_db
from ...models.models import Course, CourseInstructor, Instructor, Chapter, Lesson
from ...schemas.schemas import (
    CourseCreate, CourseUpdate, CourseResponse,
    ChapterCreate, ChapterUpdate, ChapterResponse,
    LessonCreate, LessonUpdate, LessonResponse
)
from ..deps import get_current_admin

router = APIRouter()

# Helper function
def _multilingual_to_dict(obj) -> dict:
    """Convert Pydantic MultilingualText to dict for JSON columns."""
    if obj is None:
        return {}
    if hasattr(obj, "model_dump"):
        return obj.model_dump(exclude_none=True)
    if hasattr(obj, "dict"):
        return obj.dict(exclude_none=True)
    if isinstance(obj, dict):
        return obj
    return {}

# ==================== CHAPTERS ====================

@router.get("/chapters/{chapter_id}/lessons", response_model=List[LessonResponse])
async def get_chapter_lessons(
    chapter_id: int,
    db: Session = Depends(get_db)
):
    """Get all lessons for a chapter"""
    return db.query(Lesson).filter(Lesson.chapter_id == chapter_id).order_by(Lesson.order_index).all()

@router.post("/chapters/{chapter_id}/lessons", response_model=LessonResponse, status_code=status.HTTP_201_CREATED)
async def create_lesson(
    chapter_id: int,
    lesson_data: LessonCreate,
    db: Session = Depends(get_db),
    current_admin = Depends(get_current_admin)
):
    """Create new lesson (Admin only)"""
    chapter = db.query(Chapter).filter(Chapter.id == chapter_id).first()
    if not chapter:
        raise HTTPException(status_code=404, detail="Chapter not found")
    
    new_lesson = Lesson(
        chapter_id=chapter_id,
        title=lesson_data.title,
        order_index=lesson_data.order_index,
        resource_links=lesson_data.resource_links or []
    )
    db.add(new_lesson)
    db.commit()
    db.refresh(new_lesson)
    return new_lesson

@router.put("/lessons/{lesson_id}", response_model=LessonResponse)
async def update_lesson(
    lesson_id: int,
    lesson_data: LessonUpdate,
    db: Session = Depends(get_db),
    current_admin = Depends(get_current_admin)
):
    """Update lesson (Admin only)"""
    lesson = db.query(Lesson).filter(Lesson.id == lesson_id).first()
    if not lesson:
        raise HTTPException(status_code=404, detail="Lesson not found")
    
    update_data = lesson_data.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(lesson, field, value)
    
    db.commit()
    db.refresh(lesson)
    return lesson

@router.delete("/lessons/{lesson_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_lesson(
    lesson_id: int,
    db: Session = Depends(get_db),
    current_admin = Depends(get_current_admin)
):
    """Delete lesson (Admin only)"""
    lesson = db.query(Lesson).filter(Lesson.id == lesson_id).first()
    if not lesson:
        raise HTTPException(status_code=404, detail="Lesson not found")
    db.delete(lesson)
    db.commit()
    return None

@router.get("/chapters/{chapter_id}", response_model=ChapterResponse)
async def get_chapter(
    chapter_id: int,
    db: Session = Depends(get_db)
):
    """Get single chapter by ID"""
    chapter = db.query(Chapter).filter(Chapter.id == chapter_id).first()
    if not chapter:
        raise HTTPException(status_code=404, detail="Chapter not found")
    return chapter

@router.put("/chapters/{chapter_id}", response_model=ChapterResponse)
async def update_chapter(
    chapter_id: int,
    chapter_data: ChapterUpdate,
    db: Session = Depends(get_db),
    current_admin = Depends(get_current_admin)
):
    """Update chapter (Admin only)"""
    chapter = db.query(Chapter).filter(Chapter.id == chapter_id).first()
    if not chapter:
        raise HTTPException(status_code=404, detail="Chapter not found")
    
    update_data = chapter_data.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(chapter, field, value)
    
    db.commit()
    db.refresh(chapter)
    return chapter

@router.delete("/chapters/{chapter_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_chapter(
    chapter_id: int,
    db: Session = Depends(get_db),
    current_admin = Depends(get_current_admin)
):
    """Delete chapter (Admin only)"""
    chapter = db.query(Chapter).filter(Chapter.id == chapter_id).first()
    if not chapter:
        raise HTTPException(status_code=404, detail="Chapter not found")
    db.delete(chapter)
    db.commit()
    return None

# ==================== COURSES ====================

@router.get("/{course_id_or_slug}/curriculum")
async def get_course_curriculum(
    course_id_or_slug: str,
    db: Session = Depends(get_db)
):
    """Get complete course curriculum (chapters with lessons)"""
    if course_id_or_slug.isdigit():
        course = db.query(Course).filter(Course.id == int(course_id_or_slug)).first()
    else:
        course = db.query(Course).filter(Course.slug == course_id_or_slug).first()
        
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    
    chapters = db.query(Chapter).filter(Chapter.course_id == course.id).order_by(Chapter.order_index).all()
    
    curriculum = []
    for chapter in chapters:
        lessons = db.query(Lesson).filter(Lesson.chapter_id == chapter.id).order_by(Lesson.order_index).all()
        curriculum.append({
            "chapter": ChapterResponse.from_orm(chapter),
            "lessons": [LessonResponse.from_orm(lesson) for lesson in lessons]
        })
    
    return {
        "course_id": course.id,
        "course_title": course.title,
        "curriculum": curriculum
    }

@router.get("/{course_id}/chapters", response_model=List[ChapterResponse])
async def get_course_chapters(
    course_id: int,
    db: Session = Depends(get_db)
):
    """Get all chapters for a course"""
    return db.query(Chapter).filter(Chapter.course_id == course_id).order_by(Chapter.order_index).all()

@router.post("/{course_id}/chapters", response_model=ChapterResponse, status_code=status.HTTP_201_CREATED)
async def create_chapter(
    course_id: int,
    chapter_data: ChapterCreate,
    db: Session = Depends(get_db),
    current_admin = Depends(get_current_admin)
):
    """Create new chapter (Admin only)"""
    course = db.query(Course).filter(Course.id == course_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    
    new_chapter = Chapter(
        course_id=course_id,
        title=chapter_data.title,
        description=chapter_data.description,
        order_index=chapter_data.order_index
    )
    db.add(new_chapter)
    db.commit()
    db.refresh(new_chapter)
    return new_chapter

@router.get("/{course_id_or_slug}", response_model=CourseResponse)
async def get_course(
    course_id_or_slug: str,
    db: Session = Depends(get_db)
):
    """Get single course by ID or slug"""
    query = db.query(Course).options(
        joinedload(Course.instructors).joinedload(Instructor.user)
    )
    
    if course_id_or_slug.isdigit():
        course = query.filter(Course.id == int(course_id_or_slug)).first()
    else:
        course = query.filter(Course.slug == course_id_or_slug).first()
    
    if not course:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Course not found"
        )
    
    return course

@router.get("/", response_model=List[CourseResponse])
async def get_courses(
    skip: int = 0,
    limit: int = 100,
    is_active: Optional[bool] = None,
    db: Session = Depends(get_db)
):
    """Get all courses (public endpoint)"""
    query = db.query(Course).options(joinedload(Course.instructors).joinedload(Instructor.user))
    
    if is_active is not None:
        query = query.filter(Course.is_active == is_active)
    
    courses = query.offset(skip).limit(limit).all()
    return courses

@router.post("/", response_model=CourseResponse, status_code=status.HTTP_201_CREATED)
async def create_course(
    course_data: CourseCreate,
    db: Session = Depends(get_db),
    current_admin = Depends(get_current_admin)
):
    """Create new course (Admin only)"""
    # Check if slug exists
    if course_data.slug:
        existing = db.query(Course).filter(Course.slug == course_data.slug).first()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Course with this slug already exists"
            )
    
    new_course = Course(
        slug=course_data.slug,
        title=_multilingual_to_dict(course_data.title),
        description=_multilingual_to_dict(course_data.description),
        curriculum_url=course_data.curriculum_url,
        curriculum=course_data.curriculum or {},
        icon_url=course_data.icon_url,
        hero_video_url=course_data.hero_video_url,
        duration_months=course_data.duration_months,
        start_date=course_data.start_date,
        schedule=course_data.schedule or {},
        monthly_payment=course_data.monthly_payment,
        total_payment=course_data.total_payment,
        is_active=course_data.is_active if course_data.is_active is not None else True
    )
    db.add(new_course)
    db.commit()
    db.refresh(new_course)
    
    if course_data.instructor_ids:
        for instructor_id in course_data.instructor_ids:
            instructor = db.query(Instructor).filter(Instructor.id == instructor_id).first()
            if instructor:
                db.add(CourseInstructor(course_id=new_course.id, instructor_id=instructor_id))
        db.commit()
        db.refresh(new_course)
        
    return new_course

@router.put("/{course_id}", response_model=CourseResponse)
async def update_course(
    course_id: int,
    course_data: CourseUpdate,
    db: Session = Depends(get_db),
    current_admin = Depends(get_current_admin)
):
    """Update course (Admin only)"""
    course = db.query(Course).filter(Course.id == course_id).first()
    if not course:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Course not found"
        )
    
    raw = getattr(course_data, "model_dump", None) or getattr(course_data, "dict")
    update_data = raw(exclude_unset=True, exclude={'instructor_ids'})
    
    if 'title' in update_data and update_data['title'] is not None:
        update_data['title'] = _multilingual_to_dict(update_data['title'])
    if 'description' in update_data and update_data['description'] is not None:
        update_data['description'] = _multilingual_to_dict(update_data['description'])
    
    for field, value in update_data.items():
        setattr(course, field, value)
    
    if course_data.instructor_ids is not None:
        db.query(CourseInstructor).filter(CourseInstructor.course_id == course_id).delete()
        for instructor_id in course_data.instructor_ids:
            instructor = db.query(Instructor).filter(Instructor.id == instructor_id).first()
            if instructor:
                db.add(CourseInstructor(course_id=course_id, instructor_id=instructor_id))
    
    db.commit()
    db.refresh(course)
    return course

@router.delete("/{course_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_course(
    course_id: int,
    db: Session = Depends(get_db),
    current_admin = Depends(get_current_admin)
):
    """Delete course (Admin only)"""
    course = db.query(Course).filter(Course.id == course_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    db.delete(course)
    db.commit()
    return None

@router.patch("/{course_id}/toggle-active", response_model=CourseResponse)
async def toggle_course_active(
    course_id: int,
    db: Session = Depends(get_db),
    current_admin = Depends(get_current_admin)
):
    """Toggle course active status (Admin only)"""
    course = db.query(Course).filter(Course.id == course_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    course.is_active = not course.is_active
    db.commit()
    db.refresh(course)
    return course
