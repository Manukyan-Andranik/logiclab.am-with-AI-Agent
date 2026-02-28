# app/api/endpoints/certificates.py
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload
from typing import List, Optional
from datetime import datetime

from ...core.database import get_db
from ...models.models import Certificate, Student, Course # Import models
from ...schemas.schemas import (
    CertificateResponse,
    CertificateCreate,
    CertificateUpdate,
    CertificateListResponse
)
from ..deps import get_current_admin

router = APIRouter()

@router.get("/", response_model=CertificateListResponse)
async def get_certificates(
    skip: int = 0,
    limit: int = 100,
    student_id: Optional[int] = None,
    course_id: Optional[int] = None,
    is_verified: Optional[bool] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db),
    current_admin = Depends(get_current_admin)
):
    """Get all certificate records (Admin only)"""
    query = db.query(Certificate).options(
        joinedload(Certificate.student).joinedload(Student.user),
        joinedload(Certificate.course)
    )
    
    if student_id:
        query = query.filter(Certificate.student_id == student_id)
    if course_id:
        query = query.filter(Certificate.course_id == course_id)
    if is_verified is not None:
        query = query.filter(Certificate.is_verified == is_verified)
    
    if search:
        search_term = f"%{search.lower()}%"
        query = query.join(Certificate.student).join(Student.user).join(Certificate.course).filter(
            (Certificate.certificate_number.ilike(search_term)) |
            (Student.user.first_name.ilike(search_term)) |
            (Student.user.last_name.ilike(search_term)) |
            (Student.user.email.ilike(search_term)) |
            (Course.title.ilike(search_term)) # Assuming Course.title is JSON and needs specific handling if searching multilingual
        )
            
    total = query.count()
    certificates = query.order_by(Certificate.issued_date.desc()).offset(skip).limit(limit).all()
    
    return CertificateListResponse(data=[CertificateResponse.model_validate(c) for c in certificates], total=total)

@router.get("/{certificate_id}", response_model=CertificateResponse)
async def get_certificate(
    certificate_id: int,
    db: Session = Depends(get_db),
    current_admin = Depends(get_current_admin)
):
    """Get a single certificate by ID (Admin only)"""
    certificate = db.query(Certificate).options(
        joinedload(Certificate.student).joinedload(Student.user),
        joinedload(Certificate.course)
    ).filter(Certificate.id == certificate_id).first()
    
    if not certificate:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Certificate not found"
        )
    return certificate

@router.post("/", status_code=status.HTTP_201_CREATED, response_model=CertificateResponse)
async def create_certificate(
    certificate_data: CertificateCreate,
    db: Session = Depends(get_db),
    current_admin = Depends(get_current_admin)
):
    """Create a new certificate (Admin only)"""
    # Check if student and course exist
    student = db.query(Student).filter(Student.id == certificate_data.student_id).first()
    if not student:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Student not found")
    
    course = db.query(Course).filter(Course.id == certificate_data.course_id).first()
    if not course:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Course not found")

    # Check for duplicate certificate number
    existing_cert = db.query(Certificate).filter(
        Certificate.certificate_number == certificate_data.certificate_number
    ).first()
    if existing_cert:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Certificate with this number already exists"
        )

    new_certificate = Certificate(**certificate_data.model_dump())
    db.add(new_certificate)
    db.commit()
    db.refresh(new_certificate)
    return new_certificate

@router.put("/{certificate_id}", response_model=CertificateResponse)
async def update_certificate(
    certificate_id: int,
    certificate_data: CertificateUpdate,
    db: Session = Depends(get_db),
    current_admin = Depends(get_current_admin)
):
    """Update an existing certificate (Admin only)"""
    certificate = db.query(Certificate).filter(Certificate.id == certificate_id).first()
    
    if not certificate:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Certificate not found"
        )
    
    for key, value in certificate_data.model_dump(exclude_unset=True).items():
        setattr(certificate, key, value)
    
    db.commit()
    db.refresh(certificate)
    return certificate

@router.patch("/{certificate_id}/verify", response_model=CertificateResponse)
async def verify_certificate(
    certificate_id: int,
    db: Session = Depends(get_db),
    current_admin = Depends(get_current_admin)
):
    """Mark a certificate as verified (Admin only)"""
    certificate = db.query(Certificate).filter(Certificate.id == certificate_id).first()
    
    if not certificate:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Certificate not found"
        )
    
    certificate.is_verified = True
    db.commit()
    db.refresh(certificate)
    return certificate

@router.delete("/{certificate_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_certificate(
    certificate_id: int,
    db: Session = Depends(get_db),
    current_admin = Depends(get_current_admin)
):
    """Delete a certificate (Admin only)"""
    certificate = db.query(Certificate).filter(Certificate.id == certificate_id).first()
    
    if not certificate:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Certificate not found"
        )
    
    db.delete(certificate)
    db.commit()
    return None
