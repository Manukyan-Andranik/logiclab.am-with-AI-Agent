import smtplib

SMTP_HOST="mail.logiclab.am"
SMTP_PORT=465
SMTP_USER="info@logiclab.am"
SMTP_PASSWORD="logclabadmin123."
SMTP_FROM_EMAIL="info@logiclab.am"
SMTP_USE_TLS=False
SMTP_USE_SSL=True

smtp = smtplib.SMTP_SSL("mail.logiclab.am", 465)
smtp.login(SMTP_USER, SMTP_PASSWORD)
print("LOGIN OK")
smtp.quit()



from email.message import EmailMessage

msg = EmailMessage()
msg["Subject"] = "SMTP Test"
msg["From"] = SMTP_FROM_EMAIL
msg["To"] = "manukyandranik@gmail.com"

msg.set_content("Hello from LogicLab SMTP")

with smtplib.SMTP_SSL("mail.logiclab.am", 465) as smtp:
    smtp.login(SMTP_USER, SMTP_PASSWORD)
    smtp.send_message(msg)

print("EMAIL SENT")

