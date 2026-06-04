/* eslint-disable @typescript-eslint/ban-ts-comment */
// ABOUTME: Auto-generated Drizzle ORM schema - used by coze-coding-ai CLI only
// The actual runtime uses Supabase client directly (see server/src/storage/database/supabase-client.ts)
// @ts-nocheck
import { sql } from "drizzle-orm";
import { pgTable, serial, varchar, text, integer, boolean, real, timestamp, jsonb, index, uuid } from "drizzle-orm/pg-core";

// Keep system table
export const healthCheck = pgTable("health_check", {
  id: serial().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
});

// ==================== User System ====================

export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    username: varchar("username", { length: 50 }).notNull().unique(),
    email: varchar("email", { length: 100 }).notNull().unique(),
    hashed_password: varchar("hashed_password", { length: 255 }).notNull(),
    role: varchar("role", { length: 20 }).notNull().default("user"),
    status: varchar("status", { length: 20 }).notNull().default("active"),
    created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updated_at: timestamp("updated_at", { withTimezone: true }).defaultNow(),
  },
  (table) => [
    index("users_email_idx").on(table.email),
    index("users_role_idx").on(table.role),
    index("users_status_idx").on(table.status),
  ]
);

export const userQuota = pgTable(
  "user_quota",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    user_id: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    daily_llm_tokens: integer("daily_llm_tokens").notNull().default(100000),
    daily_rewrites: integer("daily_rewrites").notNull().default(50),
    daily_collections: integer("daily_collections").notNull().default(30),
    daily_uploads: integer("daily_uploads").notNull().default(100),
    used_llm_tokens: integer("used_llm_tokens").notNull().default(0),
    used_rewrites: integer("used_rewrites").notNull().default(0),
    used_collections: integer("used_collections").notNull().default(0),
    used_uploads: integer("used_uploads").notNull().default(0),
    quota_reset_at: timestamp("quota_reset_at", { withTimezone: true }).defaultNow().notNull(),
    created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updated_at: timestamp("updated_at", { withTimezone: true }).defaultNow(),
  },
  (table) => [
    index("user_quota_user_id_idx").on(table.user_id),
  ]
);

// ==================== Data Ingestion ====================

export const collectionTask = pgTable(
  "collection_task",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    user_id: uuid("user_id").notNull().references(() => users.id),
    keyword: varchar("keyword", { length: 50 }).notNull(),
    platforms: jsonb("platforms").notNull().default(sql`'[]'::jsonb`),
    max_results: integer("max_results").notNull().default(20),
    status: varchar("status", { length: 20 }).notNull().default("pending"),
    collected_count: integer("collected_count").notNull().default(0),
    error_message: text("error_message"),
    created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updated_at: timestamp("updated_at", { withTimezone: true }).defaultNow(),
  },
  (table) => [
    index("collection_task_user_id_idx").on(table.user_id),
    index("collection_task_status_idx").on(table.status),
    index("collection_task_created_at_idx").on(table.created_at),
  ]
);

export const uploadBatch = pgTable(
  "upload_batch",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    user_id: uuid("user_id").notNull().references(() => users.id),
    total_count: integer("total_count").notNull().default(0),
    success_count: integer("success_count").notNull().default(0),
    fail_count: integer("fail_count").notNull().default(0),
    threshold_met: boolean("threshold_met").notNull().default(false),
    status: varchar("status", { length: 20 }).notNull().default("processing"),
    created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updated_at: timestamp("updated_at", { withTimezone: true }).defaultNow(),
  },
  (table) => [
    index("upload_batch_user_id_idx").on(table.user_id),
    index("upload_batch_status_idx").on(table.status),
  ]
);

export const uploadFile = pgTable(
  "upload_file",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    batch_id: uuid("batch_id").notNull().references(() => uploadBatch.id, { onDelete: "cascade" }),
    user_id: uuid("user_id").notNull().references(() => users.id),
    original_name: varchar("original_name", { length: 255 }).notNull(),
    file_format: varchar("file_format", { length: 10 }).notNull(),
    file_size: integer("file_size").notNull(),
    storage_key: varchar("storage_key", { length: 500 }),
    status: varchar("status", { length: 20 }).notNull().default("pending"),
    parsed_title: varchar("parsed_title", { length: 200 }),
    article_id: uuid("article_id").references(() => article.id),
    error_message: text("error_message"),
    created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updated_at: timestamp("updated_at", { withTimezone: true }).defaultNow(),
  },
  (table) => [
    index("upload_file_batch_id_idx").on(table.batch_id),
    index("upload_file_user_id_idx").on(table.user_id),
    index("upload_file_status_idx").on(table.status),
  ]
);

// ==================== Core Content ====================

export const article = pgTable(
  "article",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    user_id: uuid("user_id").references(() => users.id),
    title: varchar("title", { length: 200 }).notNull(),
    content: text("content").notNull(),
    summary: text("summary"),
    source_url: varchar("source_url", { length: 500 }),
    source_platform: varchar("source_platform", { length: 30 }),
    source_author: varchar("source_author", { length: 100 }),
    collection_method: varchar("collection_method", { length: 20 }),
    collection_task_id: uuid("collection_task_id").references(() => collectionTask.id),
    upload_file_id: uuid("upload_file_id").references(() => uploadFile.id),
    is_favorited: boolean("is_favorited").notNull().default(false),
    tags: jsonb("tags").default(sql`'[]'::jsonb`),
    created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updated_at: timestamp("updated_at", { withTimezone: true }).defaultNow(),
  },
  (table) => [
    index("article_user_id_idx").on(table.user_id),
    index("article_source_platform_idx").on(table.source_platform),
    index("article_collection_method_idx").on(table.collection_method),
    index("article_is_favorited_idx").on(table.is_favorited),
    index("article_created_at_idx").on(table.created_at),
    index("article_tags_idx").on(table.tags),
  ]
);

