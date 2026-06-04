"""文章素材模型"""
import uuid
from datetime import datetime

from sqlalchemy import String, Text, Boolean, Integer, DateTime, ForeignKey, func
from sqlalchemy.dialects.postgresql import UUID, ARRAY, JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Article(Base):
    __tablename__ = "articles"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False, index=True)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    summary: Mapped[str] = mapped_column(Text, nullable=True)
    source_url: Mapped[str] = mapped_column(String(500), nullable=True)
    source_platform: Mapped[str] = mapped_column(String(30), nullable=True, index=True)
    source_author: Mapped[str] = mapped_column(String(100), nullable=True)
    collection_method: Mapped[str] = mapped_column(String(20), nullable=False, default="api")
    # api | crawl | upload | import
    upload_file_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("upload_files.id", ondelete="SET NULL"), nullable=True
    )
    is_favorited: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    tags: Mapped[list[str] | None] = mapped_column(ARRAY(String), nullable=True)
    extra: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # ── 关系 ──
    analysis: Mapped["AnalysisResult | None"] = relationship("AnalysisResult", back_populates="article", uselist=False, lazy="selectin")
    upload_file: Mapped["UploadFile | None"] = relationship("UploadFile", back_populates="article", lazy="selectin")
