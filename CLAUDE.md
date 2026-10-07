# 家庭健康管理平台 - 开发指南

**技术栈**: React + Vite + Ant Design + Zustand | Node.js + NestJS + Prisma | PostgreSQL

**核心功能**: 用户认证、家庭成员管理、健康文档、健康记录、AI健康建议、AI健康咨询

---

## 工作计划管理

本项目采用**计划驱动开发**模式，所有编码工作必须基于详细的工作计划文件进行。

### 计划文件结构

```
doc/
├── planning/                              # 计划相关
│   ├── plan_current.md                    # 当前正在进行的模块工作计划
│   └── plans_archive/                     # 已完成的工作计划归档
├── deployment/                            # 部署文档
│   └── deployment-guide.md                # 部署指南
└── reference/                             # 参考资料
```

### 工作流程

1. **开始新工作前**：先编写详细的分步骤工作计划，记录到 `doc/planning/plan_current.md`
2. **计划审核**：计划编写完成后，需经用户检查确认后才能开始执行
3. **执行过程中**：每完成一个步骤，立即在计划文件中将该步骤标记为完成（打勾）
4. **模块完成后**：将 `plan_current.md` 归档到 `doc/planning/plans_archive/` 并重命名

---

## 开发环境信息

### 本地开发地址

- **前端**: http://localhost:5174
- **后端API**: http://localhost:5002/api/v1
- **API文档**: http://localhost:5002/api/docs
- **Prisma Studio**: http://localhost:5555

### 启动命令（重要！）

开发时必须使用以下命令启动服务：

```bash
# 前端（在 frontend/ 目录）
cd frontend && pnpm run dev

# 后端（在 backend/ 目录）
cd backend && pnpm run start:dev
```

其他常用命令：

```bash
# Prisma Studio（在 backend/ 目录）
cd backend && npx prisma studio --port 5555

# 数据库迁移（在 backend/ 目录）
cd backend && npx prisma migrate dev

# 生成 Prisma Client（在 backend/ 目录）
cd backend && npx prisma generate

# 种子数据（在 backend/ 目录）
cd backend && npx prisma db seed
```

**注意**：启动命令必须在对应目录下执行，不要在项目根目录直接运行。

### 端口管理（重要！）

**固定端口号**：
- 前端：**5174**（配置在 `frontend/vite.config.ts`）
- 后端：**5002**（配置在 `backend/.env`）

**启动前必须检查端口占用**，避免服务启动在错误的端口：

```bash
# 检查端口是否被占用
netstat -ano | grep -E "(:5174|:5002)"

# 如果端口被占用，找到 PID 并杀掉进程
# Windows:
taskkill //F //PID <PID号>

# 示例：杀掉占用 5002 端口的进程
netstat -ano | grep ":5002"  # 找到 PID
taskkill //F //PID 12345     # 杀掉进程
```

**常见问题**：
- 如果前端启动后显示 5175 而不是 5174，说明 5174 被占用，需要先杀掉占用进程
- 如果后端启动后 API 无法访问，检查 5002 端口是否被其他进程占用
- **每次启动服务前，先确认目标端口是空闲的**

### Docker 部署（重要！）

项目已通过 Docker Compose 正式部署使用。**每个完整的逻辑改动完成必要验证并提交后，按现有项目授权重新构建并部署 Docker 镜像**，无需额外确认：

```bash
# 仅前端改动
docker compose build --no-cache frontend && docker compose up -d frontend

# 仅后端改动
docker compose build --no-cache backend && docker compose up -d backend

# 前后端都有改动
docker compose build --no-cache && docker compose up -d
```

---

## 项目结构

