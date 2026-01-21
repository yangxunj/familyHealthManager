# 当前工作计划：第六阶段 - AI 健康建议

> 开始日期：2026-01-21
>
> 完成日期：2026-01-21
>
> 目标：完成 AI 分析健康数据并生成个性化建议

---

## 1. 后端 AI 服务模块

- [x] **1.1 创建 AI 模块结构**
  - [x] 1.1.1 安装 DashScope SDK 依赖
  - [x] 1.1.2 创建 ai 模块、服务
  - [x] 1.1.3 配置 AI 相关环境变量

- [x] **1.2 实现 DashScope API 封装**
  - [x] 1.2.1 实现通义千问 API 调用服务
  - [x] 1.2.2 实现错误处理和重试机制
  - [x] 1.2.3 实现 Token 计数

- [x] **1.3 配置健康建议 Prompt 模板**
  - [x] 1.3.1 设计健康建议 Prompt 结构
  - [x] 1.3.2 定义输出 JSON 格式规范

---

## 2. 后端建议模块 (Advice Module)

- [x] **2.1 创建建议模块结构**
  - [x] 2.1.1 创建模块、控制器、服务
  - [x] 2.1.2 创建 DTO

- [x] **2.2 实现数据收集服务**
  - [x] 2.2.1 汇总成员基本信息
  - [x] 2.2.2 汇总最近健康记录
  - [x] 2.2.3 汇总最近健康文档信息

- [x] **2.3 实现建议接口**
  - [x] 2.3.1 实现生成建议接口
  - [x] 2.3.2 实现建议解析和存储
  - [x] 2.3.3 实现历史建议查询接口
  - [x] 2.3.4 实现单条建议详情接口

---

## 3. 前端建议类型和 API

- [x] **3.1 类型定义**
  - [x] 3.1.1 创建建议相关类型
  - [x] 3.1.2 创建 API 服务

---

## 4. 前端 AI 建议页面

- [x] **4.1 建议页面**
  - [x] 4.1.1 创建 AI 建议主页面
  - [x] 4.1.2 实现成员选择
  - [x] 4.1.3 实现生成建议按钮

- [x] **4.2 建议报告组件**
  - [x] 4.2.1 实现健康评分展示（环形图）
  - [x] 4.2.2 实现关注事项列表
  - [x] 4.2.3 实现健康建议详情
  - [x] 4.2.4 实现行动清单

- [x] **4.3 历史记录**
  - [x] 4.3.1 实现历史建议列表
  - [x] 4.3.2 实现建议详情查看

- [x] **4.4 免责声明**
  - [x] 4.4.1 添加 AI 建议免责声明

---

## 验收标准

- [x] 可以为家庭成员生成 AI 健康建议
- [x] 建议内容结构完整（评分、关注事项、建议、行动清单）
- [x] 数据不足时有合适的提示
- [x] 明确展示 AI 建议的免责声明

---

## 备注

### AI 建议输出结构

```json
{
  "healthScore": 85,
  "summary": "整体健康状况良好...",
  "concerns": [
    {
      "level": "warning",
      "title": "血压偏高",
      "description": "近期收缩压多次超过 140mmHg..."
    }
  ],
  "suggestions": [
    {
      "category": "饮食",
      "title": "控制盐分摄入",
      "content": "建议每日盐摄入量控制在 6g 以下..."
    }
  ],
  "actionItems": [
    {
      "text": "每天监测血压两次（早晚各一次）",
      "priority": "high"
    }
  ]
}
```

### 阿里云 DashScope API

- 模型：qwen-turbo / qwen-plus
- API 文档：https://help.aliyun.com/zh/dashscope/
- 需要配置 DASHSCOPE_API_KEY 环境变量

---

## 实现文件清单

### 后端
- `backend/src/modules/ai/ai.service.ts` - DashScope API 封装服务
- `backend/src/modules/ai/ai.module.ts` - AI 模块
- `backend/src/modules/advice/dto/generate-advice.dto.ts` - 生成建议 DTO
- `backend/src/modules/advice/dto/query-advice.dto.ts` - 查询建议 DTO
- `backend/src/modules/advice/advice.service.ts` - 建议服务
- `backend/src/modules/advice/advice.controller.ts` - 建议控制器
- `backend/src/modules/advice/advice.module.ts` - 建议模块

### 前端
- `frontend/src/types/advice.ts` - 建议相关类型定义
- `frontend/src/api/advice.ts` - 建议 API 服务
- `frontend/src/pages/Advice/AdvicePage.tsx` - AI 建议主页面
- `frontend/src/pages/Advice/index.ts` - 导出文件
