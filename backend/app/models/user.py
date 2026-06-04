"""用户与配额模型"""
import uuid
from datetime import datetime

from sqlalchemy import String, Integer, DateTime, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class User(Base):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    username: Mapped[str] = mapped_column(String(50), unique=True, nullable=False, index=True)
    email: Mapped[str] = mapped_column(String(100), unique=True, nullable=False, index=True)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[str] = mapped_column(String(20), nullable=False, default="user")  # admin | user
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="active")  # active | banned | suspended
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # ── 关系 ──
    quota: Mapped["UserQuota"] = relationship("UserQuota", back_populates="user", uselist=False, lazy="selectin")

    @property
    def is_admin(self) -> bool:
        return self.role == "admin"


class UserQuota(Base):
    __tablename__ = "user_quota"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False, unique=True, index=True)
    daily_llm_tokens: Mapped[int] = mapped_column(Integer, nullable=False, default=100000)
    daily_rewrites: Mapped[int] = mapped_column(Integer, nullable=False, default=50)
    daily_collections: Mapped[int] = mapped_column(Integer, nullable=False, default=30)
    daily_uploads: Mapped[int] = mapped_column(Integer, nullable=False, default=100)
    used_llm_tokens: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    used_rewrites: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    used_collections: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    used_uploads: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    quota_reset_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # ── 关系 ──
    user: Mapped["User"] = relationship("User", back_populates="quota")
