# 当前工作计划：Supabase 认证迁移

> 开始日期：2026-01-22
>
> 完成日期：2026-01-22
>
> 目标：将自定义 JWT 认证迁移到 Supabase 认证

---

## 1. 后端改动

- [x] **1.1 修改 jwt.strategy.ts**
  - [x] 使用 SUPABASE_JWT_SECRET 验证 JWT
  - [x] 自动创建本地用户（首次登录时）

- [x] **1.2 简化 auth 模块**
  - [x] 简化 auth.controller.ts（移除 login/register/refresh 端点）
  - [x] 简化 auth.service.ts
  - [x] 简化 auth.module.ts（移除 JwtModule）

- [x] **1.3 更新环境变量**
  - [x] 添加 SUPABASE_URL
  - [x] 添加 SUPABASE_JWT_SECRET
  - [x] 移除 JWT_SECRET

---

## 2. 前端改动

- [x] **2.1 安装依赖**
  - [x] @supabase/supabase-js

- [x] **2.2 创建新文件**
  - [x] `frontend/src/lib/supabase.ts` - Supabase 客户端
  - [x] `frontend/src/components/auth/AuthCallback.tsx` - OAuth 回调处理

- [x] **2.3 修改现有文件**
  - [x] `frontend/src/store/authStore.ts` - 使用 Supabase session 管理
  - [x] `frontend/src/pages/Auth/Login.tsx` - Google OAuth 登录
  - [x] `frontend/src/api/client.ts` - 使用 Supabase token
  - [x] `frontend/src/App.tsx` - 添加初始化和 /auth/callback 路由
  - [x] `frontend/.env` - 添加 VITE_SUPABASE_* 变量

- [x] **2.4 清理文件**
  - [x] 删除 `frontend/src/pages/Auth/Register.tsx`
  - [x] 简化 `frontend/src/api/auth.ts`
  - [x] 简化 `frontend/src/types/auth.ts`

---

## 3. 验证

- [x] **3.1 TypeScript 类型检查**
  - [x] 前端通过 `tsc --noEmit`
  - [x] 后端通过 `tsc --noEmit`

---

## 验收标准

- [x] 后端使用 SUPABASE_JWT_SECRET 验证 JWT
- [x] 前端使用 Supabase 进行 Google OAuth 登录
- [x] 首次登录自动创建本地用户记录
- [x] TypeScript 编译无错误

---

## 环境变量配置

### 后端 (backend/.env)
```bash
SUPABASE_URL=https://oqfgpnlmixicmobfchaq.supabase.co
SUPABASE_JWT_SECRET=u23Uod/G7PhUpRI5RGXSS2WDUQ7AoyKL11zppj/rxUE2C5hiLZs4MXwYJgwxLTnZls7ojV5O30GB5Oxsqkt1aQ==
```

### 前端 (frontend/.env)
```bash
VITE_SUPABASE_URL=https://oqfgpnlmixicmobfchaq.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

## 测试步骤

1. 启动后端：`cd backend && pnpm start:dev`
2. 启动前端：`cd frontend && pnpm dev`
3. 访问 http://localhost:5174/login
4. 点击 "使用 Google 账号登录"
5. 完成 Google 授权
6. 自动跳转到 /dashboard
7. 检查数据库：用户记录已创建
8. 测试 API：家庭成员等功能正常
9. 测试登出：点击登出，跳转到登录页
