# 爆文猎人 - 快速开始指南

> 从 clone 到跑起来，预计 10 分钟。

## 环境要求

| 依赖 | 最低版本 | 推荐版本 | 说明 |
|------|----------|----------|------|
| Python | 3.10+ | 3.12 | 后端运行时 |
| PostgreSQL | 14+ | 16 | 数据库 |
| Node.js | 18+ | 20+ | 前端构建 |
| pnpm | 9+ | 9+ | 前端包管理（必须用 pnpm） |

## 架构概览

```
浏览器 → http://localhost:5000
              │
        Express (代理层 + Vite Dev)
              │  /api/v1/* → http://127.0.0.1:8000/v1/*
              │
        Python FastAPI 后端
              │
        PostgreSQL
```

## 第一步：Clone & 安装依赖

```bash
git clone https://github.com/wryyyds7/Viral_Article_Hunter.git
cd Viral_Article_Hunter

# Python 后端依赖
pip install -r backend/requirements.txt

# 前端依赖（必须用 pnpm）
pnpm install
```

## 第二步：配置环境变量

```bash
cp docs/.env.example .env
```

编辑 `.env`，**必填项**：

```bash
# 数据库（asyncpg 格式）
DATABASE_URL=postgresql+asyncpg://postgres:postgres@localhost:5432/viral_hunter

# JWT 密钥（生产环境必须更换！建议用 openssl rand -hex 32 生成）
JWT_SECRET=your-jwt-secret-change-this-in-production

# AES-256 加密密钥（32 字节字符串，用于 API Key 加密存储）
ENCRYPTION_KEY=change-this-to-a-32-byte-secret-key

# LLM API（支持 OpenAI 兼容接口，默认 DeepSeek）
LLM_API_KEY=sk-your-llm-api-key
LLM_BASE_URL=https://api.deepseek.com/v1
LLM_MODEL=deepseek-chat
```

**可选项**（采集器相关）：

```bash
# 红狐数据 API（小红书/知乎采集）
REDFOX_API_KEY=
REDFOX_BASE_URL=https://api.redfoxdata.com

# B站采集（可选，SESSDATA 提高限额）
BILIBILI_SESSDATA=

# 微博采集（可选，Cookie 提高稳定性）
WEIBO_COOKIE=

# MediaCrawler 集成（可选高级模式，浏览器自动化采集）
# 安装: git clone https://github.com/NanmiCoder/MediaCrawler.git
MEDIACRAWLER_PATH=
MEDIACRAWLER_ENABLED=false
```

## 第三步：初始化数据库

```bash
# 创建数据库
createdb viral_hunter

# 执行迁移（开发环境也可直接启动，FastAPI 会自动创建表）
cd backend
alembic upgrade head
cd ..
```

## 第四步：启动服务

### 方式一：一键启动（推荐）

```bash
bash scripts/dev.sh
```

此脚本会同时启动：
- Python FastAPI 后端（端口 8000）
- Express + Vite 前端代理（端口 5000）

### 方式二：分别启动

```bash
# 终端 1：Python 后端
bash scripts/start_backend.sh
# 或: cd backend && uvicorn app.main:app --reload --port 8000

# 终端 2：前端代理
pnpm tsx watch server/server.ts
```

访问 http://localhost:5000

## 第五步：验证

```bash
# 健康检查
curl http://localhost:8000/health
# 预期: {"status": "ok", "version": "0.1.0"}

# 前端代理检查
curl http://localhost:5000/health
# 预期: {"status": "ok", "timestamp": "..."}

# API 文档（Swagger）
# 浏览器访问 http://localhost:8000/docs
```

## 第六步：首个管理员

1. 访问 http://localhost:5000
2. 在登录页点击"注册"标签
3. 注册第一个用户 → **自动成为管理员**
4. 登录后即可使用所有功能

## 采集器使用指南

### 支持的平台

| 平台 | 采集方式 | 是否需要配置 | 稳定性 |
|------|----------|-------------|--------|
| 小红书 | RedFox API | 需要 `REDFOX_API_KEY` | 高 |
| 知乎 | RedFox API | 需要 `REDFOX_API_KEY` | 高 |
| B站 | B站公开搜索 API | 可选 `BILIBILI_SESSDATA` | 中高 |
| 微博 | 微博移动端搜索 API | 可选 `WEIBO_COOKIE` | 中 |
| 抖音 | 抖音网页版搜索 API | 风控较严 | 低 |
| 微信公众号 | 搜狗微信搜索 | 无需 | 中 |
| 今日头条 | 头条搜索 API | 无需 | 中 |

