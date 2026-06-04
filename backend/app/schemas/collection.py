"""采集相关 Schema"""
import uuid
from datetime import datetime
from pydantic import BaseModel, Field

from app.schemas.common import PageParams


class CollectRequest(BaseModel):
    keyword: str = Field(..., min_length=1, max_length=50)
    platforms: list[str] = Field(..., min_length=1, max_length=5)
    max_results: int = Field(10, ge=1, le=50)


class CollectionTaskResponse(BaseModel):
    id: uuid.UUID
    keyword: str
    platforms: list[str]
    max_results: int
    status: str
    collected_count: int
    error_message: str | None = None
    created_at: datetime

    model_config = {"from_attributes": True}


class ArticleBriefResponse(BaseModel):
    """采集结果中的文章简要"""
    id: uuid.UUID
    title: str
    source_platform: str | None = None
    source_url: str | None = None
    source_author: str | None = None
    created_at: datetime

    model_config = {"from_attributes": True}
