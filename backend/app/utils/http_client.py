"""HTTP 客户端工具"""
import httpx
import logging

logger = logging.getLogger(__name__)

# 全局异步 HTTP 客户端
_client: httpx.AsyncClient | None = None


async def get_http_client() -> httpx.AsyncClient:
    """获取全局 HTTP 客户端（复用连接池）"""
    global _client
    if _client is None or _client.is_closed:
        _client = httpx.AsyncClient(
            timeout=httpx.Timeout(30.0, connect=10.0),
            follow_redirects=True,
            headers={"User-Agent": "ViralArticleHunter/1.0"},
        )
    return _client


async def close_http_client():
    """关闭 HTTP 客户端"""
    global _client
    if _client and not _client.is_closed:
        await _client.aclose()
        _client = None


async def fetch_json(url: str, params: dict | None = None, headers: dict | None = None) -> dict:
    """请求 JSON 接口"""
    client = await get_http_client()
    try:
        resp = await client.get(url, params=params, headers=headers)
        resp.raise_for_status()
        return resp.json()
    except httpx.HTTPError as e:
        logger.error("HTTP 请求失败: %s - %s", url, e)
        raise
