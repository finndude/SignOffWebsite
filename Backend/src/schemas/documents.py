from pydantic import BaseModel
from uuid import UUID
from datetime import datetime


class UserSummary(BaseModel):
    """Minimal user info for the assignee picker — name + email to uniquely identify."""
    id: UUID
    name: str
    email: str

    class Config:
        from_attributes = True


class DocumentResponse(BaseModel):
    id: UUID
    filename: str
    status: str
    assigned_to_id: UUID
    created_at: datetime

    class Config:
        from_attributes = True


class UploadDocumentsResponse(BaseModel):
    detail: str
    documents: list[DocumentResponse]