"""进程内事件总线 - 解耦模块间依赖"""
import asyncio
import logging
from typing import Callable, Dict, List, Any

logger = logging.getLogger(__name__)


# ── 事件常量 ──
class Events:
    """系统事件名常量"""
    COLLECT_COMPLETED = "collect.completed"
    COLLECT_PARTIAL = "collect.partial"
    COLLECT_FAILED = "collect.failed"
    UPLOAD_PARSED = "upload.parsed"
    UPLOAD_PARSED_BELOW_THRESHOLD = "upload.parsed_below_threshold"
    ANALYZE_COMPLETED = "analyze.completed"
    ANALYZE_FAILED = "analyze.failed"
    REWRITE_PLATFORM_COMPLETED = "rewrite.platform_completed"
    REWRITE_COMPLETED = "rewrite.completed"
    REWRITE_PARTIAL = "rewrite.partial"
    ADMIN_ACTION = "admin.action"
    API_KEY_EXPIRING = "api_key.expiring"


class EventBus:
    """简单的进程内事件总线，解耦模块间依赖"""

    _handlers: Dict[str, List[Callable]] = {}

    @classmethod
    def on(cls, event: str, handler: Callable) -> None:
        """注册事件处理器"""
        cls._handlers.setdefault(event, []).append(handler)
        logger.debug("EventBus: 注册处理器 %s → %s", event, handler.__name__)

    @classmethod
    def off(cls, event: str, handler: Callable) -> None:
        """移除事件处理器"""
        if event in cls._handlers:
            cls._handlers[event] = [h for h in cls._handlers[event] if h != handler]

    @classmethod
    async def emit(cls, event: str, data: Dict[str, Any]) -> None:
        """触发事件，异步执行所有处理器"""
        handlers = cls._handlers.get(event, [])
        if not handlers:
            logger.debug("EventBus: 事件 %s 无处理器", event)
            return

        logger.info("EventBus: 触发 %s, %d 个处理器", event, len(handlers))
        for handler in handlers:
            try:
                result = handler(data)
                if asyncio.iscoroutine(result):
                    await result
            except Exception as e:
                logger.error("EventBus: 处理器 %s 执行失败: %s", handler.__name__, e)

    @classmethod
    def clear(cls) -> None:
        """清空所有处理器（测试用）"""
        cls._handlers.clear()
