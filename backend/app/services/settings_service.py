"""设置服务"""
import uuid
import json
import logging
from pathlib import Path

from app.database import async_session
from app.models import User

logger = logging.getLogger(__name__)

# 用户设置存储在 system_config 或单独文件
SETTINGS_DIR = Path(__file__).parent.parent.parent / "data" / "user_settings"


class SettingsService:

    @staticmethod
    async def get_settings(user_id: uuid.UUID) -> dict:
        """获取用户设置"""
        settings_file = SETTINGS_DIR / f"{user_id}.json"
        if settings_file.exists():
            return json.loads(settings_file.read_text(encoding="utf-8"))
        # 默认设置
        return {
            "default_platforms": ["xiaohongshu", "zhihu"],
            "default_style": {},
            "notification_enabled": True,
            "auto_analyze": True,
            "upload_threshold": 10,
        }

    @staticmethod
    async def update_settings(user_id: uuid.UUID, updates: dict) -> dict:
        """更新用户设置"""
        SETTINGS_DIR.mkdir(parents=True, exist_ok=True)
        settings_file = SETTINGS_DIR / f"{user_id}.json"

        # 读取现有设置
        current = await SettingsService.get_settings(user_id)

        # 合并更新
        for key, value in updates.items():
            if value is not None:
                current[key] = value

        # 写入
        settings_file.write_text(json.dumps(current, ensure_ascii=False, indent=2), encoding="utf-8")
        return current
