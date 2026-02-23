# 家庭成员可见性控制

## 状态：已完成

### 步骤 1：数据库迁移 ✅
- [x] User 模型新增 `memberVisibilityConfigured` 字段
- [x] 新增 `MemberVisibility` 模型（userId + memberId 白名单）
- [x] 运行迁移 `add_member_visibility`
- [x] 生成 Prisma Client

### 步骤 2：后端 Service + Controller ✅
- [x] MembersService.findAll 支持 scope 参数和可见性过滤
- [x] MembersController.findAll 接收 scope query 参数
- [x] FamilyService 新增 getVisibilityConfig 方法
- [x] FamilyService 新增 setVisibility 方法（事务操作）
- [x] FamilyController 新增 GET /family/visibility
- [x] FamilyController 新增 PATCH /family/visibility/:userId
- [x] leave/removeMember 时清理 MemberVisibility 记录

### 步骤 3：前端 API + 类型 ✅
- [x] membersApi.getAll 支持 scope 参数
- [x] familyApi 新增 getVisibility/setVisibility
- [x] 新增 VisibilityConfig/VisibilityConfigUser/VisibilityConfigMember 类型

### 步骤 4：家庭页面 UI ✅
- [x] 管理员可见"可见性"配置按钮
- [x] Modal 含 Switch（启用/关闭限制）+ Checkbox 列表
- [x] 用户的 linkedMember 始终勾选且禁用
- [x] 保存配置到后端

### 步骤 5：成员管理页面适配 ✅
- [x] MemberList 使用 scope=all 确保显示全部成员
- [x] MemberForm 使用 scope=all

### 步骤 6：验证 ✅
- [x] 后端 `npx tsc --noEmit` 零错误
- [x] 前端 `npx tsc --noEmit` 零错误
