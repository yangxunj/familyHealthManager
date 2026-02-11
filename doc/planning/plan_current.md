# 管理员自动注册 + is_admin 持久化 - 工作计划

## 背景

当前管理员由环境变量 ADMIN_EMAILS 指定，非技术用户难以配置。改为：首个登录用户自动成为管理员并加入白名单。保留环境变量向后兼容。

---

## 实施步骤

### 步骤 1：数据库迁移
1. [x] AllowedEmail 表增加 is_admin 字段

### 步骤 2：修改 WhitelistService
2. [x] isAdmin() 异步化（检查环境变量 OR 数据库 is_admin）
3. [x] 新增 autoRegisterFirstUser()
4. [x] 新增 syncAdminEmailsFromEnv()

### 步骤 3：修改 AdminGuard
5. [x] canActivate 异步化

### 步骤 4：修改 SupabaseAuthGuard
6. [x] 注入 WhitelistService，首用户自动注册管理员

### 步骤 5：WhitelistModule 启动同步
7. [x] onModuleInit 调用 syncAdminEmailsFromEnv

### 步骤 6：WhitelistController 适配
8. [x] checkAdminStatus 中 await isAdmin

### 验证
9. [x] TypeScript 编译零错误
10. [ ] 功能测试通过
