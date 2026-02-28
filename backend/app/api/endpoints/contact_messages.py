# app/api/endpoints/contact_messages.py
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional

from pydantic import BaseModel

from ...core.database import get_db
from ...core.email import email_service
from ...core.config import settings
from ...models.models import ContactMessage # Import the new ContactMessage model
from ...schemas.schemas import (
    ContactMessageResponse,
    ContactMessageUpdate,
    ContactMessageListResponse # For paginated list
)
from ..deps import get_current_admin

router = APIRouter(prefix="/contact", tags=["Contact Messages"])

class ContactFormBody(BaseModel):
    name: str
    email: str
    phone: Optional[str] = None
    message: Optional[str] = None

@router.post("") # The prefix is /api/contact-messages, so this becomes /api/contact-messages/contact
async def submit_contact_form(
    body: ContactFormBody,
    db: Session = Depends(get_db)
):
    """Submit contact form"""
    
    new_message = ContactMessage(
        name=body.name,
        email=body.email,
        phone=body.phone,
        message=body.message or ""
    )
    db.add(new_message)
    db.commit()
    db.refresh(new_message)
    
    # Send email to admin
    admin_email = settings.SMTP_FROM_EMAIL
    subject = f"New Contact Form Submission from {body.name}"
    email_body = f"""
    <html>
        <body>
            <h2>New Contact Form Submission</h2>
            <p><strong>Name:</strong> {body.name}</p>
            <p><strong>Email:</strong> {body.email}</p>
            <p><strong>Phone:</strong> {body.phone or 'Not provided'}</p>
            <p><strong>Message:</strong></p>
            <p>{body.message or 'No message provided'}</p>
        </body>
    </html>
    """
    
    email_sent = await email_service.send_email(
        to_email=admin_email,
        subject=subject,
        body=email_body,
        html=True
    )
    
    # Send confirmation to user
    if email_sent:
        user_subject = "Thank you for contacting LogicLab"
        user_body = f"""
        <html>
            <body>
                <h2>Thank you for contacting us, {body.name}!</h2>
                <p>We have received your message and will get back to you shortly.</p>
                <br>
                <p>Best regards,<br>LogicLab Team</p>
            </body>
        </html>
        """
        await email_service.send_email(
            to_email=body.email,
            subject=user_subject,
            body=user_body,
            html=True
        )
    
    return {
        "message": "Contact form submitted successfully",
        "email_sent": email_sent,
        "message_id": new_message.id
    }

@router.get("/", response_model=ContactMessageListResponse)
async def get_contact_messages(
    skip: int = 0,
    limit: int = 100,
    is_read: Optional[bool] = None,
    is_resolved: Optional[bool] = None,
    db: Session = Depends(get_db),
    current_admin = Depends(get_current_admin)
):
    """Get all contact messages (Admin only)"""
    query = db.query(ContactMessage)
    
    if is_read is not None:
        query = query.filter(ContactMessage.is_read == is_read)
    
    if is_resolved is not None:
        query = query.filter(ContactMessage.is_resolved == is_resolved)
            
    total = query.count()
    messages = query.order_by(ContactMessage.created_at.desc()).offset(skip).limit(limit).all()
    
    return ContactMessageListResponse(data=[ContactMessageResponse.model_validate(m) for m in messages], total=total)

@router.get("/{message_id}", response_model=ContactMessageResponse)
async def get_contact_message(
    message_id: int,
    db: Session = Depends(get_db),
    current_admin = Depends(get_current_admin)
):
    """Get a single contact message by ID (Admin only)"""
    message = db.query(ContactMessage).filter(ContactMessage.id == message_id).first()
    
    if not message:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Contact message not found"
        )
    return message

@router.patch("/{message_id}/mark-read", response_model=ContactMessageResponse)
async def mark_message_read(
    message_id: int,
    db: Session = Depends(get_db),
    current_admin = Depends(get_current_admin)
):
    """Mark a contact message as read (Admin only)"""
    message = db.query(ContactMessage).filter(ContactMessage.id == message_id).first()
    
    if not message:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Contact message not found"
        )
    
    message.is_read = True
    db.commit()
    db.refresh(message)
    return message

@router.patch("/{message_id}/mark-resolved", response_model=ContactMessageResponse)
async def mark_message_resolved(
    message_id: int,
    db: Session = Depends(get_db),
    current_admin = Depends(get_current_admin)
):
    """Mark a contact message as resolved (Admin only)"""
    message = db.query(ContactMessage).filter(ContactMessage.id == message_id).first()
    
    if not message:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Contact message not found"
        )
    
    message.is_resolved = True
    db.commit()
    db.refresh(message)
    return message

@router.delete("/{message_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_contact_message(
    message_id: int,
    db: Session = Depends(get_db),
    current_admin = Depends(get_current_admin)
):
    """Delete a contact message (Admin only)"""
    message = db.query(ContactMessage).filter(ContactMessage.id == message_id).first()
    
    if not message:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Contact message not found"
        )
    
    db.delete(message)
    db.commit()
    return None
