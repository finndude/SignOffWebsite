from datetime import datetime
from uuid import UUID

from pydantic import BaseModel


class AdminAssignmentListItem(BaseModel):
    id: UUID
    title: str
    status: str
    created_at: datetime
    assigned_to_id: UUID
    assigned_to_name: str
    assigned_to_email: str
    document_count: int
    signed_count: int

    class Config:
        from_attributes = True


class AdminAssignmentListResponse(BaseModel):
    items: list[AdminAssignmentListItem]
    page: int
    page_size: int
    total: int
    total_pages: int


class AdminUserResponse(BaseModel):
    id: UUID
    name: str
    email: str
    role: str
    is_pending_activation: bool
    created_at: datetime

    class Config:
        from_attributes = True


class AdminUserListResponse(BaseModel):
    items: list[AdminUserResponse]
    page: int
    page_size: int
    total: int
    total_pages: int


# ---------------------------------------------------------
# Keep your existing request schemas below.
# ---------------------------------------------------------


class InviteUserRequest(BaseModel):
    name: str
    email: str
    role: str


class InviteUserResponse(BaseModel):
    detail: str


class UpdateUserRoleRequest(BaseModel):
    role: str


class UpdateAssignmentAssigneeRequest(BaseModel):
    assigned_to_id: UUID


class UpdateAssignmentTitleRequest(BaseModel):
    title: str