"""爆款基因分析相关 Schema"""
import uuid
from datetime import datetime
from pydantic import BaseModel, Field

from app.schemas.common import PageParams


class AnalysisResponse(BaseModel):
    id: uuid.UUID
    article_id: uuid.UUID
    hotness_score: dict
    emotion_tags: list[str] | None = None
    title_formulas: list[dict] | None = None
    structure_template: dict | None = None
    top_3_genes: list[dict] | None = None
    platform_fit: list[dict] | None = None
    interaction_analysis: dict | None = None
    llm_model: str | None = None
    created_at: datetime

    model_config = {"from_attributes": True}


class BatchAnalysisRequest(BaseModel):
    article_ids: list[uuid.UUID] = Field(..., min_length=1, max_length=50)


class BatchAnalysisResponse(BaseModel):
    total: int
    triggered: int
    skipped: int  # 已有分析结果的跳过
    task_ids: list[uuid.UUID]
