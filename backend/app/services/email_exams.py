"""
Email Service for Exams
Async email delivery for exam submissions and notifications.
"""

import json
from datetime import datetime
from typing import Dict, Any, List, Optional
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import smtplib
import os


class EmailService:
    """Service for sending exam-related emails."""
    
    # Configuration (set from environment variables in production)
    SMTP_SERVER = os.getenv("SMTP_SERVER", "smtp.gmail.com")
    SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
    SMTP_USER = os.getenv("SMTP_USER", "noreply@logiclab.io")
    SMTP_PASSWORD = os.getenv("SMTP_PASSWORD", "")
    ADMIN_EMAIL = os.getenv("ADMIN_EMAIL", "admin@logiclab.io")
    
    @staticmethod
    def send_exam_submission(
        exam_id: int,
        student_id: int,
        submission_data: Dict[str, Any],
    ) -> bool:
        """
        Send exam submission to admin email.
        Called as background task after submission.
        """
        try:
            admin_email = EmailService.ADMIN_EMAIL
            student_email = submission_data.get("student_email")
            exam_title = submission_data.get("exam_title")
            student_name = submission_data.get("student_name")
            
            # Create email message
            msg = MIMEMultipart("alternative")
            msg["Subject"] = f"Exam Submission: {exam_title} - {student_name}"
            msg["From"] = EmailService.SMTP_USER
            msg["To"] = admin_email
            
            # HTML body with submission details
            html = EmailService._render_submission_email(submission_data)
            msg.attach(MIMEText(html, "html"))
            
            # Attach submission JSON as file
            json_filename = f"submission_exam{exam_id}_student{student_id}.json"
            json_part = MIMEText(json.dumps(submission_data, indent=2))
            json_part.add_header("Content-Disposition", "attachment", filename=json_filename)
            msg.attach(json_part)
            
            # Send email
            with smtplib.SMTP(EmailService.SMTP_SERVER, EmailService.SMTP_PORT) as server:
                server.starttls()
                server.login(EmailService.SMTP_USER, EmailService.SMTP_PASSWORD)
                server.send_message(msg)
            
            return True
        except Exception as e:
            print(f"Error sending exam submission email: {e}")
            return False
    
    @staticmethod
    def send_exam_reminder(
        student_email: str,
        exam_title: str,
        start_time: str,
    ) -> bool:
        """Send reminder email to student before exam starts."""
        try:
            msg = MIMEMultipart("alternative")
            msg["Subject"] = f"Reminder: Upcoming Exam - {exam_title}"
            msg["From"] = EmailService.SMTP_USER
            msg["To"] = student_email
            
            html = f"""
            <html>
              <body style="font-family: Arial, sans-serif; color: #333;">
                <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                  <h2 style="color: #2c3e50;">Exam Reminder</h2>
                  <p>You have an upcoming exam:</p>
                  <div style="background: #f5f5f5; padding: 15px; border-radius: 8px; margin: 20px 0;">
                    <p><strong>Exam:</strong> {exam_title}</p>
                    <p><strong>Starts:</strong> {start_time}</p>
                  </div>
                  <p>Make sure to:</p>
                  <ul>
                    <li>Test your internet connection</li>
                    <li>Close unnecessary applications</li>
                    <li>Find a quiet, distraction-free environment</li>
                    <li>Log in a few minutes early</li>
                  </ul>
                </div>
              </body>
            </html>
            """
            
            msg.attach(MIMEText(html, "html"))
            
            with smtplib.SMTP(EmailService.SMTP_SERVER, EmailService.SMTP_PORT) as server:
                server.starttls()
                server.login(EmailService.SMTP_USER, EmailService.SMTP_PASSWORD)
                server.send_message(msg)
            
            return True
        except Exception as e:
            print(f"Error sending exam reminder: {e}")
            return False
    
    @staticmethod
    def _render_submission_email(submission_data: Dict[str, Any]) -> str:
        """Render HTML email for exam submission."""
        exam_title = submission_data.get("exam_title", "Exam")
        student_name = submission_data.get("student_name", "Student")
        student_email = submission_data.get("student_email", "N/A")
        attempt_number = submission_data.get("attempt_number", 1)
        submitted_at = submission_data.get("submitted_at", "N/A")
        time_spent = submission_data.get("time_spent_seconds", 0)
        minutes = time_spent // 60
        seconds = time_spent % 60
        
        answers_count = len(submission_data.get("answers", {}))
        
        return f"""
        <html>
          <body style="font-family: Arial, sans-serif; color: #333; background: #f9f9f9;">
            <div style="max-width: 600px; margin: 0 auto; background: white; padding: 40px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
              
              <h1 style="color: #2c3e50; border-bottom: 3px solid #3498db; padding-bottom: 10px;">
                Exam Submission Received
              </h1>
              
              <div style="background: #ecf0f1; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h2 style="margin-top: 0; color: #2c3e50;">Submission Details</h2>
                
                <table style="width: 100%; border-collapse: collapse;">
                  <tr style="border-bottom: 1px solid #bdc3c7;">
                    <td style="padding: 10px; font-weight: bold; width: 150px;">Exam:</td>
                    <td style="padding: 10px;">{exam_title}</td>
                  </tr>
                  <tr style="border-bottom: 1px solid #bdc3c7;">
                    <td style="padding: 10px; font-weight: bold;">Student:</td>
                    <td style="padding: 10px;">{student_name}</td>
                  </tr>
                  <tr style="border-bottom: 1px solid #bdc3c7;">
                    <td style="padding: 10px; font-weight: bold;">Email:</td>
                    <td style="padding: 10px;">{student_email}</td>
                  </tr>
                  <tr style="border-bottom: 1px solid #bdc3c7;">
                    <td style="padding: 10px; font-weight: bold;">Attempt:</td>
                    <td style="padding: 10px;">#{attempt_number}</td>
                  </tr>
                  <tr style="border-bottom: 1px solid #bdc3c7;">
                    <td style="padding: 10px; font-weight: bold;">Submitted:</td>
                    <td style="padding: 10px;">{submitted_at}</td>
                  </tr>
                  <tr style="border-bottom: 1px solid #bdc3c7;">
                    <td style="padding: 10px; font-weight: bold;">Time Spent:</td>
                    <td style="padding: 10px;">{minutes}m {seconds}s</td>
                  </tr>
                  <tr>
                    <td style="padding: 10px; font-weight: bold;">Answers Recorded:</td>
                    <td style="padding: 10px;">{answers_count} question(s)</td>
                  </tr>
                </table>
              </div>
              
              <div style="background: #d5f4e6; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #27ae60;">
                <p style="margin: 0; color: #27ae60;">
                  ✓ Submission successfully recorded and saved.
                </p>
              </div>
              
              <p style="color: #7f8c8d; font-size: 12px; margin-top: 30px;">
                This is an automated email. Please do not reply. 
                A detailed submission file is attached to this email for your records.
              </p>
              
            </div>
          </body>
        </html>
        """
