"""设置相关 Schema"""
from pydantic import BaseModel, Field


class UserSettingsResponse(BaseModel):
    default_platforms: list[str] = []
    default_style: dict = {}
    notification_enabled: bool = True
    auto_analyze: bool = True
    upload_threshold: int = 10


class UserSettingsUpdateRequest(BaseModel):
    default_platforms: list[str] | None = None
    default_style: dict | None = None
    notification_enabled: bool | None = None
    auto_analyze: bool | None = None
    upload_threshold: int | None = Field(None, ge=1, le=100)
