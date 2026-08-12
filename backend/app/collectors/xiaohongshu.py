"""小红书采集器（RedFox API）"""
import logging
from app.collectors.base import BaseCollector
from app.utils.http_client import fetch_json
from app.config import settings

logger = logging.getLogger(__name__)


class XiaohongshuCollector(BaseCollector):
    platform = "xiaohongshu"

    async def collect(self, keyword: str, max_results: int = 10) -> list[dict]:
        """通过 RedFox API 采集小红书笔记"""
        articles = []
        try:
            # RedFox API 调用
            url = f"{settings.REDFOX_BASE_URL}/api/v1/xiaohongshu/search"
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
                    "title": item.get("title", item.get("note_card", {}).get("display_title", "")),
                    "content": item.get("desc", ""),
                    "source_url": f"https://www.xiaohongshu.com/explore/{item.get('note_id', '')}",
                    "source_author": item.get("user", {}).get("nickname", ""),
                    "tags": [tag.get("name", "") for tag in item.get("tag_list", [])],
                })
                if article["title"] or article["content"]:
                    articles.append(article)

        except Exception as e:
            logger.error("小红书采集失败: %s", e)
            # 降级：返回空结果，由调度层处理

        return articles
