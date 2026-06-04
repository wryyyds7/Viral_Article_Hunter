"""DOCX 文件解析器"""
import io
from app.parsers.base import BaseParser


class DocxParser(BaseParser):
    format_name = "docx"

    async def parse(self, file_content: bytes, filename: str) -> dict:
        """解析 DOCX 文件"""
        try:
            from docx import Document
            doc = Document(io.BytesIO(file_content))

            # 提取所有段落文本
            paragraphs = [p.text.strip() for p in doc.paragraphs if p.text.strip()]
            content = "\n".join(paragraphs)

            # 第一段作为标题
            title = paragraphs[0][:200] if paragraphs else filename

            return {"title": title, "content": content, "tags": []}
        except ImportError:
            # python-docx 未安装
            return {"title": filename, "content": "[DOCX解析失败：缺少python-docx依赖]", "tags": []}
        except Exception as e:
            return {"title": filename, "content": f"[DOCX解析异常: {e}]", "tags": []}
