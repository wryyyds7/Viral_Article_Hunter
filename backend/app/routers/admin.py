"""管理后台路由"""
import uuid
from fastapi import APIRouter, Depends, Query, Request

from app.models import User
from app.middleware.auth import admin_only
from app.schemas.admin import (
    AdminUserListParams, AdminUserResponse, AdminUserUpdateRequest,
    AdminQuotaUpdateRequest, ApiKeyCreateRequest, ApiKeyResponse,
    SystemConfigUpdateRequest, SystemConfigResponse,
    AuditLogListParams, AuditLogResponse, SystemMonitorResponse,
)
from app.schemas.common import ResponseBase, PageResult
from app.services.admin_service import AdminService
from app.utils.pagination import make_page_result

router = APIRouter()


# ── 用户管理 ──

@router.get("/users", response_model=ResponseBase[PageResult[AdminUserResponse]])
async def list_users(
    keyword: str | None = Query(None),
    role: str | None = Query(None),
    status: str | None = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    admin: User = Depends(admin_only),
):
    """查询用户列表"""
    items, total = await AdminService.list_users(keyword, role, status, page, page_size)
    return ResponseBase(data=make_page_result(
        [AdminUserResponse.model_validate(i) for i in items],
        total, page, page_size,
    ))


@router.put("/users/{user_id}", response_model=ResponseBase[AdminUserResponse])
async def update_user(
    user_id: uuid.UUID,
    req: AdminUserUpdateRequest,
    admin: User = Depends(admin_only),
):
    """更新用户信息（角色/状态）"""
    user = await AdminService.update_user(admin.id, user_id, req.role, req.status)
    if not user:
        return ResponseBase(code=40400, message="用户不存在")
    return ResponseBase(data=AdminUserResponse.model_validate(user))


@router.put("/users/{user_id}/quota", response_model=ResponseBase[dict])
async def update_quota(
    user_id: uuid.UUID,
    req: AdminQuotaUpdateRequest,
    admin: User = Depends(admin_only),
):
    """调整用户配额"""
    updates = req.model_dump(exclude_none=True)
    quota = await AdminService.update_quota(admin.id, user_id, updates)
    if not quota:
        return ResponseBase(code=40400, message="用户配额不存在")
    return ResponseBase(data={"message": "配额已更新"})


# ── API Key 管理 ──

@router.get("/api-keys", response_model=ResponseBase[list[ApiKeyResponse]])
async def list_api_keys(admin: User = Depends(admin_only)):
    """查询 API Key 列表"""
    keys = await AdminService.list_api_keys()
    return ResponseBase(data=[ApiKeyResponse.model_validate(k) for k in keys])


@router.post("/api-keys", response_model=ResponseBase[ApiKeyResponse])
async def create_api_key(
    req: ApiKeyCreateRequest,
    admin: User = Depends(admin_only),
):
    """添加 API Key"""
    api_key = await AdminService.create_api_key(admin.id, req.service, req.key_value)
    return ResponseBase(data=ApiKeyResponse.model_validate(api_key))


@router.put("/api-keys/{key_id}/toggle", response_model=ResponseBase[ApiKeyResponse])
async def toggle_api_key(
    key_id: uuid.UUID,
    is_active: bool = Query(...),
    admin: User = Depends(admin_only),
):
    """启用/禁用 API Key"""
    api_key = await AdminService.toggle_api_key(admin.id, key_id, is_active)
    if not api_key:
        return ResponseBase(code=40400, message="API Key 不存在")
    return ResponseBase(data=ApiKeyResponse.model_validate(api_key))


# ── 系统配置 ──

@router.get("/configs", response_model=ResponseBase[list[SystemConfigResponse]])
async def list_configs(
    group: str | None = Query(None),
    admin: User = Depends(admin_only),
):
    """查询系统配置"""
    configs = await AdminService.list_configs(group)
    return ResponseBase(data=[SystemConfigResponse.model_validate(c) for c in configs])


@router.put("/configs/{key}", response_model=ResponseBase[SystemConfigResponse])
async def update_config(
    key: str,
    req: SystemConfigUpdateRequest,
    admin: User = Depends(admin_only),
):
    """更新系统配置"""
    config = await AdminService.update_config(admin.id, key, req.value)
    if not config:
        return ResponseBase(code=40400, message="配置项不存在")
    return ResponseBase(data=SystemConfigResponse.model_validate(config))


# ── 审计日志 ──

@router.get("/audit-logs", response_model=ResponseBase[PageResult[AuditLogResponse]])
async def list_audit_logs(
    action: str | None = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    admin: User = Depends(admin_only),
):
    """查询审计日志"""
    items, total = await AdminService.list_audit_logs(action=action, page=page, page_size=page_size)
    return ResponseBase(data=make_page_result(
        [AuditLogResponse.model_validate(i) for i in items],
        total, page, page_size,
    ))


# ── 系统监控 ──

@router.get("/monitor", response_model=ResponseBase[SystemMonitorResponse])
async def get_system_stats(admin: User = Depends(admin_only)):
    """系统监控数据"""
    stats = await AdminService.get_system_stats()
    return ResponseBase(data=SystemMonitorResponse(**stats))
