# LAN 模式（免登录模式）- 工作计划

## 背景

支持两种部署模式：局域网模式（免登录）和公网模式（Supabase 认证）。通过是否配置 SUPABASE_URL 自动判断。

---

## 实施步骤

### 步骤 1：后端 — SupabaseAuthGuard 支持 LAN 模式
1. [x] 无 Supabase 时创建默认用户 + 默认家庭，挂载到 request

### 步骤 2：后端 — WhitelistService.isAdmin() 支持 LAN 模式
2. [x] LAN 模式下 isAdmin() 直接返回 true

### 步骤 3：前端 — authStore LAN 模式下加载家庭数据
3. [x] initialize() 中 LAN 模式补充调用 loadFamily()

### 步骤 4：前端 — MainLayout 适配 LAN 模式
4. [x] 隐藏退出登录/白名单菜单，用户名显示"本地用户"

### 验证
5. [x] TypeScript 编译零错误
6. [ ] 功能测试通过
