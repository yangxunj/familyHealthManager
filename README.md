# Family Health Manager / 家庭健康管理平台

A full-stack family health management platform with AI-powered health insights, supporting both LAN (local network) and public cloud deployment modes.

一个全栈家庭健康管理平台，集成 AI 健康分析能力，支持局域网和公网两种部署模式。

---

## Features / 功能特性

- **Family Members / 家庭成员管理** — Create and manage family member profiles with avatar, age, gender, blood type, and chronic disease history. Link members to user accounts with "This is me" identification. / 创建和管理家庭成员档案，包含头像、年龄、性别、血型、慢性病史等信息。支持成员关联用户账号，标识"这是你"。

- **Health Records / 健康记录** — Track 15 health metrics across 4 categories (blood pressure, blood sugar, blood lipid, basic vitals) with trend visualization and abnormal value alerts. Supports calendar view to see measurement history at a glance. / 记录 4 大分类共 15 项健康指标（血压、血糖、血脂、基础指标），支持趋势图表、异常值提醒，以及日历视图直观查看测量历史。

- **Health Documents / 健康文档** — Upload medical reports (images & PDFs). OCR extracts text automatically; AI formats it into structured Markdown. / 上传体检报告（图片和 PDF），OCR 自动提取文字，AI 规整为结构化 Markdown。

- **Health Plan / 健康计划** — Manage vaccination records with recommended schedules by age group, and set up periodic health checkup reminders. / 管理疫苗接种记录（含按年龄段推荐表），设置定期体检提醒计划。

- **AI Health Advice / AI 健康建议** — Generate personalized health reports based on a member's records and documents, powered by LLM. / 基于成员的健康记录和文档，由大语言模型生成个性化健康建议报告。

- **AI Health Chat / AI 健康咨询** — Real-time AI conversation with streaming responses (SSE). Supports sending images for multi-modal analysis. / 实时 AI 对话，支持 SSE 流式响应，支持发送图片进行多模态分析。

- **Food Photo Query / 拍照问食** — Snap a photo of your meal, AI analyzes nutritional content, dietary suggestions, and potential concerns. Supports follow-up questions in conversation. / 拍摄食物照片，AI 分析营养成分、饮食建议和注意事项，支持对话式追问。

- **Elder Mode / 老人模式** — One-tap switch to a senior-friendly UI: larger fonts (17px), simplified 4-tab bottom navigation (Records, Food Query, Advice, Chat), scroll-wheel input for blood pressure, grouped record cards, calendar view, and iOS-style interactions. / 一键切换老人友好界面：大字体（17px）、底部 4 个 Tab 简化导航（健康记录、拍照问食、健康建议、健康咨询）、滚轮选择器录入血压、分组记录卡片、日历视图、iOS 风格交互。

- **Member Visibility / 成员可见性** — Control which family members each user can see across the app. Useful for managing privacy in large families. / 控制每个用户在各页面能看到哪些家庭成员，适合大家庭隐私管理。

- **Multi-AI Provider / 多 AI 服务商** — Supports Alibaba Cloud DashScope (Qwen, DeepSeek, GLM, Kimi) and Google Gemini, configurable from the settings page. / 支持阿里云 DashScope（通义千问、DeepSeek、智谱、Kimi）和 Google Gemini，可在设置页面切换。

- **PWA Support / PWA 支持** — Add to home screen on iPhone / Android browsers for an app-like experience without installing an APK. / iPhone / Android 浏览器可"添加到主屏幕"，获得类原生应用体验。

- **Dual Deployment / 双模式部署** — Run in LAN mode (no login required) for home use, or in public mode with Supabase authentication (Google OAuth / email OTP). / 局域网模式（免登录）适合家庭内网使用；公网模式通过 Supabase 认证（Google OAuth / 邮箱验证码）。

## Tech Stack / 技术栈

| Layer | Technologies |
|-------|-------------|
| Frontend | React 18, TypeScript, Vite, Ant Design 5, Zustand, ECharts |
| Backend | Node.js, NestJS, Prisma ORM, TypeScript |
| Database | PostgreSQL |
| AI | Alibaba Cloud DashScope (OCR + Chat), Google Gemini (Chat) |
| Auth | Supabase (OAuth & OTP) — optional in LAN mode |
| Mobile | Capacitor (Android APK), PWA (iOS / Android) |
| Deploy | Docker Compose, Nginx |

---

## Quick Start with Docker / Docker 快速部署

