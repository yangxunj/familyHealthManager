# Family Health Manager / 家庭健康管理平台

A full-stack family health management platform with AI-powered health insights, supporting both LAN (local network) and public cloud deployment modes.

一个全栈家庭健康管理平台，集成 AI 健康分析能力，支持局域网和公网两种部署模式。

---

## Features / 功能特性

- **Family Members / 家庭成员管理** — Create and manage family member profiles with avatar, age, gender, blood type, and chronic disease history. / 创建和管理家庭成员档案，包含头像、年龄、性别、血型、慢性病史等信息。

- **Health Records / 健康记录** — Track blood pressure, blood sugar, body temperature, weight, and more with trend visualization. / 记录血压、血糖、体温、体重等指标，支持趋势图表可视化。

- **Health Documents / 健康文档** — Upload medical reports (images & PDFs). OCR extracts text automatically; AI formats it into structured Markdown. / 上传体检报告（图片和 PDF），OCR 自动提取文字，AI 规整为结构化 Markdown。

- **AI Health Advice / AI 健康建议** — Generate personalized health reports based on a member's records and documents, powered by LLM. / 基于成员的健康记录和文档，由大语言模型生成个性化健康建议报告。

- **AI Health Chat / AI 健康咨询** — Real-time AI conversation with streaming responses (SSE) for health-related questions. / 实时 AI 对话，支持 SSE 流式响应，随时咨询健康问题。

- **Multi-AI Provider / 多 AI 服务商** — Supports Alibaba Cloud DashScope (Qwen, DeepSeek, GLM, Kimi) and Google Gemini, configurable from the settings page. / 支持阿里云 DashScope（通义千问、DeepSeek、智谱、Kimi）和 Google Gemini，可在设置页面切换。

- **Dual Deployment / 双模式部署** — Run in LAN mode (no login required) for home use, or in public mode with Supabase authentication (Google OAuth / email OTP). / 局域网模式（免登录）适合家庭内网使用；公网模式通过 Supabase 认证（Google OAuth / 邮箱验证码）。

## Tech Stack / 技术栈

| Layer | Technologies |
|-------|-------------|
| Frontend | React 18, TypeScript, Vite, Ant Design 5, Zustand, ECharts |
| Backend | Node.js, NestJS, Prisma ORM, TypeScript |
| Database | PostgreSQL |
| AI | Alibaba Cloud DashScope (OCR + Chat), Google Gemini (Chat) |
| Auth | Supabase (OAuth & OTP) — optional in LAN mode |
| Deploy | Docker Compose |

## Quick Start / 快速开始

### Prerequisites / 前置条件

- Node.js >= 18
- PostgreSQL >= 14
- pnpm >= 8

### 1. Clone / 克隆

```bash
git clone https://github.com/yangxunj/familyHealthManager.git
cd familyHealthManager
```

### 2. Install dependencies / 安装依赖

```bash
cd backend && pnpm install
cd ../frontend && pnpm install
```

### 3. Configure environment / 配置环境变量

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