// ==================== AI Processing ====================

export const analysisResult = pgTable(
  "analysis_result",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    article_id: uuid("article_id").notNull().references(() => article.id, { onDelete: "cascade" }),
    user_id: uuid("user_id").notNull().references(() => users.id),
    hotness_score: jsonb("hotness_score"),
    emotion_tags: jsonb("emotion_tags").default(sql`'[]'::jsonb`),
    title_formulas: jsonb("title_formulas").default(sql`'[]'::jsonb`),
    structure_template: jsonb("structure_template"),
    interaction_analysis: jsonb("interaction_analysis"),
    top_3_genes: jsonb("top_3_genes").default(sql`'[]'::jsonb`),
    platform_fit: jsonb("platform_fit").default(sql`'[]'::jsonb`),
    raw_llm_response: jsonb("raw_llm_response"),
    llm_model: varchar("llm_model", { length: 50 }),
    llm_tokens_used: integer("llm_tokens_used").default(0),
    created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("analysis_result_article_id_idx").on(table.article_id),
    index("analysis_result_user_id_idx").on(table.user_id),
    index("analysis_result_created_at_idx").on(table.created_at),
  ]
);

export const rewriteTask = pgTable(
  "rewrite_task",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    article_id: uuid("article_id").notNull().references(() => article.id),
    user_id: uuid("user_id").notNull().references(() => users.id),
    target_platforms: jsonb("target_platforms").notNull().default(sql`'[]'::jsonb`),
    style_overrides: jsonb("style_overrides"),
    status: varchar("status", { length: 20 }).notNull().default("pending"),
    llm_calls: integer("llm_calls").notNull().default(0),
    created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updated_at: timestamp("updated_at", { withTimezone: true }).defaultNow(),
  },
  (table) => [
    index("rewrite_task_article_id_idx").on(table.article_id),
    index("rewrite_task_user_id_idx").on(table.user_id),
    index("rewrite_task_status_idx").on(table.status),
    index("rewrite_task_created_at_idx").on(table.created_at),
  ]
);

export const rewriteResult = pgTable(
  "rewrite_result",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    task_id: uuid("task_id").notNull().references(() => rewriteTask.id, { onDelete: "cascade" }),
    platform: varchar("platform", { length: 30 }).notNull(),
    title: varchar("title", { length: 200 }),
    content: text("content"),
    similarity_score: real("similarity_score"),
    quality_score: jsonb("quality_score"),
    word_count: integer("word_count"),
    rewrite_notes: text("rewrite_notes"),
    created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("rewrite_result_task_id_idx").on(table.task_id),
    index("rewrite_result_platform_idx").on(table.platform),
  ]
);

// ==================== Operations & Admin ====================

export const favoriteGroup = pgTable(
  "favorite_group",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    user_id: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 50 }).notNull(),
    sort_order: integer("sort_order").notNull().default(0),
    color: varchar("color", { length: 7 }),
    created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("favorite_group_user_id_idx").on(table.user_id),
  ]
);

export const favorite = pgTable(
  "favorite",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    user_id: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    article_id: uuid("article_id").notNull().references(() => article.id, { onDelete: "cascade" }),
    group_id: uuid("group_id").references(() => favoriteGroup.id, { onDelete: "set null" }),
    created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("favorite_user_id_idx").on(table.user_id),
    index("favorite_article_id_idx").on(table.article_id),
    index("favorite_group_id_idx").on(table.group_id),
  ]
);

export const adminAuditLog = pgTable(
  "admin_audit_log",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    admin_id: uuid("admin_id").notNull().references(() => users.id),
    action: varchar("action", { length: 50 }).notNull(),
    target_type: varchar("target_type", { length: 30 }),
    target_id: varchar("target_id", { length: 36 }),
    detail: jsonb("detail"),
    ip_address: varchar("ip_address", { length: 45 }),
    created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("admin_audit_log_admin_id_idx").on(table.admin_id),
    index("admin_audit_log_action_idx").on(table.action),
    index("admin_audit_log_created_at_idx").on(table.created_at),
  ]
);

export const apiKeys = pgTable(
  "api_keys",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    service: varchar("service", { length: 30 }).notNull().unique(),
    encrypted_key: text("encrypted_key").notNull(),
    key_hint: varchar("key_hint", { length: 10 }),
    is_active: boolean("is_active").notNull().default(true),
    expires_at: timestamp("expires_at", { withTimezone: true }),
    created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updated_at: timestamp("updated_at", { withTimezone: true }).defaultNow(),
  },
  (table) => [
    index("api_keys_service_idx").on(table.service),
    index("api_keys_is_active_idx").on(table.is_active),
  ]
);

export const systemConfig = pgTable(
  "system_config",
  {
    key: varchar("key", { length: 100 }).primaryKey(),
    value: jsonb("value").notNull(),
    description: text("description"),
    config_group: varchar("config_group", { length: 30 }),
    updated_at: timestamp("updated_at", { withTimezone: true }).defaultNow(),
  },
  (table) => [
    index("system_config_group_idx").on(table.config_group),
  ]
);
