# 当前工作计划：家庭数据共享功能

> 开始日期：2026-01-22
> 完成日期：2026-01-22
>
> 目标：实现家庭级别的数据共享，让同一个家庭的多个用户能够看到相同的数据

---

## 功能说明

将系统从「用户中心」架构改为「家庭中心」架构：
- 新增 `Family` 实体作为数据归属的核心
- 用户通过创建或加入家庭来共享数据
- 所有健康数据（家庭成员、文档、记录、聊天）归属于家庭

---

## 第一阶段：数据库模型改造 ✅

### 1.1 新增 Family 表
- [x] 在 `schema.prisma` 中添加 `Family` 模型
  - id, name, inviteCode, createdAt, updatedAt
  - 关系：users, members, chatSessions

### 1.2 修改 User 表
- [x] 添加 `familyId` 外键（可为空）
- [x] 添加 `isOwner` 字段标识是否是家庭创建者
- [x] 添加与 Family 的关系

### 1.3 修改 FamilyMember 表
- [x] 将 `userId` 改为 `familyId`
- [x] 更新关系和索引

### 1.4 修改 ChatSession 表
- [x] 将 `userId` 改为 `familyId`
- [x] 添加 `createdBy` 字段记录创建者

### 1.5 执行数据库迁移
- [x] 生成迁移文件（自定义 SQL 迁移）
- [x] 重新生成 Prisma Client

---

## 第二阶段：数据迁移脚本 ✅

### 2.1 编写迁移脚本
- [x] 为每个现有用户自动创建一个家庭
- [x] 设置用户为家庭创建者
- [x] 将用户的 FamilyMember 数据关联到新家庭
- [x] 将用户的 ChatSession 数据关联到新家庭

### 2.2 执行迁移
- [x] 运行迁移脚本
- [x] 验证数据完整性

---

## 第三阶段：后端 API 改造 ✅

### 3.1 新增 Family 模块
- [x] 创建 `family.module.ts`
- [x] 创建 `family.service.ts`
  - createFamily() - 创建家庭
  - joinFamily() - 通过邀请码加入
  - leaveFamily() - 离开家庭
  - getFamilyInfo() - 获取家庭信息
  - getFamilyUsers() - 获取家庭用户列表
  - regenerateInviteCode() - 重新生成邀请码
  - removeMember() - 移除成员
- [x] 创建 `family.controller.ts`
  - POST /family - 创建家庭
  - POST /family/join - 加入家庭
  - DELETE /family/leave - 离开家庭
  - GET /family - 获取家庭信息
  - PATCH /family - 更新家庭信息
  - POST /family/regenerate-code - 重新生成邀请码
  - DELETE /family/members/:id - 移除成员
- [x] 创建 DTOs

### 3.2 修改 Members 模块
- [x] 修改 service：使用 familyId 替代 userId
- [x] 修改 controller：添加 requireFamily 检查

### 3.3 修改 Documents 模块
- [x] 修改 service：通过 familyId 过滤
- [x] 修改 controller：添加 requireFamily 检查

### 3.4 修改 Records 模块
- [x] 修改 service：通过 familyId 过滤
- [x] 修改 controller：添加 requireFamily 检查

### 3.5 修改 Advice 模块
- [x] 修改 service：通过 familyId 过滤
- [x] 修改 controller：添加 requireFamily 检查

### 3.6 修改 Chat 模块
- [x] 修改 service：使用 familyId 替代 userId
- [x] 保留 createdBy 记录创建者
- [x] 修改 controller：添加 requireFamily 检查

### 3.7 修改 Users 模块
- [x] 修改 /users/me 接口返回家庭信息

### 3.8 注册 Family 模块
- [x] 在 app.module.ts 中导入 FamilyModule

---

## 第四阶段：前端改造 ✅

### 4.1 新增家庭 API
- [x] 创建 `frontend/src/api/family.ts`

### 4.2 修改 Auth Store
- [x] 添加家庭状态（family, hasFamily）
- [x] 登录后获取家庭信息
- [x] 添加 loadFamily() 和 setFamily() 方法

### 4.3 新增家庭页面
- [x] 创建家庭设置页面 `frontend/src/pages/Family/index.tsx`
  - 未加入家庭时显示创建或加入选项
  - 显示邀请码（可复制）
  - 显示家庭用户列表
  - 重新生成邀请码功能（仅创建者）
  - 移除成员功能（仅创建者）
  - 离开家庭功能

### 4.4 修改路由
- [x] 添加 /family 路由

### 4.5 修改布局
- [x] 在侧边栏添加「家庭设置」菜单项

---

## 第五阶段：测试验证

### 5.1 功能测试
- [ ] 测试创建家庭
- [ ] 测试邀请码加入家庭
- [ ] 测试多用户看到相同数据
- [ ] 测试离开家庭
- [ ] 测试家庭创建者权限

### 5.2 边界情况
- [ ] 用户未加入家庭时的行为
- [ ] 最后一个成员离开家庭的处理

---

## 实际修改的文件

### 后端（新增）
- `src/modules/family/family.module.ts`
- `src/modules/family/family.service.ts`
- `src/modules/family/family.controller.ts`
- `src/modules/family/dto/create-family.dto.ts`
- `src/modules/family/dto/join-family.dto.ts`
- `src/modules/family/dto/update-family.dto.ts`
- `src/modules/family/dto/index.ts`
- `prisma/migrations/20260122080000_add_family_sharing/migration.sql`

### 后端（修改）
- `prisma/schema.prisma`
- `src/modules/auth/decorators/current-user.decorator.ts`
- `src/modules/auth/guards/supabase-auth.guard.ts`
- `src/modules/members/members.service.ts`
- `src/modules/members/members.controller.ts`
- `src/modules/documents/documents.service.ts`
- `src/modules/documents/documents.controller.ts`
- `src/modules/records/records.service.ts`
- `src/modules/records/records.controller.ts`
- `src/modules/advice/advice.service.ts`
- `src/modules/advice/advice.controller.ts`
- `src/modules/chat/chat.service.ts`
- `src/modules/chat/chat.controller.ts`
- `src/modules/users/users.service.ts`
- `src/app.module.ts`

### 前端（新增）
- `src/api/family.ts`
- `src/pages/Family/index.tsx`

### 前端（修改）
- `src/api/index.ts`
- `src/store/authStore.ts`
- `src/App.tsx`
- `src/components/Layout/MainLayout.tsx`

---

## 注意事项

1. **数据迁移安全**：迁移前确保现有用户数据完整保留 ✅
2. **邀请码生成**：使用安全的随机字符串（8位大写字母+数字，排除易混淆字符）✅
3. **权限控制**：只有家庭成员才能访问家庭数据 ✅
4. **家庭创建者**：只有创建者可以重新生成邀请码和移除成员 ✅
