"""数据看板相关 Schema"""
from pydantic import BaseModel, Field


class DashboardRequest(BaseModel):
    range: str = Field("7d", pattern=r"^(7d|30d|90d|custom)$")
    start_date: str | None = None  # range=custom 时必填
    end_date: str | None = None


class PlatformStat(BaseModel):
    platform: str
    count: int
    avg_score: float | None = None


class TrendPoint(BaseModel):
    date: str
    count: int


class DashboardResponse(BaseModel):
    total_articles: int
    total_analyses: int
    total_rewrites: int
    avg_hotness_score: float | None = None
    platform_distribution: list[PlatformStat] = []
    collection_trend: list[TrendPoint] = []
    top_tags: list[dict] = []
    # [{"tag": "职场", "count": 15}]
