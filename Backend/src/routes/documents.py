import base64
import io
from datetime import datetime, date

from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from PIL import Image
from pypdf import PdfReader, PdfWriter
from reportlab.pdfgen import canvas
from reportlab.lib.utils import ImageReader

from src.database import get_db
from src.models.user import User
from src.models.assignment import Assignment
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
    overwrite_file_in_storage,
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
    query = db.query(Assignment).filter(
        Assignment.assigned_to_id == current_user.id
    )

    if date_from:
        query = query.filter(
            Assignment.created_at
            >= datetime.combine(
                date_from,
                datetime.min.time(),
            )
        )

    if date_to:
        query = query.filter(
            Assignment.created_at
            <= datetime.combine(
                date_to,
                datetime.max.time(),
            )
        )

    query = query.order_by(
        Assignment.created_at.desc()
        if sort == "newest"
        else Assignment.created_at.asc()
    )

    assignments = query.all()

    results = []

    for assignment in assignments:
        doc_count = len(assignment.documents)
        signed_count = sum(
            1
            for d in assignment.documents
            if d.is_signed
        )

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


def _get_owned_assignment(
    assignment_id: str,
    current_user: User,
    db: Session,
) -> Assignment:
    """
    Fetches an assignment and checks it actually belongs
    to the current user.
    """
    assignment = (
        db.query(Assignment)
        .filter(Assignment.id == assignment_id)
        .first()
    )

    if not assignment:
        raise HTTPException(
            status_code=404,
            detail="Assignment not found.",
        )

    if assignment.assigned_to_id != current_user.id:
        raise HTTPException(
            status_code=403,
            detail="This assignment isn't yours.",
        )

    return assignment


def _get_viewable_assignment(
    assignment_id: str,
    current_user: User,
    db: Session,
) -> Assignment:
    """
    Fetches an assignment and allows access to the signer
    or the admin who assigned it.
    """
    assignment = (
        db.query(Assignment)
        .filter(Assignment.id == assignment_id)
        .first()
    )

    if not assignment:
        raise HTTPException(
            status_code=404,
            detail="Assignment not found.",
        )

    if (
        assignment.assigned_to_id != current_user.id
        and assignment.assigned_by_id != current_user.id
    ):
        raise HTTPException(
            status_code=403,
            detail="You don't have access to this assignment.",
        )

    return assignment


