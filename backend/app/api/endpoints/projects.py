# app/api/endpoints/projects.py
from fastapi import APIRouter, Depends, HTTPException, status, File, UploadFile
from sqlalchemy.orm import Session, joinedload
from typing import List, Optional
from ...core.database import get_db
from ...models.models import Project, Course, Student
from ...schemas.schemas import ProjectCreate, ProjectUpdate, ProjectResponse
from ..deps import get_current_admin
from ...core.cloudinary import upload_image
from ...core.config import settings

router = APIRouter()

@router.post("/upload-image", response_model=dict)
async def upload_project_image(
    file: UploadFile = File(...),
    current_admin = Depends(get_current_admin)
):
    """Upload an image to Cloudinary (Admin only)"""
    url = upload_image(file.file, folder="projects")
    if not url:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to upload image"
        )
    return {"url": url}

@router.get("/", response_model=List[ProjectResponse])
async def get_projects(
    skip: int = 0,
    limit: int = 100,
    course_id: Optional[int] = None,
    is_published: Optional[bool] = None,
    is_featured: Optional[bool] = None,
    is_admin: Optional[bool] = False,
    db: Session = Depends(get_db)
):
    """Get all projects (public endpoint shows only published)"""
    query = db.query(Project).options(
        joinedload(Project.student).joinedload(Student.user),
        joinedload(Project.course)
    )
    if is_admin:
        all_projects = query.all()
        return all_projects
    
    # For public access, only show published projects
    if is_published is not False:  # Default to showing only published
        query = query.filter(Project.is_published == True)
    
    if course_id:
        query = query.filter(Project.course_id == course_id)
    
    if is_featured is not None:
        query = query.filter(Project.is_featured == is_featured)
    
    projects = query.order_by(
        Project.is_featured.desc(),
        Project.created_at.desc()
    ).offset(skip).limit(limit).all()
    
    # Apply default image fallbacks
    for project in projects:
        if not project.image_urls:
            project.image_urls = [settings.DEFAULT_PROJECT_IMAGE]
            
    return projects

@router.get("/featured", response_model=List[ProjectResponse])
async def get_featured_projects(
    limit: int = 6,
    db: Session = Depends(get_db)
):
    """Get featured projects for homepage"""
    projects = db.query(Project).options(
        joinedload(Project.student).joinedload(Student.user),
        joinedload(Project.course)
    ).filter(
        Project.is_published == True,
        Project.is_featured == True
    ).order_by(Project.created_at.desc()).limit(limit).all()
    
    # Apply default image fallbacks
    for project in projects:
        if not project.image_urls:
            project.image_urls = [settings.DEFAULT_PROJECT_IMAGE]
            
    return projects

@router.get("/{project_id}", response_model=ProjectResponse)
async def get_project(
    project_id: int,
    db: Session = Depends(get_db)
):
    """Get single project by ID"""
    project = db.query(Project).options(
        joinedload(Project.student).joinedload(Student.user),
        joinedload(Project.course)
    ).filter(Project.id == project_id).first()
    
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found"
        )
    
    # Apply default image fallbacks
    if not project.image_urls:
        project.image_urls = [settings.DEFAULT_PROJECT_IMAGE]
        
    return project

@router.post("/", response_model=ProjectResponse, status_code=status.HTTP_201_CREATED)
async def create_project(
    project_data: ProjectCreate,
    db: Session = Depends(get_db),
    current_admin = Depends(get_current_admin)
):
    """Create new project (Admin only)"""
    # Verify course exists
    course = db.query(Course).filter(Course.id == project_data.course_id).first()
    if not course:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Course not found"
        )
    
    # Verify student exists
    student = db.query(Student).filter(Student.id == project_data.student_id).first()
    if not student:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Student not found"
        )
    
    # Create project
    new_project = Project(
        course_id=project_data.course_id,
        student_id=project_data.student_id,
        title=project_data.title.dict(),
        subtitle=project_data.subtitle.dict() if project_data.subtitle else None,
        description=project_data.description.dict(),
        image_urls=project_data.image_urls or [],
        links=project_data.links or {},
        is_featured=project_data.is_featured,
        is_published=project_data.is_published
    )
    db.add(new_project)
    db.commit()
    db.refresh(new_project)
    
    return new_project

