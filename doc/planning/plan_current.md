# 当前工作计划：第七阶段 - AI 健康咨询对话

> 开始日期：2026-01-21
>
> 完成日期：2026-01-21
>
> 目标：完成与 AI 的流式健康咨询对话功能

---

## 1. 后端 Chat 模块

- [x] **1.1 创建 Chat 模块结构**
  - [x] 1.1.1 创建模块、控制器、服务
  - [x] 1.1.2 创建 DTO（创建会话、发送消息、查询会话）

- [x] **1.2 实现会话管理**
  - [x] 1.2.1 实现创建会话接口
  - [x] 1.2.2 实现获取会话列表接口
  - [x] 1.2.3 实现获取会话详情及消息接口
  - [x] 1.2.4 实现删除会话接口

- [x] **1.3 实现对话功能**
  - [x] 1.3.1 实现对话上下文构建服务（收集成员健康数据）
  - [x] 1.3.2 配置健康咨询 Prompt 模板
  - [x] 1.3.3 实现流式消息接口（SSE）
  - [x] 1.3.4 实现消息存储

---

## 2. 前端对话类型和 API

- [x] **2.1 类型定义**
  - [x] 2.1.1 创建会话、消息相关类型
  - [x] 2.1.2 创建 API 服务（含 SSE 流式处理）

---

## 3. 前端对话页面

- [x] **3.1 会话列表**
  - [x] 3.1.1 创建会话列表侧边栏
  - [x] 3.1.2 实现新建会话功能
  - [x] 3.1.3 实现删除会话功能

- [x] **3.2 对话界面**
  - [x] 3.2.1 创建消息气泡组件
  - [x] 3.2.2 创建输入框组件
  - [x] 3.2.3 实现流式消息接收和展示
  - [x] 3.2.4 实现自动滚动到底部

- [x] **3.3 辅助功能**
  - [x] 3.3.1 实现成员选择器
  - [x] 3.3.2 实现快捷问题入口
  - [x] 3.3.3 添加 AI 免责声明

---

## 验收标准

- [x] 可以选择家庭成员并开始对话
- [x] AI 回复实时流式展示
- [x] 对话可以访问成员的健康数据上下文
- [x] 会话记录正确保存和展示
- [x] 可以管理会话（新建、删除）

---

## 备注

### SSE 流式响应格式

```
event: message
data: {"content": "根据", "done": false}

event: message
data: {"content": "您的", "done": false}

event: message
data: {"content": "健康数据", "done": false}

event: done
data: {"tokensUsed": 150}
```

### 健康咨询 Prompt 模板要点

1. 角色设定：专业健康顾问
2. 注入成员健康数据上下文
3. 强调免责声明（不替代医疗诊断）
4. 回答要简洁、实用、有针对性

### 快捷问题

- "我最近的血压正常吗？"
- "如何改善睡眠质量？"
- "我应该注意哪些饮食习惯？"
- "帮我分析最近的健康数据"

---

## 实现文件清单

### 后端
- `backend/src/modules/ai/ai.service.ts` - 添加流式 API 支持
- `backend/src/modules/chat/dto/create-session.dto.ts` - 创建会话 DTO
- `backend/src/modules/chat/dto/send-message.dto.ts` - 发送消息 DTO
- `backend/src/modules/chat/dto/query-session.dto.ts` - 查询会话 DTO
- `backend/src/modules/chat/chat.service.ts` - 对话服务
- `backend/src/modules/chat/chat.controller.ts` - 对话控制器（含 SSE）
- `backend/src/modules/chat/chat.module.ts` - 对话模块

### 前端
- `frontend/src/types/chat.ts` - 对话相关类型定义
- `frontend/src/api/chat.ts` - 对话 API 服务（含 SSE 处理）
- `frontend/src/pages/Chat/ChatPage.tsx` - 对话主页面
- `frontend/src/pages/Chat/index.tsx` - 导出文件
