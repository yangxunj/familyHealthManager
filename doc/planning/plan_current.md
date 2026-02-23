# 家庭成员关联登录用户（FamilyMember.userId）

## 状态：已完成

### 步骤 1：数据库迁移 ✅
- [x] FamilyMember 模型新增 `userId` 字段（可空、唯一）
- [x] User 模型新增 `linkedMember` 反向关系
- [x] 运行迁移 `add_user_id_to_family_member`
- [x] 生成 Prisma Client

### 步骤 2：后端 Service + Controller ✅
- [x] CreateMemberDto 新增 `linkToCurrentUser` 布尔字段
- [x] MembersService.create 支持关联当前用户
- [x] MembersService 新增 linkToUser/unlinkFromUser/getMyMember 方法
- [x] findAll/findOne select 中加 userId
- [x] 软删除成员时清除 userId
- [x] MembersController 新增 GET /members/me、POST /members/:id/link、DELETE /members/me/link
- [x] FamilyService leave/removeMember 时清除 userId 关联

### 步骤 3：前端类型 + API ✅
- [x] FamilyMember 类型新增 userId 字段
- [x] CreateMemberRequest 新增 linkToCurrentUser 字段
- [x] membersApi 新增 getMyMember/linkToUser/unlinkFromUser

### 步骤 4：useDefaultMemberId hook ✅
- [x] 新建 useDefaultMemberId hook
- [x] 接入 ChatPage（新建会话弹窗默认选中）
- [x] 接入 FoodQueryPage
- [x] 接入 AdvicePage
- [x] 接入 VaccinationList
- [x] 接入 CheckupList

### 步骤 5：成员列表 + 表单 UI ✅
- [x] MemberList 显示"这是你"Tag
- [x] MemberList 显示"关联到我"按钮
- [x] MemberList 支持解除关联
- [x] MemberForm 新建模式添加"这个成员是我本人"复选框
- [x] 选择 SELF 关系时自动勾选

### 步骤 6：验证 ✅
- [x] 后端 `npx tsc --noEmit` 零错误
- [x] 前端 `npx tsc --noEmit` 零错误
