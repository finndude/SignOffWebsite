import resend

from src.config import settings

resend.api_key = settings.resend_api_key


def send_invite_email(to_email: str, name: str, invite_link: str) -> None:
    """
    Sends the account-activation email to a newly invited user.
    Raises if Resend's API call fails — the caller (the invite route)
    decides how to handle that (e.g. still return success but log it,
    or roll back the created user — see routes/admin.py).
    """
    resend.Emails.send({
        "from": settings.email_from_address,
        "to": to_email,
        "subject": "You've been invited to SignOffWebsite",
        "html": f"""
            <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
                <h2>Hi {name},</h2>
                <p>You've been added as a user on SignOffWebsite.</p>
                <p>Click the link below to set your password and activate your account:</p>
                <p>
                    <a href="{invite_link}"
                       style="display:inline-block; background:#2f5ef5; color:#fff;
                              padding:12px 20px; border-radius:8px; text-decoration:none;">
                        Set up your account
                    </a>
                </p>
                <p style="color:#888; font-size:13px;">
                    This link expires in {settings.invite_token_expire_hours} hours.
                    If you weren't expecting this invite, you can ignore this email.
                </p>
            </div>
        """,
    })