### 启用 MediaCrawler 高级模式（可选）

对于需要浏览器登录态的平台（如小红书、抖音），可启用 MediaCrawler 集成：

```bash
# 1. 克隆 MediaCrawler
git clone https://github.com/NanmiCoder/MediaCrawler.git /path/to/MediaCrawler

# 2. 安装 MediaCrawler 依赖
cd /path/to/MediaCrawler
pip install -r requirements.txt
playwright install

# 3. 配置 .env
MEDIACRAWLER_PATH=/path/to/MediaCrawler
MEDIACRAWLER_ENABLED=true
```

启用后，所有 MediaCrawler 支持的平台将自动切换为浏览器自动化模式。

### 无 API Key 时的使用方式

如果没有配置任何采集 API Key：
- 采集功能仍可调用，但小红书和知乎会返回空结果
- B站、微博、头条、微信公众号可以正常采集（使用公开 API）
- 可以使用"文档上传"功能替代采集

## 开发命令速查

| 操作 | 命令 |
|------|------|
| 启动开发环境 | `bash scripts/dev.sh` |
| 仅启动后端 | `bash scripts/start_backend.sh` |
| 仅启动前端 | `pnpm tsx watch server/server.ts` |
| 构建生产版本 | `bash scripts/build.sh` |
| 启动生产服务 | `bash scripts/start.sh` |
| 运行后端测试 | `cd backend && pytest tests/unit/ -v` |
| TypeScript 类型检查 | `npx tsc --noEmit` |
| ESLint 检查 | `npx eslint src/` |
| 数据库迁移 | `cd backend && alembic revision --autogenerate -m "描述"` → `alembic upgrade head` |

## 常见问题

**Q: 数据库连接失败？**
确保 PostgreSQL 服务已启动，`.env` 中的 `DATABASE_URL` 使用 `postgresql+asyncpg://` 格式。

**Q: LLM 调用报错？**
检查 `LLM_API_KEY` 是否有效，`LLM_BASE_URL` 是否正确。默认使用 DeepSeek，也可换成 OpenAI 等。

**Q: 采集器返回空结果？**
- 小红书/知乎：需要配置 `REDFOX_API_KEY`
- 抖音：风控较严，建议启用 MediaCrawler 模式
- 其他平台：检查网络连接

**Q: 前端启动报错 `pnpm not found`？**
项目要求使用 pnpm。安装：`npm install -g pnpm`

**Q: Express 代理报 502？**
Python 后端未启动。先运行 `bash scripts/start_backend.sh`，或使用 `bash scripts/dev.sh` 一键启动。

**Q: 密码长度要求？**
前后端统一要求最小 6 位。

**Q: 登录时用什么字段？**
支持用户名或邮箱登录。

## 项目结构（简版）

```
Viral_Article_Hunter/
├── backend/                 # Python FastAPI 后端
│   ├── app/
│   │   ├── main.py          # 应用入口（启动 Worker + Scheduler）
│   │   ├── config.py        # 全局配置
│   │   ├── routers/         # API 路由（9个模块）
│   │   ├── services/        # 业务逻辑层
│   │   ├── models/          # SQLAlchemy ORM 模型
│   │   ├── schemas/         # Pydantic 请求/响应模型
│   │   ├── collectors/      # 采集器（7个平台 + MediaCrawler）
│   │   ├── llm/             # LLM 客户端 + Prompt + 适配层
│   │   ├── middleware/      # 认证/配额/限流
│   │   ├── scheduler/       # 任务队列 + Worker + 定时任务
│   │   ├── parsers/         # 文档解析器（TXT/MD/DOCX/PDF/HTML）
│   │   └── utils/           # 工具函数
│   ├── tests/               # 测试（65个用例）
│   ├── migrations/          # Alembic 迁移
│   └── requirements.txt     # Python 依赖
├── server/                  # Express 代理层
│   ├── server.ts            # Express 入口（反向代理 + Vite）
│   └── vite.ts              # Vite 开发中间件
├── src/                     # 前端源码（SPA）
│   ├── main.ts              # 主逻辑（所有页面渲染）
│   ├── api.ts               # API 客户端（JWT Token 管理）
│   └── router.ts            # SPA 路由（支持动态参数）
├── scripts/                 # 运维脚本
│   ├── dev.sh               # 开发环境（前后端同时启动）
│   ├── start_backend.sh     # 仅启动 Python 后端
│   ├── build.sh             # 构建生产版本
│   └── start.sh             # 启动生产服务
├── docs/                    # 项目文档
├── package.json             # Node 依赖
└── docs/.env.example        # 环境变量模板
```
