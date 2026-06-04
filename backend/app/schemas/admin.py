"""管理后台相关 Schema"""
import uuid
from datetime import datetime
from pydantic import BaseModel, EmailStr, Field

from app.schemas.common import PageParams


# ── 用户管理 ──
class AdminUserListParams(PageParams):
    keyword: str | None = None
    role: str | None = None
    status: str | None = None


class AdminUserResponse(BaseModel):
    id: uuid.UUID
    username: str
    email: str
    role: str
    status: str
    created_at: datetime

    model_config = {"from_attributes": True}


class AdminUserUpdateRequest(BaseModel):
    role: str | None = Field(None, pattern=r"^(admin|user)$")
    status: str | None = Field(None, pattern=r"^(active|banned|suspended)$")


class AdminQuotaUpdateRequest(BaseModel):
    daily_llm_tokens: int | None = Field(None, ge=0)
    daily_rewrites: int | None = Field(None, ge=0)
    daily_collections: int | None = Field(None, ge=0)
    daily_uploads: int | None = Field(None, ge=0)


# ── API Key 管理 ──
class ApiKeyCreateRequest(BaseModel):
    service: str = Field(..., pattern=r"^(redfox|openai|deepseek|bilibili|other)$")
    key_value: str


class ApiKeyResponse(BaseModel):
    id: uuid.UUID
    service: str
    key_hint: str | None = None
    is_active: bool
    expires_at: datetime | None = None

    model_config = {"from_attributes": True}


# ── 系统配置 ──
class SystemConfigUpdateRequest(BaseModel):
    value: dict


class SystemConfigResponse(BaseModel):
    key: str
    value: dict
    description: str | None = None
    group_name: str | None = None

    model_config = {"from_attributes": True}


# ── 审计日志 ──
class AuditLogListParams(PageParams):
    admin_id: uuid.UUID | None = None
    action: str | None = None
    target_type: str | None = None


class AuditLogResponse(BaseModel):
    id: uuid.UUID
    admin_id: uuid.UUID
    action: str
    target_type: str | None = None
    target_id: str | None = None
    detail: dict | None = None
    ip_address: str | None = None
    created_at: datetime

    model_config = {"from_attributes": True}


# ── 系统监控 ──
class SystemMonitorResponse(BaseModel):
    total_users: int
    active_users_24h: int
    total_articles: int
    total_analyses: int
    total_rewrites: int
    db_size_mb: float | None = None
    llm_tokens_used_today: int = 0
