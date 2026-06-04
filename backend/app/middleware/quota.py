"""配额检查中间件"""
from fastapi import Depends

from app.exceptions import QuotaExceededError
from app.middleware.auth import get_current_user
from app.models import User, UserQuota
from app.database import get_db


def check_quota(resource: str):
    """配额检查依赖工厂（同步工厂，返回异步依赖函数）

    Usage:
        @router.post("/collect", dependencies=[Depends(check_quota("daily_collections"))])
        或者:
        async def endpoint(user: User = Depends(check_quota("daily_uploads"))):
    """
    async def _check(user: User = Depends(get_current_user), db=Depends(get_db)):
        quota: UserQuota | None = getattr(user, "quota", None)
        if quota is None:
            return user

        # 检查是否需要重置
        from datetime import datetime, timezone
        now = datetime.now(timezone.utc)
        if quota.quota_reset_at and (now - quota.quota_reset_at).days >= 1:
            quota.used_llm_tokens = 0
            quota.used_rewrites = 0
            quota.used_collections = 0
            quota.used_uploads = 0
            quota.quota_reset_at = now
            await db.commit()

        # 检查对应资源
        resource_map = {
            "daily_collections": (quota.used_collections, quota.daily_collections, "采集"),
            "daily_rewrites": (quota.used_rewrites, quota.daily_rewrites, "改写"),
            "daily_uploads": (quota.used_uploads, quota.daily_uploads, "上传"),
        }

        if resource in resource_map:
            used, limit, name = resource_map[resource]
            if used >= limit:
                raise QuotaExceededError(name)

        return user

    return _check
