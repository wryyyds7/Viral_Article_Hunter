"""HTML 文件解析器 + 解析器注册表"""
import logging
from app.parsers.base import BaseParser

logger = logging.getLogger(__name__)


class HtmlParser(BaseParser):
    format_name = "html"

    async def parse(self, file_content: bytes, filename: str) -> dict:
        """解析 HTML 文件，提取纯文本"""
        try:
            from bs4 import BeautifulSoup
            html = file_content.decode("utf-8", errors="replace")
            soup = BeautifulSoup(html, "html.parser")

            # 移除 script 和 style
            for tag in soup(["script", "style", "nav", "footer", "header"]):
                tag.decompose()

            # 提取标题
            title_tag = soup.find("title")
            h1_tag = soup.find("h1")
            title = ""
            if h1_tag:
                title = h1_tag.get_text(strip=True)[:200]
            elif title_tag:
                title = title_tag.get_text(strip=True)[:200]
            else:
                title = filename

            # 提取正文
            content = soup.get_text(separator="\n", strip=True)

            return {"title": title, "content": content, "tags": []}
        except ImportError:
            return {"title": filename, "content": "[HTML解析失败：缺少beautifulsoup4依赖]", "tags": []}
        except Exception as e:
            return {"title": filename, "content": f"[HTML解析异常: {e}]", "tags": []}


# ── 解析器注册表（懒加载） ──
PARSER_REGISTRY: dict[str, type[BaseParser]] = {}
_registered = False


def _ensure_registered():
    """延迟注册，避免循环导入"""
    global _registered
    if _registered:
        return
    _registered = True

    from app.parsers.html_parser import HtmlParser
    PARSER_REGISTRY["html"] = HtmlParser

    try:
        from app.parsers.txt_parser import TxtParser
        PARSER_REGISTRY["txt"] = TxtParser
    except ImportError:
        logger.warning("TXT解析器导入失败")

    try:
        from app.parsers.md_parser import MdParser
        PARSER_REGISTRY["md"] = MdParser
    except ImportError:
        logger.warning("MD解析器导入失败")

    try:
        from app.parsers.docx_parser import DocxParser
        PARSER_REGISTRY["docx"] = DocxParser
    except ImportError:
        logger.warning("DOCX解析器导入失败")

    try:
        from app.parsers.pdf_parser import PdfParser
        PARSER_REGISTRY["pdf"] = PdfParser
    except ImportError:
        logger.warning("PDF解析器导入失败")


def get_parser(format_name: str) -> BaseParser | None:
    """根据格式名获取解析器"""
    _ensure_registered()
    cls = PARSER_REGISTRY.get(format_name.lower())
    return cls() if cls else None
