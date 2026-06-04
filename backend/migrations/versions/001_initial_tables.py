"""001 - 初始表结构

Revision ID: 001_initial
Revises: None
Create Date: 2025-01-01
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "001_initial"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # users
    op.create_table(
        "users",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("username", sa.String(50), unique=True, nullable=False),
        sa.Column("email", sa.String(100), unique=True, nullable=False),
        sa.Column("hashed_password", sa.String(255), nullable=False),
        sa.Column("role", sa.String(20), nullable=False, server_default="user"),
        sa.Column("status", sa.String(20), nullable=False, server_default="active"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), onupdate=sa.func.now()),
    )

    # user_quota
    op.create_table(
        "user_quota",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("user_id", sa.String(36), sa.ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False),
        sa.Column("daily_llm_tokens", sa.Integer(), nullable=False, server_default="100000"),
        sa.Column("daily_rewrites", sa.Integer(), nullable=False, server_default="50"),
        sa.Column("daily_collections", sa.Integer(), nullable=False, server_default="30"),
        sa.Column("daily_uploads", sa.Integer(), nullable=False, server_default="100"),
        sa.Column("used_llm_tokens", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("used_rewrites", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("used_collections", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("used_uploads", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("quota_reset_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), onupdate=sa.func.now()),
    )

    # article
    op.create_table(
        "article",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("title", sa.String(200), nullable=False),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column("summary", sa.Text()),
        sa.Column("source_url", sa.String(500)),
        sa.Column("source_platform", sa.String(30)),
        sa.Column("source_author", sa.String(100)),
        sa.Column("collection_method", sa.String(20), nullable=False, server_default="api"),
        sa.Column("upload_file_id", sa.String(36), sa.ForeignKey("upload_file.id", ondelete="SET NULL")),
        sa.Column("user_id", sa.String(36), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("is_favorited", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("tags", postgresql.ARRAY(sa.String()), server_default="{}"),
        sa.Column("view_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), onupdate=sa.func.now()),
    )
    op.create_index("ix_article_source_platform", "article", ["source_platform"])
    op.create_index("ix_article_collection_method", "article", ["collection_method"])
    op.create_index("ix_article_user_tags", "article", ["user_id", sa.text("tags")], postgresql_using="gin")

    # collection_task
    op.create_table(
        "collection_task",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("user_id", sa.String(36), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("keyword", sa.String(50), nullable=False),
        sa.Column("platforms", postgresql.ARRAY(sa.String()), nullable=False),
        sa.Column("max_results", sa.Integer(), nullable=False, server_default="20"),
        sa.Column("status", sa.String(20), nullable=False, server_default="pending"),
        sa.Column("collected_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("error_message", sa.Text()),
        sa.Column("started_at", sa.DateTime(timezone=True)),
        sa.Column("completed_at", sa.DateTime(timezone=True)),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    # upload_batch
    op.create_table(
        "upload_batch",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("user_id", sa.String(36), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("total_count", sa.Integer(), nullable=False),
        sa.Column("success_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("fail_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("threshold_met", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("status", sa.String(20), nullable=False, server_default="processing"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), onupdate=sa.func.now()),
    )

    # upload_file
    op.create_table(
        "upload_file",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("batch_id", sa.String(36), sa.ForeignKey("upload_batch.id", ondelete="CASCADE"), nullable=False),
        sa.Column("original_name", sa.String(255), nullable=False),
        sa.Column("file_format", sa.String(10), nullable=False),
        sa.Column("file_size", sa.Integer(), nullable=False),
        sa.Column("status", sa.String(20), nullable=False, server_default="pending"),
        sa.Column("parsed_title", sa.String(200)),
        sa.Column("article_id", sa.String(36), sa.ForeignKey("article.id", ondelete="SET NULL")),
        sa.Column("error_message", sa.Text()),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), onupdate=sa.func.now()),
    )

    # analysis_result
    op.create_table(
        "analysis_result",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("article_id", sa.String(36), sa.ForeignKey("article.id", ondelete="CASCADE"), unique=True, nullable=False),
        sa.Column("hotness_score", postgresql.JSONB()),
        sa.Column("emotion_tags", postgresql.ARRAY(sa.String())),
        sa.Column("title_formulas", postgresql.JSONB()),
        sa.Column("structure_template", postgresql.JSONB()),
        sa.Column("interaction_analysis", postgresql.JSONB()),
        sa.Column("top_3_genes", postgresql.JSONB()),
        sa.Column("platform_fit", postgresql.JSONB()),
        sa.Column("raw_llm_response", postgresql.JSONB()),
        sa.Column("llm_model", sa.String(50)),
        sa.Column("llm_tokens_used", sa.Integer()),
        sa.Column("analysis_version", sa.String(10), nullable=False, server_default="1.0"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    # rewrite_task
    op.create_table(
        "rewrite_task",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("article_id", sa.String(36), sa.ForeignKey("article.id", ondelete="CASCADE"), nullable=False),
        sa.Column("user_id", sa.String(36), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("target_platforms", postgresql.ARRAY(sa.String()), nullable=False),
        sa.Column("style_overrides", postgresql.JSONB()),
        sa.Column("status", sa.String(20), nullable=False, server_default="pending"),
        sa.Column("llm_call_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("started_at", sa.DateTime(timezone=True)),
        sa.Column("completed_at", sa.DateTime(timezone=True)),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    # rewrite_result
    op.create_table(
        "rewrite_result",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("task_id", sa.String(36), sa.ForeignKey("rewrite_task.id", ondelete="CASCADE"), nullable=False),
        sa.Column("platform", sa.String(30), nullable=False),
        sa.Column("title", sa.String(200)),
        sa.Column("content", sa.Text()),
        sa.Column("similarity_score", sa.Float()),
        sa.Column("word_count", sa.Integer()),
        sa.Column("quality_score", sa.Float()),
        sa.Column("rewrite_notes", sa.Text()),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.UniqueConstraint("task_id", "platform", name="uq_task_platform"),
    )

    # favorite_group
    op.create_table(
        "favorite_group",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("user_id", sa.String(36), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("name", sa.String(50), nullable=False),
        sa.Column("sort_order", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("color", sa.String(7)),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    # favorite
    op.create_table(
        "favorite",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("user_id", sa.String(36), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("article_id", sa.String(36), sa.ForeignKey("article.id", ondelete="CASCADE"), nullable=False),
        sa.Column("group_id", sa.String(36), sa.ForeignKey("favorite_group.id", ondelete="CASCADE"), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.UniqueConstraint("user_id", "article_id", "group_id", name="uq_favorite"),
    )

    # admin_audit_log
    op.create_table(
        "admin_audit_log",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("admin_id", sa.String(36), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("action", sa.String(50), nullable=False),
        sa.Column("target_type", sa.String(30)),
        sa.Column("target_id", sa.String(36)),
        sa.Column("detail", postgresql.JSONB()),
        sa.Column("ip_address", sa.String(45)),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    # api_keys
    op.create_table(
        "api_keys",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("service", sa.String(30), nullable=False),
        sa.Column("encrypted_key", sa.Text(), nullable=False),
        sa.Column("key_hint", sa.String(10)),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default="true"),
        sa.Column("expires_at", sa.DateTime(timezone=True)),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), onupdate=sa.func.now()),
    )
    op.create_index("uq_api_keys_service", "api_keys", ["service"], unique=True)

    # system_config
    op.create_table(
        "system_config",
        sa.Column("key", sa.String(100), primary_key=True),
        sa.Column("value", postgresql.JSONB(), nullable=False),
        sa.Column("description", sa.String(200)),
        sa.Column("group", sa.String(30)),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), onupdate=sa.func.now()),
    )

    # 预置系统配置
    op.execute("""
        INSERT INTO system_config (key, value, description, "group") VALUES
        ('upload_threshold', '10', '上传文档自动触发分析的最低篇数', 'upload'),
        ('max_file_size', '5242880', '单文件最大字节数(5MB)', 'upload'),
        ('rewrite_similarity_threshold', '0.6', '改写相似度上限', 'rewrite'),
        ('daily_llm_token_limit', '100000', '默认每日LLM Token上限', 'quota'),
        ('collection_rate_limit', '5', '采集接口每分钟限流次数', 'rate_limit')
    """)


def downgrade() -> None:
    op.drop_table("system_config")
    op.drop_table("api_keys")
    op.drop_table("admin_audit_log")
    op.drop_table("favorite")
    op.drop_table("favorite_group")
    op.drop_table("rewrite_result")
    op.drop_table("rewrite_task")
    op.drop_table("analysis_result")
    op.drop_table("upload_file")
    op.drop_table("upload_batch")
    op.drop_table("article")
    op.drop_table("collection_task")
    op.drop_table("user_quota")
    op.drop_table("users")
