"""解析器基类"""
import logging
from abc import ABC, abstractmethod

logger = logging.getLogger(__name__)


class BaseParser(ABC):
    """文档解析器抽象基类"""

    format_name: str = ""

    @abstractmethod
    async def parse(self, file_content: bytes, filename: str) -> dict:
        """解析文档内容

        Returns:
            {"title": "", "content": "", "tags": []}
        """
        ...

    def supports(self, filename: str) -> bool:
        """检查是否支持该文件格式"""
        ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
        return ext == self.format_name
