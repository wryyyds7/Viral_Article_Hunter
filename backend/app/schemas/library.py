"""素材库相关 Schema"""
import uuid
from datetime import datetime
from pydantic import BaseModel, Field

from app.schemas.common import PageParams


class ArticleListParams(PageParams):
    keyword: str | None = None
    source_platform: str | None = None
    is_favorited: bool | None = None
    tags: list[str] | None = None
    collection_method: str | None = None
    sort_by: str = Field("created_at", pattern=r"^(created_at|title|source_platform)$")
    sort_order: str = Field("desc", pattern=r"^(asc|desc)$")


class ArticleDetailResponse(BaseModel):
    id: uuid.UUID
    title: str
    content: str
    summary: str | None = None
    source_url: str | None = None
    source_platform: str | None = None
    source_author: str | None = None
    collection_method: str | None = None
    is_favorited: bool
    tags: list[str] | None = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class FavoriteRequest(BaseModel):
    article_id: uuid.UUID
    group_id: uuid.UUID | None = None  # v1.1


class ExportRequest(BaseModel):
    article_ids: list[uuid.UUID] = Field(..., min_length=1, max_length=50)
    format: str = Field("json", pattern=r"^(json|csv|txt)$")
