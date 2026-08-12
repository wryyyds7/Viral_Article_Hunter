"""跨平台改写服务"""
import uuid
import logging

from sqlalchemy import select, update

from app.database import async_session
from app.models import RewriteTask, RewriteResult, Article
from app.llm.client import llm_client
from app.llm.prompts.prompt_builder import build_rewrite_prompt, build_quality_check_prompt
from app.llm.adapter import adapt_rewrite_output
from app.utils.text_processor import calculate_similarity, count_words
from app.event_bus import EventBus, Events
from app.config import settings

logger = logging.getLogger(__name__)


class RewriteService:

    @staticmethod
    async def create_task(
        user_id: uuid.UUID,
        article_id: uuid.UUID,
        target_platforms: list[str],
        style_overrides: dict | None = None,
    ) -> RewriteTask:
        """创建改写任务"""
        async with async_session() as db:
            task = RewriteTask(
                user_id=user_id,
                article_id=article_id,
                target_platforms=target_platforms,
                style_overrides=style_overrides,
                status="pending",
            )
            db.add(task)
            await db.commit()
            await db.refresh(task)

        # 提交到任务队列
        from app.scheduler.task_queue import task_queue, TaskType, TaskPriority
        await task_queue.submit(
            TaskType.REWRITE,
            {
                "task_id": str(task.id),
                "article_id": str(article_id),
                "target_platforms": target_platforms,
                "style_overrides": style_overrides,
                "user_id": str(user_id),
            },
            priority=TaskPriority.NORMAL,
        )
        return task

    @staticmethod
    async def execute_rewrite(
        task_id: str,
        article_id: str,
        target_platforms: list[str],
        style_overrides: dict | None,
        user_id: str,
    ):
        """执行改写（由 worker 调用）"""
        task_uuid = uuid.UUID(task_id)
        article_uuid = uuid.UUID(article_id)

        # 读取原文
        async with async_session() as db:
            result = await db.execute(select(Article).where(Article.id == article_uuid))
            article = result.scalar_one_or_none()
            if not article:
                logger.error("文章不存在: %s", article_id)
                return

            # 更新任务状态
            await db.execute(
                update(RewriteTask).where(RewriteTask.id == task_uuid).values(status="processing")
            )
            await db.commit()

        completed_platforms = []
        failed_platforms = []

        for platform in target_platforms:
            try:
                # 构建 Prompt
                messages = build_rewrite_prompt(
                    article.title, article.content, platform, style_overrides
                )

                # 调用 LLM
                response = await llm_client.chat(
                    messages=messages,
                    temperature=0.8,
                    response_format={"type": "json_object"},
                )
                raw_text = response["choices"][0]["message"]["content"]
                tokens_used = response.get("usage", {}).get("total_tokens", 0)

                # 适配
                adapted, errors = adapt_rewrite_output(raw_text, article.content)
                if adapted is None:
                    failed_platforms.append(platform)
                    logger.error("改写适配失败 %s: %s", platform, errors)
                    continue

                # 计算相似度
                similarity = calculate_similarity(article.content, adapted.get("content", ""))

                # 质量自检（如果相似度 > 0.6 则警告）
                if similarity > 0.6:
                    logger.warning("相似度过高 %s: %.2f", platform, similarity)

                # LLM 质量自检
                quality_score = None
                try:
                    qc_messages = build_quality_check_prompt(
                        article.title, article.content,
                        adapted.get("title", ""), adapted.get("content", ""),
                        platform,
                    )
                    qc_response = await llm_client.chat(
                        messages=qc_messages,
                        temperature=0.2,
                        response_format={"type": "json_object"},
                    )
                    qc_raw = qc_response["choices"][0]["message"]["content"]
                    import json
                    quality_score = json.loads(qc_raw) if qc_raw.strip().startswith("{") else None
                except Exception as qc_err:
                    logger.debug("质量自检跳过 %s: %s", platform, qc_err)

                # 存入结果
                async with async_session() as db:
                    rewrite_result = RewriteResult(
                        task_id=task_uuid,
                        platform=platform,
                        title=adapted.get("title"),
                        content=adapted.get("content", ""),
                        similarity_score=similarity,
                        word_count=count_words(adapted.get("content", "")),
                        quality_score=quality_score,
                        rewrite_notes=adapted.get("rewrite_notes"),
                        raw_llm_response={"raw": raw_text},
                        llm_model=response.get("model", llm_client.model),
                        llm_tokens_used=tokens_used,
                    )
                    db.add(rewrite_result)
                    await db.commit()

                completed_platforms.append(platform)

                # SSE 事件
                await EventBus.emit(Events.REWRITE_PLATFORM_COMPLETED, {
                    "task_id": task_id,
                    "platform": platform,
                    "result_id": str(rewrite_result.id),
                    "user_id": user_id,
                })

            except Exception as e:
                failed_platforms.append(platform)
                logger.error("改写失败 %s: %s", platform, e)

        # 更新任务状态
        status = "completed" if not failed_platforms else ("partial" if completed_platforms else "failed")
        async with async_session() as db:
            await db.execute(
                update(RewriteTask).where(RewriteTask.id == task_uuid).values(
                    status=status,
                    llm_call_count=len(completed_platforms),
                    error_message=f"失败平台: {failed_platforms}" if failed_platforms else None,
                )
            )
            await db.commit()

        # 触发完成事件
        event = Events.REWRITE_COMPLETED if status == "completed" else Events.REWRITE_PARTIAL
        await EventBus.emit(event, {
            "task_id": task_id,
            "completed_platforms": completed_platforms,
            "failed_platforms": failed_platforms,
            "user_id": user_id,
        })

    @staticmethod
    async def get_task(task_id: uuid.UUID) -> tuple[RewriteTask | None, list[RewriteResult]]:
        async with async_session() as db:
            result = await db.execute(select(RewriteTask).where(RewriteTask.id == task_id))
            task = result.scalar_one_or_none()
            results = []
            if task:
                r = await db.execute(select(RewriteResult).where(RewriteResult.task_id == task_id))
                results = list(r.scalars().all())
            return task, results

    @staticmethod
    async def list_tasks(user_id: uuid.UUID, page: int = 1, page_size: int = 20) -> tuple[list, int]:
        async with async_session() as db:
            from app.utils.pagination import paginate, PageParams
            query = (
                select(RewriteTask)
                .where(RewriteTask.user_id == user_id)
                .order_by(RewriteTask.created_at.desc())
            )
            return await paginate(query, PageParams(page=page, page_size=page_size), db)
