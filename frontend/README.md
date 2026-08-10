# GTC AI Content Studio — 前端 (React + Vite + Tailwind)

## 技术栈
- React 18 + Vite 5
- Tailwind CSS 3（GTC 品牌蓝主题）
- 通过 Vite dev proxy 把 `/api` 转发到后端 `:8000`

## 快速开始
```bash
cd frontend
npm install
npm run dev
```
打开 http://localhost:5173

生产构建：
```bash
npm run build      # 产物在 dist/
npm run preview    # 本地预览构建产物
```

## 页面
- **首页 Dashboard**：运营概览（平台数 / 案例数 / 视觉 DNA / 禁止元素）
- **内容生产中心**：选择内容类型 + 平台 → 一键生成 文案 + 图片 Prompt + 多平台版本；含「Prompt 优化引擎」独立入口
- **品牌知识库**：品牌定位 / 视觉 DNA / 禁止元素 / 历史案例（支持新增、删除）

> 接口约定见 `src/api.js`。后端未启动时页面会提示请求失败，属正常现象。
