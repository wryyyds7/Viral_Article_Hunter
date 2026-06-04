"""管理员审计日志模型"""
import uuid
from datetime import datetime

from sqlalchemy import String, DateTime, ForeignKey, func, Index
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class AdminAuditLog(Base):
    __tablename__ = "admin_audit_log"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    admin_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False, index=True)
    action: Mapped[str] = mapped_column(String(50), nullable=False)
    # 12种: ban_user | unban_user | change_role | adjust_quota | ...
    target_type: Mapped[str | None] = mapped_column(String(30), nullable=True)
    # user | article | api_key | system_config
    target_id: Mapped[str | None] = mapped_column(String(100), nullable=True)
    detail: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    ip_address: Mapped[str | None] = mapped_column(String(45), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    # 注意：此表只有INSERT，没有UPDATE/DELETE（不可篡改）

    __table_args__ = (
        Index("ix_admin_audit_admin_time", "admin_id", "created_at"),
    )
