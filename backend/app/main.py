"""FastAPI 应用入口"""
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.config import settings
from app.database import engine, Base
from app.exceptions import AppException
from app.routers import (
    auth_router,
    collection_router,
    analysis_router,
    rewrite_router,
    upload_router,
    library_router,
    dashboard_router,
    settings_router,
    admin_router,
)

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """应用生命周期管理"""
    # ── Startup ──
    logger.info("爆文猎人启动中...")
    # 创建数据库表（开发环境，生产用 Alembic）
    try:
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
        logger.info("数据库表同步完成")
    except Exception as e:
        logger.warning("数据库连接失败，跳过表同步: %s", e)

    # 注册事件处理器
    _register_event_handlers()

    logger.info("爆文猎人启动完成，端口 %s", "5000")
    yield

    # ── Shutdown ──
    logger.info("爆文猎人关闭中...")
    await engine.dispose()
    logger.info("数据库连接池已关闭")


def _register_event_handlers():
    """注册 EventBus 事件处理器"""
    from app.event_bus import EventBus, Events
    from app.services.analysis_service import AnalysisService

    async def on_collect_completed(data: dict):
        """采集完成 → 自动触发分析"""
        service = AnalysisService()
        await service.auto_analyze(
            article_ids=data.get("article_ids", []),
            user_id=data.get("user_id"),
        )

    async def on_collect_partial(data: dict):
        """采集部分完成 → 对已有数据自动分析"""
        service = AnalysisService()
        await service.auto_analyze(
            article_ids=data.get("article_ids", []),
            user_id=data.get("user_id"),
        )

    async def on_upload_parsed(data: dict):
        """上传解析完成 → 数量≥阈值自动分析"""
        service = AnalysisService()
        await service.auto_analyze(
            article_ids=data.get("article_ids", []),
            user_id=data.get("user_id"),
        )

    EventBus.on(Events.COLLECT_COMPLETED, on_collect_completed)
    EventBus.on(Events.COLLECT_PARTIAL, on_collect_partial)
    EventBus.on(Events.UPLOAD_PARSED, on_upload_parsed)


# ── 创建应用 ──
app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

# ── CORS ──
cors_origins = [o.strip() for o in settings.CORS_ORIGINS.split(",")]
app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── 全局异常处理 ──
@app.exception_handler(AppException)
async def app_exception_handler(request: Request, exc: AppException):
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "code": exc.error_code,
            "message": exc.detail,
            "data": None,
        },
    )


# ── 注册路由 ──
app.include_router(auth_router, prefix="/v1/auth", tags=["认证"])
app.include_router(collection_router, prefix="/v1/collect", tags=["采集"])
app.include_router(analysis_router, prefix="/v1/analysis", tags=["分析"])
app.include_router(rewrite_router, prefix="/v1/rewrite", tags=["改写"])
app.include_router(upload_router, prefix="/v1/upload", tags=["上传"])
app.include_router(library_router, prefix="/v1/library", tags=["素材库"])
app.include_router(dashboard_router, prefix="/v1/dashboard", tags=["看板"])
app.include_router(settings_router, prefix="/v1/settings", tags=["设置"])
app.include_router(admin_router, prefix="/v1/admin", tags=["管理后台"])


# ── 健康检查 ──
@app.get("/health", tags=["系统"])
async def health_check():
    return {"status": "ok", "version": settings.APP_VERSION}


@app.get("/", tags=["系统"])
async def root():
    return {"app": settings.APP_NAME, "version": settings.APP_VERSION, "docs": "/docs"}
