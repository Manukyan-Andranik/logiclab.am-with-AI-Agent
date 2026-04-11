# app/api/endpoints/contact_messages.py
import html
from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from sqlalchemy.orm import Session
from typing import List, Optional

from pydantic import BaseModel

from ...core.database import get_db
from ...core.email import email_service
from ...core.config import settings
from ...core.email_theme import (
    BG,
    BORDER,
    CARD,
    CARD_BORDER,
    FG,
    GOLD,
    INNER,
    MUTED,
    ON_GOLD,
    SUBTLE,
)
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

    safe_name = html.escape(body.name.strip())
    safe_email = html.escape(body.email.strip())
    safe_phone = html.escape(body.phone.strip()) if body.phone else ""
    safe_message = html.escape(body.message).replace("\n", "<br>")

    # Colors from frontend/src/index.css :root (via email_theme)
    BASE_STYLES = f"""
        * {{ margin: 0; padding: 0; box-sizing: border-box; }}
        body {{
            margin: 0;
            padding: 24px 12px;
            background-color: {BG};
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            color: {MUTED};
            -webkit-font-smoothing: antialiased;
            line-height: 1.5;
        }}
        .wrapper {{
            max-width: 600px;
            margin: 0 auto;
            background: {CARD};
            border-radius: 12px;
            overflow: hidden;
            border: 1px solid {CARD_BORDER};
            box-shadow: 0 8px 40px rgba(0, 0, 0, 0.35);
        }}
        .header {{
            background: {BG};
            border-bottom: 3px solid {GOLD};
            padding: 28px 32px 26px;
        }}
        .logo {{
            font-size: 24px;
            font-weight: 700;
            color: {GOLD};
            letter-spacing: -0.02em;
        }}
        .logo span {{ color: {FG}; }}
        .header-tagline {{
            font-size: 13px;
            color: {MUTED};
            margin-top: 8px;
            font-weight: 500;
        }}
        .body {{ padding: 32px; color: {FG}; }}
        .badge {{
            display: inline-block;
            background: rgba(255, 215, 0, 0.12);
            color: {GOLD};
            font-size: 12px;
            font-weight: 600;
            padding: 6px 12px;
            border-radius: 999px;
            margin-bottom: 16px;
            border: 1px solid rgba(255, 215, 0, 0.35);
        }}
        .section-title {{
            font-size: 20px;
            font-weight: 700;
            color: {GOLD};
            margin-bottom: 20px;
            padding-bottom: 12px;
            border-bottom: 1px solid {BORDER};
        }}
        p {{
            font-size: 15px;
            line-height: 1.65;
            color: {MUTED};
            margin: 0 0 12px;
        }}
        .field-table {{
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 8px;
            border-radius: 8px;
            overflow: hidden;
            border: 1px solid {BORDER};
        }}
        .field-table td {{
            padding: 14px 16px;
            font-size: 15px;
            vertical-align: top;
        }}
        .field-label {{
            width: 112px;
            background: {GOLD};
            color: {ON_GOLD};
            font-size: 12px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.06em;
            border-bottom: 1px solid {BORDER};
        }}
        .field-value {{
            background: {INNER};
            color: {FG};
            font-weight: 500;
            border-bottom: 1px solid {BORDER};
            word-break: break-word;
        }}
        .field-table tr:last-child .field-label,
        .field-table tr:last-child .field-value {{ border-bottom: none; }}
        .message-box {{
            background: {INNER};
            border: 1px solid {BORDER};
            border-left: 4px solid {GOLD};
            border-radius: 0 8px 8px 0;
            padding: 20px 20px 20px 22px;
            margin-top: 20px;
        }}
        .message-label {{
            font-size: 12px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.08em;
            color: {GOLD};
            margin-bottom: 12px;
        }}
        .message-text {{
            font-size: 15px;
            line-height: 1.7;
            color: {MUTED};
        }}
        .confirm-icon-wrap {{ text-align: center; margin-bottom: 24px; }}
        .icon-circle {{
            display: inline-block;
            width: 56px;
            height: 56px;
            line-height: 56px;
            background: {GOLD};
            color: {ON_GOLD};
            border-radius: 50%;
            font-size: 26px;
            font-weight: 700;
        }}
        .confirm-name {{
            font-size: 22px;
            font-weight: 700;
            color: {FG};
            margin-bottom: 6px;
            line-height: 1.35;
        }}
        .confirm-name span {{ color: {GOLD}; }}
        .confirm-text {{
            font-size: 15px;
            color: {MUTED};
            line-height: 1.65;
        }}
        .hint-en {{
            font-size: 14px;
            color: {SUBTLE};
            font-style: italic;
            margin-top: 16px;
            padding-top: 16px;
            border-top: 1px dashed {BORDER};
        }}
        .divider {{
            height: 1px;
            background: linear-gradient(to right, transparent, {BORDER}, transparent);
            margin: 28px 0;
        }}
        .signature {{
            font-size: 14px;
            color: {MUTED};
        }}
        .signature strong {{ color: {GOLD}; font-weight: 600; }}
        .footer {{
            background: {BG};
            border-top: 1px solid {BORDER};
            padding: 20px 32px;
            text-align: center;
        }}
        .footer p {{
            font-size: 13px;
            color: {SUBTLE};
            margin: 0;
            line-height: 1.5;
        }}
        .footer a {{
            color: {GOLD};
            font-weight: 600;
            text-decoration: none;
        }}
    """

    # ─── Admin Email ──────────────────────────────────────────────────────────
    admin_email = settings.ADMIN_EMAIL or settings.SMTP_FROM_EMAIL
    subject = f"New message from {body.name.strip()} — LogicLab contact"

    email_body = f"""
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>New contact message</title>
        <style>{BASE_STYLES}</style>
    </head>
    <body>
        <div class="wrapper">
            <div class="header">
                <div class="logo">Logic<span>Lab</span></div>
                <div class="header-tagline">Someone reached out through the website</div>
            </div>
            <div class="body">
                <div class="badge">New contact message</div>
                <div class="section-title">Reply from your inbox</div>
                <p style="margin-bottom:20px;color:{MUTED};font-size:14px;">
                    You can reply directly to <strong style="color:{FG};">{safe_email}</strong> — it will go to the visitor.
                </p>
                <table class="field-table" role="presentation" cellpadding="0" cellspacing="0">
                    <tr>
                        <td class="field-label">Name</td>
                        <td class="field-value">{safe_name}</td>
                    </tr>
                    <tr>
                        <td class="field-label">Email</td>
                        <td class="field-value">{safe_email}</td>
                    </tr>
                    <tr>
                        <td class="field-label">Phone</td>
                        <td class="field-value">{safe_phone or "Not provided"}</td>
                    </tr>
                </table>
                <div class="message-box">
                    <div class="message-label">Their message</div>
                    <div class="message-text">{safe_message}</div>
                </div>
            </div>
            <div class="footer">
                <p>&copy; 2026 LogicLab &mdash; <a href="https://www.logiclab.am/">logiclab.am</a></p>
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

    # ─── User confirmation (we received your message) ─────────────────────────
    user_subject = "Ձեր հաղորդագրությունը հասել է LogicLab — Շնորհակալություն"

    user_body = f"""
    <!DOCTYPE html>
    <html lang="hy">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Շնորհակալություն</title>
        <style>{BASE_STYLES}</style>
    </head>
    <body>
        <div class="wrapper">
            <div class="header">
                <div class="logo">Logic<span>Lab</span></div>
                <div class="header-tagline">Մենք ստացել ենք ձեր նամակը</div>
            </div>
            <div class="body">
                <div class="confirm-icon-wrap">
                    <div class="icon-circle">&#10003;</div>
                </div>
                <div class="confirm-name">Շնորհակալություն, <span>{safe_name}</span></div>
                <p class="confirm-text">
                    Ձեր հաղորդագրությունը հաջողությամբ հասել է մեզ։ Մեր թիմը կկարդա այն և
                    կկապնվի ձեզ հետ սովորաբար 1–2 աշխատանքային օրվա ընթացքում։
                    Եթե հարցը շտապ է, կարող եք նշել դա նամակում — մենք կփորձենք արձագանքել ավելի շուտ։
                </p>
                <p class="hint-en">
                    English: We have received your message. Our team will read it and get back to you
                    within about 1–2 business days. Thank you for contacting LogicLab.
                </p>
                <div class="divider"></div>
                <div class="signature">
                    Հարգանքներով,<br>
                    <strong>LogicLab թիմ</strong>
                </div>
            </div>
            <div class="footer">
                <p>
                    <a href="https://www.logiclab.am/">logiclab.am</a>
                    &nbsp;&middot;&nbsp;
                    Սա ավտոմատ հաղորդագրություն է, պատասխանելու կարիք չկա։
                </p>
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
