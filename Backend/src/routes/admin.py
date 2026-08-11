import secrets

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from src.database import get_db
from src.models.user import User
from src.schemas.admin import InviteUserRequest, InviteUserResponse
from src.routes.auth import get_current_user
from src.security import hash_password, create_invite_token
from src.services.email_service import send_invite_email
from src.config import settings

router = APIRouter(prefix="/admin", tags=["admin"])


def require_admin(current_user: User = Depends(get_current_user)) -> User:
    """Dependency — only lets admins through, everyone else gets a 403."""
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins can perform this action.",
        )
    return current_user


@router.post("/invite-user", response_model=InviteUserResponse)
def invite_user(
    payload: InviteUserRequest,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    existing = db.query(User).filter(User.email == payload.email).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A user with that email already exists.",
        )

    # Placeholder password — unusable on its own since it's never given to
    # the user. They set their real password via the activation link below.
    placeholder_password = secrets.token_urlsafe(32)

    new_user = User(
        name=payload.name,
        email=payload.email,
        hashed_password=hash_password(placeholder_password),
        role="assignee",
        is_pending_activation=True,
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    invite_token = create_invite_token(str(new_user.id))
    invite_link = f"{settings.frontend_url}/activate-account?token={invite_token}"

    try:
        send_invite_email(new_user.email, new_user.name, invite_link)
    except Exception as e:
        # User record stays either way — an admin can resend the invite later.
        # (A "resend invite" endpoint is a natural follow-up feature.)
        print(f"[invite email failed] {type(e).__name__}: {e}")
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="User was created, but the invite email failed to send.",
        )

    return {"detail": f"Invite sent to {new_user.email}."}