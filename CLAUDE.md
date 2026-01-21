# 家庭健康管理平台 - 开发指南

**技术栈**: React + Vite + Ant Design + Zustand | Node.js + NestJS + Prisma | PostgreSQL

**核心功能**: 家庭成员管理、健康文档管理、健康记录追踪、AI健康建议、AI健康咨询

---

## 工作计划管理

本项目采用**计划驱动开发**模式，所有编码工作必须基于详细的工作计划文件进行。

### 计划文件结构

```
doc/
├── planning/                              # 计划相关
│   ├── plan_current.md                    # 当前正在进行的模块工作计划
│   ├── plan_whole_project.md              # 整个项目的总体工作计划
│   └── plans_archive/                     # 已完成的工作计划归档
├── design/                                # 设计文档
│   ├── product-design.md                  # 产品设计文档
│   └── technical-architecture.md          # 技术架构文档
└── reference/                             # 参考资料
    └── database-schema.md                 # 数据库表结构（待创建）
```

### 工作流程

1. **开始新工作前**：先编写详细的分步骤工作计划，记录到 `doc/planning/plan_current.md`
2. **计划审核**：计划编写完成后，需经用户检查确认后才能开始执行
3. **执行过程中**：每完成一个步骤，立即在计划文件中将该步骤标记为完成（打勾）
4. **模块完成后**：
   - 更新 `doc/planning/plan_whole_project.md` 中对应模块的状态
   - 将 `plan_current.md` 归档到 `doc/planning/plans_archive/` 并重命名
   - 清空 `plan_current.md`，准备写入下一个模块的计划

### 执行规范

每完成 `doc/planning/plan_current.md` 中的一个小步骤（如 2.1、2.2、2.3...），按以下流程执行：

1. **编码实现**：完成该步骤的代码开发
2. **测试验证**：如果该步骤是可测试的，必须先进行测试，确保功能正常
3. **标记完成**：测试通过后，在 `doc/planning/plan_current.md` 中将该步骤标记为已完成（打勾）
4. **立即提交**：标记完成后，立即提交 Git
   - 提交信息应清晰说明完成了哪个步骤
   - 不要等整个阶段完成才一次性提交
5. **继续下一步**：按计划持续执行下一个步骤

**重要**：
- Git 提交的粒度是 `doc/planning/plan_current.md` 中的每个编号步骤（如 2.1、2.2），而不是整个阶段
- 必须**测试通过后**才能提交，不要提交未经测试的代码

### 计划文件格式

使用 Markdown 复选框语法标记任务状态：
- `- [ ]` 待完成
- `- [x]` 已完成

---

## 项目文档

| 文档 | 路径 | 说明 |
|------|------|------|
| 产品设计 | `doc/design/product-design.md` | 产品功能需求和业务规则 |
| 技术架构 | `doc/design/technical-architecture.md` | 技术选型、数据模型、API设计 |
| 项目总计划 | `doc/planning/plan_whole_project.md` | 整个项目的开发阶段和里程碑 |
| 当前模块计划 | `doc/planning/plan_current.md` | 当前正在开发的模块详细步骤 |
| **数据库结构** | `doc/reference/database-schema.md` | **数据库表结构参考（查询数据库前必读）** |

---

## 数据库查询规范

**重要**: 在执行任何数据库查询之前，必须先了解数据库结构：

1. **表名**: PostgreSQL 使用小写蛇形命名（如 `family_members` 而非 `FamilyMember`）
2. **字段名**: 同样使用小写蛇形命名（如 `birth_date` 而非 `birthDate`）
3. **枚举值**: 了解各枚举类型的有效值
4. **表关系**: 了解表之间的关联关系

**常见表名映射**：
```
Prisma Model      → PostgreSQL Table
User              → users
FamilyMember      → family_members
Document          → documents
HealthRecord      → health_records
HealthAdvice      → health_advices
ChatSession       → chat_sessions
ChatMessage       → chat_messages
```

---

## 开发环境信息

### 本地开发地址

- **前端**: http://localhost:5173 （Vite默认端口）
- **后端API**: http://localhost:5001
- **Prisma Studio**: http://localhost:5555

### 启动命令

```bash
# 前端（在 frontend/ 目录）
cd frontend && pnpm run dev

# 后端（在 backend/ 目录）
cd backend && pnpm run start:dev

# Prisma Studio（在 backend/ 目录）
cd backend && npx prisma studio --port 5555

# 数据库迁移（在 backend/ 目录）
cd backend && npx prisma migrate dev

# 种子数据（在 backend/ 目录）
cd backend && npx prisma db seed
```

**注意**：启动命令必须在对应目录下执行，不要在项目根目录直接运行。

### 端口管理

**固定端口号**：
- 前端：**5173**
- 后端：**5001**

