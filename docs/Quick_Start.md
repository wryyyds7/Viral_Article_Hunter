# 爆文猎人 - 快速开始指南

> 从 clone 到跑起来，预计 15 分钟。

## 环境要求

| 依赖 | 最低版本 | 推荐版本 |
|------|----------|----------|
| Python | 3.10+ | 3.12 |
| PostgreSQL | 15+ | 16 |
| Redis | 7+ | 7.2 |
| Node.js | 18+ | 20（前端开发用） |

## 第一步：Clone & 安装依赖

```bash
git clone https://github.com/wryyyds7/Viral_Article_Hunter.git
cd Viral_Article_Hunter

# 后端依赖
pip install -r requirements.txt

# 前端依赖
cd frontend && pnpm install && cd ..
```

## 第二步：配置环境变量

```bash
cp .env.example .env
# 编辑 .env，至少填写以下必填项：
# DATABASE_URL, JWT_SECRET, OPENAI_API_KEY
```

所有环境变量说明见 [.env.example](.env.example)

## 第三步：初始化数据库

```bash
# 创建数据库
createdb viral_hunter

# 执行迁移
alembic upgrade head

# 导入预置数据（系统配置、平台规则等）
python scripts/seed_data.py
```

## 第四步：启动服务

```bash
# 后端 API（端口 8000）
uvicorn app.main:app --reload --port 8000

# 前端开发服务器（端口 3000）
cd frontend && pnpm dev
```

## 第五步：验证

```bash
# 健康检查
curl http://localhost:8000/health

# 预期返回
{"status": "ok", "version": "1.0.0"}
```

## 第六步：首个管理员

1. 访问 http://localhost:3000/register
2. 注册第一个用户 → **自动成为管理员**
3. 访问 http://localhost:3000/admin 验证管理后台

## 开发命令速查

| 操作 | 命令 |
|------|------|
| 启动后端 | `uvicorn app.main:app --reload` |
| 启动前端 | `cd frontend && pnpm dev` |
| 数据库迁移 | `alembic revision --autogenerate -m "描述"` → `alembic upgrade head` |
| 跑测试 | `pytest tests/` |
| 代码格式化 | `black app/ && isort app/` |
| 类型检查 | `mypy app/` |

## 项目结构

```
Viral_Article_Hunter/
├── app/                    # 后端 Python 代码
│   ├── main.py            # FastAPI 入口
│   ├── api/               # 路由层（v1/）
│   ├── models/            # SQLAlchemy 模型
│   ├── schemas/           # Pydantic Schema
│   ├── services/          # 业务逻辑层
│   ├── core/              # 配置/安全/中间件
│   └── prompts/           # LLM Prompt 模板
├── frontend/              # 前端代码
├── migrations/            # Alembic 数据库迁移
├── tests/                 # 测试
├── scripts/               # 工具脚本
├── docs/                  # 项目文档（本文档目录）
├── .env.example           # 环境变量模板
└── requirements.txt       # Python 依赖
```

## 常见问题

**Q: 数据库连接失败？**
确保 PostgreSQL 服务已启动，`.env` 中的 `DATABASE_URL` 正确。

**Q: LLM 调用报错？**
检查 `OPENAI_API_KEY` 是否有效，余额是否充足。

**Q: 采集器报错？**
检查 `REDFOX_API_KEY` 是否配置。MVP 阶段可先使用用户上传功能替代采集。

**Q: 前端启动报错？**
确保 `pnpm install` 已执行，Node.js 版本 ≥ 18。
