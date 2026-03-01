# app/api/endpoints/contact_messages.py
from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from sqlalchemy.orm import Session
from typing import List, Optional

from pydantic import BaseModel

from ...core.database import get_db
from ...core.email import email_service
from ...core.config import settings
from ...models.models import ContactMessage
from ...schemas.schemas import (
    ContactMessageResponse,
    ContactMessageUpdate,
    ContactMessageListResponse
)
from ..deps import get_current_admin

router = APIRouter(tags=["Contact Messages"])

class ContactFormBody(BaseModel):
    name: str
    email: str
    phone: Optional[str] = None
    message: str

async def send_contact_emails(body: ContactFormBody):
    """Background task to send admin and user emails"""
    print(f"Sending contact form emails for {body.email}")

    # ─── Shared Styles ────────────────────────────────────────────────────────
    BASE_STYLES = """
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700&family=DM+Sans:wght@300;400;500&display=swap');

        * { margin: 0; padding: 0; box-sizing: border-box; }

        body {
            background-color: #1a1a1a;
            font-family: 'DM Sans', sans-serif;
            color: #ccc;
            -webkit-font-smoothing: antialiased;
        }

        .wrapper {
            max-width: 620px;
            margin: 40px auto;
            background: #222;
            border-radius: 4px;
            overflow: hidden;
            border: 1px solid #2e2e2e;
            box-shadow: 0 8px 60px rgba(0,0,0,0.5);
        }

        /* ── Header ── */
        .header {
            background: linear-gradient(135deg, #222 0%, #2a2a2a 100%);
            border-bottom: 3px solid #FFD700;
            padding: 40px 48px 36px;
            position: relative;
            overflow: hidden;
        }
        .header::before {
            content: '';
            position: absolute;
            top: -60px; right: -60px;
            width: 200px; height: 200px;
            border-radius: 50%;
            background: radial-gradient(circle, rgba(255,215,0,0.08) 0%, transparent 70%);
        }
        .logo {
            font-family: 'DM Sans', sans-serif;
            font-size: 28px;
            font-weight: 800;
            color: #FFD700;
            letter-spacing: 0;
            text-transform: none;
            display: inline-block;
            line-height: 1.2;
        }
        .logo span {
            color: #ffffff;
            text-decoration: underline;
            text-underline-offset: 5px;
            text-decoration-color: #ffffff;
            text-decoration-thickness: 3px;
        }
        .header-tagline {
            font-size: 11px;
            letter-spacing: 4px;
            text-transform: uppercase;
            color: #666;
            margin-top: 6px;
        }

        /* ── Body ── */
        .body {
            padding: 48px;
        }
        .section-title {
            font-family: 'Playfair Display', serif;
            font-size: 22px;
            color: #FFD700;
            margin-bottom: 24px;
            padding-bottom: 16px;
            border-bottom: 1px solid #2e2e2e;
        }
        p {
            font-size: 15px;
            line-height: 1.8;
            color: #aaa;
            margin-bottom: 12px;
        }

        /* ── Field Rows (Admin) ── */
        .field-row {
            display: flex;
            gap: 0;
            margin-bottom: 2px;
            border-radius: 2px;
            overflow: hidden;
        }
        .field-label {
            background: #FFD700;
            color: #222;
            font-size: 11px;
            font-weight: 500;
            letter-spacing: 2px;
            text-transform: uppercase;
            padding: 12px 18px;
            min-width: 120px;
            display: flex;
            align-items: center;
        }
        .field-value {
            background: #2a2a2a;
            color: #ddd;
            font-size: 14px;
            padding: 12px 20px;
            flex: 1;
            display: flex;
            align-items: center;
            border-left: 2px solid #333;
        }

        /* ── Message Box ── */
        .message-box {
            background: #2a2a2a;
            border-left: 3px solid #FFD700;
            border-radius: 0 2px 2px 0;
            padding: 20px 24px;
            margin-top: 24px;
            font-size: 14px;
            line-height: 1.9;
            color: #bbb;
        }
        .message-label {
            font-size: 10px;
            letter-spacing: 3px;
            text-transform: uppercase;
            color: #FFC000;
            margin-bottom: 10px;
            font-weight: 500;
        }

        /* ── Confirmation Card ── */
        .confirm-icon {
            width: 64px; height: 64px;
            background: linear-gradient(135deg, #FFD700, #FFC000);
            border-radius: 50%;
            display: flex; align-items: center; justify-content: center;
            margin-bottom: 28px;
            font-size: 28px;
            line-height: 64px;
            text-align: center;
        }
        .confirm-name {
            font-family: 'Playfair Display', serif;
            font-size: 28px;
            color: #fff;
            margin-bottom: 8px;
        }
        .confirm-name span { color: #FFD700; }
        .confirm-text {
            font-size: 15px;
            color: #888;
            line-height: 1.9;
            max-width: 460px;
        }
        .divider {
            height: 1px;
            background: linear-gradient(to right, transparent, #333, transparent);
            margin: 36px 0;
        }
        .signature {
            font-size: 13px;
            color: #555;
        }
        .signature strong {
            color: #FFC000;
            font-weight: 500;
        }

        /* ── Footer ── */
        .footer {
            background: #1c1c1c;
            border-top: 1px solid #2a2a2a;
            padding: 24px 48px;
            text-align: center;
        }
        .footer p {
            font-size: 11px;
            color: #444;
            letter-spacing: 1px;
            margin: 0;
        }
        .footer a { color: #FFD700; text-decoration: none; }

        /* ── Badge ── */
        .badge {
            display: inline-block;
            background: rgba(255, 215, 0, 0.1);
            border: 1px solid rgba(255, 215, 0, 0.25);
            color: #FFD700;
            font-size: 10px;
            letter-spacing: 2px;
            text-transform: uppercase;
            padding: 4px 12px;
            border-radius: 2px;
            margin-bottom: 20px;
        }
    """

    # ─── Admin Email ──────────────────────────────────────────────────────────
    admin_email = settings.ADMIN_EMAIL or settings.SMTP_FROM_EMAIL
    subject = f"New Contact Form Submission from {body.name}"

    email_body = f"""
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>New Contact Submission</title>
        <style>{BASE_STYLES}</style>
    </head>
    <body>
        <div class="wrapper">

            <!-- Header -->
            <div class="header">
                <div class="logo">Logic <span>Lab</span></div>
                <div class="header-tagline">Contact Form Notification</div>
            </div>

            <!-- Body -->
            <div class="body">
                <div class="badge">&#9679;&nbsp; New Submission</div>
                <div class="section-title">Contact Form Submission</div>

                <!-- Fields -->
                <div class="field-row">
                    <div class="field-label">Name</div>
                    <div class="field-value">{body.name}</div>
                </div>
                <div class="field-row">
                    <div class="field-label">Email</div>
                    <div class="field-value">{body.email}</div>
                </div>
                <div class="field-row">
                    <div class="field-label">Phone</div>
                    <div class="field-value">{body.phone or 'Not provided'}</div>
                </div>

                <!-- Message -->
                <div class="message-box">
                    <div class="message-label">Message</div>
                    {body.message}
                </div>
            </div>

            <!-- Footer -->
            <div class="footer">
                <p>&copy; 2024 LogicLab &mdash; <a href="https://www.logiclab.am/">logiclab.am</a></p>
            </div>

        </div>
    </body>
    </html>
    """

    await email_service.send_email(
        to_email=admin_email,
        subject=subject,
        body=email_body,
        html=True
    )

    # ─── User Confirmation Email ───────────────────────────────────────────────
    user_subject = "Շնորհակալություն LogicLab-ի հետ կապ հաստատելու համար"

    user_body = f"""
    <!DOCTYPE html>
    <html lang="hy">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Շնորհակալություն</title>
        <style>
            {BASE_STYLES}
            .confirm-icon-wrap {{
                text-align: center;
                margin-bottom: 32px;
            }}
            .icon-circle {{
                display: inline-block;
                width: 72px; height: 72px;
                background: linear-gradient(135deg, #FFD700, #FFC000);
                border-radius: 50%;
                font-size: 32px;
                line-height: 72px;
                text-align: center;
            }}
        </style>
    </head>
    <body>
        <div class="wrapper">

            <!-- Header -->
            <div class="header">
                <div class="logo">Logic <span>Lab</span></div>
                <div class="header-tagline">Հաստատման նամակ</div>
            </div>

            <!-- Body -->
            <div class="body">

                <div class="confirm-icon-wrap">
                    <div class="icon-circle">✓</div>
                </div>

                <div class="confirm-name">Շնորհակալություն,<br><span>{body.name}!</span></div>

                <div class="divider"></div>

                <p class="confirm-text">
                    Մենք ստացել ենք ձեր հաղորդագրությունը և կպատասխանենք ձեզ
                    հնարավորինս սեղմ ժամկետներում: Ձեր հարցումը մեզ համար
                    կարևոր է, և մենք անպայման կդիտարկենք այն:
                </p>

                <div class="divider"></div>

                <div class="signature">
                    Հարգանքներով,<br>
                    <strong>LogicLab թիմ</strong>
                </div>

            </div>

            <!-- Footer -->
            <div class="footer">
                <p>&copy; 2024 LogicLab &mdash; <a href="https://www.logiclab.am/">logiclab.am</a></p>
            </div>

        </div>
    </body>
    </html>
    """

    await email_service.send_email(
        to_email=body.email,
        subject=user_subject,
        body=user_body,
        html=True
    )
@router.post("")
async def submit_contact_form(
    body: ContactFormBody,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    """Submit contact form"""
    
    new_message = ContactMessage(
        name=body.name,
        email=body.email,
        phone=body.phone,
        message=body.message
    )
    db.add(new_message)
    db.commit()
    db.refresh(new_message)
    print(f"New contact message saved with ID: {new_message.id}")
    # Add email sending to background tasks
    background_tasks.add_task(send_contact_emails, body)
    
    return {
        "message": "Contact form submitted successfully",
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
