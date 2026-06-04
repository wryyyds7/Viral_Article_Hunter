"""爆款基因分析结果模型"""
import uuid
from datetime import datetime

from sqlalchemy import String, Integer, Float, DateTime, ForeignKey, func
from sqlalchemy.dialects.postgresql import UUID, ARRAY, JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class AnalysisResult(Base):
    __tablename__ = "analysis_results"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    article_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("articles.id", ondelete="CASCADE"), nullable=False, unique=True, index=True
    )
    # ── 爆款基因6维度 ──
    hotness_score: Mapped[dict] = mapped_column(JSONB, nullable=False)
    # {"level": "S", "score": 92, "factors": ["..."]}
    emotion_tags: Mapped[list | None] = mapped_column(ARRAY(String), nullable=True)
    # ["好奇-惊喜", "焦虑-紧迫"]
    title_formulas: Mapped[list | None] = mapped_column(JSONB, nullable=True)
    # [{"name": "数字+痛点", "confidence": 0.9}]
    structure_template: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    # {"type": "list", "sections": [...], "golden_ratio": "..."}
    top_3_genes: Mapped[list | None] = mapped_column(JSONB, nullable=True)
    # [{"rank": 1, "gene": "标题公式", "reason": "..."}]
    platform_fit: Mapped[list | None] = mapped_column(JSONB, nullable=True)
    # [{"platform": "xiaohongshu", "fit_score": 85}]
    interaction_analysis: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    # 互动分析
    # ── LLM 元信息 ──
    raw_llm_response: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    llm_model: Mapped[str | None] = mapped_column(String(50), nullable=True)
    llm_tokens_used: Mapped[int | None] = mapped_column(Integer, nullable=True)
    # ── 时间戳 ──
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    # ── 关系 ──
    article: Mapped["Article"] = relationship("Article", back_populates="analysis")
