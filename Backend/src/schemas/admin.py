from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, EmailStr


class InviteUserRequest(BaseModel):
    name: str
    email: EmailStr
    role: Literal["admin", "assignee"] = "assignee"


class InviteUserResponse(BaseModel):
    detail: str


class AdminAssignmentListItem(BaseModel):
    id: UUID
    title: str
    status: str
    created_at: datetime
    assigned_to_name: str
    assigned_to_email: EmailStr
    document_count: int
    signed_count: int
