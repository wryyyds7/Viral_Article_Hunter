"""采集器测试"""
import pytest
from app.collectors.base import BaseCollector
from app.collectors.generic import (
    GenericCollector, get_collector, list_supported_platforms,
    COLLECTOR_REGISTRY, _PLATFORM_NAMES,
)


class TestBaseCollector:
    """测试基类方法"""

    def test_normalize_article(self):
        """测试文章标准化"""

        class TestCollector(BaseCollector):
            platform = "test"

            async def collect(self, keyword: str, max_results: int = 10):
                return []

        c = TestCollector()
        raw = {
            "title": "测试标题",
            "content": "测试内容",
            "summary": "摘要",
            "source_url": "https://example.com",
            "source_author": "作者",
            "tags": ["标签1", "标签2"],
        }
        result = c._normalize_article(raw)
        assert result["title"] == "测试标题"
        assert result["content"] == "测试内容"
        assert result["source_platform"] == "test"
        assert result["collection_method"] == "api"
        assert result["tags"] == ["标签1", "标签2"]

    def test_normalize_truncates_title(self):
        """测试标题截断"""

        class TestCollector(BaseCollector):
            platform = "test"

            async def collect(self, keyword: str, max_results: int = 10):
                return []

        c = TestCollector()
        result = c._normalize_article({"title": "A" * 300})
        assert len(result["title"]) == 200

    def test_normalize_defaults(self):
        """测试默认值"""

        class TestCollector(BaseCollector):
            platform = "test"

            async def collect(self, keyword: str, max_results: int = 10):
                return []

        c = TestCollector()
        result = c._normalize_article({})
        assert result["title"] == ""
        assert result["content"] == ""
        assert result["source_platform"] == "test"
        assert result["tags"] == []
        assert result["collection_method"] == "api"


class TestGenericCollector:
    def test_returns_empty(self):
        c = GenericCollector("nonexistent")
        import asyncio
        result = asyncio.run(c.collect("test", 5))
        assert result == []


class TestCollectorRegistry:
    def test_get_collector_returns_instance(self):
        """测试获取已注册的采集器"""
        collector = get_collector("bilibili")
        assert collector is not None
        assert collector.platform == "bilibili"

    def test_get_collector_unknown_returns_none(self):
        """测试获取未注册平台返回 None"""
        collector = get_collector("nonexistent_platform")
        assert collector is None

    def test_list_supported_platforms(self):
        """测试平台列表"""
        platforms = list_supported_platforms()
        assert len(platforms) > 0
        # 至少包含小红书和知乎
        ids = [p["id"] for p in platforms]
        assert "xiaohongshu" in ids
        assert "zhihu" in ids
        assert "bilibili" in ids

    def test_all_platforms_have_names(self):
        """测试所有已注册平台都有中文名"""
        platforms = list_supported_platforms()
        for p in platforms:
            assert p["name"] is not None
            assert p["id"] is not None
            assert "enabled" in p
            assert "mode" in p

    def test_bilibili_collector_registered(self):
        """测试 B站采集器已注册"""
        assert "bilibili" in COLLECTOR_REGISTRY

    def test_weibo_collector_registered(self):
        """测试微博采集器已注册"""
        assert "weibo" in COLLECTOR_REGISTRY

    def test_douyin_collector_registered(self):
        """测试抖音采集器已注册"""
        assert "douyin" in COLLECTOR_REGISTRY

    def test_weixin_collector_registered(self):
        """测试微信采集器已注册"""
        assert "weixin" in COLLECTOR_REGISTRY

    def test_toutiao_collector_registered(self):
        """测试头条采集器已注册"""
        assert "toutiao" in COLLECTOR_REGISTRY


class TestBilibiliCollector:
    def test_platform_name(self):
        from app.collectors.bilibili import BilibiliCollector
        c = BilibiliCollector()
        assert c.platform == "bilibili"

    def test_strip_html(self):
        from app.collectors.bilibili import _strip_html
        assert _strip_html("hello<em>world</em>") == "helloworld"
        assert _strip_html("no tags") == "no tags"
        assert _strip_html("") == ""

    def test_parse_tags(self):
        from app.collectors.bilibili import _parse_bilibili_tags
        assert _parse_bilibili_tags("tag1,tag2,tag3") == ["tag1", "tag2", "tag3"]
        assert _parse_bilibili_tags("") == []
        assert _parse_bilibili_tags("single") == ["single"]


class TestWeiboCollector:
    def test_platform_name(self):
        from app.collectors.weibo import WeiboCollector
        c = WeiboCollector()
        assert c.platform == "weibo"

    def test_extract_topics(self):
        from app.collectors.weibo import _extract_weibo_topics
        assert _extract_weibo_topics("这是#话题1#和#话题2#的微博") == ["话题1", "话题2"]
        assert _extract_weibo_topics("没有话题") == []
        assert _extract_weibo_topics("#单话题#") == ["单话题"]


class TestDouyinCollector:
    def test_platform_name(self):
        from app.collectors.douyin import DouyinCollector
        c = DouyinCollector()
        assert c.platform == "douyin"

    def test_extract_tags(self):
        from app.collectors.douyin import _extract_douyin_tags
        assert _extract_douyin_tags("这是#话题1 #话题2 的文案") == ["话题1", "话题2"]
        assert _extract_douyin_tags("没有标签") == []


class TestWeixinCollector:
    def test_platform_name(self):
        from app.collectors.weixin import WeixinCollector
        c = WeixinCollector()
        assert c.platform == "weixin"

    def test_strip_html(self):
        from app.collectors.weixin import _strip_html
        assert _strip_html("<p>内容</p>") == "内容"
        assert _strip_html("") == ""


class TestToutiaoCollector:
    def test_platform_name(self):
        from app.collectors.toutiao import ToutiaoCollector
        c = ToutiaoCollector()
        assert c.platform == "toutiao"

    def test_strip_html(self):
        from app.collectors.toutiao import _strip_html
        assert _strip_html("<b>标题</b>") == "标题"
        assert _strip_html("") == ""
        assert _strip_html(None) == ""


class TestMediaCrawlerAdapter:
    def test_platform_map(self):
        from app.collectors.mediacrawler_adapter import PLATFORM_MAP
        assert PLATFORM_MAP["xiaohongshu"] == "xhs"
        assert PLATFORM_MAP["douyin"] == "dy"
        assert PLATFORM_MAP["bilibili"] == "bili"
        assert PLATFORM_MAP["weibo"] == "wb"
        assert PLATFORM_MAP["zhihu"] == "zh"

    def test_disabled_returns_empty(self):
        """测试未启用时返回空"""
        import asyncio
        from app.collectors.mediacrawler_adapter import MediaCrawlerAdapter
        from app.config import settings

        # 确保未启用
        original = settings.MEDIACRAWLER_ENABLED
        settings.MEDIACRAWLER_ENABLED = False
        try:
            c = MediaCrawlerAdapter("xiaohongshu")
            result = asyncio.run(c.collect("test", 5))
            assert result == []
        finally:
            settings.MEDIACRAWLER_ENABLED = original

    def test_health_check_disabled(self):
        """测试未启用时健康检查返回 False"""
        import asyncio
        from app.collectors.mediacrawler_adapter import MediaCrawlerAdapter
        from app.config import settings

        original = settings.MEDIACRAWLER_ENABLED
        settings.MEDIACRAWLER_ENABLED = False
        try:
            c = MediaCrawlerAdapter("xiaohongshu")
            result = asyncio.run(c.health_check())
            assert result is False
        finally:
            settings.MEDIACRAWLER_ENABLED = original
