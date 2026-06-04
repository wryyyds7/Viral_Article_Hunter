"""采集服务"""
import uuid
import logging

from sqlalchemy import select, update

from app.database import async_session
from app.models import CollectionTask, Article
from app.event_bus import EventBus, Events
from app.collectors.generic import get_collector

logger = logging.getLogger(__name__)


class CollectionService:

    @staticmethod
    async def create_task(user_id: uuid.UUID, keyword: str, platforms: list[str], max_results: int) -> CollectionTask:
        """创建采集任务"""
        async with async_session() as db:
            task = CollectionTask(
                user_id=user_id,
                keyword=keyword,
                platforms=platforms,
                max_results=max_results,
                status="pending",
            )
            db.add(task)
            await db.commit()
            await db.refresh(task)

        # 提交到任务队列
        from app.scheduler.task_queue import task_queue, TaskType, TaskPriority
        await task_queue.submit(
            TaskType.COLLECT,
            {
                "task_id": str(task.id),
                "keyword": keyword,
                "platforms": platforms,
                "max_results": max_results,
                "user_id": str(user_id),
            },
            priority=TaskPriority.NORMAL,
        )
        return task

    @staticmethod
    async def execute_collection(task_id: str, keyword: str, platforms: list[str], max_results: int, user_id: str):
        """执行采集（由 worker 调用）"""
        async with async_session() as db:
            # 更新任务状态
            await db.execute(
                update(CollectionTask).where(CollectionTask.id == uuid.UUID(task_id)).values(status="running")
            )
            await db.commit()

        all_articles = []
        errors = []
        by_platform = {}

        for platform in platforms:
            collector = get_collector(platform)
            if not collector:
                errors.append(f"平台 {platform} 无可用采集器")
                continue

            try:
                articles = await collector.collect(keyword, max_results)
                by_platform[platform] = len(articles)

                # 存入数据库
                for raw in articles:
                    async with async_session() as db:
                        article = Article(
                            user_id=uuid.UUID(user_id),
                            title=raw["title"],
                            content=raw["content"],
                            summary=raw.get("summary", ""),
                            source_url=raw.get("source_url", ""),
                            source_platform=raw.get("source_platform", platform),
                            source_author=raw.get("source_author", ""),
                            collection_method=raw.get("collection_method", "api"),
                            tags=raw.get("tags", []),
                        )
                        db.add(article)
                        await db.flush()
                        all_articles.append(str(article.id))
                logger.info("平台 %s 采集完成: %d 篇", platform, len(articles))
            except Exception as e:
                errors.append(f"平台 {platform} 采集失败: {e}")
                logger.error("采集失败 %s: %s", platform, e)

        # 更新任务状态
        status = "completed" if not errors else ("partial" if all_articles else "failed")
        async with async_session() as db:
            await db.execute(
                update(CollectionTask).where(CollectionTask.id == uuid.UUID(task_id)).values(
                    status=status,
                    collected_count=len(all_articles),
                    error_message="; ".join(errors) if errors else None,
                    result_summary={"by_platform": by_platform, "errors": errors},
                )
            )
            await db.commit()

        # 触发事件
        article_uuids = [uuid.UUID(aid) for aid in all_articles]
        if status == "completed":
            await EventBus.emit(Events.COLLECT_COMPLETED, {
                "task_id": task_id,
                "article_ids": article_uuids,
                "user_id": user_id,
            })
        elif status == "partial":
            await EventBus.emit(Events.COLLECT_PARTIAL, {
                "task_id": task_id,
                "article_ids": article_uuids,
                "user_id": user_id,
                "errors": errors,
            })

    @staticmethod
    async def get_task(task_id: uuid.UUID) -> CollectionTask | None:
        async with async_session() as db:
            result = await db.execute(select(CollectionTask).where(CollectionTask.id == task_id))
            return result.scalar_one_or_none()

    @staticmethod
    async def list_tasks(user_id: uuid.UUID, page: int = 1, page_size: int = 20) -> tuple[list, int]:
        async with async_session() as db:
            from app.utils.pagination import paginate, PageParams
            query = (
                select(CollectionTask)
                .where(CollectionTask.user_id == user_id)
                .order_by(CollectionTask.created_at.desc())
            )
            return await paginate(query, PageParams(page=page, page_size=page_size), db)
