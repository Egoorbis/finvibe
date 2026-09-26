from resend import Resend
from .config import settings

def _client():
    if not settings.RESEND_API_KEY:
        raise RuntimeError("RESEND_API_KEY is not configured")
    return Resend(api_key=settings.RESEND_API_KEY)

def _send(to, subject, html, text=None):
    payload={"from": f"FinVibe <{settings.RESEND_FROM_EMAIL}>", "to":[to], "subject":subject, "html":html}
    if text: payload["text"]=text
    return _client().emails.send(payload)

def send_password_reset_email(to, token, username):
    url=f"{settings.FRONTEND_URL}/reset-password?token={token}"
    return _send(to,"Password Reset Request - FinVibe",f"<h1>Password Reset Request</h1><p>Hi {username},</p><p><a href='{url}'>Reset Password</a></p><p>This link expires in 1 hour.</p>",f"Hi {username}, reset your password: {url}")

def send_verification_email(to, token, username):
    url=f"{settings.FRONTEND_URL}/verify-email?token={token}"
    return _send(to,"Verify Your Email - FinVibe",f"<h1>Welcome to FinVibe!</h1><p>Hi {username},</p><p><a href='{url}'>Verify Email</a></p><p>This link expires in 24 hours.</p>",f"Hi {username}, verify your email: {url}")

def send_welcome_email(to, username):
    return _send(to,"Welcome to FinVibe - Get Started!",f"<h1>Welcome to FinVibe!</h1><p>Hi {username}, your email has been verified successfully.</p>",f"Welcome to FinVibe, {username}!")
