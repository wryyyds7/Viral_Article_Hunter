"""PDF 文件解析器"""
from app.parsers.base import BaseParser


class PdfParser(BaseParser):
    format_name = "pdf"

    async def parse(self, file_content: bytes, filename: str) -> dict:
        """解析 PDF 文件"""
        try:
            import fitz  # PyMuPDF
            doc = fitz.open(stream=file_content, filetype="pdf")
            text_parts = []
            for page in doc:
                text_parts.append(page.get_text())
            doc.close()

            content = "\n".join(text_parts).strip()
            if not content:
                return {"title": filename, "content": "[PDF无法提取文本]", "tags": []}

            # 第一行作为标题
            lines = content.split("\n")
            title = lines[0].strip()[:200] if lines else filename

            return {"title": title, "content": content, "tags": []}
        except ImportError:
            return {"title": filename, "content": "[PDF解析失败：缺少PyMuPDF依赖]", "tags": []}
        except Exception as e:
            return {"title": filename, "content": f"[PDF解析异常: {e}]", "tags": []}
