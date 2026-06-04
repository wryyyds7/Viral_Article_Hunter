"""定时任务调度（APScheduler）"""
import logging
from datetime import datetime

from apscheduler.schedulers.asyncio import AsyncIOScheduler

from app.config import settings

logger = logging.getLogger(__name__)

scheduler = AsyncIOScheduler()


def setup_cron_jobs():
    """注册定时任务"""

    # 1. 配额每日重置（每天 00:00）
    scheduler.add_job(
        _reset_daily_quotas,
        "cron",
        hour=0,
        minute=0,
        id="reset_quotas",
        replace_existing=True,
    )

    # 2. API Key 过期检测（每天 09:00）
    scheduler.add_job(
        _check_api_key_expiry,
        "cron",
        hour=9,
        minute=0,
        id="check_api_keys",
        replace_existing=True,
    )

    # 3. 系统健康检查（每30分钟）
    scheduler.add_job(
        _health_check,
        "interval",
        minutes=30,
        id="health_check",
        replace_existing=True,
    )

    logger.info("定时任务注册完成")


async def _reset_daily_quotas():
    """重置所有用户每日配额"""
    from app.database import async_session
    from sqlalchemy import text

    async with async_session() as db:
        await db.execute(text("""
            UPDATE user_quota 
            SET used_llm_tokens = 0,
                used_rewrites = 0,
                used_collections = 0,
                used_uploads = 0,
                quota_reset_at = NOW()
        """))
        await db.commit()
    logger.info("每日配额重置完成")


async def _check_api_key_expiry():
    """检测即将过期的 API Key"""
    from app.database import async_session
    from app.models import ApiKey
    from sqlalchemy import select
    from datetime import timedelta

    async with async_session() as db:
        soon = datetime.utcnow() + timedelta(days=7)
        result = await db.execute(
            select(ApiKey).where(ApiKey.expires_at <= soon, ApiKey.is_active == True)
        )
        expiring_keys = result.scalars().all()

        for key in expiring_keys:
            from app.event_bus import EventBus, Events
            await EventBus.emit(Events.API_KEY_EXPIRING, {
                "service": key.service,
                "expires_at": str(key.expires_at),
            })

    logger.info("API Key 过期检测完成，%d 个即将过期", len(expiring_keys))


async def _health_check():
    """系统健康检查"""
    try:
        from app.database import engine
        async with engine.connect() as conn:
            await conn.execute(text("SELECT 1"))
        logger.debug("健康检查: 数据库正常")
    except Exception as e:
        logger.error("健康检查: 数据库异常 - %s", e)
