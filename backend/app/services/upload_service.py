"""上传服务"""
import uuid
import logging

from sqlalchemy import select, update

from app.database import async_session
from app.models import UploadBatch, UploadFile, Article
from app.parsers.html_parser import get_parser
from app.event_bus import EventBus, Events
from app.config import settings

logger = logging.getLogger(__name__)

# 支持的格式与大小限制
SUPPORTED_FORMATS = {"txt", "md", "docx", "pdf", "html"}
MAX_FILE_SIZE = 5 * 1024 * 1024  # 5MB
UPLOAD_THRESHOLD = settings.UPLOAD_THRESHOLD


class UploadService:

    @staticmethod
    async def create_batch(user_id: uuid.UUID, files: list[dict]) -> UploadBatch:
        """创建上传批次并逐文件解析"""
        async with async_session() as db:
            batch = UploadBatch(
                user_id=user_id,
                total_count=len(files),
            )
            db.add(batch)
            await db.flush()

            success_count = 0
            fail_count = 0

            for file_info in files:
                upload_file = UploadFile(
                    batch_id=batch.id,
                    original_name=file_info["filename"],
                    file_format=file_info["format"],
                    file_size=file_info["size"],
                )
                db.add(upload_file)
                await db.flush()

                # 解析文件
                try:
                    parsed = await UploadService._parse_file(upload_file, file_info.get("content", b""))
                    if parsed and parsed.get("content"):
                        # 创建文章
                        article = Article(
                            user_id=user_id,
                            title=parsed.get("title", file_info["filename"]),
                            content=parsed["content"],
                            source_platform="upload",
                            collection_method="upload",
                            upload_file_id=upload_file.id,
                            tags=parsed.get("tags", []),
                        )
                        db.add(article)
                        await db.flush()

                        # 更新文件状态
                        upload_file.status = "success"
                        upload_file.parsed_title = parsed.get("title")
                        upload_file.parsed_content = parsed["content"][:500]
                        upload_file.article_id = article.id
                        success_count += 1
                    else:
                        upload_file.status = "failed"
                        upload_file.error_message = "解析结果为空"
                        fail_count += 1
                except Exception as e:
                    upload_file.status = "failed"
                    upload_file.error_message = str(e)[:500]
                    fail_count += 1
                    logger.error("文件解析失败 %s: %s", file_info["filename"], e)

            # 更新批次
            threshold_met = success_count >= UPLOAD_THRESHOLD
            batch.success_count = success_count
            batch.fail_count = fail_count
            batch.threshold_met = threshold_met
            batch.status = "completed" if fail_count == 0 else ("partial_failed" if success_count > 0 else "all_failed")

            await db.commit()
            await db.refresh(batch)

        # 触发事件
        if threshold_met and success_count > 0:
            # 获取所有成功解析的文章ID
            async with async_session() as db:
                r = await db.execute(
                    select(UploadFile.article_id).where(
                        UploadFile.batch_id == batch.id,
                        UploadFile.status == "success",
                        UploadFile.article_id.isnot(None),
                    )
                )
                article_ids = [row[0] for row in r.all() if row[0]]

            await EventBus.emit(Events.UPLOAD_PARSED, {
                "batch_id": str(batch.id),
                "article_ids": article_ids,
                "user_id": str(user_id),
                "threshold_met": True,
            })
        elif success_count > 0 and not threshold_met:
            await EventBus.emit(Events.UPLOAD_PARSED_BELOW_THRESHOLD, {
                "batch_id": str(batch.id),
                "success_count": success_count,
                "threshold": UPLOAD_THRESHOLD,
                "user_id": str(user_id),
            })

        return batch

    @staticmethod
    async def _parse_file(upload_file: UploadFile, content: bytes) -> dict | None:
        """解析单个文件"""
        parser = get_parser(upload_file.file_format)
        if not parser:
            return None
        return await parser.parse(content, upload_file.original_name)

    @staticmethod
    async def parse_file(file_id: str, file_content: bytes | None = None):
        """解析文件（由 worker 调用）"""
        file_uuid = uuid.UUID(file_id)
        async with async_session() as db:
            result = await db.execute(select(UploadFile).where(UploadFile.id == file_uuid))
            upload_file = result.scalar_one_or_none()
            if not upload_file:
                return

        if file_content:
            parsed = await UploadService._parse_file(upload_file, file_content)
            if parsed:
                async with async_session() as db:
                    upload_file.status = "success"
                    upload_file.parsed_title = parsed.get("title")
                    upload_file.parsed_content = parsed.get("content", "")[:500]
                    await db.commit()

    @staticmethod
    async def get_batch(batch_id: uuid.UUID) -> UploadBatch | None:
        async with async_session() as db:
            result = await db.execute(select(UploadBatch).where(UploadBatch.id == batch_id))
            return result.scalar_one_or_none()

    @staticmethod
    async def get_progress(batch_id: uuid.UUID) -> dict:
        async with async_session() as db:
            batch_result = await db.execute(select(UploadBatch).where(UploadBatch.id == batch_id))
            batch = batch_result.scalar_one_or_none()
            if not batch:
                return {}

            files_result = await db.execute(
                select(UploadFile).where(UploadFile.batch_id == batch_id)
            )
            files = list(files_result.scalars().all())

            return {
                "batch_id": str(batch_id),
                "total": batch.total_count,
                "completed": sum(1 for f in files if f.status in ("success", "failed")),
                "failed": sum(1 for f in files if f.status == "failed"),
                "processing": sum(1 for f in files if f.status in ("pending", "parsing")),
                "threshold_met": batch.threshold_met,
            }
