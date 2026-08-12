import secrets
from uuid import UUID

from fastapi import (
    APIRouter,
    Depends,
    File,
    Form,
    HTTPException,
    Query,
    UploadFile,
    status,
)
from sqlalchemy import or_
from sqlalchemy.orm import Session

from src.database import get_db
from src.models.user import User
from src.models.assignment import Assignment
from src.models.document import Document
from src.schemas.admin import (
    AdminAssignmentListItem,
    AdminUserResponse,
    InviteUserRequest,
    InviteUserResponse,
    UpdateUserRoleRequest,
)
from src.schemas.documents import UserSummary, UploadDocumentsResponse
from src.routes.auth import get_current_user
from src.security import hash_password, create_invite_token
from src.services.email_service import (
    send_documents_assigned_email,
    send_invite_email,
)
from src.services.storage_service import upload_file_to_storage
from src.config import settings

router = APIRouter(prefix="/admin", tags=["admin"])


def require_admin(
    current_user: User = Depends(get_current_user),
) -> User:
    """
    Dependency — only lets admins through.
    Everyone else receives a 403 response.
    """

    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins can perform this action.",
        )

    return current_user


@router.post(
    "/invite-user",
    response_model=InviteUserResponse,
)
def invite_user(
    payload: InviteUserRequest,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    existing = (
        db.query(User)
        .filter(User.email == payload.email)
        .first()
    )

    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A user with that email already exists.",
        )

    placeholder_password = secrets.token_urlsafe(32)

    new_user = User(
        name=payload.name,
        email=payload.email,
        hashed_password=hash_password(
            placeholder_password
        ),
        role=payload.role,
        is_pending_activation=True,
    )

    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    invite_token = create_invite_token(
        str(new_user.id)
    )

    invite_link = (
        f"{settings.frontend_url}/activate-account"
        f"?token={invite_token}"
    )

    try:
        send_invite_email(
            new_user.email,
            new_user.name,
            invite_link,
        )
    except Exception as e:
        print(
            f"[invite email failed] "
            f"{type(e).__name__}: {e}"
        )

        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=(
                "User was created, but the invite email "
                "failed to send."
            ),
        )

    return {
        "detail": f"Invite sent to {new_user.email}."
    }


@router.get(
    "/assignments",
    response_model=list[AdminAssignmentListItem],
)
def list_admin_assignments(
    search: str | None = Query(None),
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    """
    Every assignment uploaded by this admin.

    Search supports:
    - Assignment title
    - Assignee name
    - Assignee email
    """

    query = (
        db.query(Assignment)
        .filter(
            Assignment.assigned_by_id == admin.id
        )
    )

    if search:
        search = search.strip()

        if len(search) >= 2:
            search_term = f"%{search}%"

            query = query.join(
                Assignment.assigned_to
            ).filter(
                or_(
                    Assignment.title.ilike(
                        search_term
                    ),
                    User.name.ilike(
                        search_term
                    ),
                    User.email.ilike(
                        search_term
                    ),
                )
            )

    assignments = (
        query
        .order_by(
            Assignment.created_at.desc()
        )
        .all()
    )

    results = []

    for assignment in assignments:
        doc_count = len(
            assignment.documents
        )

        signed_count = sum(
            1
            for document in assignment.documents
            if document.is_signed
        )

        results.append(
            AdminAssignmentListItem(
                id=assignment.id,
                title=assignment.title,
                status=assignment.status,
                created_at=assignment.created_at,
                assigned_to_name=(
                    assignment.assigned_to.name
                ),
                assigned_to_email=(
                    assignment.assigned_to.email
                ),
                document_count=doc_count,
                signed_count=signed_count,
            )
        )

    return results


@router.get(
    "/users",
    response_model=list[AdminUserResponse],
)
def list_all_users(
    search: str | None = Query(None),
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    """
    Return all users for the admin user-management screen.

    Search supports:
    - User name
    - User email
    """

    query = db.query(User)

    if search:
        search = search.strip()

        if len(search) >= 2:
            search_term = f"%{search}%"

            query = query.filter(
                or_(
                    User.name.ilike(
                        search_term
                    ),
                    User.email.ilike(
                        search_term
                    ),
                )
            )

    return (
        query
        .order_by(User.name.asc())
        .all()
    )


@router.patch(
    "/users/{user_id}/role",
    response_model=AdminUserResponse,
)
def update_user_role(
    user_id: UUID,
    payload: UpdateUserRoleRequest,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    """
    Change another user's role.

    Admins cannot change their own role.
    """

    if user_id == admin.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You cannot change your own role.",
        )

    user = (
        db.query(User)
        .filter(User.id == user_id)
        .first()
    )

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found.",
        )

    if payload.role not in {
        "admin",
        "assignee",
    }:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                "Role must be either "
                "'admin' or 'assignee'."
            ),
        )

    user.role = payload.role

    db.commit()
    db.refresh(user)

    return user


