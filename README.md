# GTC AI Content Studio
## 光明科学城全球青年人才中心 AI 新媒体智能运营工作台

按 PRD《GTC新媒体AI智能运营工作台 PRD执行文档 V1.0》第一阶段（P0）范围实现的**全栈 MVP**：

- 模块一 品牌知识库
- 模块二 历史案例库
- 模块三 AI 内容生成中心（文案 + 图片 Prompt + 多平台版本）
- 模块四 平台助手（公众号 / 小红书 / 视频号 / LinkedIn 接口与生成逻辑）
- 模块五 Prompt 优化引擎

技术栈遵循 PRD 第八节：前端 React + Tailwind，后端 FastAPI，数据库 SQLAlchemy（本地 SQLite，生产切 Supabase PostgreSQL），AI 接 DeepSeek（OpenAI 兼容接口，可选，未配置 Key 时自动降级为规则化生成，保证零配置可运行）。生成的提示词由用户复制到网页 ChatGPT / Midjourney 使用，不接 OpenAI。

## 云端同步配置

前端支持 Supabase Auth 登录和工作区快照同步。复制 `frontend/.env.example` 为
`frontend/.env.local`，填写 `VITE_SUPABASE_URL`、`VITE_SUPABASE_ANON_KEY`，并将
`VITE_API_BASE_URL` 指向已部署的 FastAPI 地址。未填写 Supabase 配置时，前端仍保持本地模式。

后端同步接口默认要求 Supabase Auth JWT。生产环境在 `backend/.env` 填写
`SUPABASE_JWT_SECRET`，保持 `SYNC_AUTH_DISABLED=false`；不要把 `service_role` Key 放入前端。

## 目录
```
gtc-ai-studio/
  backend/    FastAPI 后端（见 backend/README.md）
  frontend/   React 前端（见 frontend/README.md）
```

## 一键启动（开发）
终端一：
```bash
cd backend
python -m venv .venv && .venv/Scripts/activate   # Windows
pip install -r requirements.txt
cp .env.example .env
uvicorn app.main:app --reload --port 8000
```
终端二：
```bash
cd frontend
npm install
npm run dev
```
浏览器打开 http://localhost:5173

## 接入真实服务
- **Supabase**：把 `backend/.env` 的 `DATABASE_URL` 换成 Supabase 连接串即可，代码无需改动。
- **DeepSeek**：在 `backend/.env` 填入 `DEEPSEEK_API_KEY`，Prompt 优化引擎与内容生成的图片 Prompt 将改为 DeepSeek 优化（生成的提示词复制到网页 ChatGPT / Midjourney 使用）。不接 OpenAI。

## 范围说明
本 MVP 聚焦 PRD 第一阶段 P0。第二阶段（视频号/LinkedIn 助手 UI 增强、AI 图片评分）与第三阶段
（情报自动抓取、竞品监控、内容日历、自动发布）已预留接口与数据模型（intelligence 表、platforms 规则），可在此基础上扩展。
