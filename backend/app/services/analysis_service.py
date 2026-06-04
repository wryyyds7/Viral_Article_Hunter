"""爆款基因分析服务"""
import uuid
import logging

from sqlalchemy import select, update

from app.database import async_session
from app.models import Article, AnalysisResult
from app.llm.client import llm_client
from app.llm.prompts.prompt_builder import build_analysis_prompt, build_batch_analysis_prompt
from app.llm.adapter import adapt_analysis_output
from app.event_bus import EventBus, Events

logger = logging.getLogger(__name__)


class AnalysisService:

    @staticmethod
    async def auto_analyze(article_ids: list[uuid.UUID], user_id: str | None = None):
        """自动触发分析（由 EventBus 调用）"""
        for article_id in article_ids:
            # 检查是否已有分析结果
            async with async_session() as db:
                existing = await db.execute(
                    select(AnalysisResult).where(AnalysisResult.article_id == article_id)
                )
                if existing.scalar_one_or_none():
                    logger.debug("文章 %s 已有分析结果，跳过", article_id)
                    continue

            # 提交分析任务
            from app.scheduler.task_queue import task_queue, TaskType, TaskPriority
            await task_queue.submit(
                TaskType.ANALYZE,
                {
                    "article_id": str(article_id),
                    "user_id": user_id or "",
                },
                priority=TaskPriority.HIGH,
            )

    @staticmethod
    async def execute_analysis(article_id: str, user_id: str):
        """执行分析（由 worker 调用）"""
        article_uuid = uuid.UUID(article_id)

        # 读取文章
        async with async_session() as db:
            result = await db.execute(select(Article).where(Article.id == article_uuid))
            article = result.scalar_one_or_none()
            if not article:
                logger.error("文章不存在: %s", article_id)
                return

        # 构建 Prompt
        messages = build_analysis_prompt(article.title, article.content)

        # 调用 LLM
        try:
            response = await llm_client.chat(
                messages=messages,
                temperature=0.3,
                response_format={"type": "json_object"},
            )
            raw_text = response["choices"][0]["message"]["content"]
            tokens_used = response.get("usage", {}).get("total_tokens", 0)
            model_used = response.get("model", llm_client.model)

        except Exception as e:
            logger.error("LLM 调用失败: %s", e)
            await EventBus.emit(Events.ANALYZE_FAILED, {
                "article_id": article_id,
                "error": str(e),
            })
            return

        # 适配层处理
        adapted, errors = adapt_analysis_output(raw_text)
        if adapted is None:
            logger.error("分析结果适配失败: %s", errors)
            return

        # 存入数据库
        async with async_session() as db:
            analysis = AnalysisResult(
                article_id=article_uuid,
                hotness_score=adapted.get("hotness_score", {"level": "C", "score": 50, "factors": []}),
                emotion_tags=adapted.get("emotion_tags"),
                title_formulas=adapted.get("title_formulas"),
                structure_template=adapted.get("structure_template"),
                top_3_genes=adapted.get("top_3_genes"),
                platform_fit=adapted.get("platform_fit"),
                interaction_analysis=adapted.get("interaction_analysis"),
                raw_llm_response={"raw": raw_text},
                llm_model=model_used,
                llm_tokens_used=tokens_used,
            )
            # 先删除旧结果（如果有）
            await db.execute(
                AnalysisResult.__table__.delete().where(AnalysisResult.article_id == article_uuid)
            )
            db.add(analysis)
            await db.commit()

        logger.info("分析完成: %s, tokens=%d, errors=%s", article_id, tokens_used, errors)

        # 触发事件
        await EventBus.emit(Events.ANALYZE_COMPLETED, {
            "article_id": article_id,
            "hotness_level": adapted.get("hotness_score", {}).get("level", "C"),
            "user_id": user_id,
        })

    @staticmethod
    async def get_analysis(article_id: uuid.UUID) -> AnalysisResult | None:
        async with async_session() as db:
            result = await db.execute(
                select(AnalysisResult).where(AnalysisResult.article_id == article_id)
            )
            return result.scalar_one_or_none()

    @staticmethod
    async def batch_analyze(user_id: uuid.UUID, article_ids: list[uuid.UUID]) -> dict:
        """批量触发分析"""
        triggered = 0
        skipped = 0
        task_ids = []

        for aid in article_ids:
            async with async_session() as db:
                existing = await db.execute(
                    select(AnalysisResult).where(AnalysisResult.article_id == aid)
                )
                if existing.scalar_one_or_none():
                    skipped += 1
                    continue

            from app.scheduler.task_queue import task_queue, TaskType, TaskPriority
            task_id = await task_queue.submit(
                TaskType.ANALYZE,
                {"article_id": str(aid), "user_id": str(user_id)},
                priority=TaskPriority.HIGH,
            )
            triggered += 1
            task_ids.append(uuid.UUID(task_id))

        return {
            "total": len(article_ids),
            "triggered": triggered,
            "skipped": skipped,
            "task_ids": task_ids,
        }
