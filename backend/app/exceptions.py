"""自定义业务异常"""
from fastapi import HTTPException


class AppException(HTTPException):
    """业务异常基类"""
    def __init__(self, status_code: int, error_code: int, detail: str):
        self.error_code = error_code
        super().__init__(status_code=status_code, detail=detail)


class QuotaExceededError(AppException):
    """配额超限"""
    def __init__(self, resource: str = "未知资源"):
        super().__init__(
            status_code=429,
            error_code=40103,
            detail=f"{resource}配额已用尽，请明天再试",
        )


class LLMServiceError(AppException):
    """LLM 服务异常"""
    def __init__(self, detail: str = "LLM 服务暂不可用"):
        super().__init__(status_code=503, error_code=41201, detail=detail)


class CollectionError(AppException):
    """采集异常"""
    def __init__(self, detail: str = "采集服务异常"):
        super().__init__(status_code=500, error_code=41101, detail=detail)


class UploadParseError(AppException):
    """文档解析异常"""
    def __init__(self, detail: str = "文档解析失败"):
        super().__init__(status_code=400, error_code=40701, detail=detail)


class InsufficientArticlesError(AppException):
    """上传文档数量不足阈值"""
    def __init__(self, current: int, threshold: int = 10):
        super().__init__(
            status_code=200,
            error_code=40705,
            detail=f"当前上传 {current} 篇，建议补到 {threshold} 篇以获得更准确的分析",
        )


class AdminPermissionError(AppException):
    """管理员权限不足"""
    def __init__(self):
        super().__init__(
            status_code=403,
            error_code=40301,
            detail="需要管理员权限",
        )


class AuthenticationError(AppException):
    """认证失败"""
    def __init__(self, detail: str = "认证失败"):
        super().__init__(status_code=401, error_code=40101, detail=detail)


class TokenExpiredError(AppException):
    """Token 过期"""
    def __init__(self):
        super().__init__(status_code=401, error_code=40101, detail="认证令牌已过期")


class InvalidTokenError(AppException):
    """无效 Token"""
    def __init__(self):
        super().__init__(status_code=401, error_code=40102, detail="无效的认证令牌")


class NotFoundError(AppException):
    """资源不存在"""
    def __init__(self, resource: str = "资源"):
        super().__init__(status_code=404, error_code=40400, detail=f"{resource}不存在")
