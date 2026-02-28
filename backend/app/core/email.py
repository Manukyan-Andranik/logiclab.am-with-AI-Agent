# app/core/email.py
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import List, Optional
from .config import settings
import logging

logger = logging.getLogger(__name__)

class EmailService:
    def __init__(self):
        self.smtp_host = settings.SMTP_HOST
        self.smtp_port = settings.SMTP_PORT
        self.smtp_user = settings.SMTP_USER
        self.smtp_password = settings.SMTP_PASSWORD
        self.from_email = settings.SMTP_FROM_EMAIL
        self.from_name = settings.SMTP_FROM_NAME
    
    async def send_email(
        self,
        to_email: str,
        subject: str,
        body: str,
        html: bool = False
    ) -> bool:
        """Send an email"""
        try:
            msg = MIMEMultipart("alternative")
            msg["Subject"] = subject
            msg["From"] = f"{self.from_name} <{self.from_email}>"
            msg["To"] = to_email
            
            if html:
                part = MIMEText(body, "html")
            else:
                part = MIMEText(body, "plain")
            
            msg.attach(part)
            
            with smtplib.SMTP(self.smtp_host, self.smtp_port) as server:
                server.starttls()
                server.login(self.smtp_user, self.smtp_password)
                server.send_message(msg)
            
            logger.info(f"Email sent successfully to {to_email}")
            return True
        except Exception as e:
            logger.error(f"Failed to send email to {to_email}: {str(e)}")
            return False
    
    async def send_registration_received(self, to_email: str, student_name: str, course_name: str):
        """Send registration received email"""
        subject = "Registration Received - LogicLab"
        body = f"""
        <html>
            <body>
                <h2>Thank you for your registration, {student_name}!</h2>
                <p>We have received your registration for <strong>{course_name}</strong>.</p>
                <p>Our team will review your application and get back to you shortly.</p>
                <br>
                <p>Best regards,<br>LogicLab Team</p>
            </body>
        </html>
        """
        return await self.send_email(to_email, subject, body, html=True)
    
    async def send_registration_confirmed(
        self,
        to_email: str,
        student_name: str,
        course_name: str,
        login_email: str,
        temp_password: str
    ):
        """Send registration confirmed email with login credentials"""
        subject = "Registration Confirmed - Welcome to LogicLab!"
        body = f"""
        <html>
            <body>
                <h2>Congratulations, {student_name}!</h2>
                <p>Your registration for <strong>{course_name}</strong> has been confirmed!</p>
                <br>
                <h3>Your Login Credentials:</h3>
                <p><strong>Email:</strong> {login_email}</p>
                <p><strong>Temporary Password:</strong> {temp_password}</p>
                <p>Please login at: <a href="{settings.FRONTEND_URL}/student/login">{settings.FRONTEND_URL}/student/login</a></p>
                <p><em>We recommend changing your password after first login.</em></p>
                <br>
                <p>Best regards,<br>LogicLab Team</p>
            </body>
        </html>
        """
        return await self.send_email(to_email, subject, body, html=True)
    
    async def send_registration_rejected(self, to_email: str, student_name: str, course_name: str):
        """Send registration rejected email"""
        subject = "Registration Status Update - LogicLab"
        body = f"""
        <html>
            <body>
                <h2>Dear {student_name},</h2>
                <p>Thank you for your interest in <strong>{course_name}</strong>.</p>
                <p>Unfortunately, we are unable to accept your registration at this time.</p>
                <p>This could be due to the course being full or other requirements not being met.</p>
                <p>Please feel free to contact us for more information or to explore other courses.</p>
                <br>
                <p>Best regards,<br>LogicLab Team</p>
            </body>
        </html>
        """
        return await self.send_email(to_email, subject, body, html=True)
    
    async def send_course_completed(self, to_email: str, student_name: str, course_name: str):
        """Send course completion email"""
        subject = "Congratulations! Course Completed - LogicLab"
        body = f"""
        <html>
            <body>
                <h2>Congratulations, {student_name}! 🎉</h2>
                <p>You have successfully completed <strong>{course_name}</strong>!</p>
                <p>We are proud of your achievement and dedication.</p>
                <p>Your certificate will be available in your student portal soon.</p>
                <br>
                <p>Best regards,<br>LogicLab Team</p>
            </body>
        </html>
        """
        return await self.send_email(to_email, subject, body, html=True)
    
    async def send_material_access_granted(
        self,
        to_email: str,
        student_name: str,
        chapter_title: str,
        course_name: str
    ):
        """Send material (chapter) access granted email"""
        subject = f"New Material Available - {course_name}"
        body = f"""
        <html>
            <body>
                <h2>Hello {student_name},</h2>
                <p>New course material has been made available to you!</p>
                <p><strong>Chapter:</strong> {chapter_title}</p>
                <p><strong>Course:</strong> {course_name}</p>
                <p>Login to your student portal to access the materials: 
                   <a href="{settings.FRONTEND_URL}/student/materials">{settings.FRONTEND_URL}/student/materials</a>
                </p>
                <br>
                <p>Happy learning!<br>LogicLab Team</p>
            </body>
        </html>
        """
        return await self.send_email(to_email, subject, body, html=True)

    async def send_password_reset_email(self, to_email: str, username: str, reset_link: str):
        """Send password reset email"""
        subject = "Password Reset Request - LogicLab"
        body = f"""
        <html>
            <body>
                <h2>Hello {username},</h2>
                <p>You have requested a password reset for your LogicLab account.</p>
                <p>Please click on the link below to reset your password:</p>
                <p><a href="{reset_link}">Reset Password</a></p>
                <p>If you did not request a password reset, please ignore this email.</p>
                <br>
                <p>Best regards,<br>LogicLab Team</p>
            </body>
        </html>
        """
        return await self.send_email(to_email, subject, body, html=True)

email_service = EmailService()


