from fastapi import APIRouter, Depends, HTTPException, Response, Request, status
from sqlalchemy.orm import Session

from src.database import get_db
from src.models.user import User
from src.schemas.auth import (
    ActivateAccountRequest,
    ForgotPasswordRequest,
    LoginRequest,
    ResetPasswordRequest,
    UserResponse,
)
from src.security import (
    verify_password,
    hash_password,
    create_access_token,
    create_password_reset_token,
    create_refresh_token,
    decode_token,
)
from src.config import settings
from src.services.email_service import send_password_reset_email

router = APIRouter(prefix="/auth", tags=["auth"])

# Cookie settings — httpOnly blocks JS access (mitigates XSS token theft).
# secure=True requires HTTPS; keep False only for local http dev, flip on in production.
COOKIE_KWARGS = dict(
    httponly=True,
    secure=settings.app_env == "production",
    samesite="none",
)


def _validate_password_rules(password: str) -> None:
    if len(password) < 8:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password must be at least 8 characters.",
        )
    if not any(character.isdigit() for character in password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password must contain at least one number.",
        )


@router.post("/login", response_model=UserResponse)
def login(payload: LoginRequest, response: Response, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == payload.email).first()

    # Same generic error whether the email doesn't exist or the password is wrong —
    # never reveal which one, that leaks which emails are registered.
    invalid_credentials = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Incorrect email or password.",
    )

    if not user:
        raise invalid_credentials

    if not verify_password(payload.password, user.hashed_password):
        raise invalid_credentials

    if user.is_pending_activation:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account not yet activated. Check your email to set a password.",
        )

    access_token = create_access_token(str(user.id))
    refresh_token = create_refresh_token(str(user.id))

    response.set_cookie(
        "access_token", access_token,
        max_age=settings.access_token_expire_minutes * 60,
        **COOKIE_KWARGS,
    )
    response.set_cookie(
        "refresh_token", refresh_token,
        max_age=settings.refresh_token_expire_days * 24 * 60 * 60,
        **COOKIE_KWARGS,
    )

    return user


@router.post("/refresh")
def refresh(request: Request, response: Response, db: Session = Depends(get_db)):
    refresh_token = request.cookies.get("refresh_token")
    if not refresh_token:
        raise HTTPException(status_code=401, detail="No refresh token provided.")

    payload = decode_token(refresh_token)
    if not payload or payload.get("type") != "refresh":
        raise HTTPException(status_code=401, detail="Invalid or expired refresh token.")

    user = db.query(User).filter(User.id == payload["sub"]).first()
    if not user:
        raise HTTPException(status_code=401, detail="User no longer exists.")

    new_access_token = create_access_token(str(user.id))
    response.set_cookie(
        "access_token", new_access_token,
        max_age=settings.access_token_expire_minutes * 60,
        **COOKIE_KWARGS,
    )
    return {"detail": "Access token refreshed."}


@router.post("/logout")
def logout(response: Response):
    response.delete_cookie("access_token")
    response.delete_cookie("refresh_token")
    return {"detail": "Logged out."}


@router.post("/activate-account")
def activate_account(payload: ActivateAccountRequest, db: Session = Depends(get_db)):
    """
    Called from the link in the invite email. Verifies the invite token,
    sets the user's real password, and flips them out of pending status.
    """
    token_payload = decode_token(payload.token)
    if not token_payload or token_payload.get("type") != "invite":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This invite link is invalid or has expired.",
        )

    user = db.query(User).filter(User.id == token_payload["sub"]).first()
    if not user:
        raise HTTPException(status_code=404, detail="User no longer exists.")

    if not user.is_pending_activation:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This account has already been activated.",
        )

    _validate_password_rules(payload.password)

    user.hashed_password = hash_password(payload.password)
    user.is_pending_activation = False
    db.commit()

    return {"detail": "Account activated. You can now log in."}


@router.post("/forgot-password")
def forgot_password(payload: ForgotPasswordRequest, db: Session = Depends(get_db)):
    """
    Sends a reset link if the account exists. Always returns the same success
    response so attackers cannot use this endpoint to discover registered emails.
    """
    generic_response = {
        "detail": "If an account exists for that email, a password reset link has been sent.",
    }

    user = db.query(User).filter(User.email == payload.email).first()
    if not user or user.is_pending_activation:
        return generic_response

    reset_token = create_password_reset_token(str(user.id))
    reset_link = f"{settings.frontend_url}/reset-password?token={reset_token}"

    try:
        send_password_reset_email(user.email, user.name, reset_link)
    except Exception as e:
        print(f"[password reset email failed] {type(e).__name__}: {e}")
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Password reset email failed to send. Please try again later.",
        )

    return generic_response


@router.post("/reset-password")
def reset_password(payload: ResetPasswordRequest, db: Session = Depends(get_db)):
    token_payload = decode_token(payload.token)
    if not token_payload or token_payload.get("type") != "password_reset":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This password reset link is invalid or has expired.",
        )

    user = db.query(User).filter(User.id == token_payload["sub"]).first()
    if not user:
        raise HTTPException(status_code=404, detail="User no longer exists.")

    _validate_password_rules(payload.password)

    user.hashed_password = hash_password(payload.password)
    user.is_pending_activation = False
    db.commit()

    return {"detail": "Password reset. You can now log in."}


def get_current_user(request: Request, db: Session = Depends(get_db)) -> User:
    """Dependency to protect routes — use with Depends(get_current_user)."""
    access_token = request.cookies.get("access_token")
    if not access_token:
        raise HTTPException(status_code=401, detail="Not authenticated.")

    payload = decode_token(access_token)
    if not payload or payload.get("type") != "access":
        raise HTTPException(status_code=401, detail="Invalid or expired session.")

    user = db.query(User).filter(User.id == payload["sub"]).first()
    if not user:
        raise HTTPException(status_code=401, detail="User no longer exists.")

    return user


@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)):
    return current_user