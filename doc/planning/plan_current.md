# API 密钥管理功能 - 工作计划

## 背景

管理员可在页面上配置 AI 服务的 API Key，保存到数据库，优先读取 DB 配置，回退到环境变量。

---

## 实施步骤

### 步骤 1：数据库迁移
1. [x] 新增 SystemConfig 表
2. [x] 运行迁移

### 步骤 2：后端 Settings 模块
3. [x] 新建 settings 模块（service + controller + dto）

### 步骤 3：修改 AiService
4. [x] 注入 SettingsService，从 DB 读取 API Key

### 步骤 4：前端 API 层
5. [x] 新建 settings API 和类型

### 步骤 5：前端 API 配置组件
6. [x] 新建 ApiConfigManager 组件

### 步骤 6：集成到 MainLayout
7. [x] 添加管理员菜单项

### 验证
8. [x] TypeScript 编译零错误
9. [ ] 功能测试通过
