"""知乎采集器（RedFox API）"""
import logging
from app.collectors.base import BaseCollector
from app.utils.http_client import fetch_json
from app.config import settings

logger = logging.getLogger(__name__)


class ZhihuCollector(BaseCollector):
    platform = "zhihu"

    async def collect(self, keyword: str, max_results: int = 10) -> list[dict]:
        """通过 RedFox API 采集知乎内容"""
        articles = []
        try:
            url = f"{settings.REDFOX_BASE_URL}/api/v1/zhihu/search"
            params = {
                "keyword": keyword,
                "page": 1,
                "size": min(max_results, 20),
            }
            headers = {"Authorization": f"Bearer {settings.REDFOX_API_KEY}"}

            data = await fetch_json(url, params=params, headers=headers)
            items = data.get("data", {}).get("items", [])

            for item in items[:max_results]:
                article = self._normalize_article({
                    "title": item.get("title", ""),
                    "content": item.get("excerpt", item.get("content", "")),
                    "source_url": item.get("url", ""),
                    "source_author": item.get("author", {}).get("name", ""),
                    "tags": item.get("topics", []),
                })
                if article["title"] or article["content"]:
                    articles.append(article)

        except Exception as e:
            logger.error("知乎采集失败: %s", e)

        return articles
