import base64
from datetime import datetime, date

from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from sqlalchemy import func

from src.database import get_db
from src.models.user import User
from src.models.assignment import Assignment
from src.models.document import Document
from src.schemas.documents import (
    AssignmentListItem,
    AssignmentDetailResponse,
    DocumentDownloadResponse,
    SignDocumentResponse,
    ConfirmAssignmentResponse,
)
from src.schemas.signing import SignDocumentRequest
from src.routes.auth import get_current_user
from src.services.storage_service import (
    get_download_url,
    get_file_from_storage,
    upload_signature_to_storage,
)
from src.services.email_service import send_signing_complete_email

router = APIRouter(prefix="/assignments", tags=["documents"])


@router.get("", response_model=list[AssignmentListItem])
def list_my_assignments(
    sort: str = Query("newest", pattern="^(newest|oldest)$"),
    date_from: date | None = None,
    date_to: date | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Every assignment (upload batch) assigned to the current user,
    with optional date-range filtering and newest/oldest sorting.
    """
    query = db.query(Assignment).filter(Assignment.assigned_to_id == current_user.id)

    if date_from:
        query = query.filter(Assignment.created_at >= datetime.combine(date_from, datetime.min.time()))
    if date_to:
        query = query.filter(Assignment.created_at <= datetime.combine(date_to, datetime.max.time()))

    query = query.order_by(
        Assignment.created_at.desc() if sort == "newest" else Assignment.created_at.asc()
    )

    assignments = query.all()

    results = []
    for assignment in assignments:
        doc_count = len(assignment.documents)
        signed_count = sum(1 for d in assignment.documents if d.is_signed)
        results.append(
            AssignmentListItem(
                id=assignment.id,
                title=assignment.title,
                status=assignment.status,
                created_at=assignment.created_at,
                assigned_by_name=assignment.assigned_by.name,
                document_count=doc_count,
                signed_count=signed_count,
            )
        )

    return results


def _get_owned_assignment(assignment_id: str, current_user: User, db: Session) -> Assignment:
    """Fetches an assignment and checks it actually belongs to the current user."""
    assignment = db.query(Assignment).filter(Assignment.id == assignment_id).first()
    if not assignment:
        raise HTTPException(status_code=404, detail="Assignment not found.")
    if assignment.assigned_to_id != current_user.id:
        raise HTTPException(status_code=403, detail="This assignment isn't yours.")
    return assignment


@router.get("/{assignment_id}", response_model=AssignmentDetailResponse)
def get_assignment(
    assignment_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    assignment = _get_owned_assignment(assignment_id, current_user, db)
    return AssignmentDetailResponse(
        id=assignment.id,
        title=assignment.title,
        status=assignment.status,
        created_at=assignment.created_at,
        assigned_by_name=assignment.assigned_by.name,
        documents=assignment.documents,
    )


@router.get("/{assignment_id}/documents/{document_id}/download", response_model=DocumentDownloadResponse)
def download_document(
    assignment_id: str,
    document_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    assignment = _get_owned_assignment(assignment_id, current_user, db)
    document = next((d for d in assignment.documents if str(d.id) == document_id), None)
    if not document:
        raise HTTPException(status_code=404, detail="Document not found in this assignment.")

    return DocumentDownloadResponse(download_url=get_download_url(document.storage_key))


@router.get("/{assignment_id}/documents/{document_id}/file")
def view_document_file(
    assignment_id: str,
    document_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    assignment = _get_owned_assignment(assignment_id, current_user, db)
    document = next((d for d in assignment.documents if str(d.id) == document_id), None)
    if not document:
        raise HTTPException(status_code=404, detail="Document not found in this assignment.")

    try:
        stored_file = get_file_from_storage(document.storage_key)
    except Exception:
        raise HTTPException(status_code=502, detail="Couldn't load this file from storage.")

    headers = {
        "Content-Disposition": f'inline; filename="{document.filename}"',
    }
    if stored_file.get("ContentLength") is not None:
        headers["Content-Length"] = str(stored_file["ContentLength"])

    return StreamingResponse(
        stored_file["Body"],
        media_type=stored_file.get("ContentType") or "application/pdf",
        headers=headers,
    )


@router.post("/{assignment_id}/documents/{document_id}/sign", response_model=SignDocumentResponse)
def sign_document(
    assignment_id: str,
    document_id: str,
    payload: SignDocumentRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    assignment = _get_owned_assignment(assignment_id, current_user, db)
    document = next((d for d in assignment.documents if str(d.id) == document_id), None)
    if not document:
        raise HTTPException(status_code=404, detail="Document not found in this assignment.")

    # Strip the "data:image/png;base64," prefix if present
    raw_data = payload.signature_data_url.split(",")[-1]
    try:
        image_bytes = base64.b64decode(raw_data)
    except Exception:
        raise HTTPException(status_code=400, detail="Signature data is invalid.")

    signature_key = upload_signature_to_storage(image_bytes)

    document.signature_storage_key = signature_key
    document.is_signed = True
    document.signed_at = datetime.utcnow()
    db.commit()
    db.refresh(document)

    return SignDocumentResponse(detail="Document signed.", document=document)


@router.post("/{assignment_id}/confirm", response_model=ConfirmAssignmentResponse)
def confirm_assignment(
    assignment_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    assignment = _get_owned_assignment(assignment_id, current_user, db)

    unsigned = [d for d in assignment.documents if not d.is_signed]
    if unsigned:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"{len(unsigned)} document(s) still need to be signed before confirming.",
        )

    assignment.status = "signed"
    db.commit()

    try:
        send_signing_complete_email(
            current_user.email,
            current_user.name,
            [d.filename for d in assignment.documents],
        )
    except Exception as e:
        print(f"[signing confirmation email failed] {type(e).__name__}: {e}")

    return ConfirmAssignmentResponse(detail="All documents confirmed as signed.")
