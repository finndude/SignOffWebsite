from datetime import datetime
from uuid import UUID

from pydantic import (
    BaseModel,
    ConfigDict,
    EmailStr,
    Field,
    field_validator,
)


class InviteUserRequest(BaseModel):
    name: str = Field(
        ...,
        min_length=1,
        max_length=120,
    )

    email: EmailStr

    role: str = "assignee"

    @field_validator("role")
    @classmethod
    def validate_role(cls, value: str) -> str:
        if value not in {
            "admin",
            "assignee",
        }:
            raise ValueError(
                "Role must be either 'admin' or 'assignee'."
            )

        return value


class InviteUserResponse(BaseModel):
    detail: str


class AdminAssignmentListItem(BaseModel):
    id: UUID
    title: str | None
    status: str
    created_at: datetime

    assigned_to_id: UUID
    assigned_to_name: str
    assigned_to_email: str

    document_count: int
    signed_count: int


class UpdateAssignmentAssigneeRequest(BaseModel):
    assigned_to_id: UUID


class AdminUserResponse(BaseModel):
    """
    User information shown on the admin user-management screen.
    Password/hash information is deliberately excluded.
    """

    model_config = ConfigDict(
        from_attributes=True
    )

    id: UUID
    name: str
    email: EmailStr
    role: str
    is_pending_activation: bool
    created_at: datetime


class UpdateUserRoleRequest(BaseModel):
    role: str

    @field_validator("role")
    @classmethod
    def validate_role(cls, value: str) -> str:
        if value not in {
            "admin",
            "assignee",
        }:
            raise ValueError(
                "Role must be either 'admin' or 'assignee'."
            )

        return value