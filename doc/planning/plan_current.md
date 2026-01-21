# 当前工作计划：第八阶段 - 优化与测试

> 开始日期：2026-01-21
>
> 完成日期：2026-01-21
>
> 目标：性能优化、安全加固和全面测试

---

## 1. 后端优化

- [x] **1.1 数据库索引优化**
  - [x] 1.1.1 Prisma Schema 已包含复合索引

- [x] **1.2 实现关键接口缓存**
  - [x] 1.2.1 安装 @nestjs/cache-manager
  - [x] 1.2.2 配置全局缓存模块

- [x] **1.3 添加请求限流**
  - [x] 1.3.1 安装 @nestjs/throttler
  - [x] 1.3.2 配置全局限流（100次/分钟）
  - [x] 1.3.3 登录接口特殊限流（5次/分钟）
  - [x] 1.3.4 AI 接口特殊限流（10-20次/分钟）

- [x] **1.4 完善错误处理和日志**
  - [x] 1.4.1 统一异常过滤器增强
  - [x] 1.4.2 添加请求日志中间件

---

## 2. 安全加固

- [x] **2.1 输入验证增强**
  - [x] 2.1.1 全局 ValidationPipe 配置 whitelist

- [x] **2.2 敏感数据保护**
  - [x] 2.2.1 密码使用 bcrypt 哈希（已实现）
  - [x] 2.2.2 TransformInterceptor 统一响应格式

- [x] **2.3 操作审计日志**
  - [x] 2.3.1 创建 AuditLog 模型
  - [x] 2.3.2 实现 AuditService
  - [x] 2.3.3 数据库迁移

- [x] **2.4 安全依赖检查**
  - [x] 2.4.1 运行 pnpm audit（发现 hono 漏洞为 Prisma 依赖，不影响应用）

---

## 3. 文档完善

- [x] **3.1 API 文档**
  - [x] 3.1.1 配置 Swagger
  - [x] 3.1.2 添加接口标签分类

- [x] **3.2 部署文档**
  - [x] 3.2.1 编写环境变量说明
  - [x] 3.2.2 编写部署步骤

---

## 验收标准

- [x] 关键查询有索引覆盖
- [x] 全局缓存模块已配置
- [x] API 有限流保护
- [x] 关键操作有审计日志表
- [x] Swagger API 文档可用
- [x] 部署文档完整

---

## 实现文件清单

### 后端优化
- `backend/src/app.module.ts` - 添加 CacheModule, ThrottlerModule
- `backend/src/modules/auth/auth.controller.ts` - 登录限流
- `backend/src/modules/advice/advice.controller.ts` - AI 生成限流
- `backend/src/modules/chat/chat.controller.ts` - AI 对话限流
- `backend/src/common/filters/http-exception.filter.ts` - 增强异常过滤器
- `backend/src/common/middleware/logger.middleware.ts` - 请求日志

### 安全加固
- `backend/prisma/schema.prisma` - 添加 AuditLog 模型
- `backend/src/common/audit/audit.service.ts` - 审计日志服务
- `backend/src/common/audit/audit.module.ts` - 审计日志模块

### 文档
- `backend/src/main.ts` - Swagger 配置
- `doc/deployment/deployment-guide.md` - 部署指南

---

## 备注

### 限流策略

| 接口类型 | 限制 |
|---------|------|
| 普通 API | 100 次/分钟 |
| 登录接口 | 5 次/分钟 |
| AI 生成接口 | 10 次/分钟 |
| AI 对话接口 | 20 次/分钟 |

### API 文档

访问地址：http://localhost:5001/api/docs
