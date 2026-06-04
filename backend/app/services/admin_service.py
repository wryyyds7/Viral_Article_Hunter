"""管理后台服务"""
import uuid
import logging
from datetime import datetime, timezone

from sqlalchemy import select, func, update, text

from app.database import async_session
from app.models import User, UserQuota, AdminAuditLog, ApiKey, SystemConfig, Article, AnalysisResult, RewriteTask
from app.utils.crypto import encrypt, decrypt, mask_key
from app.utils.pagination import paginate, PageParams

logger = logging.getLogger(__name__)


class AdminService:

    # ── 用户管理 ──

    @staticmethod
    async def list_users(keyword: str | None = None, role: str | None = None, status: str | None = None, page: int = 1, page_size: int = 20) -> tuple[list, int]:
        async with async_session() as db:
            query = select(User).order_by(User.created_at.desc())
            if keyword:
                query = query.where((User.username.ilike(f"%{keyword}%")) | (User.email.ilike(f"%{keyword}%")))
            if role:
                query = query.where(User.role == role)
            if status:
                query = query.where(User.status == status)
            return await paginate(query, PageParams(page=page, page_size=page_size), db)

    @staticmethod
    async def update_user(admin_id: uuid.UUID, user_id: uuid.UUID, role: str | None = None, status: str | None = None) -> User | None:
        async with async_session() as db:
            result = await db.execute(select(User).where(User.id == user_id))
            user = result.scalar_one_or_none()
            if not user:
                return None

            changes = {}
            if role:
                changes["role"] = {"from": user.role, "to": role}
                user.role = role
            if status:
                changes["status"] = {"from": user.status, "to": status}
                user.status = status

            await db.commit()
            await db.refresh(user)

            # 审计日志
            await AdminService._log_action(admin_id, "update_user", "user", str(user_id), changes)
            return user

    @staticmethod
    async def update_quota(admin_id: uuid.UUID, user_id: uuid.UUID, updates: dict) -> UserQuota | None:
        async with async_session() as db:
            result = await db.execute(select(UserQuota).where(UserQuota.user_id == user_id))
            quota = result.scalar_one_or_none()
            if not quota:
                return None

            changes = {}
            for field_name, value in updates.items():
                if value is not None and hasattr(quota, field_name):
                    old_val = getattr(quota, field_name)
                    setattr(quota, field_name, value)
                    changes[field_name] = {"from": old_val, "to": value}

            await db.commit()

            await AdminService._log_action(admin_id, "adjust_quota", "user", str(user_id), changes)
            return quota

    # ── API Key 管理 ──

    @staticmethod
    async def list_api_keys() -> list[ApiKey]:
        async with async_session() as db:
            result = await db.execute(select(ApiKey).order_by(ApiKey.service))
            return list(result.scalars().all())

    @staticmethod
    async def create_api_key(admin_id: uuid.UUID, service: str, key_value: str) -> ApiKey:
        async with async_session() as db:
            encrypted = encrypt(key_value)
            hint = mask_key(key_value)

            api_key = ApiKey(
                service=service,
                encrypted_key=encrypted,
                key_hint=hint,
            )
            db.add(api_key)
            await db.commit()
            await db.refresh(api_key)

            await AdminService._log_action(admin_id, "create_api_key", "api_key", str(api_key.id), {"service": service})
            return api_key

    @staticmethod
    async def toggle_api_key(admin_id: uuid.UUID, key_id: uuid.UUID, is_active: bool) -> ApiKey | None:
        async with async_session() as db:
            result = await db.execute(select(ApiKey).where(ApiKey.id == key_id))
            api_key = result.scalar_one_or_none()
            if not api_key:
                return None
            api_key.is_active = is_active
            await db.commit()

            await AdminService._log_action(admin_id, "toggle_api_key", "api_key", str(key_id), {"is_active": is_active})
            return api_key

    # ── 系统配置 ──

    @staticmethod
    async def list_configs(group: str | None = None) -> list[SystemConfig]:
        async with async_session() as db:
            query = select(SystemConfig).order_by(SystemConfig.group_name, SystemConfig.key)
            if group:
                query = query.where(SystemConfig.group_name == group)
            result = await db.execute(query)
            return list(result.scalars().all())

    @staticmethod
    async def update_config(admin_id: uuid.UUID, key: str, value: dict) -> SystemConfig | None:
        async with async_session() as db:
            result = await db.execute(select(SystemConfig).where(SystemConfig.key == key))
            config = result.scalar_one_or_none()
            if not config:
                return None
            old_value = config.value
            config.value = value
            await db.commit()

            await AdminService._log_action(admin_id, "update_config", "system_config", key, {"from": old_value, "to": value})
            return config

    # ── 审计日志 ──

    @staticmethod
    async def list_audit_logs(admin_id: uuid.UUID | None = None, action: str | None = None, page: int = 1, page_size: int = 20) -> tuple[list, int]:
        async with async_session() as db:
            query = select(AdminAuditLog).order_by(AdminAuditLog.created_at.desc())
            if admin_id:
                query = query.where(AdminAuditLog.admin_id == admin_id)
            if action:
                query = query.where(AdminAuditLog.action == action)
            return await paginate(query, PageParams(page=page, page_size=page_size), db)

    # ── 系统监控 ──

    @staticmethod
    async def get_system_stats() -> dict:
        async with async_session() as db:
            total_users = await db.scalar(select(func.count()).select_from(User)) or 0
            active_24h = await db.scalar(
                select(func.count()).select_from(User).where(
                    User.updated_at >= datetime.now(timezone.utc) - __import__("datetime").timedelta(hours=24)
                )
            ) or 0
            total_articles = await db.scalar(select(func.count()).select_from(Article)) or 0
            total_analyses = await db.scalar(select(func.count()).select_from(AnalysisResult)) or 0
            total_rewrites = await db.scalar(select(func.count()).select_from(RewriteTask)) or 0

        return {
            "total_users": total_users,
            "active_users_24h": active_24h,
            "total_articles": total_articles,
            "total_analyses": total_analyses,
            "total_rewrites": total_rewrites,
            "db_size_mb": None,
            "llm_tokens_used_today": 0,
        }

    # ── 内部方法 ──

    @staticmethod
    async def _log_action(admin_id: uuid.UUID, action: str, target_type: str, target_id: str, detail: dict | None = None):
        """记录审计日志"""
        async with async_session() as db:
            log = AdminAuditLog(
                admin_id=admin_id,
                action=action,
                target_type=target_type,
                target_id=target_id,
                detail=detail,
            )
            db.add(log)
            await db.commit()
