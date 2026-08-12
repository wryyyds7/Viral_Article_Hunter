"""认证相关 Schema"""
import uuid
from datetime import datetime
from pydantic import BaseModel, EmailStr, Field


class RegisterRequest(BaseModel):
    username: str = Field(..., min_length=3, max_length=50, pattern=r"^[a-zA-Z0-9_]+$")
    email: EmailStr
    password: str = Field(..., min_length=6, max_length=128)


class LoginRequest(BaseModel):
    """登录请求 - username 字段同时支持用户名和邮箱"""
    username: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int
    user: "UserBrief"


class UserBrief(BaseModel):
    id: uuid.UUID
    username: str
    email: str
    role: str
    status: str

    model_config = {"from_attributes": True}


class ChangePasswordRequest(BaseModel):
    old_password: str
    new_password: str = Field(..., min_length=6, max_length=128)


class UserProfileResponse(BaseModel):
    id: uuid.UUID
    username: str
    email: str
    role: str
    status: str
    created_at: datetime

    model_config = {"from_attributes": True}
