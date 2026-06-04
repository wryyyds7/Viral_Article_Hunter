"""素材库服务"""
import uuid
import logging

from sqlalchemy import select, update, func, or_

from app.database import async_session
from app.models import Article, Favorite, FavoriteGroup
from app.utils.pagination import paginate, PageParams
from app.utils.exporter import export_json, export_csv, export_txt

logger = logging.getLogger(__name__)


class LibraryService:

    @staticmethod
    async def list_articles(
        user_id: uuid.UUID,
        keyword: str | None = None,
        source_platform: str | None = None,
        is_favorited: bool | None = None,
        tags: list[str] | None = None,
        collection_method: str | None = None,
        sort_by: str = "created_at",
        sort_order: str = "desc",
        page: int = 1,
        page_size: int = 20,
    ) -> tuple[list, int]:
        async with async_session() as db:
            query = select(Article).where(Article.user_id == user_id)

            if keyword:
                query = query.where(
                    or_(
                        Article.title.ilike(f"%{keyword}%"),
                        Article.content.ilike(f"%{keyword}%"),
                    )
                )
            if source_platform:
                query = query.where(Article.source_platform == source_platform)
            if is_favorited is not None:
                query = query.where(Article.is_favorited == is_favorited)
            if tags:
                query = query.where(Article.tags.overlap(tags))
            if collection_method:
                query = query.where(Article.collection_method == collection_method)

            # 排序
            sort_col = getattr(Article, sort_by, Article.created_at)
            query = query.order_by(sort_col.desc() if sort_order == "desc" else sort_col.asc())

            return await paginate(query, PageParams(page=page, page_size=page_size), db)

    @staticmethod
    async def get_article(article_id: uuid.UUID, user_id: uuid.UUID) -> Article | None:
        async with async_session() as db:
            result = await db.execute(
                select(Article).where(Article.id == article_id, Article.user_id == user_id)
            )
            return result.scalar_one_or_none()

    @staticmethod
    async def delete_article(article_id: uuid.UUID, user_id: uuid.UUID) -> bool:
        async with async_session() as db:
            result = await db.execute(
                select(Article).where(Article.id == article_id, Article.user_id == user_id)
            )
            article = result.scalar_one_or_none()
            if not article:
                return False
            await db.delete(article)
            await db.commit()
            return True

    @staticmethod
    async def toggle_favorite(user_id: uuid.UUID, article_id: uuid.UUID, group_id: uuid.UUID | None = None) -> bool:
        """切换收藏状态"""
        async with async_session() as db:
            # 检查文章
            result = await db.execute(select(Article).where(Article.id == article_id))
            article = result.scalar_one_or_none()
            if not article:
                return False

            # 检查是否已收藏
            fav_result = await db.execute(
                select(Favorite).where(
                    Favorite.user_id == user_id,
                    Favorite.article_id == article_id,
                )
            )
            existing = fav_result.scalar_one_or_none()

            if existing:
                # 取消收藏
                await db.delete(existing)
                article.is_favorited = False
            else:
                # 添加收藏
                fav = Favorite(user_id=user_id, article_id=article_id, group_id=group_id)
                db.add(fav)
                article.is_favorited = True

            await db.commit()
            return True

    @staticmethod
    async def export_articles(article_ids: list[uuid.UUID], format: str = "json") -> str:
        """导出文章"""
        async with async_session() as db:
            result = await db.execute(
                select(Article).where(Article.id.in_(article_ids))
            )
            articles = list(result.scalars().all())

        data = [
            {
                "title": a.title,
                "content": a.content,
                "source_platform": a.source_platform,
                "source_url": a.source_url,
                "tags": a.tags or [],
            }
            for a in articles
        ]

        if format == "csv":
            return export_csv(data)
        elif format == "txt":
            return export_txt(data)
        else:
            return export_json(data)

    @staticmethod
    async def get_tags(user_id: uuid.UUID) -> list[str]:
        """获取用户所有标签"""
        async with async_session() as db:
            result = await db.execute(
                select(Article.tags).where(Article.user_id == user_id, Article.tags.isnot(None))
            )
            all_tags = set()
            for row in result.all():
                if row[0]:
                    all_tags.update(row[0])
            return sorted(all_tags)
