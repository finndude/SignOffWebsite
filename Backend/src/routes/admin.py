import secrets

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from sqlalchemy.orm import Session

from src.database import get_db
from src.models.user import User
from src.models.document import Document
from src.schemas.admin import InviteUserRequest, InviteUserResponse
from src.schemas.documents import UserSummary, DocumentResponse, UploadDocumentsResponse
from src.routes.auth import get_current_user
from src.security import hash_password, create_invite_token
from src.services.email_service import send_invite_email, send_documents_assigned_email
from src.services.storage_service import upload_file_to_storage
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


@router.get("/users", response_model=list[UserSummary])
def list_assignable_users(
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    """
    Users for the assignee picker on the upload screen.
    Returns name + email for each so admins can uniquely tell people apart.
    """
    return db.query(User).filter(User.role == "assignee").order_by(User.name).all()


@router.post("/documents/upload", response_model=UploadDocumentsResponse)
async def upload_documents(
    assigned_to_id: str = Form(...),
    files: list[UploadFile] = File(...),
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    if not files:
        raise HTTPException(status_code=400, detail="No files were provided.")

    assignee = db.query(User).filter(User.id == assigned_to_id).first()
    if not assignee:
        raise HTTPException(status_code=404, detail="Selected assignee does not exist.")

    created_documents: list[Document] = []

    for upload in files:
        if upload.content_type != "application/pdf":
            raise HTTPException(
                status_code=400,
                detail=f"'{upload.filename}' isn't a PDF. Only PDF files are supported.",
            )

        file_bytes = await upload.read()
        storage_key = upload_file_to_storage(file_bytes, upload.filename, upload.content_type)

        document = Document(
            filename=upload.filename,
            storage_key=storage_key,
            uploaded_by_id=admin.id,
            assigned_to_id=assignee.id,
            status="pending",
        )
        db.add(document)
        created_documents.append(document)

    db.commit()
    for document in created_documents:
        db.refresh(document)

    try:
        send_documents_assigned_email(
            assignee.email,
            assignee.name,
            [doc.filename for doc in created_documents],
            f"{settings.frontend_url}/dashboard",
        )
    except Exception as e:
        # Documents are already saved either way — don't lose the upload
        # over a notification failure. Just log it for now.
        print(f"[assignment email failed] {type(e).__name__}: {e}")

    return {
        "detail": f"{len(created_documents)} document(s) assigned to {assignee.name}.",
        "documents": created_documents,
    }