**启动前检查端口占用**：
```bash
# 检查端口是否被占用
netstat -ano | findstr ":5173 :5001"

# 如果端口被占用，杀掉占用进程
taskkill /F /PID <PID号>
```

---

## 项目结构

```
family-health-manager/
├── backend/                  # 后端服务（NestJS + Prisma）
│   ├── src/
│   │   ├── modules/          # 功能模块
│   │   │   ├── auth/         # 认证模块
│   │   │   ├── users/        # 用户管理
│   │   │   ├── members/      # 家庭成员
│   │   │   ├── documents/    # 健康文档
│   │   │   ├── records/      # 健康记录
│   │   │   ├── advice/       # AI健康建议
│   │   │   ├── chat/         # AI咨询对话
│   │   │   ├── storage/      # 文件存储
│   │   │   └── ai/           # AI服务封装
│   │   ├── common/           # 公共模块
│   │   │   ├── decorators/   # 自定义装饰器
│   │   │   ├── filters/      # 异常过滤器
│   │   │   ├── guards/       # 权限守卫
│   │   │   └── prisma/       # Prisma服务
│   │   └── config/           # 配置
│   ├── prisma/
│   │   ├── schema.prisma     # 数据库模型
│   │   └── seed.ts           # 种子数据
│   └── package.json
│
├── frontend/                 # 前端应用（React + Vite）
│   ├── src/
│   │   ├── pages/            # 页面组件
│   │   │   ├── Dashboard/    # 首页仪表盘
│   │   │   ├── Members/      # 家庭成员
│   │   │   ├── Documents/    # 健康文档
│   │   │   ├── Records/      # 健康记录
│   │   │   ├── Advice/       # AI建议
│   │   │   ├── Chat/         # AI咨询
│   │   │   └── Auth/         # 认证页面
│   │   ├── components/       # 公共组件
│   │   ├── api/              # API调用
│   │   ├── store/            # Zustand状态管理
│   │   ├── hooks/            # 自定义Hooks
│   │   └── types/            # TypeScript类型
│   └── package.json
│
├── doc/                      # 项目文档
│   ├── design/               # 设计文档
│   ├── planning/             # 计划文档
│   └── reference/            # 参考资料
│
└── CLAUDE.md                 # 本文件
```

---

## 开发流程

### 添加新功能模块

**步骤1: 后端模块**

```bash
cd backend
nest generate module modules/your-feature
nest generate controller modules/your-feature
nest generate service modules/your-feature
```

**步骤2: 数据库模型**（如需要）

```bash
# 编辑 prisma/schema.prisma 添加新模型
npx prisma migrate dev --name add-your-feature
npx prisma generate
```

**步骤3: 前端页面**

```bash
# 在 frontend/src/pages/ 创建新页面
# 在 App.tsx 添加路由
# 在 api/ 目录添加API调用
```

**步骤4: 测试验证**

```bash
# 后端
cd backend && pnpm run build

# 前端
cd frontend && pnpm run build
```

---

## 安全与数据隔离

### 数据隔离（重要！）

所有涉及用户数据的查询必须包含 `userId` 过滤：

```typescript
// 正确示例
const members = await this.prisma.familyMember.findMany({
  where: { userId: user.id },
});

// 错误示例 - 数据泄露风险！
const members = await this.prisma.familyMember.findMany();
```

### 成员归属验证

访问家庭成员相关数据前，必须验证成员归属：

```typescript
// 验证成员归属
async validateMemberOwnership(userId: string, memberId: string) {
  const member = await this.prisma.familyMember.findFirst({
    where: { id: memberId, userId },
  });
  if (!member) {
    throw new ForbiddenException('无权访问该成员');
  }
  return member;
}
```

---

## Git提交规则

**Commit格式**:

```bash
<type>: <简短描述>

<详细说明（可选）>

Co-Authored-By: Claude <noreply@anthropic.com>
```

**Type类型**:

- `feat` - 新功能
- `fix` - Bug修复
- `docs` - 文档更新
- `refactor` - 代码重构
- `test` - 测试相关
- `perf` - 性能优化
- `chore` - 其他

---

## 关键禁忌事项

**绝对不能做的事**:

- 绕过用户数据隔离（userId验证）
- 硬编码配置（必须使用环境变量）
- 不测试就提交代码
- 在前端暴露敏感密钥（API Key等）
- AI功能中做出医学诊断或用药建议

---

## AI功能开发注意事项

### 安全边界

AI功能必须遵守以下边界：

1. **不能做医学诊断** - 只能提供健康科普和建议
2. **不能建议用药剂量** - 涉及用药必须引导就医
3. **紧急情况识别** - 识别危险信号时必须提示就医
4. **免责声明** - 所有AI相关页面必须展示免责声明

### Prompt管理

AI Prompt 模板统一存放在 `src/config/prompts.ts`，便于维护和调整。

---

**记住**: 先读文档，再动手。保持简单，避免过度设计。健康数据敏感，安全第一。
