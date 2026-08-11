from pydantic import BaseModel, EmailStr


class InviteUserRequest(BaseModel):
    name: str
    email: EmailStr


class InviteUserResponse(BaseModel):
    detail: str