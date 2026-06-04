"""采集器基类"""
import logging
from abc import ABC, abstractmethod
from typing import Any

logger = logging.getLogger(__name__)


class BaseCollector(ABC):
    """采集器抽象基类"""

    platform: str = ""

    @abstractmethod
    async def collect(self, keyword: str, max_results: int = 10) -> list[dict]:
        """执行采集，返回文章列表

        Returns:
            [{"title": "", "content": "", "source_url": "", "source_author": "", "tags": []}]
        """
        ...

    async def health_check(self) -> bool:
        """检查采集器是否可用"""
        return True

    def _normalize_article(self, raw: dict) -> dict:
        """标准化文章字段"""
        return {
            "title": raw.get("title", "")[:200],
            "content": raw.get("content", ""),
            "summary": raw.get("summary", ""),
            "source_url": raw.get("source_url", ""),
            "source_platform": self.platform,
            "source_author": raw.get("source_author", ""),
            "tags": raw.get("tags", []),
            "collection_method": "api",
        }
