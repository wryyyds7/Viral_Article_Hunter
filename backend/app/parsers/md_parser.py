"""Markdown 文件解析器"""
from app.parsers.base import BaseParser


class MdParser(BaseParser):
    format_name = "md"

    async def parse(self, file_content: bytes, filename: str) -> dict:
        """解析 Markdown 文件"""
        text = file_content.decode("utf-8", errors="replace").strip()
        if not text:
            return {"title": "", "content": "", "tags": []}

        # 提取第一个 # 标题
        title = ""
        for line in text.split("\n"):
            line = line.strip()
            if line.startswith("#"):
                title = line.lstrip("#").strip()[:200]
                break

        if not title:
            title = filename

        return {"title": title, "content": text, "tags": []}