```
familyHealthManager/
├── backend/                  # 后端服务（NestJS + Prisma）
│   ├── src/
│   │   ├── modules/          # 功能模块
│   │   │   ├── auth/         # 认证模块（JWT）
│   │   │   ├── users/        # 用户管理
│   │   │   ├── members/      # 家庭成员管理
│   │   │   ├── documents/    # 健康文档
│   │   │   ├── records/      # 健康记录
│   │   │   ├── advice/       # AI健康建议
│   │   │   ├── chat/         # AI健康咨询
│   │   │   ├── ai/           # AI服务（DashScope）
│   │   │   └── storage/      # 文件存储
│   │   ├── common/           # 公共模块
│   │   │   ├── audit/        # 审计日志
│   │   │   ├── filters/      # 异常过滤器
│   │   │   ├── interceptors/ # 拦截器
│   │   │   ├── middleware/   # 中间件
│   │   │   └── prisma/       # Prisma服务
│   │   └── main.ts           # 入口文件
│   ├── prisma/
│   │   ├── schema.prisma     # 数据库模型
│   │   └── migrations/       # 数据库迁移
│   └── uploads/              # 文件上传目录
├── frontend/                 # 前端应用（React + Vite）
│   ├── src/
│   │   ├── pages/            # 页面组件
│   │   │   ├── Auth/         # 认证页面
│   │   │   ├── Dashboard/    # 仪表盘
│   │   │   ├── Members/      # 家庭成员
│   │   │   ├── Documents/    # 健康文档
│   │   │   ├── Records/      # 健康记录
│   │   │   ├── Advice/       # AI健康建议
│   │   │   └── Chat/         # AI健康咨询
│   │   ├── components/       # 公共组件
│   │   ├── api/              # API调用
│   │   ├── store/            # Zustand状态管理
│   │   ├── hooks/            # 自定义Hooks
│   │   ├── layouts/          # 布局组件
│   │   └── types/            # TypeScript类型
│   └── public/               # 静态资源
├── doc/                      # 项目文档
│   ├── planning/             # 工作计划
│   └── deployment/           # 部署文档
└── claude.md                 # 开发指南（本文件）
```

---

## 核心功能模块

### 认证模块 (auth)
- JWT Token认证
- 登录/注册
- Token刷新

### 家庭成员管理 (members)
- 成员CRUD
- 成员头像上传

### 健康文档 (documents)
- 文档上传与管理
- 关联家庭成员

### 健康记录 (records)
- 血压、血糖、体温、体重等记录
- 数据可视化

### AI健康建议 (advice)
- 基于健康数据生成AI建议
- DashScope API集成

### AI健康咨询 (chat)
- 实时AI对话
- SSE流式响应

---

## 安全特性

- **限流保护**: 普通API 100次/分钟，登录 5次/分钟，AI接口 10-20次/分钟
- **输入验证**: 全局ValidationPipe with whitelist
- **审计日志**: 关键操作记录到audit_logs表
- **JWT认证**: Access Token + Refresh Token

---

## Git提交规则

**提交时机**: 每个独立、完整的逻辑改动在完成必要验证后及时提交；允许同一任务中多轮编辑和修正，不按文件变化或计划步骤逐次提交。只暂存本次任务相关改动，保留用户已有未提交和已暂存内容。

**Commit格式**:

```bash
<type>: <简短描述>

<详细说明（可选）>

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
```

**Type类型**:
- `feat` - 新功能
- `fix` - Bug修复
- `docs` - 文档更新
- `refactor` - 代码重构
- `perf` - 性能优化
- `chore` - 其他

---

**记住**: 先读代码，再动手。保持简单，避免过度设计。

## Git 云端备份

- 完成当前任务的必要验证和完整逻辑提交后，主动普通 push 到已配置的用户/组织远程当前任务分支，确认远程包含本次提交；无需再次询问。提交和推送均按完整任务或已验证里程碑收口，不按文件逐次操作。当次用户或项目明确要求仅本地时保留例外。
- 核对仓库绑定账号、远程与目标分支；无 upstream 但用户远程和当前分支归属明确时，可用 git push -u 建立同名跟踪。遇到无远程、认证失败、远程分叉等问题，保留本地提交并报告原因、未推送数量及下一步，不强推、不自动改写或合并历史、不顺带批量推其他项目/分支。
- 最终回复分别说明本地提交号与实际推送结果；dry-run 不算已推送。Git 备份不新增部署、PR 合并或业务发布授权，用户已有改动、忽略文件和密钥继续保留原有处理方式。
