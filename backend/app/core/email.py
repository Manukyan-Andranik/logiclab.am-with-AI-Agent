import asyncio
import html
import json
import logging
from email.mime.application import MIMEApplication
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.header import Header
from typing import Any, Dict, Optional, Tuple, Union
from email.utils import formataddr
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

    def _smtp_kwargs(self) -> dict:
        port = int(self.smtp_port)

        kwargs = {
            "hostname": self.smtp_host,
            "port": port,
            "username": self.smtp_user or None,
            "password": self.smtp_password or None,
            "timeout": 60,
        }

        # Port 465 = SSL/TLS immediately
        if port == 465:
            kwargs["use_tls"] = True

        # Port 587 = plain connect then STARTTLS
        elif port == 587:
            kwargs["start_tls"] = True

        return kwargs

    def _from_header(self) -> str:
        """RFC-compliant From with UTF-8 display name (Armenian sender names)."""
        return formataddr((str(Header(self.from_name, "utf-8")), self.from_email))

    @staticmethod
    def _smtp_accepted(
        response: Optional[
            Union[
                Tuple[Dict[str, Tuple[int, str]], str],
                Dict[str, Tuple[int, str]],
                Tuple[int, str],
            ]
        ],
    ) -> bool:
        """Interpret aiosmtplib.send() result.

        ``send()`` returns ``(failed_recipients, data_message)`` where
        ``failed_recipients`` is empty when all RCPT commands succeeded.
        """
        if response is None:
            return True

        if isinstance(response, tuple):
            if not response:
                return True
            first = response[0]
            if isinstance(first, dict):
                if first:
                    return False
                return True
            if isinstance(first, int):
                return first < 400

        if isinstance(response, dict):
            for _addr, item in response.items():
                code = item[0] if isinstance(item, (tuple, list)) else item
                if int(code) >= 400:
                    return False
            return True

        return True

    async def verify_connection(self) -> bool:
        """Connect and authenticate at startup; does not send mail."""
        import socket
        try:
            resolved_ip = socket.gethostbyname(self.smtp_host)
            logger.info("DNS resolved %s to %s", self.smtp_host, resolved_ip)
        except Exception as de:
            logger.error("DNS resolution failed for %s: %s", self.smtp_host, str(de))

        port = int(self.smtp_port)
        logger.info("Probing SMTP connection to %s:%s (use_tls=%s)", self.smtp_host, port, port == 465)
        client = aiosmtplib.SMTP(
            hostname=self.smtp_host,
            port=port,
            timeout=60,
            use_tls=(port == 465),
            start_tls=(port == 587),
        )
        try:
            await client.connect()
            logger.info("SMTP connected to %s", self.smtp_host)
            if self.smtp_user and self.smtp_password:
                await client.login(self.smtp_user, self.smtp_password)
                logger.info("SMTP logged in as %s", self.smtp_user)
            await client.quit()
            return True
        except Exception as e:
            logger.error("SMTP probe failed: %s (%s)", str(e), type(e).__name__)
            logger.exception(
                "smtp_connect_failed host=%s port=%s user=%s",
                self.smtp_host,
                self.smtp_port,
                self.smtp_user or "(none)",
            )
            return False

    async def _deliver(self, msg: MIMEMultipart, to_email: str, context: str) -> bool:
        """Send via explicit SMTP session (same path as startup verify) with retries."""
        port = int(self.smtp_port)
        max_attempts = 3

        for attempt in range(1, max_attempts + 1):
            client = aiosmtplib.SMTP(
                hostname=self.smtp_host,
                port=port,
                timeout=60,
                use_tls=(port == 465),
                start_tls=(port == 587),
            )
            try:
                await client.connect()
                if self.smtp_user and self.smtp_password:
                    await client.login(self.smtp_user, self.smtp_password)

                errors, _ = await client.send_message(
                    msg,
                    sender=self.from_email,
                    recipients=[to_email],
                )
                await client.quit()

                if errors:
                    logger.error(
                        "email_rejected context=%s to=%s errors=%s",
                        context,
                        to_email,
                        errors,
                    )
                    return False

                logger.info("email_sent context=%s to=%s attempt=%s", context, to_email, attempt)
                return True

            except Exception:
                try:
                    await client.quit()
                except Exception:
                    pass
                if attempt < max_attempts:
                    logger.warning(
                        "email_retry context=%s to=%s attempt=%s/%s",
                        context,
                        to_email,
                        attempt,
                        max_attempts,
                    )
                    await asyncio.sleep(2 * attempt)
                    continue
                logger.exception(
                    "email_failed context=%s to=%s smtp=%s:%s",
                    context,
                    to_email,
                    self.smtp_host,
                    self.smtp_port,
                )
                return False

        return False

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
        msg = MIMEMultipart("alternative")
        msg["Subject"] = Header(subject, "utf-8")
        msg["From"] = self._from_header()
        msg["To"] = to_email
        msg.attach(MIMEText(body, "html" if html else "plain", "utf-8"))
        return await self._deliver(msg, to_email, "Transactional")

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
        url = f"{settings.FRONTEND_URL}/login?role=student"
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
          <p style="margin:0;color:{MUTED};">Մաղթում ենք հաջողություն ուսման մեջ:</p>
          """
        url = f"{settings.FRONTEND_URL}/student/materials"
        return await self.send_email(
            to_email,
            "Նոր ուսումնական նյութեր — LogicLab",
            self._get_themed_html(content, url, "Մուտք գործել"),
            html=True,
        )


    async def send_exam_submitted_to_student(
        self,
        to_email: str,
        student_name: str,
        exam_title: str,
        *,
        score: Optional[float] = None,
        max_score: Optional[float] = None,
        score_percent: Optional[float] = None,
        pending_manual_count: int = 0,
        attempt_id: Optional[int] = None,
    ) -> bool:
        """Confirm exam submission to the student with score summary when available."""
        if not to_email or "@" not in to_email:
            logger.warning("exam_student_email_skipped missing_or_invalid to=%s", to_email)
            return False

        sn = _h(student_name)
        title = _h(exam_title)

        score_block = ""
        if max_score is not None and max_score > 0 and score is not None:
            pct = score_percent
            if pct is None:
                pct = round(float(score) / float(max_score) * 100, 1)
            score_block = f"""          <div style="background:{INNER};border:1px solid {BORDER};border-radius:8px;padding:16px 18px;margin:16px 0;">
            <p style="margin:0 0 6px;font-size:15px;color:{FG};"><strong style="color:{GOLD};">Արդյունք՝</strong> {score:g} / {max_score:g} միավոր</p>
            <p style="margin:0;font-size:15px;color:{FG};"><strong style="color:{GOLD};">Տոկոս՝</strong> {pct:g}%</p>
          </div>"""
        elif pending_manual_count > 0:
            score_block = f"""          <p style="margin:16px 0;color:{MUTED};">Ձեր պատասխանները ստացվել են։ Մասնագետի գնահատումից հետո արդյունքը կհայտնվի ձեր էջում։</p>"""

        pending_note = ""
        if pending_manual_count > 0:
            pending_note = f"""          <p style="margin:12px 0 0;font-size:14px;color:{SUBTLE};">Որոշ հարցեր պահանջում են ձեռքով գնահատում ({pending_manual_count}) — վերջնական միավորները կարող են թարմացվել։</p>"""

        content = f"""          <p style="margin:0 0 10px;font-size:18px;font-weight:700;color:{FG};">Ողջույն, {sn} ✅</p>
          <p style="margin:0 0 10px;color:{MUTED};">Դուք հաջողությամբ ներկայացրել եք <strong style="color:{GOLD};">{title}</strong> քննությունը։</p>
{score_block}
          <p style="margin:0;color:{MUTED};">Շնորհակալություն աշխատանքի համար։</p>
{pending_note}"""

        url = f"{settings.FRONTEND_URL}/student/exams"
        if attempt_id:
            url = f"{settings.FRONTEND_URL}/student/exams?attempt={attempt_id}"

        return await self.send_email(
            to_email,
            f"Քննությունը ներկայացված է — {exam_title}",
            self._get_themed_html(content, url, "Դիտել քննությունները"),
            html=True,
        )

    async def send_exam_graded_to_student(
        self,
        to_email: str,
        student_name: str,
        exam_title: str,
        *,
        score: float,
        max_score: float,
        score_percent: Optional[float] = None,
        attempt_id: Optional[int] = None,
    ) -> bool:
        """Notify student when manual grading is complete."""
        if not to_email or "@" not in to_email:
            return False

        sn = _h(student_name)
        title = _h(exam_title)
        pct = score_percent
        if pct is None and max_score > 0:
            pct = round(float(score) / float(max_score) * 100, 1)

        content = f"""          <p style="margin:0 0 10px;font-size:18px;font-weight:700;color:{FG};">Ողջույն, {sn} 📋</p>
          <p style="margin:0 0 10px;color:{MUTED};"><strong style="color:{GOLD};">{title}</strong> քննության գնահատումն ավարտված է։</p>
          <div style="background:{INNER};border:1px solid {BORDER};border-radius:8px;padding:16px 18px;margin:16px 0;">
            <p style="margin:0 0 6px;font-size:15px;color:{FG};"><strong style="color:{GOLD};">Վերջնական արդյունք՝</strong> {score:g} / {max_score:g} միավոր</p>
            <p style="margin:0;font-size:15px;color:{FG};"><strong style="color:{GOLD};">Տոկոս՝</strong> {pct:g}%</p>
          </div>"""

        url = f"{settings.FRONTEND_URL}/student/exams"
        return await self.send_email(
            to_email,
            f"Քննության արդյունքը պատրաստ է — {exam_title}",
            self._get_themed_html(content, url, "Դիտել արդյունքը"),
            html=True,
        )

    async def send_exam_submission_emails(
        self,
        *,
        admin_email: Optional[str],
        student_email: Optional[str],
        submission_data: Dict[str, Any],
        json_file_path: str,
        score: Optional[float] = None,
        max_score: Optional[float] = None,
        score_percent: Optional[float] = None,
        pending_manual_count: int = 0,
    ) -> Dict[str, bool]:
        """Send admin notification and student confirmation after exam submit."""
        results = {"admin": False, "student": False}

        if admin_email:
            results["admin"] = await self.send_exam_submission(
                admin_email, submission_data, json_file_path
            )

        student_name = str(submission_data.get("student_name", "Student"))
        exam_title = str(submission_data.get("exam_title", "Exam"))
        attempt_id = submission_data.get("attempt_id")

        if student_email:
            results["student"] = await self.send_exam_submitted_to_student(
                student_email,
                student_name,
                exam_title,
                score=score,
                max_score=max_score,
                score_percent=score_percent,
                pending_manual_count=pending_manual_count,
                attempt_id=attempt_id,
            )

        return results

    async def send_exam_submission(
        self,
        admin_email: str,
        submission_data: Dict[str, Any],
        json_file_path: str,
    ) -> bool:
        """Notify admin with exam submission summary and JSON attachment."""
        title = _h(str(submission_data.get("exam_title", "Exam")))
        student_name = _h(str(submission_data.get("student_name", "Student")))
        student_email = _h(str(submission_data.get("student_email", "")))
        submitted_at = _h(str(submission_data.get("submitted_at", "")))
        spent = int(submission_data.get("time_spent_seconds", 0))
        minutes, seconds = divmod(spent, 60)
        answers_count = len(submission_data.get("answers") or {})

        content = f"""          <p style="margin:0 0 10px;font-size:18px;font-weight:700;color:{FG};">Exam submission received</p>
          <p style="margin:0 0 8px;color:{MUTED};"><strong style="color:{GOLD};">Exam:</strong> {title}</p>
          <p style="margin:0 0 8px;color:{MUTED};"><strong style="color:{GOLD};">Student:</strong> {student_name} ({student_email})</p>
          <p style="margin:0 0 8px;color:{MUTED};"><strong style="color:{GOLD};">Submitted:</strong> {submitted_at}</p>
          <p style="margin:0 0 8px;color:{MUTED};"><strong style="color:{GOLD};">Time:</strong> {minutes}m {seconds}s · {answers_count} answer(s)</p>
          <p style="margin:0;color:{SUBTLE};">Full answers are attached as JSON.</p>"""

        try:
            msg = MIMEMultipart("mixed")
            msg["Subject"] = Header(f"Exam submission: {submission_data.get('exam_title', 'Exam')}", "utf-8")
            msg["From"] = self._from_header()
            msg["To"] = admin_email

            alt = MIMEMultipart("alternative")
            alt.attach(MIMEText(self._get_themed_html(content), "html", "utf-8"))
            msg.attach(alt)

            payload = json.dumps(submission_data, indent=2, ensure_ascii=False).encode("utf-8")
            attachment = MIMEApplication(payload, _subtype="json")
            attachment.add_header(
                "Content-Disposition",
                "attachment",
                filename=f"submission_{submission_data.get('attempt_id', 'exam')}.json",
            )
            msg.attach(attachment)

            return await self._deliver(msg, admin_email, "Exam submission")
        except Exception as e:
            logger.error("Exam submission email build failed: %s", str(e))
            return False


email_service = EmailService()