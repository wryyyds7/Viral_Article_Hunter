"""全局配置 - 从环境变量读取所有配置项"""
from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    """应用配置，优先从环境变量读取，缺失时使用默认值"""

    # ── 应用 ──
    APP_NAME: str = "爆文猎人"
    APP_VERSION: str = "0.1.0"
    DEBUG: bool = False
    LOG_LEVEL: str = "INFO"

    # ── 数据库 ──
    DATABASE_URL: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/viral_hunter"
    DB_ECHO: bool = False  # SQLAlchemy 日志（开发时可开）

    # ── Redis（v1.1 引入，MVP 可不配） ──
    REDIS_URL: Optional[str] = None

    # ── LLM ──
    LLM_API_KEY: str = ""
    LLM_BASE_URL: str = "https://api.deepseek.com/v1"
    LLM_MODEL: str = "deepseek-chat"
    LLM_LITE_MODEL: str = "deepseek-chat"
    LLM_MAX_RETRIES: int = 1
    LLM_TIMEOUT: int = 90
    LLM_MAX_TOKENS: int = 4096  # 单次请求最大 Token 数

    # ── 采集器 ──
    REDFOX_API_KEY: str = ""
    REDFOX_BASE_URL: str = "https://api.redfoxdata.com"
    SEARCH_API_KEY: str = ""
    SEARCH_BASE_URL: str = ""

    # ── B站采集 ──
    BILIBILI_SESSDATA: str = ""  # B站 Cookie SESSDATA（可选，提高限额）

    # ── 微博采集 ──
    WEIBO_COOKIE: str = ""  # 微博 Cookie（可选）

    # ── MediaCrawler 集成（可选高级模式）──
    MEDIACRAWLER_PATH: str = ""  # MediaCrawler 项目路径
    MEDIACRAWLER_ENABLED: bool = False

    # ── JWT ──
    JWT_SECRET: str = "change-me-in-production"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 120  # 2小时
    REFRESH_TOKEN_EXPIRE_DAYS: int = 30

    # ── 加密 ──
    ENCRYPTION_KEY: str = "0" * 32  # AES-256 需要 32 字节密钥

    # ── 上传 ──
    UPLOAD_THRESHOLD: int = 10  # 上传文档数量阈值
    MAX_FILE_SIZE_MB: int = 5
    UPLOAD_DIR: str = "/tmp/vh_uploads"

    # ── CORS ──
    CORS_ORIGINS: str = "*"  # 逗号分隔，或 "*"

    # ── 限流 ──
    RATE_LIMIT_COLLECT: int = 5  # 次/分钟
    RATE_LIMIT_UPLOAD: int = 5
    RATE_LIMIT_ANALYSIS: int = 10
    RATE_LIMIT_REWRITE: int = 3
    RATE_LIMIT_ADMIN: int = 30

    # ── 配额默认值 ──
    DEFAULT_DAILY_LLM_TOKENS: int = 100000
    DEFAULT_DAILY_REWRITES: int = 50
    DEFAULT_DAILY_COLLECTIONS: int = 30
    DEFAULT_DAILY_UPLOADS: int = 100

    # ── 改写 ──
    REWRITE_SIMILARITY_THRESHOLD: float = 0.6

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = True


settings = Settings()
