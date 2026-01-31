# MathViz3D 部署指南

本文档介绍如何将 MathViz3D 部署到 Cloudflare Pages 和 Workers。

---

## 前置准备

### 1. Cloudflare 账号

注册 [Cloudflare](https://dash.cloudflare.com/) 账号，记录以下信息：

- **Account ID**：在 Workers & Pages 页面右侧可见
- **API Token**：在 [API Tokens](https://dash.cloudflare.com/profile/api-tokens) 页面创建

创建 API Token 时选择以下权限：
- Account - Cloudflare Pages - Edit
- Account - Workers Scripts - Edit
- Account - D1 - Edit

### 2. OpenAI API Key

需要支持 vision 的模型（如 gpt-4o）。

### 3. 本地环境

```bash
# 安装依赖
npm install

# 安装 wrangler CLI
npm install -g wrangler
```

---

## 第一步：部署前端（Cloudflare Pages）

### 1.1 构建项目

```bash
npm run build
```

构建产物在 `dist/` 目录。

### 1.2 创建 Pages 项目

首次部署需要在 Cloudflare Dashboard 创建项目：

1. 进入 [Workers & Pages](https://dash.cloudflare.com/?to=/:account/workers-and-pages)
2. 点击 "Create" → "Pages"
3. 选择 "Direct Upload"
4. 项目名称填 `mathviz3d`（或自定义）
5. 上传 `dist/` 目录

### 1.3 命令行部署（后续更新）

```bash
# 设置环境变量
export CLOUDFLARE_API_TOKEN="your-api-token"

# 部署到 Pages
npx wrangler pages deploy dist --project-name mathviz3d --branch main
```

部署成功后会显示访问地址，如：`https://mathviz3d.pages.dev`

---

## 第二步：部署 API Worker

Worker 作为 AI API 代理，避免前端直接暴露 API Key。

### 2.1 创建 D1 数据库

```bash
# 创建数据库
npx wrangler d1 create mathviz3d-ai-log

# 记录返回的 database_id
```

### 2.2 配置 wrangler.jsonc

编辑 `worker/wrangler.jsonc`，填入你的数据库 ID：

```jsonc
{
  "name": "mathviz3d-api",
  "main": "src/index.ts",
  "compatibility_date": "2024-01-01",
  "d1_databases": [
    {
      "binding": "DB",
      "database_name": "mathviz3d-ai-log",
      "database_id": "your-database-id"  // 替换为实际 ID
    }
  ]
}
```

### 2.3 初始化数据库表

```bash
cd worker

# 创建日志表
npx wrangler d1 execute mathviz3d-ai-log --remote --command "
CREATE TABLE IF NOT EXISTS logs (
  id TEXT PRIMARY KEY,
  created_at INTEGER NOT NULL,
  session_id TEXT NOT NULL,
  agent TEXT NOT NULL,
  input_summary TEXT,
  raw_output TEXT,
  parsed_json TEXT,
  error TEXT,
  duration_ms INTEGER
);
CREATE INDEX IF NOT EXISTS idx_logs_created_at ON logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_logs_session_id ON logs(session_id);
CREATE INDEX IF NOT EXISTS idx_logs_agent ON logs(agent);
"
```

### 2.4 设置 Worker Secrets

```bash
cd worker

# 设置 OpenAI API Key
npx wrangler secret put OPENAI_API_KEY
# 输入你的 API Key

# 设置允许的来源（可选，用于 CORS）
npx wrangler secret put ALLOWED_ORIGINS
# 输入：https://mathviz3d.pages.dev
```

### 2.5 部署 Worker

```bash
cd worker
npx wrangler deploy
```

部署成功后会显示 Worker 地址，如：`https://mathviz3d-api.your-subdomain.workers.dev`

### 2.6 配置前端 API 地址

编辑 `src/config.ts` 或 `.env`，设置 Worker 地址：

```typescript
export const API_BASE_URL = 'https://mathviz3d-api.your-subdomain.workers.dev'
```

重新构建并部署前端。

---

## 第三步：验证部署

### 3.1 测试前端

访问 Pages 地址，上传一张几何题图片，检查：
- AI 识别是否正常
- 3D 模型是否渲染

### 3.2 查询 D1 日志

```bash
# 查看最近的 AI 调用日志
npx wrangler d1 execute mathviz3d-ai-log --remote --command "
SELECT id, created_at, agent, substr(raw_output, 1, 100) as preview
FROM logs
ORDER BY created_at DESC
LIMIT 5
"
```

或使用 REST API：

```bash
curl -s "https://api.cloudflare.com/client/v4/accounts/{account_id}/d1/database/{database_id}/query" \
  -H "X-Auth-Email: your-email@example.com" \
  -H "X-Auth-Key: your-global-api-key" \
  -H "Content-Type: application/json" \
  -d '{"sql": "SELECT * FROM logs ORDER BY created_at DESC LIMIT 1"}'
```

---

## 常用命令速查

```bash
# 前端构建
npm run build

# 前端部署
CLOUDFLARE_API_TOKEN="xxx" npx wrangler pages deploy dist --project-name mathviz3d --branch main

# Worker 部署
cd worker && npx wrangler deploy

# 查看 Pages 部署列表
CLOUDFLARE_API_TOKEN="xxx" npx wrangler pages deployment list --project-name mathviz3d

# 查询 D1 日志
npx wrangler d1 execute mathviz3d-ai-log --remote --command "SELECT * FROM logs ORDER BY created_at DESC LIMIT 5"

# 查看 Worker 日志（实时）
npx wrangler tail mathviz3d-api
```

---

## 故障排查

### API 调用失败

1. 检查 Worker 是否部署成功：`npx wrangler tail mathviz3d-api`
2. 检查 OPENAI_API_KEY 是否设置：`npx wrangler secret list`
3. 检查 CORS 配置是否正确

### D1 查询权限错误

确保 API Token 有 D1 Edit 权限，或使用 Global API Key + Email 认证。

### 前端显示旧数据

清除浏览器缓存，或检查 Pages 部署是否成功更新。

---

## 环境变量说明

| 变量 | 位置 | 说明 |
|------|------|------|
| `CLOUDFLARE_API_TOKEN` | 本地环境 | 用于 wrangler CLI 部署 |
| `OPENAI_API_KEY` | Worker Secret | OpenAI API 密钥 |
| `ALLOWED_ORIGINS` | Worker Secret | CORS 允许的来源 |

---

*Last updated: 2026-01-31*
