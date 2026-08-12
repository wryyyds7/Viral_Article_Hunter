"""采集器注册表与智能选择

策略：
1. 如果启用了 MediaCrawler，优先使用 MediaCrawler 适配器（浏览器自动化，支持登录态）
2. 否则使用轻量级 HTTP API 采集器
3. 未实现的平台返回空结果
"""
import logging
from app.collectors.base import BaseCollector
from app.config import settings

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
    """获取采集器实例

    策略：
    1. 如果 MEDIACRAWLER_ENABLED=True，使用 MediaCrawlerAdapter（浏览器自动化）
    2. 否则使用轻量级 HTTP API 采集器
    3. 未注册的平台返回 None
    """
    _ensure_registered()

    # 如果启用了 MediaCrawler，优先使用
    if settings.MEDIACRAWLER_ENABLED and platform in _MEDIACRAWLER_PLATFORMS:
        from app.collectors.mediacrawler_adapter import MediaCrawlerAdapter
        return MediaCrawlerAdapter(platform=platform)

    cls = COLLECTOR_REGISTRY.get(platform)
    if cls:
        return cls() if isinstance(cls, type) else cls
    return None


# MediaCrawler 支持的平台
_MEDIACRAWLER_PLATFORMS = {"xiaohongshu", "douyin", "bilibili", "weibo", "zhihu", "kuaishou", "tieba"}

_registered = False


def _ensure_registered():
    """延迟注册，避免循环导入"""
    global _registered
    if _registered:
        return
    _registered = True

    # 注册已实现的轻量级采集器
    _safe_register("xiaohongshu", "app.collectors.xiaohongshu", "XiaohongshuCollector")
    _safe_register("zhihu", "app.collectors.zhihu", "ZhihuCollector")
    _safe_register("bilibili", "app.collectors.bilibili", "BilibiliCollector")
    _safe_register("weibo", "app.collectors.weibo", "WeiboCollector")
    _safe_register("douyin", "app.collectors.douyin", "DouyinCollector")
    _safe_register("weixin", "app.collectors.weixin", "WeixinCollector")
    _safe_register("toutiao", "app.collectors.toutiao", "ToutiaoCollector")

    # 预留未实现的平台（返回空结果）
    for p in ["baijiahao"]:
        if p not in COLLECTOR_REGISTRY:
            register_collector(p, GenericCollector)


def _safe_register(platform: str, module_path: str, class_name: str):
    """安全注册采集器（导入失败时跳过）"""
    try:
        import importlib
        module = importlib.import_module(module_path)
        cls = getattr(module, class_name)
        register_collector(platform, cls)
        logger.debug("采集器注册成功: %s → %s", platform, class_name)
    except ImportError as e:
        logger.warning("采集器导入失败 %s: %s", platform, e)
    except Exception as e:
        logger.warning("采集器注册异常 %s: %s", platform, e)


def list_supported_platforms() -> list[dict]:
    """列出所有支持的平台及其状态"""
    _ensure_registered()
    platforms = []
    for platform_id, cls in COLLECTOR_REGISTRY.items():
        is_generic = cls is GenericCollector
        platforms.append({
            "id": platform_id,
            "name": _PLATFORM_NAMES.get(platform_id, platform_id),
            "enabled": not is_generic,
            "mode": "mediacrawler" if (settings.MEDIACRAWLER_ENABLED and platform_id in _MEDIACRAWLER_PLATFORMS) else ("api" if not is_generic else "not_implemented"),
        })
    return platforms


_PLATFORM_NAMES = {
    "xiaohongshu": "小红书",
    "zhihu": "知乎",
    "weixin": "微信公众号",
    "bilibili": "B站",
    "douyin": "抖音",
    "weibo": "微博",
    "toutiao": "今日头条",
    "baijiahao": "百家号",
    "kuaishou": "快手",
    "tieba": "贴吧",
}
