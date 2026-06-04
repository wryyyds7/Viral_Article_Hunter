"""认证路由"""
from fastapi import APIRouter, Depends

from app.models import User
from app.middleware.auth import get_current_user
from app.schemas.auth import (
    RegisterRequest, LoginRequest, TokenResponse,
    ChangePasswordRequest, UserProfileResponse, UserBrief,
)
from app.schemas.common import ResponseBase
from app.services.auth_service import AuthService

router = APIRouter()


@router.post("/register", response_model=ResponseBase[TokenResponse])
async def register(req: RegisterRequest):
    """用户注册"""
    user = await AuthService.register(req.username, req.email, req.password)
    token = AuthService.create_token(user.id, user.role)
    return ResponseBase(data=TokenResponse(
        access_token=token,
        expires_in=3600 * 24,
        user=UserBrief.model_validate(user),
    ))


@router.post("/login", response_model=ResponseBase[TokenResponse])
async def login(req: LoginRequest):
    """用户登录"""
    user, token = await AuthService.login(req.username, req.password)
    return ResponseBase(data=TokenResponse(
        access_token=token,
        expires_in=3600 * 24,
        user=UserBrief.model_validate(user),
    ))


@router.get("/me", response_model=ResponseBase[UserProfileResponse])
async def get_profile(user: User = Depends(get_current_user)):
    """获取当前用户信息"""
    return ResponseBase(data=UserProfileResponse.model_validate(user))


@router.put("/password", response_model=ResponseBase[bool])
async def change_password(
    req: ChangePasswordRequest,
    user: User = Depends(get_current_user),
):
    """修改密码"""
    await AuthService.change_password(user.id, req.old_password, req.new_password)
    return ResponseBase(data=True)
