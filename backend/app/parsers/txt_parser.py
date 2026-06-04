"""TXT 文件解析器"""
from app.parsers.base import BaseParser


class TxtParser(BaseParser):
    format_name = "txt"

    async def parse(self, file_content: bytes, filename: str) -> dict:
        """解析 TXT 文件"""
        # 尝试多种编码
        for encoding in ["utf-8", "gbk", "gb2312", "latin-1"]:
            try:
                text = file_content.decode(encoding)
                break
            except (UnicodeDecodeError, LookupError):
                continue
        else:
            text = file_content.decode("utf-8", errors="replace")

        text = text.strip()
        if not text:
            return {"title": "", "content": "", "tags": []}

        # 第一行作为标题
        lines = text.split("\n")
        title = lines[0].strip()[:200] if lines else filename
        content = text

        return {"title": title, "content": content, "tags": []}
