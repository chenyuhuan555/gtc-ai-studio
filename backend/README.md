# GTC AI Content Studio — 后端 (FastAPI)

GTC 新媒体 AI 智能运营工作台后端。按 PRD 第一阶段（P0）范围实现：
品牌知识库、历史案例库、内容生成中心、Prompt 优化引擎、四大平台助手（接口层）。

## 技术栈
- FastAPI + Uvicorn
- SQLAlchemy 2.0（ORM）
- Pydantic v2
- 数据库：本地默认 SQLite；生产切换到 Supabase PostgreSQL
- AI：DeepSeek（OpenAI 兼容接口，可选，用于优化提示词；未配置 Key 时自动降级为「规则化生成引擎」）

## 快速开始

```bash
cd backend
python -m venv .venv && source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env        # 按需修改 DATABASE_URL / OPENAI_API_KEY
uvicorn app.main:app --reload --port 8000
```

启动后访问 http://localhost:8000/docs 查看接口文档。

## 切换到 Supabase（生产）
把 `.env` 里的 `DATABASE_URL` 换成 Supabase 的 Pooler 连接串，例如：
```
DATABASE_URL=postgresql://postgres:<pwd>@db.<ref>.supabase.co:5432/postgres
```
项目会自动使用已安装的 `psycopg` 驱动连接 PostgreSQL。
其余无需改动，SQLAlchemy 会自动用 PostgreSQL 方言。

## 接入真实 DeepSeek
在 `.env` 填入 `DEEPSEEK_API_KEY`（以及 `DEEPSEEK_MODEL`，默认 `deepseek-chat`），
Prompt 优化引擎与内容生成的图片 Prompt 会改为调用 DeepSeek 优化；
品牌 DNA / 平台规则 / 禁止元素仍由引擎统一约束，保证风格不漂移。
生成的提示词直接复制到网页 ChatGPT / Midjourney 使用，不接 OpenAI。

## 目录结构
```
app/
  config.py          配置（数据库 / OpenAI / CORS）
  database.py        SQLAlchemy 引擎与会话
  models.py          数据模型（PRD 第六节）
  schemas.py         Pydantic 请求/响应
  data.py            GTC 品牌资产常量（单一事实来源）
  seed.py            首次启动播种品牌知识库
  services/
    ai_client.py     OpenAI 封装（无 Key 降级）
    brand_context.py 品牌上下文加载
    prompt_engine.py Prompt 优化引擎（模块五）
    content_generator.py 文案/图片 Prompt/多平台版本（模块三）
  routers/
    brand.py  platforms.py  cases.py  content.py
```

## 视觉控制字段
为让提示词稳定、减少风格漂移，内容生成与 Prompt 工具均支持 6 个视觉控制字段
（`poster_type` 海报视觉类型 / `main_visual` 主视觉形式 / `brand_strength` 品牌露出强度 /
`theme_style` 主题风格 / `text_density` 文本密度 / `required_modules` 必须包含的信息模块）。
字段定义与中英文映射集中在 `services/visual_control.py`，与前端 `src/engine.js` 的 `VISUAL_CONTROL` 同步维护。

## AI 助手（多轮对话优化提示词）
`POST /api/chat/optimize`：传入多轮 `messages` + 可选 `current_prompt`（优化基线），
结合 GTC 品牌上下文，由 DeepSeek 返回 `{ reply, optimized_prompt }`（JSON）。
无 Key 时降级为规则化提示。前端 `pages/ChatAssistant.jsx` 提供对话 UI。

## 工作区云同步

`GET/PUT /api/sync/workspace` 用于同步 Dashboard、聊天历史、表单草稿和最近生成记录。
接口默认要求 Supabase Auth 用户 JWT；只有本地临时调试时才可以在 `.env` 设置
`SYNC_AUTH_DISABLED=true`。生产环境必须设置 `SUPABASE_JWT_SECRET`，并且绝不能把
`service_role` Key 放进浏览器或前端环境变量。

## 主要接口
| 方法 | 路径 | 说明 |
|---|---|---|
| GET  | /api/brand | 品牌知识库（DNA + 禁止元素 + 模板 + 官方 Logo） |
| GET  | /api/platforms | 四大平台规则 |
| GET/POST/DELETE | /api/cases | 历史案例 CRUD |
| POST | /api/content/generate | 内容生成（支持视觉控制字段：文案 + 图片 Prompt + 多平台版本） |
| POST | /api/prompt/build | Prompt 优化引擎（支持视觉控制字段） |
| POST | /api/chat/optimize | AI 助手多轮对话优化提示词（接 DeepSeek） |
| GET/PUT | /api/sync/workspace | 工作区快照云同步（版本冲突返回 409） |