@router.put("/{project_id}", response_model=ProjectResponse)
async def update_project(
    project_id: int,
    project_data: ProjectUpdate,
    db: Session = Depends(get_db),
    current_admin = Depends(get_current_admin)
):
    """Update project (Admin only)"""
    project = db.query(Project).filter(Project.id == project_id).first()
    
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found"
        )
    
    # Update fields
    update_data = project_data.dict(exclude_unset=True)
    
    # Handle multilingual fields explicitly to ensure they are dicts
    if 'title' in update_data and update_data['title']:
        update_data['title'] = update_data['title']
    if 'subtitle' in update_data and update_data['subtitle']:
        update_data['subtitle'] = update_data['subtitle']
    if 'description' in update_data and update_data['description']:
        update_data['description'] = update_data['description']
    
    for field, value in update_data.items():
        if value is not None:
            setattr(project, field, value)
    
    db.commit()
    db.refresh(project)
    return project

@router.delete("/{project_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_project(
    project_id: int,
    db: Session = Depends(get_db),
    current_admin = Depends(get_current_admin)
):
    """Delete project (Admin only)"""
    project = db.query(Project).filter(Project.id == project_id).first()
    
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found"
        )
    
    db.delete(project)
    db.commit()
    return None

@router.patch("/{project_id}/toggle-published", response_model=ProjectResponse)
async def toggle_project_published(
    project_id: int,
    db: Session = Depends(get_db),
    current_admin = Depends(get_current_admin)
):
    """Toggle project published status (Admin only)"""
    project = db.query(Project).filter(Project.id == project_id).first()
    
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found"
        )
    
    project.is_published = not project.is_published
    db.commit()
    db.refresh(project)
    return project

@router.patch("/{project_id}/toggle-featured", response_model=ProjectResponse)
async def toggle_project_featured(
    project_id: int,
    db: Session = Depends(get_db),
    current_admin = Depends(get_current_admin)
):
    """Toggle project featured status (Admin only)"""
    project = db.query(Project).filter(Project.id == project_id).first()
    
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found"
        )
    
    project.is_featured = not project.is_featured
    db.commit()
    db.refresh(project)
    return project

@router.get("/by-course/{course_id_or_slug}", response_model=List[ProjectResponse])
async def get_projects_by_course(
    course_id_or_slug: str,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    """Get all published projects for a specific course"""
    query = db.query(Course)
    if course_id_or_slug.isdigit():
        course = query.filter(Course.id == int(course_id_or_slug)).first()
    else:
        course = query.filter(Course.slug == course_id_or_slug).first()
    
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    
    projects = db.query(Project).options(
        joinedload(Project.student).joinedload(Student.user),
        joinedload(Project.course)
    ).filter(
        Project.course_id == course.id,
        Project.is_published == True
    ).order_by(Project.created_at.desc()).offset(skip).limit(limit).all()
    
    return projects

@router.get("/by-student/{student_id}", response_model=List[ProjectResponse])
async def get_projects_by_student(
    student_id: int,
    db: Session = Depends(get_db),
    current_admin = Depends(get_current_admin)
):
    """Get all projects by a specific student (Admin only)"""
    projects = db.query(Project).options(
        joinedload(Project.student).joinedload(Student.user),
        joinedload(Project.course)
    ).filter(
        Project.student_id == student_id
    ).order_by(Project.created_at.desc()).all()
    
    return projects

@router.get("/statistics/overview")
async def get_project_statistics(
    db: Session = Depends(get_db),
    current_admin = Depends(get_current_admin)
):
    """Get project statistics (Admin only)"""
    total = db.query(Project).count()
    published = db.query(Project).filter(Project.is_published == True).count()
    featured = db.query(Project).filter(Project.is_featured == True).count()
    drafts = total - published
    
    # Projects by course
    projects_by_course = db.query(
        Course.id,
        Course.title,
        db.func.count(Project.id).label('count')
    ).join(Project).group_by(Course.id).all()
    
    return {
        "total_projects": total,
        "published": published,
        "drafts": drafts,
        "featured": featured,
        "by_course": [
            {
                "course_id": course_id,
                "course_title": title,
                "project_count": count
            }
            for course_id, title, count in projects_by_course
        ]
    }