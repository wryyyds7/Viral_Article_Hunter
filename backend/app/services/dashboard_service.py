"""数据看板服务"""
import uuid
from datetime import datetime, timedelta, timezone

from sqlalchemy import select, func, distinct

from app.database import async_session
from app.models import Article, AnalysisResult, RewriteTask

from app.schemas.dashboard import DashboardResponse, PlatformStat, TrendPoint


class DashboardService:

    @staticmethod
    async def get_dashboard(user_id: uuid.UUID, range_str: str = "7d", start_date: str | None = None, end_date: str | None = None) -> DashboardResponse:
        """获取数据看板"""
        since = DashboardService._calc_since(range_str, start_date, end_date)

        async with async_session() as db:
            # 基础统计
            total_articles = await db.scalar(
                select(func.count()).select_from(Article).where(Article.user_id == user_id)
            ) or 0

            total_analyses = await db.scalar(
                select(func.count()).select_from(AnalysisResult)
                .join(Article, AnalysisResult.article_id == Article.id)
                .where(Article.user_id == user_id)
            ) or 0

            total_rewrites = await db.scalar(
                select(func.count()).select_from(RewriteTask).where(RewriteTask.user_id == user_id)
            ) or 0

            # 平均热度
            avg_score_result = await db.execute(
                select(func.avg(AnalysisResult.hotness_score["score"].as_float()))
                .join(Article, AnalysisResult.article_id == Article.id)
                .where(Article.user_id == user_id, Article.created_at >= since)
            )
            avg_score = avg_score_result.scalar()

            # 平台分布
            platform_result = await db.execute(
                select(Article.source_platform, func.count())
                .where(Article.user_id == user_id, Article.created_at >= since)
                .group_by(Article.source_platform)
            )
            platform_dist = [
                PlatformStat(platform=row[0] or "unknown", count=row[1])
                for row in platform_result.all()
            ]

            # 采集趋势（按天）
            trend_result = await db.execute(
                select(func.date(Article.created_at), func.count())
                .where(Article.user_id == user_id, Article.created_at >= since)
                .group_by(func.date(Article.created_at))
                .order_by(func.date(Article.created_at))
            )
            trend = [
                TrendPoint(date=str(row[0]), count=row[1])
                for row in trend_result.all()
            ]

            # 热门标签
            tag_result = await db.execute(
                select(Article.tags).where(
                    Article.user_id == user_id,
                    Article.created_at >= since,
                    Article.tags.isnot(None),
                )
            )
            tag_count: dict[str, int] = {}
            for row in tag_result.all():
                if row[0]:
                    for tag in row[0]:
                        tag_count[tag] = tag_count.get(tag, 0) + 1

            top_tags = [
                {"tag": k, "count": v}
                for k, v in sorted(tag_count.items(), key=lambda x: -x[1])[:10]
            ]

        return DashboardResponse(
            total_articles=total_articles,
            total_analyses=total_analyses,
            total_rewrites=total_rewrites,
            avg_hotness_score=round(avg_score, 1) if avg_score else None,
            platform_distribution=platform_dist,
            collection_trend=trend,
            top_tags=top_tags,
        )

    @staticmethod
    def _calc_since(range_str: str, start_date: str | None, end_date: str | None) -> datetime:
        """计算查询起始时间"""
        now = datetime.now(timezone.utc)
        if range_str == "custom" and start_date:
            return datetime.fromisoformat(start_date).replace(tzinfo=timezone.utc)
        days_map = {"7d": 7, "30d": 30, "90d": 90}
        days = days_map.get(range_str, 7)
        return now - timedelta(days=days)
