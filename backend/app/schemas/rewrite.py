"""跨平台改写相关 Schema"""
import uuid
from datetime import datetime
from pydantic import BaseModel, Field

from app.schemas.common import PageParams


class RewriteRequest(BaseModel):
    article_id: uuid.UUID
    target_platforms: list[str] = Field(..., min_length=1, max_length=7)
    style_overrides: dict | None = None
    # {"tone": "专业", "emoji_density": 3, "colloquial": True, "emotion_intensity": 2, "length": "medium"}


class RewriteTaskResponse(BaseModel):
    id: uuid.UUID
    article_id: uuid.UUID
    target_platforms: list[str]
    style_overrides: dict | None = None
    status: str
    created_at: datetime

    model_config = {"from_attributes": True}


class RewriteResultResponse(BaseModel):
    id: uuid.UUID
    task_id: uuid.UUID
    platform: str
    title: str | None = None
    content: str
    similarity_score: float | None = None
    quality_score: dict | None = None
    word_count: int | None = None
    rewrite_notes: str | None = None
    created_at: datetime

    model_config = {"from_attributes": True}


class RewriteDetailResponse(BaseModel):
    """改写任务详情（含所有平台结果）"""
    task: RewriteTaskResponse
    results: list[RewriteResultResponse]
