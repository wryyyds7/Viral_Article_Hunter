"""Worker 入口 - 从任务队列消费并执行"""
import logging
import asyncio

from app.scheduler.task_queue import task_queue, TaskType
from app.services.collection_service import CollectionService
from app.services.analysis_service import AnalysisService
from app.services.rewrite_service import RewriteService
from app.services.upload_service import UploadService

logger = logging.getLogger(__name__)


async def start_workers():
    """注册所有任务处理器并启动 worker"""
    # 注册处理器
    task_queue.register_handler(TaskType.COLLECT, _handle_collect)
    task_queue.register_handler(TaskType.ANALYZE, _handle_analyze)
    task_queue.register_handler(TaskType.REWRITE, _handle_rewrite)
    task_queue.register_handler(TaskType.PARSE, _handle_parse)

    # 启动
    await task_queue.start()
    logger.info("Workers 已启动")


async def stop_workers():
    """停止所有 worker"""
    await task_queue.stop()


async def _handle_collect(payload: dict):
    """处理采集任务"""
    service = CollectionService()
    await service.execute_collection(
        task_id=payload["task_id"],
        keyword=payload["keyword"],
        platforms=payload["platforms"],
        max_results=payload["max_results"],
        user_id=payload["user_id"],
    )


async def _handle_analyze(payload: dict):
    """处理分析任务"""
    service = AnalysisService()
    await service.execute_analysis(
        article_id=payload["article_id"],
        user_id=payload["user_id"],
    )


async def _handle_rewrite(payload: dict):
    """处理改写任务"""
    service = RewriteService()
    await service.execute_rewrite(
        task_id=payload["task_id"],
        article_id=payload["article_id"],
        target_platforms=payload["target_platforms"],
        style_overrides=payload.get("style_overrides"),
        user_id=payload["user_id"],
    )


async def _handle_parse(payload: dict):
    """处理文件解析任务"""
    service = UploadService()
    await service.parse_file(
        file_id=payload["file_id"],
        file_content=payload.get("file_content"),
    )
