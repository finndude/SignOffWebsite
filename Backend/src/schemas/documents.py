from datetime import datetime
from uuid import UUID

from pydantic import BaseModel


class AssignmentListItem(BaseModel):
    id: UUID
    title: str
    status: str
    created_at: datetime
    assigned_by_name: str
    document_count: int
    signed_count: int

    class Config:
        from_attributes = True


class AssignmentListResponse(BaseModel):
    items: list[AssignmentListItem]
    page: int
    page_size: int
    total: int
    total_pages: int


# ---------------------------------------------------------
# Keep the rest of your existing documents schemas below.
# ---------------------------------------------------------


class UserSummary(BaseModel):
    id: UUID
    name: str
    email: str

    class Config:
        from_attributes = True


class UploadDocumentsResponse(BaseModel):
    detail: str


class DocumentDownloadResponse(BaseModel):
    download_url: str


class AssignmentDetailResponse(BaseModel):
    id: UUID
    title: str
    status: str
    created_at: datetime
    assigned_by_name: str
    assigned_by_id: UUID
    current_user_id: UUID
    documents: list

    class Config:
        from_attributes = True


class SignDocumentResponse(BaseModel):
    detail: str
    document: object


class ConfirmAssignmentResponse(BaseModel):
    detail: str