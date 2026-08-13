from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict


class AssignmentListItem(BaseModel):
    id: UUID
    title: str
    status: str
    created_at: datetime
    assigned_by_name: str
    document_count: int
    signed_count: int

    model_config = ConfigDict(from_attributes=True)


class AssignmentListResponse(BaseModel):
    items: list[AssignmentListItem]
    page: int
    page_size: int
    total: int
    total_pages: int


# ---------------------------------------------------------
# User schemas
# ---------------------------------------------------------


class UserSummary(BaseModel):
    id: UUID
    name: str
    email: str

    model_config = ConfigDict(from_attributes=True)


# ---------------------------------------------------------
# Document schemas
# ---------------------------------------------------------


class DocumentResponse(BaseModel):
    id: UUID
    assignment_id: UUID
    filename: str
    storage_key: str
    is_signed: bool
    signed_at: datetime | None
    signature_storage_key: str | None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class UploadDocumentsResponse(BaseModel):
    detail: str


class DocumentDownloadResponse(BaseModel):
    download_url: str


# ---------------------------------------------------------
# Assignment detail
# ---------------------------------------------------------


class AssignmentDetailResponse(BaseModel):
    id: UUID
    title: str
    status: str
    created_at: datetime
    assigned_by_name: str
    assigned_by_id: UUID
    current_user_id: UUID
    documents: list[DocumentResponse]

    model_config = ConfigDict(from_attributes=True)


# ---------------------------------------------------------
# Signing
# ---------------------------------------------------------


class SignDocumentResponse(BaseModel):
    detail: str
    document: DocumentResponse


class ConfirmAssignmentResponse(BaseModel):
    detail: str