The easiest way to get started. Only [Docker](https://www.docker.com/products/docker-desktop/) is required.

最简单的部署方式，只需要安装 [Docker](https://www.docker.com/products/docker-desktop/)。

### 1. Download / 下载部署文件

```bash
mkdir family-health && cd family-health
curl -O https://raw.githubusercontent.com/yangxunj/familyHealthManager/main/deploy/docker-compose.yml
curl -O https://raw.githubusercontent.com/yangxunj/familyHealthManager/main/deploy/.env.example
```

### 2. Configure / 配置

```bash
cp .env.example .env
```

Edit `.env` and fill in at minimum:

编辑 `.env`，至少填写以下两项：

- `DB_PASSWORD` — Change to a secure password / 修改为安全的数据库密码
- `DASHSCOPE_API_KEY` — Get from [Alibaba Cloud DashScope](https://dashscope.console.aliyun.com/) / 从[阿里云百炼](https://dashscope.console.aliyun.com/)获取

### 3. Start / 启动

```bash
docker compose up -d
```

Open http://localhost:5180 in your browser. Done!

浏览器打开 http://localhost:5180 ，完成！

### LAN Mode vs Public Mode / 局域网模式 vs 公网模式

By default, the app runs in **LAN mode** (no login required). To enable authentication, configure Supabase in `.env`.

默认以**局域网模式**运行（无需登录）。如需启用认证登录，在 `.env` 中配置 Supabase。

| | LAN Mode / 局域网模式 | Public Mode / 公网模式 |
|---|---|---|
| Auth / 认证 | None (auto login) / 无需登录 | Supabase (OAuth / OTP) |
| Admin | All users / 所有用户 | Configured via `ADMIN_EMAILS` |
| Setup / 配置 | Default (no extra config) / 默认（无需额外配置） | Set `SUPABASE_*` vars in `.env` / 在 `.env` 中配置 Supabase |

---

## Mobile Access / 移动端访问

### Android APK

Download the APK from [GitHub Releases](https://github.com/yangxunj/familyHealthManager/releases) and install on your Android device. The APK loads the frontend remotely from your server, so you always get the latest version without reinstalling.

从 [GitHub Releases](https://github.com/yangxunj/familyHealthManager/releases) 下载 APK 安装到安卓手机。APK 从服务器远程加载前端，无需重新安装即可获取最新版本。

**First launch / 首次使用：**

1. Open the app → Enter your server address / 打开 App → 输入服务器地址
   - Public server / 公网：`https://health.example.com`
   - LAN server / 局域网：`http://192.168.1.100:5180`
2. The app auto-detects the mode (LAN or Public) / App 自动检测运行模式
3. Configuration is saved locally — no need to re-enter next time / 配置保存在本地，下次无需重复输入

To change server later: **Settings → Server Config** / 更换服务器：**系统设置 → 服务器配置**

### iPhone / iPad (PWA)

Open your server URL in Safari → Tap **Share** → **Add to Home Screen**. The app will run in standalone mode like a native app.

在 Safari 中打开服务器地址 → 点击**分享** → **添加到主屏幕**。应用将以独立模式运行，体验接近原生 App。

---

## Build from Source / 从源码构建

For developers who want to modify the code or run in development mode.

适合需要修改代码或以开发模式运行的开发者。

### Prerequisites / 前置条件

- Node.js >= 18
- PostgreSQL >= 14
- pnpm >= 8

### Steps / 步骤

```bash
# 1. Clone / 克隆
git clone https://github.com/yangxunj/familyHealthManager.git
cd familyHealthManager

# 2. Install dependencies / 安装依赖
cd backend && pnpm install
cd ../frontend && pnpm install

# 3. Configure / 配置环境变量
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
# Edit both .env files / 编辑两个 .env 文件

# 4. Initialize database / 初始化数据库
cd backend
npx prisma migrate deploy
npx prisma db seed        # optional / 可选

# 5. Start / 启动
cd backend && pnpm run start:dev     # Terminal 1
cd frontend && pnpm run dev          # Terminal 2
```

Open http://localhost:5174. / 打开 http://localhost:5174。

### Build from source with Docker / 使用 Docker 从源码构建

```bash
git clone https://github.com/yangxunj/familyHealthManager.git
cd familyHealthManager
# Create .env.docker with your config / 创建 .env.docker 填入配置
docker compose up -d
# Open http://localhost:5180
```

---

## Project Structure / 项目结构

```
familyHealthManager/
├── backend/                # NestJS + Prisma
│   ├── src/modules/
│   │   ├── auth/           # Authentication (JWT) / 认证
│   │   ├── users/          # User management / 用户管理
│   │   ├── members/        # Family members / 家庭成员
│   │   ├── family/         # Family & invitations / 家庭管理与邀请
│   │   ├── documents/      # Health documents & OCR / 健康文档与 OCR
│   │   ├── records/        # Health records / 健康记录
│   │   ├── vaccination/    # Vaccination management / 疫苗接种
│   │   ├── checkups/       # Periodic checkups / 定期检查
│   │   ├── advice/         # AI health advice / AI 健康建议
│   │   ├── chat/           # AI health chat (SSE) / AI 健康咨询
│   │   ├── ai/             # AI service layer / AI 服务层
│   │   ├── config/         # System configuration / 系统配置
│   │   ├── storage/        # File storage / 文件存储
│   │   ├── settings/       # Admin settings / 管理员设置
│   │   └── whitelist/      # Email whitelist / 邮箱白名单
│   └── prisma/             # Schema & migrations / 数据库模型与迁移
├── frontend/               # React + Vite + Ant Design
│   ├── src/
│   │   ├── pages/          # Page components / 页面组件
│   │   ├── api/            # API client / API 调用
│   │   ├── store/          # Zustand state / 状态管理
│   │   ├── hooks/          # Custom hooks / 自定义 Hooks
│   │   └── components/     # Shared components / 公共组件
│   └── android/            # Capacitor Android project / 安卓原生层
├── deploy/                 # Production deployment files / 生产部署文件
├── doc/                    # Documentation / 文档
└── docker-compose.yml      # Dev Docker Compose / 开发用 Docker Compose
```

## Security / 安全特性

- **Rate Limiting** — 100 req/min for general APIs, 5/min for login, 10–20/min for AI endpoints. / 普通 API 100 次/分钟，登录 5 次/分钟，AI 接口 10–20 次/分钟。
- **Input Validation** — Global `ValidationPipe` with whitelist mode. / 全局输入校验，白名单模式。
- **Audit Logging** — Critical operations are logged to the `audit_logs` table. / 关键操作记录到审计日志表。
- **Email Whitelist** — Only whitelisted emails can log in (public mode). / 仅白名单内的邮箱可登录（公网模式）。
- **Data Encryption** — Health data is encrypted at rest; only family members can access their data. / 健康数据加密存储，仅家庭成员可访问。

## License / 许可证

MIT
