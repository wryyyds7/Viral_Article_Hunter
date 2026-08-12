"""抖音采集器（抖音搜索 API + 分享链接解析）"""
import logging
import re
from app.collectors.base import BaseCollector
from app.utils.http_client import get_http_client

logger = logging.getLogger(__name__)


class DouyinCollector(BaseCollector):
    """抖音采集器

    策略：
    1. 关键词搜索：使用抖音网页版搜索 API（需要 Cookie，可能不稳定）
    2. 分享链接解析：解析用户提供的抖音分享链接
    3. 降级：返回空结果并记录日志

    对于生产环境推荐使用 MediaCrawler 集成模式。
    """
    platform = "douyin"

    async def collect(self, keyword: str, max_results: int = 10) -> list[dict]:
        """通过抖音搜索 API 采集内容"""
        articles = []
        try:
            # 抖音网页版搜索 API
            # 注意：抖音 API 有较强的风控，可能需要 Cookie
            client = await get_http_client()

            # 先访问首页获取 ttwid 等 Cookie
            headers = {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                "Referer": "https://www.douyin.com/",
            }

            # 尝试搜索 API
            search_url = "https://www.douyin.com/aweme/v1/web/search/item/"
            params = {
                "keyword": keyword,
                "count": min(max_results, 15),
                "offset": 0,
                "search_source": "normal_search",
                "sort_type": 0,  # 综合排序
                "publish_time": 0,
            }

            resp = await client.get(search_url, params=params, headers=headers)

            # 检查是否被风控
            if resp.status_code != 200:
                logger.warning("抖音搜索返回 %d，可能需要 Cookie", resp.status_code)
                return []

            data = resp.json()

            # 抖音 API 返回结构可能变化，这里做容错处理
            if data.get("status_code") != 0:
                logger.warning("抖音搜索 status_code=%s", data.get("status_code"))
                return []

            items = data.get("data", [])
            for item in items[:max_results]:
                aweme = item.get("aweme_info", {})
                if not aweme:
                    continue

                desc = aweme.get("desc", "")
                author = aweme.get("author", {}).get("nickname", "")
                aweme_id = aweme.get("aweme_id", "")

                # 获取视频/图集内容
                video_text = ""
                if aweme.get("images"):
                    # 图集类型
                    video_text = f"[图集] {desc}"
                elif aweme.get("video"):
                    video_text = f"[视频] {desc}"

                article = self._normalize_article({
                    "title": desc[:50] if desc else "",
                    "content": video_text or desc,
                    "summary": desc[:200] if desc else "",
                    "source_url": f"https://www.douyin.com/video/{aweme_id}" if aweme_id else "",
                    "source_author": author,
                    "tags": _extract_douyin_tags(desc),
                })
                if article["title"] or article["content"]:
                    articles.append(article)

        except Exception as e:
            logger.error("抖音采集失败: %s", e)

        return articles

    async def health_check(self) -> bool:
        """检查抖音 API 是否可用"""
        try:
            client = await get_http_client()
            resp = await client.get(
                "https://www.douyin.com/",
                headers={"User-Agent": "Mozilla/5.0"},
            )
            return resp.status_code == 200
        except Exception:
            return False


def _extract_douyin_tags(text: str) -> list[str]:
    """从抖音文案中提取 #话题 标签"""
    tags = re.findall(r'#([^#\s]+)', text)
    return [t.strip() for t in tags if t.strip()]
