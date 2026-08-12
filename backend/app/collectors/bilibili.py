"""B站采集器（Bilibili 搜索 API）"""
import logging
from app.collectors.base import BaseCollector
from app.utils.http_client import fetch_json
from app.config import settings

logger = logging.getLogger(__name__)


class BilibiliCollector(BaseCollector):
    """B站视频采集器 — 使用 B站公开搜索 API"""
    platform = "bilibili"

    async def collect(self, keyword: str, max_results: int = 10) -> list[dict]:
        """通过 B站搜索 API 采集视频内容"""
        articles = []
        try:
            # B站搜索 API（公开接口，无需登录）
            url = "https://api.bilibili.com/x/web-interface/search/type"
            params = {
                "keyword": keyword,
                "search_type": "video",
                "page": 1,
                "page_size": min(max_results, 42),
                "order": "pubdate",  # 按发布日排序，获取最新内容
            }
            headers = {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
                "Referer": "https://search.bilibili.com",
            }
            # 如果有 SESSDATA，添加 Cookie
            if settings.BILIBILI_SESSDATA:
                headers["Cookie"] = f"SESSDATA={settings.BILIBILI_SESSDATA}"

            data = await fetch_json(url, params=params, headers=headers)

            # B站 API 返回结构: {"code": 0, "data": {"result": [...]}}
            if data.get("code") != 0:
                logger.warning("B站搜索返回非零 code: %s", data.get("code"))
                return []

            items = data.get("data", {}).get("result", [])
            for item in items[:max_results]:
                # 清理 HTML 标签（B站搜索结果标题/描述中有 <em> 高亮标签）
                title = _strip_html(item.get("title", ""))
                description = _strip_html(item.get("description", ""))

                # 构建 URL
                bvid = item.get("bvid", "")
                article = self._normalize_article({
                    "title": title,
                    "content": description,
                    "summary": description[:200] if description else "",
                    "source_url": f"https://www.bilibili.com/video/{bvid}" if bvid else "",
                    "source_author": _strip_html(item.get("author", "")),
                    "tags": _parse_bilibili_tags(item.get("tag", "")),
                })
                if article["title"] or article["content"]:
                    articles.append(article)

        except Exception as e:
            logger.error("B站采集失败: %s", e)

        return articles

    async def health_check(self) -> bool:
        """检查 B站 API 是否可用"""
        try:
            data = await fetch_json(
                "https://api.bilibili.com/x/web-interface/search/type",
                params={"keyword": "test", "search_type": "video", "page": 1, "page_size": 1},
                headers={"User-Agent": "Mozilla/5.0", "Referer": "https://search.bilibili.com"},
            )
            return data.get("code") == 0
        except Exception:
            return False


def _strip_html(text: str) -> str:
    """去除 HTML 标签"""
    import re
    return re.sub(r'<[^>]+>', '', text).strip()


def _parse_bilibili_tags(tag_str: str) -> list[str]:
    """解析 B站 tag 字段（逗号分隔的字符串）"""
    if not tag_str:
        return []
    return [t.strip() for t in tag_str.split(",") if t.strip()]
