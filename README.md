# 爆文猎人 (HotContent Hunter)

AI 驱动的内容创作 SaaS 平台 —— 多平台热点采集、爆款基因分析、一键跨平台改写。

## 功能概览

| 模块 | 功能 | 说明 |
|------|------|------|
| 多平台热点采集 | 关键词搜索 + 多平台同步采集 | 支持小红书/知乎/微信公众号/微博/B站/抖音/头条/豆瓣/即刻 |
| 用户文档上传 | TXT/MD/DOCX/PDF/HTML 五种格式 | ≥10 篇自动触发分析，<10 篇提醒后可继续 |
| 爆款基因分析 | LLM 6 维度深度分析 | 热度评分/情绪标签/标题公式/结构模板/互动钩子/平台适配 |
| 一键跨平台改写 | LLM + 平台风格知识库 | 7 个平台一键改写，SSE 流式输出 |
| 素材库管理 | 收藏/搜索/标签/分组 | P0 布尔收藏 → P1 多分组 |
| 数据看板 | 分析统计/趋势/分布 | 时间范围筛选，可视化图表 |
| 管理后台 | 用户/配额/Key/审核/配置/日志 | AdminOnly 权限控制，操作审计 |
| 认证系统 | 注册/登录/JWT | 首用户自动 admin，角色分级 |

## 技术栈

```
前端: Vite 7 + TypeScript + Tailwind CSS (SPA)
后端: Express + TypeScript (RESTful API)
数据库: PostgreSQL (Supabase 托管)
LLM: coze-coding-dev-sdk (豆包 Seed 系列)
存储: Supabase Storage / 对象存储
认证: JWT + bcrypt
```

## 项目结构

```
├── server/                    # 后端
│   ├── server.ts              # Express 入口
│   ├── vite.ts                # Vite 开发中间件
│   ├── routes/                # API 路由
│   │   ├── auth.ts            # 认证 (注册/登录/用户信息)
│   │   ├── articles.ts        # 文章素材 CRUD
│   │   ├── analysis.ts        # 爆款基因分析
│   │   ├── rewrite.ts         # 跨平台改写 (SSE流式)
│   │   ├── collection.ts      # 热点采集
│   │   ├── upload.ts          # 文档上传
│   │   ├── analytics.ts       # 数据看板
│   │   ├── admin.ts           # 管理后台
│   │   └── settings.ts        # 设置
│   └── src/storage/database/  # Supabase 客户端 + 类型
├── src/                       # 前端
│   ├── main.ts                # 页面渲染 + 交互逻辑
│   ├── api.ts                 # API 客户端封装
│   ├── router.ts              # SPA 路由
│   └── index.ts               # 入口
├── src/storage/database/shared/
│   └── schema.ts              # 数据库 Schema (14 张表)
├── docs/                      # 项目文档
│   ├── 产品文档/              # PRD
│   ├── 功能文档/              # F01-F08
│   ├── 接口文档/              # A00-A08
│   └── 技术文档/              # 技术方案/认证/Prompt/演进路线等
├── scripts/                   # 构建/启动脚本
│   ├── dev.sh                 # 开发环境
│   ├── build.sh               # 构建
│   └── start.sh               # 生产环境
├── index.html                 # SPA 入口
├── package.json
├── vite.config.ts
└── tsconfig.json
```

## 数据库设计 (14 张表)

### 用户体系
- **users** — 用户账号 (username/email/角色/状态/配额)
- **user_quota** — 用户配额 (每日分析/改写/采集/上传上限 + 已用计数)

### 数据入口
- **collection_task** — 采集任务 (关键词/平台/状态/结果数)
- **upload_batch** — 上传批次 (文件数/成功数/阈值判断)
- **upload_file** — 上传文件 (文件名/格式/解析状态/关联文章)
- **article** — 文章素材 (标题/正文/来源平台/采集方式/标签) — 核心表

### AI 处理
- **analysis_result** — 爆款分析结果 (6 维度 JSONB + LLM 元信息)
- **rewrite_task** — 改写任务 (目标平台/风格参数/状态)
- **rewrite_result** — 改写结果 (每平台一条/相似度/质量评分)

### 运营管理
- **favorite_group** — 收藏分组 (v1.1)
- **favorite** — 收藏记录 (多对多关联)
- **admin_audit_log** — 管理员审计 (只 INSERT，不可篡改)
- **api_keys** — API Key 加密存储 (AES-256)
- **system_config** — 系统配置 (键值对)

## 快速开始

### 1. 环境变量

复制 `.env.example` 并填写：

```bash
cp docs/.env.example .env
```

必填项：
- `SUPABASE_URL` — Supabase 项目 URL
- `SUPABASE_SERVICE_ROLE_KEY` — Supabase 服务角色密钥
- `JWT_SECRET` — JWT 签名密钥

### 2. 安装依赖

```bash
pnpm install
```

### 3. 启动开发服务器

```bash
coze dev
# 或
bash scripts/dev.sh
```

访问 http://localhost:5000

### 4. 构建生产版本

```bash
bash scripts/build.sh
bash scripts/start.sh
```

## API 接口

所有接口前缀 `/api/v1/`：

| 模块 | 路径 | 方法 | 说明 |
|------|------|------|------|
| 认证 | /auth/register | POST | 用户注册 |
| 认证 | /auth/login | POST | 用户登录 |
| 认证 | /auth/me | GET | 获取当前用户 |
| 文章 | /articles | GET | 文章列表 |
| 分析 | /analysis/:articleId | POST | 触发分析 |
| 分析 | /analysis/:articleId | GET | 获取分析结果 |
| 改写 | /rewrite | POST | 创建改写任务 |
| 改写 | /rewrite/:taskId/stream | GET | SSE 流式输出 |
| 采集 | /collection | POST | 触发采集 |
| 上传 | /upload | POST | 批量上传 |
| 看板 | /analytics/overview | GET | 数据概览 |
| 管理 | /admin/users | GET | 用户列表 |
| 设置 | /settings | GET/PUT | 系统设置 |

## 核心业务流程

```
采集/上传 → 文章入库 → LLM 爆款分析 → 用户选择改写
                                              ↓
                            SSE 流式输出 ← LLM 跨平台改写
                                              ↓
                                     用户复制/导出
```

## 文档索引

- [产品需求文档 PRD](docs/产品文档/产品需求文档_PRD.md)
- [技术方案与工程规范](docs/技术文档/技术方案与工程规范.md)
- [认证与多用户架构](docs/技术文档/认证与多用户架构设计.md)
- [LLM Prompt 设计文档](docs/技术文档/LLM_Prompt设计文档.md)
- [技术演进路线](docs/技术文档/技术演进路线.md)
- [功能流程文档](docs/功能流程文档.md)
- [项目结构文档](docs/项目结构文档.md)

## License

MIT
