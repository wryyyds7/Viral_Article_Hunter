"""微信公众号采集器（搜狗微信搜索）"""
import logging
import re
from app.collectors.base import BaseCollector
from app.utils.http_client import get_http_client

logger = logging.getLogger(__name__)


class WeixinCollector(BaseCollector):
    """微信公众号采集器

    策略：使用搜狗微信搜索（https://weixin.sogou.com）
    搜狗微信搜索是公开的微信公众号文章搜索入口。
    """
    platform = "weixin"

    async def collect(self, keyword: str, max_results: int = 10) -> list[dict]:
        """通过搜狗微信搜索采集公众号文章"""
        articles = []
        try:
            client = await get_http_client()

            # 搜狗微信搜索 URL
            url = "https://weixin.sogou.com/weixin"
            params = {
                "type": "2",  # 搜索文章
                "query": keyword,
                "page": 1,
                "ie": "utf8",
            }
            headers = {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                "Referer": "https://weixin.sogou.com/",
                "Accept": "text/html,application/xhtml+xml",
                "Accept-Language": "zh-CN,zh;q=0.9",
            }

            resp = await client.get(url, params=params, headers=headers)

            if resp.status_code != 200:
                logger.warning("搜狗微信搜索返回 %d", resp.status_code)
                return []

            html = resp.text

            # 解析搜索结果（搜狗微信搜索结果页面结构）
            # 每个搜索结果在 <div class="results"> 下的 <div class="vrbox">
            pattern = re.compile(
                r'<h3[^>]*>\s*<a[^>]*href="([^"]*)"[^>]*>(.*?)</a>\s*</h3>'
                r'.*?<p class="txt-info"[^>]*>(.*?)</p>'
                r'.*?<div class="account"[^>]*>(.*?)</div>',
                re.DOTALL,
            )

            matches = pattern.findall(html)
            for match in matches[:max_results]:
                article_url = match[0]
                title = _strip_html(match[1])
                content = _strip_html(match[2])
                author = _strip_html(match[3])

                article = self._normalize_article({
                    "title": title,
                    "content": content,
                    "summary": content[:200] if content else "",
                    "source_url": article_url,
                    "source_author": author,
                    "tags": [keyword],
                })
                if article["title"] or article["content"]:
                    articles.append(article)

        except Exception as e:
            logger.error("微信公众号采集失败: %s", e)

        return articles

    async def health_check(self) -> bool:
        """检查搜狗微信搜索是否可用"""
        try:
            client = await get_http_client()
            resp = await client.get(
                "https://weixin.sogou.com/",
                headers={"User-Agent": "Mozilla/5.0"},
            )
            return resp.status_code == 200
        except Exception:
            return False


def _strip_html(text: str) -> str:
    """去除 HTML 标签和多余空白"""
    return re.sub(r'<[^>]+>', '', text).strip()
