"""今日头条采集器（头条搜索 API）"""
import logging
import re
from app.collectors.base import BaseCollector
from app.utils.http_client import fetch_json

logger = logging.getLogger(__name__)


class ToutiaoCollector(BaseCollector):
    """今日头条采集器 — 使用头条搜索 API"""
    platform = "toutiao"

    async def collect(self, keyword: str, max_results: int = 10) -> list[dict]:
        """通过头条搜索 API 采集文章"""
        articles = []
        try:
            # 头条搜索 API（公开接口）
            url = "https://so.toutiao.com/search"
            params = {
                "keyword": keyword,
                "pd": "information",  # 信息流
                "dvpf": "pc",
                "source": "input",
                "search_source": "switch_tab",
                "page_num": 0,
                "count": min(max_results, 15),
            }
            headers = {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                "Referer": "https://so.toutiao.com/",
                "Accept": "application/json",
            }

            try:
                data = await fetch_json(url, params=params, headers=headers)
            except Exception:
                # 头条搜索 API 可能返回 HTML 而非 JSON，降级处理
                client = await get_http_client()
                resp = await client.get(url, params=params, headers=headers)
                if resp.status_code != 200:
                    logger.warning("头条搜索返回 %d", resp.status_code)
                    return []
                # 从 HTML 中解析
                return _parse_toutiao_html(resp.text, keyword, max_results, self)

            # 尝试从 JSON 中提取搜索结果
            raw_data = data.get("data", [])
            for item in raw_data[:max_results]:
                title = item.get("title", "")
                content = item.get("abstract", item.get("content", ""))
                article_url = item.get("url", item.get("article_url", ""))
                author = item.get("media_name", item.get("source", ""))

                article = self._normalize_article({
                    "title": _strip_html(title),
                    "content": _strip_html(content),
                    "summary": _strip_html(content)[:200] if content else "",
                    "source_url": article_url,
                    "source_author": author,
                    "tags": [keyword] if keyword else [],
                })
                if article["title"] or article["content"]:
                    articles.append(article)

        except Exception as e:
            logger.error("头条采集失败: %s", e)

        return articles

    async def health_check(self) -> bool:
        """检查头条搜索是否可用"""
        try:
            from app.utils.http_client import get_http_client
            client = await get_http_client()
            resp = await client.get(
                "https://so.toutiao.com/",
                headers={"User-Agent": "Mozilla/5.0"},
            )
            return resp.status_code == 200
        except Exception:
            return False


def _parse_toutiao_html(html: str, keyword: str, max_results: int, collector) -> list[dict]:
    """从头条搜索 HTML 页面解析结果"""
    articles = []
    # 头条搜索结果页面结构
    pattern = re.compile(
        r'<a[^>]*class="result-title-source"[^>]*>(.*?)</a>.*?'
        r'<p[^>]*class="result-content"[^>]*>(.*?)</p>',
        re.DOTALL,
    )
    matches = pattern.findall(html)
    for match in matches[:max_results]:
        title = _strip_html(match[0])
        content = _strip_html(match[1])
        article = collector._normalize_article({
            "title": title,
            "content": content,
            "summary": content[:200] if content else "",
            "source_url": "",
            "source_author": "",
            "tags": [keyword],
        })
        if article["title"] or article["content"]:
            articles.append(article)
    return articles


def _strip_html(text: str) -> str:
    """去除 HTML 标签"""
    if not text:
        return ""
    return re.sub(r'<[^>]+>', '', text).strip()
