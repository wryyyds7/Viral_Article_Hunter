"""MediaCrawler 集成适配器

当平台采集需要浏览器自动化（登录态、JS签名等）时，
通过子进程调用 MediaCrawler 进行采集，并解析输出结果。

使用前提：
1. 安装 MediaCrawler: git clone https://github.com/NanmiCoder/MediaCrawler.git
2. 在 .env 中配置 MEDIACRAWLER_PATH 和 MEDIACRAWLER_ENABLED=true
3. 安装 MediaCrawler 的依赖

参考: https://github.com/NanmiCoder/MediaCrawler
"""
import asyncio
import json
import logging
import os
from pathlib import Path

from app.collectors.base import BaseCollector
from app.config import settings

logger = logging.getLogger(__name__)

# MediaCrawler 平台名称映射
PLATFORM_MAP = {
    "xiaohongshu": "xhs",
    "douyin": "dy",
    "bilibili": "bili",
    "weibo": "wb",
    "zhihu": "zh",
    "tieba": "tb",
    "kuaishou": "ks",
}


class MediaCrawlerAdapter(BaseCollector):
    """MediaCrawler 适配器 — 通过子进程调用 MediaCrawler

    适用于需要浏览器登录态的平台采集（如小红书、抖音等）。
    本适配器将 MediaCrawler 的输出解析为统一的文章格式。
    """

    def __init__(self, platform: str = ""):
        self.platform = platform

    async def collect(self, keyword: str, max_results: int = 10) -> list[dict]:
        """调用 MediaCrawler 执行采集"""
        if not settings.MEDIACRAWLER_ENABLED or not settings.MEDIACRAWLER_PATH:
            logger.warning("MediaCrawler 未启用，跳过 %s 采集", self.platform)
            return []

        mc_platform = PLATFORM_MAP.get(self.platform, self.platform)
        mc_path = Path(settings.MEDIACRAWLER_PATH)

        if not mc_path.exists():
            logger.error("MediaCrawler 路径不存在: %s", mc_path)
            return []

        # 构建命令
        # 使用 MediaCrawler 的搜索模式
        cmd = [
            "python", "main.py",
            "--platform", mc_platform,
            "--lt", "qrcode",  # 二维码登录
            "--type", "search",
            "--keywords", keyword,
            "--page", str(min(max_results // 5 + 1, 3)),  # 估算页数
        ]

        # 写入配置（MediaCrawler 通过 config/base_config.py 读取关键词）
        # 这里通过命令行参数传递

        try:
            # 执行 MediaCrawler
            process = await asyncio.create_subprocess_exec(
                *cmd,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
                cwd=str(mc_path),
            )

            # 等待执行完成（超时 120 秒）
            stdout, stderr = await asyncio.wait_for(
                process.communicate(), timeout=120
            )

            if process.returncode != 0:
                logger.error(
                    "MediaCrawler 执行失败 (exit=%d): %s",
                    process.returncode,
                    stderr.decode()[:500],
                )
                return []

            # 解析 MediaCrawler 输出
            # MediaCrawler 默认输出 JSON 到 data/ 目录
            return await self._parse_mediacrawler_output(mc_path, keyword, max_results)

        except asyncio.TimeoutError:
            logger.error("MediaCrawler 执行超时")
            return []
        except Exception as e:
            logger.error("MediaCrawler 适配器异常: %s", e)
            return []

    async def _parse_mediacrawler_output(self, mc_path: Path, keyword: str, max_results: int) -> list[dict]:
        """解析 MediaCrawler 输出的 JSON 文件"""
        articles = []

        # MediaCrawler 默认输出到 data/ 目录下的 JSON 文件
        data_dir = mc_path / "data"

        if not data_dir.exists():
            logger.warning("MediaCrawler 数据目录不存在: %s", data_dir)
            return []

        # 查找最新的 JSON 文件
        mc_platform = PLATFORM_MAP.get(self.platform, self.platform)
        json_files = sorted(data_dir.glob(f"*{mc_platform}*search*.json"), reverse=True)

        if not json_files:
            # 尝试查找任何包含关键词的 JSON
            json_files = sorted(data_dir.glob(f"*{mc_platform}*.json"), reverse=True)

        if not json_files:
            logger.warning("未找到 MediaCrawler 输出文件")
            return []

        # 读取最新的文件
        try:
            with open(json_files[0], "r", encoding="utf-8") as f:
                raw_items = json.load(f)

            # MediaCrawler 输出格式因平台而异，这里做通用适配
            for item in raw_items[:max_results]:
                article = self._normalize_article({
                    "title": item.get("title", item.get("desc", ""))[:200],
                    "content": item.get("content", item.get("desc", item.get("description", ""))),
                    "summary": item.get("content", "")[:200],
                    "source_url": item.get("note_url", item.get("url", item.get("video_url", ""))),
                    "source_author": item.get("nickname", item.get("author", item.get("user", {}).get("nickname", ""))),
                    "tags": item.get("tag_list", item.get("tags", [])),
                })
                if article["title"] or article["content"]:
                    articles.append(article)

        except Exception as e:
            logger.error("解析 MediaCrawler 输出失败: %s", e)

        return articles

    async def health_check(self) -> bool:
        """检查 MediaCrawler 是否可用"""
        if not settings.MEDIACRAWLER_ENABLED:
            return False
        mc_path = Path(settings.MEDIACRAWLER_PATH)
        return mc_path.exists() and (mc_path / "main.py").exists()
