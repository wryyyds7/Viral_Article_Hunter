# 爆文猎人 (HotContent Hunter)

AI 驱动的内容创作 SaaS 平台 —— 多平台热点采集、爆款基因分析、一键跨平台改写。

## 架构

```
前端 (Vite + TypeScript + Tailwind CSS SPA)
    ↓ /api/v1/*
Express (代理层 + Vite Dev Middleware)
    ↓ http://127.0.0.1:8000
Python FastAPI 后端 (业务逻辑 + LLM + 采集 + 任务队列)
    ↓
PostgreSQL (Supabase 托管或本地)
```

## 功能概览

| 模块 | 功能 | 说明 |
|------|------|------|
| 多平台热点采集 | 关键词搜索 + 多平台同步采集 | 支持小红书/知乎(已实现) + 微信/B站/抖音/微博/头条/百家号(预留) |
| 用户文档上传 | TXT/MD/DOCX/PDF/HTML 五种格式 | ≥10 篇自动触发分析，<10 篇提醒后可继续 |
| 爆款基因分析 | LLM 6 维度深度分析 | 热度评分/情绪标签/标题公式/结构模板/互动钩子/平台适配 |
| 一键跨平台改写 | LLM + 平台风格知识库 | 7 个平台一键改写，SSE 流式输出，质量自检 |
| 素材库管理 | 收藏/搜索/标签/分组/导出 | 支持收藏切换、标签筛选、CSV/TXT/JSON 导出 |
| 数据看板 | 分析统计/趋势/分布/标签 | 时间范围筛选(7d/30d/90d)，可视化图表 |
| 管理后台 | 用户/配额/Key/审核/配置/监控 | AdminOnly 权限控制，操作审计，系统监控 |
| 认证系统 | 注册/登录/JWT/改密 | 首用户自动 admin，支持用户名或邮箱登录 |

## 技术栈

```
前端: Vite 7 + TypeScript + Tailwind CSS (SPA)
代理: Express (反向代理 + Vite Dev Middleware)
后端: Python FastAPI + SQLAlchemy(asyncio) + APScheduler
数据库: PostgreSQL (asyncpg)
LLM: OpenAI 兼容接口 (默认 DeepSeek)
认证: JWT + bcrypt
任务队列: asyncio.PriorityQueue (进程内)
```

## 快速开始

### 1. 环境变量

```bash
cp docs/.env.example .env
```

必填项：
- `DATABASE_URL` — PostgreSQL 连接串 (asyncpg 格式)
- `JWT_SECRET` — JWT 签名密钥
- `ENCRYPTION_KEY` — AES-256 加密密钥 (32字节)
- `LLM_API_KEY` — LLM API 密钥

### 2. 安装依赖

```bash
# Python 依赖
pip install -r backend/requirements.txt

# Node 依赖
pnpm install
```

### 3. 启动开发服务器

```bash
# 方式一：同时启动前后端
bash scripts/dev.sh

# 方式二：分别启动
bash scripts/start_backend.sh   # Python 后端 :8000
pnpm tsx watch server/server.ts # Express 前端 :5000
```

访问 http://localhost:5000

### 4. 构建生产版本

```bash
bash scripts/build.sh
bash scripts/start.sh
```

## API 接口

所有接口前缀 `/api/v1/`（前端）→ 代理到 Python `/v1/`：

| 模块 | 路径 | 方法 | 说明 |
|------|------|------|------|
| 认证 | /auth/register | POST | 用户注册 |
| 认证 | /auth/login | POST | 用户登录(用户名或邮箱) |
| 认证 | /auth/me | GET | 获取当前用户 (JWT) |
| 认证 | /auth/password | PUT | 修改密码 |
| 采集 | /collect/platforms | GET | 支持的平台列表 |
| 采集 | /collect/tasks | POST | 创建采集任务 |
| 采集 | /collect/tasks | GET | 采集任务列表 |
| 分析 | /analysis/articles/:id | GET | 获取分析结果 |
| 分析 | /analysis/batch | POST | 批量触发分析 |
| 改写 | /rewrite/tasks | POST | 创建改写任务 |
| 改写 | /rewrite/tasks/:id | GET | 改写任务详情 |
| 改写 | /rewrite/tasks/:id/stream | GET | SSE 流式推送 |
| 素材库 | /library/articles | GET | 文章列表(搜索/筛选/分页) |
| 素材库 | /library/articles/:id | GET/DELETE | 文章详情/删除 |
| 素材库 | /library/favorite | POST | 切换收藏 |
| 素材库 | /library/export | POST | 导出(CSV/TXT/JSON) |
| 上传 | /upload/files | POST | 批量上传(multipart) |
| 看板 | /dashboard/overview | GET | 数据看板 |
| 设置 | /settings/ | GET/PUT | 用户设置 |
| 管理 | /admin/users | GET | 用户列表 |
| 管理 | /admin/monitor | GET | 系统监控 |

## 核心业务流程

```
采集/上传 → 文章入库 → EventBus → 自动触发分析(任务队列)
                                         ↓
                                    LLM 6维度分析
                                         ↓
                              用户选择文章 → 一键改写
                                         ↓
                          LLM 跨平台改写 + 质量自检
                                         ↓
                              SSE 流式推送 → 用户复制/导出
```

## 测试

```bash
cd backend
pytest tests/unit/ -v
```

## License

MIT
