# 家庭健康管理平台 - 部署指南

## 环境要求

- Node.js >= 18.0.0
- PostgreSQL >= 14
- pnpm >= 8.0.0

## 环境变量配置

### 后端 (backend/.env)

```env
# 数据库连接
DATABASE_URL="postgresql://user:password@localhost:5432/familyHealthManager?schema=public"

# JWT 配置
JWT_SECRET="your-super-secret-jwt-key-at-least-32-chars"
JWT_EXPIRES_IN="1d"
JWT_REFRESH_SECRET="your-super-secret-refresh-key-at-least-32-chars"
JWT_REFRESH_EXPIRES_IN="7d"

# 服务配置
PORT=5002
CORS_ORIGIN="http://localhost:5174"

# 阿里云 DashScope (通义千问 AI)
DASHSCOPE_API_KEY="your-dashscope-api-key"

# 文件上传
UPLOAD_DIR="./uploads"
MAX_FILE_SIZE=10485760  # 10MB
```

### 前端 (frontend/.env)

```env
VITE_API_BASE_URL=http://localhost:5002/api/v1
```

## 部署步骤

### 1. 克隆项目

```bash
git clone <repository-url>
cd familyHealthManager
```

### 2. 安装依赖

```bash
# 后端
cd backend
pnpm install

# 前端
cd ../frontend
pnpm install
```

### 3. 配置环境变量

复制示例配置文件并修改：

```bash
# 后端
cd backend
cp .env.example .env
# 编辑 .env 文件，填入实际配置

# 前端
cd ../frontend
cp .env.example .env
# 编辑 .env 文件，填入实际配置
```

### 4. 初始化数据库

```bash
cd backend

# 执行数据库迁移
npx prisma migrate deploy

# (可选) 生成种子数据
npx prisma db seed
```

### 5. 构建项目

```bash
# 后端
cd backend
pnpm build

# 前端
cd ../frontend
pnpm build
```

### 6. 启动服务

开发模式：

```bash
# 后端
cd backend
pnpm start:dev

# 前端
cd ../frontend
pnpm dev
```

生产模式：

```bash
# 后端
cd backend
pnpm start:prod

# 前端 - 使用 nginx 或其他静态文件服务器托管 dist 目录
```

## 访问地址

- 前端应用：http://localhost:5174
- 后端 API：http://localhost:5002/api/v1
- API 文档：http://localhost:5002/api/docs

## 健康检查

后端健康检查接口：

```bash
curl http://localhost:5002/api/v1/health
```

## 常见问题

### 1. 数据库连接失败

- 检查 PostgreSQL 服务是否运行
- 检查 DATABASE_URL 配置是否正确
- 检查数据库用户权限

### 2. AI 功能不可用

- 检查 DASHSCOPE_API_KEY 是否配置
- 检查网络是否能访问阿里云 API

### 3. 文件上传失败

- 检查 uploads 目录是否存在且有写入权限
- 检查文件大小是否超过限制

## 安全建议

1. **JWT Secret**：使用足够长且随机的字符串（至少32字符）
2. **数据库密码**：使用强密码
3. **CORS**：生产环境配置具体的前端域名
4. **HTTPS**：生产环境启用 HTTPS
5. **限流**：已内置 API 限流保护

## 监控

- API 日志输出到控制台
- 错误日志包含堆栈信息
- 审计日志存储在 audit_logs 表