@router.get(
    "/{assignment_id}",
    response_model=AssignmentDetailResponse,
)
def get_assignment(
    assignment_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    assignment = _get_viewable_assignment(
        assignment_id,
        current_user,
        db,
    )

    return AssignmentDetailResponse(
        id=assignment.id,
        title=assignment.title,
        status=assignment.status,
        created_at=assignment.created_at,
        assigned_by_name=assignment.assigned_by.name,
        assigned_by_id=assignment.assigned_by_id,
        current_user_id=current_user.id,
        documents=assignment.documents,
    )


@router.get(
    "/{assignment_id}/documents/{document_id}/download",
    response_model=DocumentDownloadResponse,
)
def download_document(
    assignment_id: str,
    document_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    assignment = _get_viewable_assignment(
        assignment_id,
        current_user,
        db,
    )

    document = next(
        (
            d
            for d in assignment.documents
            if str(d.id) == document_id
        ),
        None,
    )

    if not document:
        raise HTTPException(
            status_code=404,
            detail="Document not found in this assignment.",
        )

    return DocumentDownloadResponse(
        download_url=get_download_url(
            document.storage_key
        )
    )


@router.get(
    "/{assignment_id}/documents/{document_id}/file"
)
def view_document_file(
    assignment_id: str,
    document_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    assignment = _get_viewable_assignment(
        assignment_id,
        current_user,
        db,
    )

    document = next(
        (
            d
            for d in assignment.documents
            if str(d.id) == document_id
        ),
        None,
    )

    if not document:
        raise HTTPException(
            status_code=404,
            detail="Document not found in this assignment.",
        )

    try:
        stored_file = get_file_from_storage(
            document.storage_key
        )
    except Exception:
        raise HTTPException(
            status_code=502,
            detail="Couldn't load this file from storage.",
        )

    headers = {
        "Content-Disposition": (
            f'inline; filename="{document.filename}"'
        ),
    }

    if stored_file.get("ContentLength") is not None:
        headers["Content-Length"] = str(
            stored_file["ContentLength"]
        )

    return StreamingResponse(
        stored_file["Body"],
        media_type=(
            stored_file.get("ContentType")
            or "application/pdf"
        ),
        headers=headers,
    )


@router.post(
    "/{assignment_id}/documents/{document_id}/sign",
    response_model=SignDocumentResponse,
)
def sign_document(
    assignment_id: str,
    document_id: str,
    payload: SignDocumentRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    assignment = _get_owned_assignment(
        assignment_id,
        current_user,
        db,
    )

    document = next(
        (
            d
            for d in assignment.documents
            if str(d.id) == document_id
        ),
        None,
    )

    if not document:
        raise HTTPException(
            status_code=404,
            detail="Document not found in this assignment.",
        )

    if not payload.signatures:
        raise HTTPException(
            status_code=400,
            detail="Please place your signature on at least one page.",
        )

    # ---------------------------------------------------------
    # Decode the signature image
    # ---------------------------------------------------------

    raw_data = payload.signature_data_url.split(",")[-1]

    try:
        image_bytes = base64.b64decode(raw_data)

        signature_image = Image.open(
            io.BytesIO(image_bytes)
        ).convert("RGBA")

    except Exception:
        raise HTTPException(
            status_code=400,
            detail="Signature data is invalid.",
        )

    # Store the original signature image.
    signature_key = upload_signature_to_storage(
        image_bytes
    )

    # ---------------------------------------------------------
    # Download the original PDF
    # ---------------------------------------------------------

    try:
        stored_file = get_file_from_storage(
            document.storage_key
        )

        original_pdf_bytes = stored_file["Body"].read()

    except Exception:
        raise HTTPException(
            status_code=502,
            detail="Couldn't load this document from storage.",
        )

    # ---------------------------------------------------------
    # Read PDF
    # ---------------------------------------------------------

    try:
        reader = PdfReader(
            io.BytesIO(original_pdf_bytes)
        )

        writer = PdfWriter()

        for page in reader.pages:
            writer.add_page(page)

    except Exception:
        raise HTTPException(
            status_code=500,
            detail="Couldn't process this PDF.",
        )

    # ---------------------------------------------------------
    # Add every signature
    # ---------------------------------------------------------

    for signature in payload.signatures:

        page_number = signature.page_number

        if page_number < 0 or page_number >= len(reader.pages):
            raise HTTPException(
                status_code=400,
                detail=f"Invalid page number: {page_number + 1}.",
            )

        page = writer.pages[page_number]

        # -----------------------------------------------------
        # Get the REAL PDF page dimensions
        # -----------------------------------------------------

        pdf_page_width = float(
            page.mediabox.width
        )

        pdf_page_height = float(
            page.mediabox.height
        )

        # -----------------------------------------------------
        # Validate frontend page dimensions
        # -----------------------------------------------------

        if (
            signature.page_width <= 0
            or signature.page_height <= 0
        ):
            raise HTTPException(
                status_code=400,
                detail="Invalid rendered page dimensions.",
            )

        # -----------------------------------------------------
        # Convert frontend coordinates to PDF coordinates
        #
        # Frontend:
        #   origin = top-left
        #
        # PDF:
        #   origin = bottom-left
        # -----------------------------------------------------

        scale_x = (
            pdf_page_width /
            signature.page_width
        )

        scale_y = (
            pdf_page_height /
            signature.page_height
        )

        pdf_x = signature.x * scale_x

        pdf_width = (
            signature.width * scale_x
        )

        pdf_height = (
            signature.height * scale_y
        )

        pdf_y = (
            pdf_page_height
            - (
                signature.y * scale_y
            )
            - pdf_height
        )

        # -----------------------------------------------------
        # Safety: keep signature inside PDF page
        # -----------------------------------------------------

        pdf_x = max(
            0,
            min(
                pdf_x,
                pdf_page_width - pdf_width,
            ),
        )

        pdf_y = max(
            0,
            min(
                pdf_y,
                pdf_page_height - pdf_height,
            ),
        )

        # -----------------------------------------------------
        # Create transparent PDF overlay
        # -----------------------------------------------------

        overlay_buffer = io.BytesIO()

        overlay = canvas.Canvas(
            overlay_buffer,
            pagesize=(
                pdf_page_width,
                pdf_page_height,
            ),
        )

        # ReportLab expects an ImageReader/image source here.
        # Passing BytesIO directly causes a TypeError on Render.
        signature_image_reader = ImageReader(
            signature_image
        )

        overlay.drawImage(
            signature_image_reader,
            pdf_x,
            pdf_y,
            width=pdf_width,
            height=pdf_height,
            preserveAspectRatio=True,
            mask="auto",
        )

        overlay.save()

        overlay_buffer.seek(0)

        signature_pdf = PdfReader(
            overlay_buffer
        )

        # -----------------------------------------------------
        # Merge signature onto the correct page
        # -----------------------------------------------------

        page.merge_page(
            signature_pdf.pages[0]
        )

    # ---------------------------------------------------------
    # Write completed PDF
    # ---------------------------------------------------------

    output_buffer = io.BytesIO()

    writer.write(output_buffer)

    signed_pdf_bytes = output_buffer.getvalue()

    # ---------------------------------------------------------
    # OVERWRITE ORIGINAL PDF
    # ---------------------------------------------------------

    try:
        overwrite_file_in_storage(
            document.storage_key,
            signed_pdf_bytes,
            "application/pdf",
        )

    except Exception:
        raise HTTPException(
            status_code=502,
            detail="Couldn't save the signed document to storage.",
        )

    # ---------------------------------------------------------
    # Update database
    # ---------------------------------------------------------

    document.signature_storage_key = signature_key
    document.is_signed = True
    document.signed_at = datetime.utcnow()

    db.commit()
    db.refresh(document)

    return SignDocumentResponse(
        detail="Document signed.",
        document=document,
    )


@router.post(
    "/{assignment_id}/confirm",
    response_model=ConfirmAssignmentResponse,
)
def confirm_assignment(
    assignment_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    assignment = _get_owned_assignment(
        assignment_id,
        current_user,
        db,
    )

    unsigned = [
        d
        for d in assignment.documents
        if not d.is_signed
    ]

    if unsigned:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                f"{len(unsigned)} document(s) still need "
                "to be signed before confirming."
            ),
        )

    assignment.status = "signed"
    db.commit()

    try:
        send_signing_complete_email(
            current_user.email,
            current_user.name,
            [
                d.filename
                for d in assignment.documents
            ],
        )
    except Exception as e:
        print(
            f"[signing confirmation email failed] "
            f"{type(e).__name__}: {e}"
        )

    return ConfirmAssignmentResponse(
        detail="All documents confirmed as signed."
    )