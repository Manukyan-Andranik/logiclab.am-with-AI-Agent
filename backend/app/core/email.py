import aiosmtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.header import Header
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

    def _get_themed_html(self, content: str, action_url: str = None, action_text: str = None) -> str:
        """
        Wraps content in the LogicLab base style:
        - Background: #222
        - Card: #333
        - Accent: #FFD700
        """
        button_html = f'''
            <div style="text-align: center; margin-top: 30px;">
                <a href="{action_url}" 
                   style="background-color: #FFD700; color: #222222; padding: 14px 28px; 
                          text-decoration: none; border-radius: 8px; font-weight: bold; 
                          display: inline-block; box-shadow: 4px 4px 0px 0px #000000;">
                    {action_text}
                </a>
            </div>''' if action_url and action_text else ""

        return f"""
        <!DOCTYPE html>
        <html lang="hy">
        <head>
            <meta charset="utf-8">
            <style>
                body {{ background-color: #222222; margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #ffffff; }}
                .wrapper {{ background-color: #222222; padding: 40px 20px; }}
                .container {{ max-width: 600px; margin: 0 auto; background-color: #333333; border-radius: 12px; border: 1px solid #222222; overflow: hidden; }}
                .header {{ background-color: #222222; padding: 25px; text-align: center; border-bottom: 2px solid #FFD700; }}
                .body-content {{ padding: 40px 30px; line-height: 1.6; font-size: 16px; }}
                .footer {{ padding: 20px; text-align: center; font-size: 12px; color: #707070; background-color: #222222; }}
                .gold {{ color: #FFD700; font-weight: bold; }}
                .credential-box {{ background-color: #222222; border: 1px solid #444; border-radius: 8px; padding: 20px; margin: 20px 0; }}
                h2 {{ color: #FFD700; margin-top: 0; font-size: 22px; }}
                p {{ margin: 10px 0; }}
            </style>
        </head>
        <body>
            <div class="wrapper">
                <div class="container">
                    <div class="header">
                        <span style="color: #FFD700; font-size: 24px; font-weight: bold; letter-spacing: 1px;">LOGICLAB</span>
                    </div>
                    <div class="body-content">
                        {content}
                        {button_html}
                    </div>
                    <div class="footer">
                        © 2026 LogicLab Academy. Բոլոր իրավունքները պաշտպանված են:
                    </div>
                </div>
            </div>
        </body>
        </html>
        """

    async def send_email(self, to_email: str, subject: str, body: str, html: bool = False) -> bool:
        try:
            msg = MIMEMultipart("alternative")
            msg["Subject"] = Header(subject, "utf-8")
            msg["From"] = f"{self.from_name} <{self.from_email}>"
            msg["To"] = to_email
            msg.attach(MIMEText(body, "html" if html else "plain", "utf-8"))
            
            await aiosmtplib.send(
                msg, hostname=self.smtp_host, port=self.smtp_port,
                username=self.smtp_user, password=self.smtp_password,
                use_tls=(self.smtp_port == 465), start_tls=(self.smtp_port == 587), timeout=10
            )
            return True
        except Exception as e:
            logger.error(f"Email failed: {str(e)}")
            return False

    # --- Refactored Templates ---

    async def send_registration_received(self, to_email: str, student_name: str, course_name: str):
        content = f"""
            <h2>Ողջույն, {student_name}</h2>
            <p>Շնորհակալություն <span class="gold">{course_name}</span> դասընթացին գրանցվելու համար:</p>
            <p>Մենք ստացել ենք ձեր հայտը: Մեր թիմը կուսումնասիրի այն և կկապվի ձեզ հետ շատ մոտ ժամանակներս:</p>
        """
        return await self.send_email(to_email, "Գրանցումը ստացված է - LogicLab", self._get_themed_html(content), html=True)

    async def send_registration_confirmed(self, to_email: str, student_name: str, course_name: str, login_email: str, temp_password: str):
        content = f"""
            <h2>Բարի գալուստ LogicLab! 🎉</h2>
            <p>Ձեր գրանցումը <span class="gold">{course_name}</span> դասընթացի համար հաստատվել է:</p>
            <div class="credential-box">
                <p><strong>Email:</strong> {login_email}</p>
                <p><strong>Գաղտնաբառ:</strong> <span class="gold">{temp_password}</span></p>
            </div>
            <p style="font-size: 13px; color: #aaa;">* Անվտանգության համար խնդրում ենք փոխել գաղտնաբառը առաջին մուտքից հետո:</p>
        """
        url = f"{settings.FRONTEND_URL}/student/login"
        return await self.send_email(to_email, "Գրանցումը հաստատված է", self._get_themed_html(content, url, "Մուտք Գործել"), html=True)

    async def send_password_reset_email(self, to_email: str, username: str, reset_link: str):
        content = f"""
            <h2>Գաղտնաբառի վերականգնում</h2>
            <p>Հարգելի {username}, դուք հարցում եք ուղարկել LogicLab-ի ձեր հաշվի գաղտնաբառը վերականգնելու համար:</p>
            <p>Սեղմեք ներքևի կոճակին գործողությունը շարունակելու համար:</p>
        """
        return await self.send_email(to_email, "Գաղտնաբառի վերականգնում", self._get_themed_html(content, reset_link, "Վերականգնել"), html=True)

    async def send_material_access_granted(self, to_email: str, student_name: str, chapter_title: str, course_name: str):
        content = f"""
            <h2>Նոր նյութեր են հասանելի</h2>
            <p>Ողջույն {student_name}, <span class="gold">{course_name}</span> դասընթացի նոր բաժինը արդեն բաց է ձեզ համար:</p>
            <p><strong>Բաժին:</strong> {chapter_title}</p>
        """
        url = f"{settings.FRONTEND_URL}/student/materials"
        return await self.send_email(to_email, "Նոր ուսումնական նյութեր", self._get_themed_html(content, url, "Դիտել Նյութերը"), html=True)

email_service = EmailService()