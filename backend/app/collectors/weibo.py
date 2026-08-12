"""微博采集器（微博搜索 API）"""
import logging
import re
from app.collectors.base import BaseCollector
from app.utils.http_client import fetch_json
from app.config import settings

logger = logging.getLogger(__name__)


class WeiboCollector(BaseCollector):
    """微博采集器 — 使用微博移动端搜索 API"""
    platform = "weibo"

    async def collect(self, keyword: str, max_results: int = 10) -> list[dict]:
        """通过微博搜索 API 采集微博内容"""
        articles = []
        try:
            # 微博移动端搜索 API
            url = "https://m.weibo.cn/api/container/getIndex"
            params = {
                "containerid": f"100103type=1&q={keyword}",
                "page_type": "searchall",
                "page": 1,
            }
            headers = {
                "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15",
                "Referer": f"https://m.weibo.cn/search?containerid=100103type%3D1%26q%3D{keyword}",
                "Accept": "application/json",
            }
            if settings.WEIBO_COOKIE:
                headers["Cookie"] = settings.WEIBO_COOKIE

            data = await fetch_json(url, params=params, headers=headers)

            # 微博 API 返回结构: {"ok": 1, "data": {"cards": [...]}}
            if not data.get("ok"):
                logger.warning("微博搜索返回 ok=0")
                return []

            cards = data.get("data", {}).get("cards", [])
            for card in cards:
                # card_type=9 是微博正文
                if card.get("card_type") != 9:
                    continue

                mblog = card.get("mblog", {})
                if not mblog:
                    continue

                # 清理微博正文中的 HTML 标签
                text = _strip_html(mblog.get("text", ""))
                long_text = mblog.get("longText", {})
                if long_text:
                    text = _strip_html(long_text.get("longTextContent", text))

                title = text[:50] if text else ""  # 微博无标题，取正文前50字
                author = mblog.get("user", {}).get("screen_name", "")

                article = self._normalize_article({
                    "title": title,
                    "content": text,
                    "summary": text[:200] if text else "",
                    "source_url": f"https://m.weibo.cn/detail/{mblog.get('id', '')}",
                    "source_author": author,
                    "tags": _extract_weibo_topics(mblog.get("text", "")),
                })
                if article["title"] or article["content"]:
                    articles.append(article)

                if len(articles) >= max_results:
                    break

        except Exception as e:
            logger.error("微博采集失败: %s", e)

        return articles

    async def health_check(self) -> bool:
        """检查微博 API 是否可用"""
        try:
            data = await fetch_json(
                "https://m.weibo.cn/api/container/getIndex",
                params={"containerid": "100103type=1&q=test"},
                headers={"User-Agent": "Mozilla/5.0 (iPhone)"},
            )
            return data.get("ok") == 1
        except Exception:
            return False


def _strip_html(text: str) -> str:
    """去除 HTML 标签"""
    return re.sub(r'<[^>]+>', '', text).strip()


def _extract_weibo_topics(text: str) -> list[str]:
    """从微博正文中提取 #话题# 标签"""
    topics = re.findall(r'#([^#]+)#', text)
    return [t.strip() for t in topics if t.strip()]
