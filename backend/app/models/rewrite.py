"""改写任务与结果模型"""
import uuid
from datetime import datetime

from sqlalchemy import String, Integer, Float, Text, DateTime, ForeignKey, UniqueConstraint, func
from sqlalchemy.dialects.postgresql import UUID, ARRAY, JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class RewriteTask(Base):
    __tablename__ = "rewrite_tasks"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False, index=True)
    article_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("articles.id", ondelete="CASCADE"), nullable=False, index=True
    )
    target_platforms: Mapped[list] = mapped_column(ARRAY(String), nullable=False)
    style_overrides: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    # {"tone": "专业", "emoji_density": 3}
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="pending")
    # pending | processing | completed | failed
    llm_call_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # ── 关系 ──
    article: Mapped["Article"] = relationship("Article", lazy="selectin")
    results: Mapped[list["RewriteResult"]] = relationship("RewriteResult", back_populates="task", lazy="selectin")


class RewriteResult(Base):
    __tablename__ = "rewrite_results"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    task_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("rewrite_tasks.id", ondelete="CASCADE"), nullable=False, index=True
    )
    platform: Mapped[str] = mapped_column(String(30), nullable=False)
    title: Mapped[str | None] = mapped_column(String(200), nullable=True)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    similarity_score: Mapped[float | None] = mapped_column(Float, nullable=True)
    quality_score: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    # {"readability": 85, "style_match": 90, "originality": 78, "compliance": 95}
    word_count: Mapped[int | None] = mapped_column(Integer, nullable=True)
    rewrite_notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    # 改写说明
    raw_llm_response: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    llm_model: Mapped[str | None] = mapped_column(String(50), nullable=True)
    llm_tokens_used: Mapped[int | None] = mapped_column(Integer, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (
        UniqueConstraint("task_id", "platform", name="uq_task_platform"),
    )

    # ── 关系 ──
    task: Mapped["RewriteTask"] = relationship("RewriteTask", back_populates="results")
