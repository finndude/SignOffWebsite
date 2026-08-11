from pydantic import BaseModel, EmailStr
from uuid import UUID


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class UserResponse(BaseModel):
    id: UUID
    name: str
    email: str
    role: str

    class Config:
        from_attributes = True


class ActivateAccountRequest(BaseModel):
    token: str
    password: str


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    token: str
    password: str
