from pydantic import BaseModel
from uuid import UUID
from datetime import datetime
from typing import Optional


class UserSummary(BaseModel):
    """Minimal user info for the assignee picker — name + email to uniquely identify."""
    id: UUID
    name: str
    email: str

    class Config:
        from_attributes = True


class UploadDocumentsResponse(BaseModel):
    detail: str


class AssignmentListItem(BaseModel):
    """One row in the assignee's document list."""
    id: UUID
    title: Optional[str] = None
    status: str
    created_at: datetime
    assigned_by_name: str
    document_count: int
    signed_count: int

    class Config:
        from_attributes = True


class DocumentInAssignment(BaseModel):
    id: UUID
    filename: str
    is_signed: bool
    signed_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class AssignmentDetailResponse(BaseModel):
    id: UUID
    title: Optional[str] = None
    status: str
    created_at: datetime
    assigned_by_name: str
    documents: list[DocumentInAssignment]

    class Config:
        from_attributes = True


class DocumentDownloadResponse(BaseModel):
    download_url: str


class SignDocumentResponse(BaseModel):
    detail: str
    document: DocumentInAssignment


class ConfirmAssignmentResponse(BaseModel):
    detail: str
