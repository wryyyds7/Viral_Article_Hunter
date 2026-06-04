"""通用采集器（预留扩展）"""
import logging
from app.collectors.base import BaseCollector

logger = logging.getLogger(__name__)


class GenericCollector(BaseCollector):
    """通用采集器 - 用于未来接入其他平台"""

    def __init__(self, platform: str = ""):
        self.platform = platform

    async def collect(self, keyword: str, max_results: int = 10) -> list[dict]:
        logger.warning("平台 %s 的采集器尚未实现", self.platform)
        return []


# ── 平台采集器注册表 ──
COLLECTOR_REGISTRY: dict[str, type[BaseCollector]] = {}


def register_collector(platform: str, collector_class: type[BaseCollector]):
    COLLECTOR_REGISTRY[platform] = collector_class


def get_collector(platform: str) -> BaseCollector | None:
    """懒加载获取采集器实例"""
    _ensure_registered()
    cls = COLLECTOR_REGISTRY.get(platform)
    if cls:
        return cls() if isinstance(cls, type) else cls
    return None


_registered = False


def _ensure_registered():
    """延迟注册，避免循环导入"""
    global _registered
    if _registered:
        return
    _registered = True

    # 导入已实现的采集器并注册
    try:
        from app.collectors.xiaohongshu import XiaohongshuCollector
        register_collector("xiaohongshu", XiaohongshuCollector)
    except ImportError:
        logger.warning("小红书采集器导入失败，跳过注册")

    try:
        from app.collectors.zhihu import ZhihuCollector
        register_collector("zhihu", ZhihuCollector)
    except ImportError:
        logger.warning("知乎采集器导入失败，跳过注册")

    # 预留未实现的平台（返回空结果）
    for p in ["weixin", "bilibili", "douyin", "weibo", "toutiao", "baijiahao"]:
        if p not in COLLECTOR_REGISTRY:
            register_collector(p, GenericCollector)
