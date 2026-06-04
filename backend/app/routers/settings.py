"""设置路由"""
from fastapi import APIRouter, Depends

from app.models import User
from app.middleware.auth import get_current_user
from app.schemas.settings import UserSettingsResponse, UserSettingsUpdateRequest
from app.schemas.common import ResponseBase
from app.services.settings_service import SettingsService

router = APIRouter()


@router.get("/", response_model=ResponseBase[UserSettingsResponse])
async def get_settings(user: User = Depends(get_current_user)):
    """获取用户设置"""
    settings = await SettingsService.get_settings(user.id)
    return ResponseBase(data=UserSettingsResponse(**settings))


@router.put("/", response_model=ResponseBase[UserSettingsResponse])
async def update_settings(
    req: UserSettingsUpdateRequest,
    user: User = Depends(get_current_user),
):
    """更新用户设置"""
    updates = req.model_dump(exclude_none=True)
    settings = await SettingsService.update_settings(user.id, updates)
    return ResponseBase(data=UserSettingsResponse(**settings))