Edit both `.env` files. See [Configuration](#configuration--配置说明) below.

编辑两个 `.env` 文件，详见下方[配置说明](#configuration--配置说明)。

### 4. Initialize database / 初始化数据库

```bash
cd backend
npx prisma migrate deploy
npx prisma db seed        # optional / 可选：导入种子数据
```

### 5. Start / 启动

```bash
# Terminal 1 — backend
cd backend && pnpm run start:dev

# Terminal 2 — frontend
cd frontend && pnpm run dev
```

Open http://localhost:5174 in your browser. / 浏览器打开 http://localhost:5174。

## Configuration / 配置说明

### Backend (`backend/.env`)

```env
# Database / 数据库
DATABASE_URL="postgresql://postgres:password@localhost:5432/familyHealthManager?schema=public&client_encoding=utf8"

# Server port / 服务端口
PORT=5002

# ---- LAN Mode: comment out the Supabase section below ----
# ---- 局域网模式：注释掉下面的 Supabase 配置即可 ----

# Supabase Auth (public mode only / 仅公网模式)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your-service-role-key
SUPABASE_JWT_SECRET=your-jwt-secret

# Alibaba Cloud DashScope (required for OCR / OCR 必需)
DASHSCOPE_API_KEY=your-dashscope-api-key

# Google Gemini (optional / 可选)
GOOGLE_API_KEY=your-google-api-key
GOOGLE_API_BASE=https://generativelanguage.googleapis.com/v1beta/openai
GEMINI_MODEL=gemini-3-flash-preview
# GEMINI_PROXY=http://localhost:20808   # if you need a proxy / 如需代理

# Admin emails, comma-separated (public mode / 公网模式)
ADMIN_EMAILS=admin@example.com
```

### Frontend (`frontend/.env`)

```env
VITE_API_BASE_URL=http://localhost:5002/api/v1

# Supabase (public mode only / 仅公网模式)
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### LAN Mode vs Public Mode / 局域网模式 vs 公网模式

| | LAN Mode / 局域网模式 | Public Mode / 公网模式 |
|---|---|---|
| Auth / 认证 | None (auto login) / 无需登录 | Supabase (OAuth / OTP) |
| Admin | All users / 所有用户 | Configured via `ADMIN_EMAILS` |
| Setup / 配置 | Comment out Supabase env vars / 注释 Supabase 环境变量 | Fill in all Supabase env vars / 填写 Supabase 配置 |

## Docker Deployment / Docker 一键部署

The easiest way to deploy. No Node.js or build tools needed — just Docker.

最简单的部署方式，无需安装 Node.js 或任何构建工具，只需要 Docker。

### Option A: Use pre-built images (recommended) / 使用预构建镜像（推荐）

```bash
# 1. Download deployment files / 下载部署文件
mkdir family-health && cd family-health
curl -O https://raw.githubusercontent.com/yangxunj/familyHealthManager/main/deploy/docker-compose.yml
curl -O https://raw.githubusercontent.com/yangxunj/familyHealthManager/main/deploy/.env.example

# 2. Configure / 配置
cp .env.example .env
# Edit .env — at minimum, set DASHSCOPE_API_KEY and change DB_PASSWORD
# 编辑 .env — 至少填写 DASHSCOPE_API_KEY 并修改 DB_PASSWORD

# 3. Start / 启动
docker compose up -d
```

Open http://localhost:5180. / 打开 http://localhost:5180。

### Option B: Build from source / 从源码构建

```bash
git clone https://github.com/yangxunj/familyHealthManager.git
cd familyHealthManager
# Create .env.docker with your config / 创建 .env.docker 填入配置
docker compose up -d
```

The app will be available at http://localhost:5180. / 应用将在 http://localhost:5180 可用。

## Project Structure / 项目结构

```
familyHealthManager/
├── backend/                # NestJS + Prisma
│   ├── src/modules/
│   │   ├── auth/           # Authentication / 认证
│   │   ├── users/          # User management / 用户管理
│   │   ├── members/        # Family members / 家庭成员
│   │   ├── documents/      # Health documents & OCR / 健康文档与 OCR
│   │   ├── records/        # Health records / 健康记录
│   │   ├── advice/         # AI health advice / AI 健康建议
│   │   ├── chat/           # AI health chat (SSE) / AI 健康咨询
│   │   ├── ai/             # AI service layer / AI 服务层
│   │   ├── settings/       # System settings / 系统设置
│   │   └── whitelist/      # Email whitelist / 邮箱白名单
│   └── prisma/             # Schema & migrations / 数据库模型与迁移
├── frontend/               # React + Vite + Ant Design
│   └── src/
│       ├── pages/          # Page components / 页面组件
│       ├── api/            # API client / API 调用
│       ├── store/          # Zustand state / 状态管理
│       └── components/     # Shared components / 公共组件
├── doc/                    # Documentation / 文档
└── docker-compose.yml
```

## Security / 安全特性

- **Rate Limiting** — 100 req/min for general APIs, 5/min for login, 10–20/min for AI endpoints. / 普通 API 100 次/分钟，登录 5 次/分钟，AI 接口 10–20 次/分钟。
- **Input Validation** — Global `ValidationPipe` with whitelist mode. / 全局输入校验，白名单模式。
- **Audit Logging** — Critical operations are logged to the `audit_logs` table. / 关键操作记录到审计日志表。
- **Email Whitelist** — Only whitelisted emails can log in (public mode). / 仅白名单内的邮箱可登录（公网模式）。

## License / 许可证

MIT
