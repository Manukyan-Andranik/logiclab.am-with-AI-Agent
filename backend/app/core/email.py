import html
import logging
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.header import Header
from typing import Optional

import aiosmtplib

from .config import settings
from .email_theme import (
    BG,
    BORDER,
    CARD,
    CARD_BORDER,
    FG,
    GOLD,
    GOLD_ALT,
    INNER,
    MUTED,
    ON_GOLD,
    SUBTLE,
)

logger = logging.getLogger(__name__)


def _h(text: str) -> str:
    """Escape text for HTML body."""
    return html.escape(text or "", quote=False)


def _attr(url: str) -> str:
    """Escape for use in HTML attributes (e.g. href)."""
    return html.escape(url or "", quote=True)


class EmailService:
    def __init__(self):
        self.smtp_host = settings.SMTP_HOST
        self.smtp_port = settings.SMTP_PORT
        self.smtp_user = settings.SMTP_USER
        self.smtp_password = settings.SMTP_PASSWORD
        self.from_email = settings.SMTP_FROM_EMAIL
        self.from_name = settings.SMTP_FROM_NAME

    def _get_themed_html(
        self,
        content: str,
        action_url: Optional[str] = None,
        action_text: Optional[str] = None,
    ) -> str:
        """Simple light layout: readable in Gmail/Outlook, minimal markup."""
        button_block = ""
        if action_url and action_text:
            button_block = f"""
            <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin-top:24px;">
              <tr>
                <td style="border-radius:8px;background:{GOLD};box-shadow:4px 4px 0 0 {GOLD_ALT};">
                  <a href="{_attr(action_url)}" style="display:inline-block;padding:12px 22px;font-size:15px;font-weight:700;color:{ON_GOLD};text-decoration:none;font-family:inherit;">{_h(action_text)}</a>
                </td>
              </tr>
            </table>"""

        return f"""<!DOCTYPE html>
<html lang="hy">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>LogicLab</title>
</head>
<body style="margin:0;padding:20px 12px;background-color:{BG};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;font-size:16px;line-height:1.55;color:{MUTED};">
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="max-width:560px;margin:0 auto;">
    <tr>
      <td style="background:{CARD};border-radius:12px;border:1px solid {CARD_BORDER};overflow:hidden;">
        <div style="padding:18px 22px;background:{BG};border-bottom:3px solid {GOLD};">
          <span style="font-size:20px;font-weight:800;letter-spacing:0.02em;line-height:1;">
            <span style="color:{GOLD};">Logic</span><span style="color:{FG};">Lab</span>
          </span>
        </div>
        <div style="padding:22px 22px 26px;color:{FG};">
{content}
{button_block}
        </div>
        <div style="padding:14px 22px;background:{BG};border-top:1px solid {BORDER};font-size:13px;color:{MUTED};text-align:center;line-height:1.5;">
          © 2026 LogicLab · <a href="https://www.logiclab.am" style="color:{GOLD};text-decoration:none;font-weight:600;">logiclab.am</a>
        </div>
      </td>
    </tr>
  </table>
  <p style="max-width:560px;margin:14px auto 0;text-align:center;font-size:12px;color:{SUBTLE};line-height:1.4;">
    Այս նամակը ուղարկվել է ավտոմատ կերպով LogicLab կրթական հարթակի կողմից։
  </p>
</body>
</html>"""

    async def send_email(self, to_email: str, subject: str, body: str, html: bool = False) -> bool:
        try:
            msg = MIMEMultipart("alternative")
            msg["Subject"] = Header(subject, "utf-8")
            msg["From"] = f"{self.from_name} <{self.from_email}>"
            msg["To"] = to_email
            msg.attach(MIMEText(body, "html" if html else "plain", "utf-8"))

            await aiosmtplib.send(
                msg,
                hostname=self.smtp_host,
                port=self.smtp_port,
                username=self.smtp_user,
                password=self.smtp_password,
                use_tls=(self.smtp_port == 465),
                start_tls=(self.smtp_port == 587),
                timeout=10,
            )
            return True
        except Exception as e:
            logger.error("Email failed: %s", str(e))
            return False

    async def send_registration_received(self, to_email: str, student_name: str, course_name: str):
        sn, cn = _h(student_name), _h(course_name)
        content = f"""          <p style="margin:0 0 10px;font-size:18px;font-weight:700;color:{FG};">Ողջույն, {sn} 👋</p>
          <p style="margin:0 0 10px;color:{MUTED};">Ուրախ ենք տեղեկացնել, որ <strong style="color:{GOLD};">{cn}</strong> դասընթացի ձեր հայտը հաջողությամբ ստացվել է։</p>
          <p style="margin:0;color:{MUTED};">Մեր մասնագետն արդեն ուսումնասիրում է այն և կկապվի Ձեզ հետ մոտ ժամանակներս՝ մանրամասները քննարկելու համար։</p>"""
        return await self.send_email(
            to_email,
            "Ձեր հայտը ստացված է — LogicLab",
            self._get_themed_html(content),
            html=True,
        )

    async def send_registration_confirmed(
        self,
        to_email: str,
        student_name: str,
        course_name: str,
        login_email: str,
        temp_password: str,
    ):
        sn, cn = _h(student_name), _h(course_name)
        le, pw = _h(login_email), _h(temp_password)
        content = f"""          <p style="margin:0 0 10px;font-size:18px;font-weight:700;color:{FG};">Բարի գալուստ <span style="color:{GOLD};">Logic</span><span style="color:{FG};">Lab</span> ընտանիք ✨</p>
          <p style="margin:0 0 16px;color:{MUTED};">Ձեր մասնակցությունը <strong style="color:{GOLD};">{cn}</strong> դասընթացին հաստատված է։ Ահա Ձեր մուտքային տվյալները՝ անձնական էջ մուտք գործելու համար.</p>
          <div style="background:{INNER};border:1px solid {BORDER};border-radius:8px;padding:16px 18px;margin:0 0 14px;">
            <p style="margin:0 0 8px;font-size:15px;color:{FG};"><strong style="color:{GOLD};">Էլ. հասցե՝</strong> {le}</p>
            <p style="margin:0;font-size:15px;color:{FG};"><strong style="color:{GOLD};">Ժամանակավոր գաղտնաբառ՝</strong> <code style="background:{CARD};padding:2px 8px;border-radius:4px;font-size:14px;color:{GOLD};border:1px solid {BORDER};">{pw}</code></p>
          </div>
          <p style="margin:0;font-size:14px;color:{SUBTLE};">💡 Անվտանգության նկատառումներից ելնելով՝ խնդրում ենք փոխել գաղտնաբառը առաջին մուտքից հետո։</p>"""
        url = f"{settings.FRONTEND_URL}/student/login"
        return await self.send_email(
            to_email,
            "Գրանցումը հաստատված է — LogicLab",
            self._get_themed_html(content, url, "Մուտք գործել կաբինետ"),
            html=True,
        )

    async def send_course_completed(self, to_email: str, student_name: str, course_name: str):
        sn, cn = _h(student_name), _h(course_name)
        content = f"""          <p style="margin:0 0 10px;font-size:18px;font-weight:700;color:{FG};">Շնորհավորում ենք, {sn} 🎓</p>
          <p style="margin:0 0 10px;color:{MUTED};">Դուք հաջողությամբ ավարտեցիք <strong style="color:{GOLD};">{cn}</strong> դասընթացը։</p>
          <p style="margin:0;color:{MUTED};">Սա հիանալի ձեռքբերում է։ Մենք հպարտ ենք Ձեր գրանցած արդյունքներով և մաղթում ենք մասնագիտական նորանոր վերելքներ։</p>"""
        return await self.send_email(
            to_email,
            "Շնորհավորում ենք ավարտելու կապակցությամբ — LogicLab",
            self._get_themed_html(content),
            html=True,
        )

    async def send_registration_rejected(self, to_email: str, student_name: str, course_name: str):
        sn, cn = _h(student_name), _h(course_name)
        content = f"""          <p style="margin:0 0 10px;font-size:18px;font-weight:700;color:{FG};">Ողջույն, {sn}</p>
          <p style="margin:0 0 10px;color:{MUTED};">Շնորհակալություն <strong style="color:{GOLD};">{cn}</strong> դասընթացի նկատմամբ հետաքրքրության համար։</p>
          <p style="margin:0;color:{MUTED};">Ցավոք, այս պահին տեղերի սահմանափակ լինելու պատճառով չենք կարող հաստատել Ձեր հայտը։ Մենք անպայման կպահենք Ձեր տվյալները և առաջինը կտեղեկացնենք հաջորդ փուլի մեկնարկի մասին։</p>"""
        return await self.send_email(
            to_email,
            "Տեղեկություն գրանցման վերաբերյալ — LogicLab",
            self._get_themed_html(content),
            html=True,
        )

    async def send_password_reset_email(self, to_email: str, username: str, reset_link: str):
        un = _h(username)
        content = f"""          <p style="margin:0 0 10px;font-size:18px;font-weight:700;color:{FG};">Գաղտնաբառի վերականգնում 🔐</p>
          <p style="margin:0 0 10px;color:{MUTED};">Հարգելի {un}, ստացվել է Ձեր LogicLab հաշվի գաղտնաբառը փոխելու հարցում։</p>
          <p style="margin:0;color:{MUTED};">Եթե դա Դուք եք, սեղմեք ստորև նշված կոճակին։ Հղումը վավեր է սահմանափակ ժամանակով։</p>"""
        return await self.send_email(
            to_email,
            "Գաղտնաբառի վերականգնում — LogicLab",
            self._get_themed_html(content, reset_link, "Սահմանել նոր գաղտնաբառ"),
            html=True,
        )

    async def send_project_published(
        self,
        to_email: str,
        student_name: str,
        project_title: str,
        project_id: int,
    ):
        """Project owner notification: admin approved & published their project."""
        sn, pt = _h(student_name), _h(project_title)
        content = f"""          <p style="margin:0 0 10px;font-size:18px;font-weight:700;color:{FG};">Շնորհավորում ենք, {sn} 🎉</p>
          <p style="margin:0 0 10px;color:{MUTED};">Ձեր նախագիծը՝ <strong style="color:{GOLD};">{pt}</strong>, հաստատվել և հրապարակվել է LogicLab-ի կայքում։</p>
          <p style="margin:0;color:{MUTED};">Այժմ բոլոր այցելուները կարող են ծանոթանալ Ձեր աշխատանքին։ Շնորհակալություն ձեր ներդրման համար։</p>"""
        url = f"{settings.FRONTEND_URL}/projects/{project_id}"
        return await self.send_email(
            to_email,
            "Ձեր նախագիծը հրապարակված է — LogicLab",
            self._get_themed_html(content, url, "Դիտել նախագիծը"),
            html=True,
        )

    async def send_daily_life_published(
        self,
        to_email: str,
        student_name: str,
        story_title: str,
        story_id: int,
    ):
        """Notify a student that a new Daily Life story is live."""
        sn, st = _h(student_name), _h(story_title)
        content = f"""          <p style="margin:0 0 10px;font-size:18px;font-weight:700;color:{FG};">Նոր պատմություն ունենք ✨</p>
          <p style="margin:0 0 10px;color:{MUTED};">Ողջույն, {sn}։ Հենց նոր հրապարակվեց նոր պատմություն՝ <strong style="color:{GOLD};">{st}</strong>.</p>
          <p style="margin:0;color:{MUTED};">Խորհուրդ ենք տալիս մի քանի րոպե հատկացնել ընթերցելու համար։</p>"""
        url = f"{settings.FRONTEND_URL}/#daily-life"
        return await self.send_email(
            to_email,
            "Նոր պատմություն — LogicLab",
            self._get_themed_html(content, url, "Բացել"),
            html=True,
        )

    async def send_material_access_granted(
        self,
        to_email: str,
        student_name: str,
        chapter_title: str,
        course_name: str,
    ):
        """Chapter-level grant: student now has access to a whole chapter."""
        sn, ch, cn = _h(student_name), _h(chapter_title), _h(course_name)
        content = f"""          <p style="margin:0 0 10px;font-size:18px;font-weight:700;color:{FG};">Նոր գլուխ է հասանելի 📚</p>
          <p style="margin:0 0 10px;color:{MUTED};">Ողջույն {sn}։ <strong style="color:{GOLD};">{cn}</strong> դասընթացում Ձեզ համար արդեն հասանելի է նոր թեմա.</p>
          <p style="margin:0;color:{MUTED};"><strong style="color:{GOLD};">Գլուխ՝</strong> {ch}</p>
          """
        url = f"{settings.FRONTEND_URL}/student/materials"
        return await self.send_email(
            to_email,
            "Նոր գլուխ է հասանելի — LogicLab",
            self._get_themed_html(content, url, "Բացել"),
            html=True,
        )

    async def send_lesson_access_granted(
        self,
        to_email: str,
        student_name: str,
        lesson_title: str,
        chapter_title: str,
        course_name: str,
    ):
        """Lesson-level grant: a single lesson within a chapter is now available."""
        sn, ls, ch, cn = _h(student_name), _h(lesson_title), _h(chapter_title), _h(course_name)
        content = f"""          <p style="margin:0 0 10px;font-size:18px;font-weight:700;color:{FG};">Նոր դաս է հասանելի ✨</p>
          <p style="margin:0 0 10px;color:{MUTED};">Ողջույն {sn}։ <strong style="color:{GOLD};">{cn}</strong> դասընթացում Ձեզ համար բացվել է նոր դաս.</p>
          <p style="margin:0;color:{MUTED};"><strong style="color:{GOLD};">Դաս՝</strong> {ls}</p>
          <p style="margin:4px 0 0;color:{MUTED};"><strong style="color:{GOLD};">Գլուխ՝</strong> {ch}</p>
          """
        url = f"{settings.FRONTEND_URL}/student/materials"
        return await self.send_email(
            to_email,
            "Նոր դաս է հասանելի — LogicLab",
            self._get_themed_html(content, url, "Մուտք գործել"),
            html=True,
        )

    async def send_cumulative_access_granted(
        self,
        to_email: str,
        student_name: str,
        course_name: str,
        items: list,
    ):
        """Send a single email summarizing multiple granted access records."""
        sn, cn = _h(student_name), _h(course_name)

        items_html = ""
        for item in items:
            ct = _h(item.get("chapter_title", ""))
            lt = _h(item.get("lesson_title", ""))
            rn = _h(item.get("resource_name", ""))

            if rn:
                label = f"Ռեսուրս՝ <strong>{rn}</strong> ({lt}, {ct})"
            elif lt:
                label = f"Դաս՝ <strong>{lt}</strong> ({ct})"
            else:
                label = f"Գլուխ՝ <strong>{ct}</strong>"

            items_html += f'<li style="margin-bottom:8px;color:{MUTED};">{label}</li>'

        content = f"""          <p style="margin:0 0 10px;font-size:18px;font-weight:700;color:{FG};">Ուսումնական նյութերի թարմացում 📚</p>
          <p style="margin:0 0 10px;color:{MUTED};">Ողջույն {sn}։ <strong style="color:{GOLD};">{cn}</strong> դասընթացում Ձեզ համար արդեն հասանելի են հետևյալ նյութերը.</p>
          <ul style="margin:16px 0;padding-left:20px;">
            {items_html}
          </ul>
          <p style="margin:0;color:{MUTED};">Հաջողություն ենք մաղթում ուսման մեջ:</p>
          """
        url = f"{settings.FRONTEND_URL}/student/materials"
        return await self.send_email(
            to_email,
            "Նոր ուսումնական նյութեր — LogicLab",
            self._get_themed_html(content, url, "Մուտք գործել"),
            html=True,
        )


email_service = EmailService()