@router.get(
    "/users/assignable",
    response_model=list[UserSummary],
)
def list_assignable_users(
    search: str | None = Query(None),
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    """
    Users for the assignee picker on the upload screen.

    Only regular signers are returned.

    Search supports:
    - User name
    - User email
    """

    query = (
        db.query(User)
        .filter(
            User.role == "assignee"
        )
    )

    if search:
        search = search.strip()

        if len(search) >= 2:
            search_term = f"%{search}%"

            query = query.filter(
                or_(
                    User.name.ilike(
                        search_term
                    ),
                    User.email.ilike(
                        search_term
                    ),
                )
            )

    return (
        query
        .order_by(User.name.asc())
        .limit(50)
        .all()
    )


@router.post(
    "/documents/upload",
    response_model=UploadDocumentsResponse,
)
async def upload_documents(
    title: str = Form(...),
    assigned_to_id: str = Form(...),
    files: list[UploadFile] = File(...),
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    title = title.strip()

    if not title:
        raise HTTPException(
            status_code=400,
            detail="Upload title is required.",
        )

    if len(title) > 120:
        raise HTTPException(
            status_code=400,
            detail=(
                "Upload title must be "
                "120 characters or fewer."
            ),
        )

    if not files:
        raise HTTPException(
            status_code=400,
            detail="No files were provided.",
        )

    assignee = (
        db.query(User)
        .filter(
            User.id == assigned_to_id
        )
        .first()
    )

    if not assignee:
        raise HTTPException(
            status_code=404,
            detail="Selected assignee does not exist.",
        )

    if assignee.role != "assignee":
        raise HTTPException(
            status_code=400,
            detail=(
                "Documents can only be assigned "
                "to regular signers."
            ),
        )

    assignment = Assignment(
        title=title,
        assigned_to_id=assignee.id,
        assigned_by_id=admin.id,
        status="pending",
    )

    db.add(assignment)
    db.flush()

    created_documents: list[Document] = []

    for upload in files:

        if upload.content_type != "application/pdf":
            raise HTTPException(
                status_code=400,
                detail=(
                    f"'{upload.filename}' isn't a PDF. "
                    "Only PDF files are supported."
                ),
            )

        file_bytes = await upload.read()

        storage_key = upload_file_to_storage(
            file_bytes,
            upload.filename,
            upload.content_type,
        )

        document = Document(
            assignment_id=assignment.id,
            filename=upload.filename,
            storage_key=storage_key,
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
            [
                doc.filename
                for doc in created_documents
            ],
            f"{settings.frontend_url}/dashboard",
        )
    except Exception as e:
        print(
            f"[assignment email failed] "
            f"{type(e).__name__}: {e}"
        )

    return {
        "detail": (
            f"{len(created_documents)} document(s) "
            f"assigned to {assignee.name}."
        ),
    }