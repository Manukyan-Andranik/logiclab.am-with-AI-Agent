# app/core/email.py
import aiosmtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.header import Header
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
        """Send an email asynchronously using aiosmtplib"""
        try:
            msg = MIMEMultipart("alternative")
            msg["Subject"] = Header(subject, "utf-8")
            msg["From"] = f"{self.from_name} <{self.from_email}>"
            msg["To"] = to_email
            
            if html:
                part = MIMEText(body, "html", "utf-8")
            else:
                part = MIMEText(body, "plain", "utf-8")
            
            msg.attach(part)
            
            # Determine if we should use SSL or STARTTLS
            use_tls = self.smtp_port == 465
            start_tls = self.smtp_port == 587
            
            logger.info(f"Attempting to send email to {to_email} via {self.smtp_host}:{self.smtp_port} (User: {self.smtp_user})")
            
            await aiosmtplib.send(
                msg,
                hostname=self.smtp_host,
                port=self.smtp_port,
                username=self.smtp_user,
                password=self.smtp_password,
                use_tls=use_tls,
                start_tls=start_tls,
                timeout=10
            )
            
            logger.info(f"Email sent successfully to {to_email}")
            return True
        except aiosmtplib.SMTPAuthenticationError as e:
            logger.error(f"SMTP Authentication failed for {self.smtp_user} at {self.smtp_host}: {str(e)}. Please check your SMTP_PASSWORD (if using Gmail, use an App Password).")
            return False
        except Exception as e:
            logger.error(f"Failed to send email to {to_email}: {type(e).__name__}: {str(e)}")
            return False
    
    async def send_registration_received(self, to_email: str, student_name: str, course_name: str):
        """Send registration received email"""
        subject = "Գրանցումը ստացված է - LogicLab"
        body = f"""
        <html>
            <body style="font-family: sans-serif;">
                <h2>Շնորհակալություն գրանցման համար, {student_name}!</h2>
                <p>Մենք ստացել ենք ձեր գրանցման հայտը <strong>{course_name}</strong> դասընթացի համար:</p>
                <p>Մեր թիմը կուսումնասիրի ձեր հայտը և կկապվի ձեզ հետ մոտ ժամանակներս:</p>
                <br>
                <p>Հարգանքներով,<br>LogicLab թիմ</p>
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
        subject = "Գրանցումը հաստատված է - Բարի գալուստ LogicLab!"
        body = f"""
        <html>
            <body style="font-family: sans-serif;">
                <h2>Շնորհավորում ենք, {student_name}!</h2>
                <p>Ձեր գրանցումը <strong>{course_name}</strong> դասընթացի համար հաստատված է:</p>
                <br>
                <h3>Ձեր մուտքանունն ու գաղտնաբառը:</h3>
                <p><strong>Email:</strong> {login_email}</p>
                <p><strong>Ժամանակավոր գաղտնաբառ:</strong> {temp_password}</p>
                <p>Խնդրում ենք մուտք գործել այստեղ: <a href="{settings.FRONTEND_URL}/student/login">{settings.FRONTEND_URL}/student/login</a></p>
                <p><em>Խորհուրդ ենք տալիս փոխել գաղտնաբառը առաջին մուտքից հետո:</em></p>
                <br>
                <p>Հարգանքներով,<br>LogicLab թիմ</p>
            </body>
        </html>
        """
        return await self.send_email(to_email, subject, body, html=True)
    
    async def send_registration_rejected(self, to_email: str, student_name: str, course_name: str):
        """Send registration rejected email"""
        subject = "Տեղեկատվություն գրանցման կարգավիճակի վերաբերյալ - LogicLab"
        body = f"""
        <html>
            <body style="font-family: sans-serif;">
                <h2>Հարգելի {student_name},</h2>
                <p>Շնորհակալություն <strong>{course_name}</strong> դասընթացի հանդեպ հետաքրքրություն ցուցաբերելու համար:</p>
                <p>Ցավոք, այս պահին մենք չենք կարող հաստատել ձեր գրանցումը:</p>
                <p>Սա կարող է պայմանավորված լինել խմբերի լրացված լինելու կամ այլ պատճառներով:</p>
                <br>
                <p>Հարգանքներով,<br>LogicLab թիմ</p>
            </body>
        </html>
        """
        return await self.send_email(to_email, subject, body, html=True)
    
    async def send_course_completed(self, to_email: str, student_name: str, course_name: str):
        """Send course completion email"""
        subject = "Շնորհավորում ենք: Դասընթացն ավարտված է - LogicLab"
        body = f"""
        <html>
            <body style="font-family: sans-serif;">
                <h2>Շնորհավորում ենք, {student_name}! 🎉</h2>
                <p>Դուք հաջողությամբ ավարտեցիք <strong>{course_name}</strong> դասընթացը:</p>
                <p>Մենք հպարտ ենք ձեր ձեռքբերումներով:</p>
                <p>Ձեր սերտիֆիկատը շուտով հասանելի կլինի ձեր անձնական էջում:</p>
                <br>
                <p>Հարգանքներով,<br>LogicLab թիմ</p>
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
        subject = f"Նոր նյութեր են հասանելի - {course_name}"
        body = f"""
        <html>
            <body style="font-family: sans-serif;">
                <h2>Ողջույն {student_name},</h2>
                <p>Դասընթացի նոր նյութերը արդեն հասանելի են ձեզ համար:</p>
                <p><strong>Բաժին:</strong> {chapter_title}</p>
                <p><strong>Դասընթաց:</strong> {course_name}</p>
                <p>Մուտք գործեք ձեր էջ՝ նյութերին ծանոթանալու համար: 
                   <a href="{settings.FRONTEND_URL}/student/materials">{settings.FRONTEND_URL}/student/materials</a>
                </p>
                <br>
                <p>Մաղթում ենք հաջող ուսումնառություն:<br>LogicLab թիմ</p>
            </body>
        </html>
        """
        return await self.send_email(to_email, subject, body, html=True)

    async def send_password_reset_email(self, to_email: str, username: str, reset_link: str):
        """Send password reset email"""
        subject = "Գաղտնաբառի վերականգնման հարցում - LogicLab"
        body = f"""
        <html>
            <body style="font-family: sans-serif;">
                <h2>Ողջույն {username},</h2>
                <p>Դուք հարցում եք ուղարկել LogicLab-ի ձեր հաշվի գաղտնաբառը վերականգնելու համար:</p>
                <p>Խնդրում ենք սեղմել ստորև նշված հղմանը՝ գաղտնաբառը փոխելու համար:</p>
                <p><a href="{reset_link}">Վերականգնել գաղտնաբառը</a></p>
                <p>Եթե դուք չեք կատարել այս հարցումը, պարզապես անտեսեք այս հաղորդագրությունը:</p>
                <br>
                <p>Հարգանքներով,<br>LogicLab թիմ</p>
            </body>
        </html>
        """
        return await self.send_email(to_email, subject, body, html=True)

email_service = EmailService()


