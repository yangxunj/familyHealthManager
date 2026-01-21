# 家庭健康管理平台 - 技术架构文档

> 版本：1.0
>
> 创建日期：2026-01-21
>
> 配套文档：`doc/design/product-design.md`
>
> 状态：设计中

---

## 目录

1. [架构概述](#1-架构概述)
2. [技术选型](#2-技术选型)
3. [数据模型设计](#3-数据模型设计)
4. [API接口设计](#4-api接口设计)
5. [后端模块设计](#5-后端模块设计)
6. [前端架构设计](#6-前端架构设计)
7. [AI功能实现](#7-ai功能实现)
8. [安全设计](#8-安全设计)
9. [部署架构](#9-部署架构)

---

## 1. 架构概述

### 1.1 整体架构

```
┌─────────────────────────────────────────────────────────────────────┐
│                          系统架构图                                  │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌─────────────┐          ┌─────────────┐          ┌─────────────┐ │
│  │   Frontend  │   HTTP   │   Backend   │  Prisma  │ PostgreSQL  │ │
│  │ React+Vite  │◀────────▶│   NestJS    │◀────────▶│             │ │
│  │ Ant Design  │          │             │          └─────────────┘ │
│  └─────────────┘          └──────┬──────┘                          │
│                                  │                                  │
│                    ┌─────────────┼─────────────┐                   │
│                    │             │             │                   │
│                    ▼             ▼             ▼                   │
│             ┌──────────┐  ┌──────────┐  ┌──────────┐              │
│             │   LLM    │  │  Object  │  │  Redis   │              │
│             │   API    │  │ Storage  │  │  Cache   │              │
│             │(DashScope)│  │ (Local/  │  │(可选)    │              │
│             │          │  │  云存储) │  │          │              │
│             └──────────┘  └──────────┘  └──────────┘              │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### 1.2 模块划分

```
┌─────────────────────────────────────────────────────────────────────┐
│                          后端模块划分                                │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐                 │
│  │    auth     │  │   users     │  │   members   │                 │
│  │   用户认证   │  │   用户管理   │  │  家庭成员   │                 │
│  └─────────────┘  └─────────────┘  └─────────────┘                 │
│                                                                     │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐                 │
│  │  documents  │  │   records   │  │   advice    │                 │
│  │  健康文档   │  │  健康记录   │  │  AI健康建议  │                 │
│  └─────────────┘  └─────────────┘  └─────────────┘                 │
│                                                                     │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐                 │
│  │    chat     │  │   storage   │  │     ai      │                 │
│  │  AI对话咨询  │  │  文件存储   │  │  AI服务封装  │                 │
│  └─────────────┘  └─────────────┘  └─────────────┘                 │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 2. 技术选型

### 2.1 技术栈概览

| 层次 | 技术 | 版本 | 说明 |
|------|------|------|------|
| **前端框架** | React | 18.x | 组件化UI开发 |
| **构建工具** | Vite | 5.x | 快速开发构建 |
| **UI组件库** | Ant Design | 5.x | 企业级组件库 |
| **状态管理** | Zustand | 4.x | 轻量级状态管理 |
| **请求库** | Axios + React Query | - | 数据请求与缓存 |
| **图表库** | ECharts | 5.x | 健康数据可视化 |
| **后端框架** | NestJS | 10.x | Node.js企业级框架 |
| **ORM** | Prisma | 5.x | 类型安全的数据库操作 |
| **数据库** | PostgreSQL | 15.x | 关系型数据库 |
| **缓存** | Redis | 7.x | 缓存与会话存储（可选） |
| **AI服务** | 阿里云DashScope | - | 通义千问大模型API |
| **文件存储** | 本地/OSS | - | 健康文档存储 |

### 2.2 开发工具

| 工具 | 用途 |
|------|------|
| TypeScript | 类型安全 |
| ESLint + Prettier | 代码规范 |
| pnpm | 包管理 |
| Docker | 容器化部署 |
| Git | 版本控制 |

---

## 3. 数据模型设计

### 3.1 Prisma Schema

```prisma
// prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ============================================================================
// 枚举定义
// ============================================================================

/// 家庭成员关系
enum Relationship {
  SELF        // 本人
  SPOUSE      // 配偶
  FATHER      // 父亲
  MOTHER      // 母亲
  SON         // 儿子
  DAUGHTER    // 女儿
  GRANDFATHER // 祖父/外祖父
  GRANDMOTHER // 祖母/外祖母
  OTHER       // 其他
}

/// 性别
enum Gender {
  MALE
  FEMALE
}

/// 血型
enum BloodType {
  A
  B
  AB
  O
  UNKNOWN
}

/// 健康文档类型
enum DocumentType {
  PHYSICAL_EXAM     // 体检报告
  LAB_REPORT        // 检验报告
  IMAGING_REPORT    // 影像报告
  MEDICAL_RECORD    // 病历记录
  PRESCRIPTION      // 处方单
  OTHER             // 其他
}

/// 健康指标类型
enum RecordType {
  // 基础指标
  HEIGHT            // 身高
  WEIGHT            // 体重
  WAIST             // 腰围
  // 心血管
  SYSTOLIC_BP       // 收缩压
  DIASTOLIC_BP      // 舒张压
  HEART_RATE        // 心率
  // 血糖
  FASTING_GLUCOSE   // 空腹血糖
  POSTPRANDIAL_GLUCOSE // 餐后血糖
  HBA1C             // 糖化血红蛋白
  // 血脂
  TOTAL_CHOLESTEROL // 总胆固醇
  TRIGLYCERIDES     // 甘油三酯
  HDL               // 高密度脂蛋白
  LDL               // 低密度脂蛋白
  // 其他
  TEMPERATURE       // 体温
  BLOOD_OXYGEN      // 血氧饱和度
}

/// 测量场景
enum MeasurementContext {
  MORNING           // 晨起
  BEFORE_MEAL       // 餐前
  AFTER_MEAL        // 餐后
  AFTER_EXERCISE    // 运动后
  BEFORE_SLEEP      // 睡前
  OTHER             // 其他
}

/// 对话角色
enum ChatRole {
  USER
  ASSISTANT
}

// ============================================================================
// 数据模型
// ============================================================================

/// 用户表
model User {
  id            String    @id @default(uuid())
  email         String    @unique @db.VarChar(255)
  passwordHash  String    @map("password_hash") @db.VarChar(255)
  name          String    @db.VarChar(100)
  avatar        String?   @db.VarChar(500)
  phone         String?   @db.VarChar(20)

  // 时间戳
  createdAt     DateTime  @default(now()) @map("created_at")
  updatedAt     DateTime  @updatedAt @map("updated_at")
  lastLoginAt   DateTime? @map("last_login_at")

  // 关系
  members       FamilyMember[]
  chatSessions  ChatSession[]

  @@map("users")
}

/// 家庭成员表
model FamilyMember {
  id            String       @id @default(uuid())
  userId        String       @map("user_id")

  // 基本信息
  name          String       @db.VarChar(100)
  relationship  Relationship
  gender        Gender
  birthDate     DateTime     @map("birth_date") @db.Date
  avatar        String?      @db.VarChar(500)
  bloodType     BloodType    @default(UNKNOWN) @map("blood_type")

  // 身体基础数据（最新值，便于快速查询）
  height        Decimal?     @db.Decimal(5, 2)  // cm
  weight        Decimal?     @db.Decimal(5, 2)  // kg

  // 病史
  chronicDiseases String[]   @default([]) @map("chronic_diseases")  // 慢性病
  allergies     String?      @db.Text                               // 过敏史

  // 备注
  notes         String?      @db.Text

  // 时间戳
  createdAt     DateTime     @default(now()) @map("created_at")
  updatedAt     DateTime     @updatedAt @map("updated_at")
  deletedAt     DateTime?    @map("deleted_at")

  // 关系
  user          User         @relation(fields: [userId], references: [id], onDelete: Cascade)
  documents     Document[]
  records       HealthRecord[]
  advices       HealthAdvice[]
  chatSessions  ChatSession[]

  @@index([userId])
  @@index([userId, deletedAt])
  @@map("family_members")
}

/// 健康文档表
model Document {
  id            String       @id @default(uuid())
  memberId      String       @map("member_id")

  // 文档信息
  type          DocumentType
  name          String       @db.VarChar(200)
  checkDate     DateTime     @map("check_date") @db.Date
  institution   String?      @db.VarChar(200)  // 检查机构

  // 文件
  files         Json         @default("[]")     // 文件URL数组 [{url, name, size, type}]

  // 备注
  notes         String?      @db.Text

  // AI解析结果（可选）
  parsedData    Json?        @map("parsed_data")  // AI解析提取的指标数据

  // 时间戳
  createdAt     DateTime     @default(now()) @map("created_at")
  updatedAt     DateTime     @updatedAt @map("updated_at")
  deletedAt     DateTime?    @map("deleted_at")

  // 关系
  member        FamilyMember @relation(fields: [memberId], references: [id], onDelete: Cascade)

  @@index([memberId])
  @@index([memberId, type])
  @@index([memberId, checkDate])
  @@map("documents")
}

/// 健康记录表
model HealthRecord {
  id            String             @id @default(uuid())
  memberId      String             @map("member_id")

  // 记录信息
  recordDate    DateTime           @map("record_date")
  recordType    RecordType         @map("record_type")
  value         Decimal            @db.Decimal(10, 2)
  unit          String             @db.VarChar(20)

  // 测量上下文
  context       MeasurementContext @default(OTHER)

  // 异常标记
  isAbnormal    Boolean            @default(false) @map("is_abnormal")

  // 备注
  notes         String?            @db.Text

  // 来源（手动/文档解析）
  source        String             @default("MANUAL") @db.VarChar(20)
  documentId    String?            @map("document_id")  // 如果来自文档解析

  // 时间戳
  createdAt     DateTime           @default(now()) @map("created_at")

  // 关系
  member        FamilyMember       @relation(fields: [memberId], references: [id], onDelete: Cascade)

  @@index([memberId])
  @@index([memberId, recordType])
  @@index([memberId, recordDate])
  @@map("health_records")
}

/// AI健康建议表
model HealthAdvice {
  id            String       @id @default(uuid())
  memberId      String       @map("member_id")

  // 建议内容
  content       Json                          // 完整的建议内容（JSON结构）
  healthScore   Int?         @map("health_score")  // 健康评分 0-100

  // 生成时的数据快照（用于追溯）
  dataSnapshot  Json         @map("data_snapshot")

  // AI相关
  modelUsed     String?      @map("model_used") @db.VarChar(50)
  tokensUsed    Int?         @map("tokens_used")

  // 时间戳
  generatedAt   DateTime     @default(now()) @map("generated_at")

  // 关系
  member        FamilyMember @relation(fields: [memberId], references: [id], onDelete: Cascade)

  @@index([memberId])
  @@index([memberId, generatedAt])
  @@map("health_advices")
}

/// AI咨询会话表
model ChatSession {
  id            String       @id @default(uuid())
  userId        String       @map("user_id")
  memberId      String       @map("member_id")

  // 会话信息
  title         String       @db.VarChar(200)  // 会话标题（可自动生成）

  // 时间戳
  createdAt     DateTime     @default(now()) @map("created_at")
  updatedAt     DateTime     @updatedAt @map("updated_at")

  // 关系
  user          User         @relation(fields: [userId], references: [id], onDelete: Cascade)
  member        FamilyMember @relation(fields: [memberId], references: [id], onDelete: Cascade)
  messages      ChatMessage[]

  @@index([userId])
  @@index([memberId])
  @@map("chat_sessions")
}

/// AI咨询消息表
model ChatMessage {
  id            String      @id @default(uuid())
  sessionId     String      @map("session_id")

  // 消息内容
  role          ChatRole
  content       String      @db.Text

  // AI相关（仅assistant消息）
  tokensUsed    Int?        @map("tokens_used")

  // 时间戳
  createdAt     DateTime    @default(now()) @map("created_at")

  // 关系
  session       ChatSession @relation(fields: [sessionId], references: [id], onDelete: Cascade)

  @@index([sessionId])
  @@index([sessionId, createdAt])
  @@map("chat_messages")
}
```

### 3.2 数据库索引说明

| 表 | 索引 | 用途 |
|---|------|------|
| family_members | userId + deletedAt | 快速查询用户的未删除成员 |
| documents | memberId + type | 按类型筛选成员文档 |
| documents | memberId + checkDate | 按时间排序文档 |
| health_records | memberId + recordType | 按指标类型查询记录 |
| health_records | memberId + recordDate | 按时间查询记录 |

### 3.3 健康指标参考范围配置

```typescript
// src/config/health-reference.ts

export const HEALTH_REFERENCE = {
  // 血压
  SYSTOLIC_BP: {
    unit: 'mmHg',
    ranges: {
      adult: { low: 90, high: 140 },
      elderly: { low: 90, high: 150 },  // 65岁以上
    },
    criticalLow: 70,
    criticalHigh: 180,
  },
  DIASTOLIC_BP: {
    unit: 'mmHg',
    ranges: {
      adult: { low: 60, high: 90 },
    },
    criticalLow: 40,
    criticalHigh: 110,
  },

  // 血糖
  FASTING_GLUCOSE: {
    unit: 'mmol/L',
    ranges: {
      adult: { low: 3.9, high: 6.1 },
      diabetic: { low: 4.4, high: 7.0 },  // 糖尿病患者
    },
    criticalLow: 2.8,
    criticalHigh: 16.7,
  },

  // ... 其他指标
};
```

---

## 4. API接口设计

### 4.1 接口规范

**基础路径**: `/api/v1`

**响应格式**:
```typescript
// 成功响应
{
  "success": true,
  "data": { ... },
  "message": "操作成功"
}

// 错误响应
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "错误描述"
  }
}

// 分页响应
{
  "success": true,
  "data": {
    "items": [ ... ],
    "total": 100,
    "page": 1,
    "pageSize": 20,
    "totalPages": 5
  }
}
```

### 4.2 认证模块 API

#### 4.2.1 用户注册

```
POST /api/v1/auth/register
```

**请求体**:
```typescript
{
  email: string;
  password: string;
  name: string;
}
```

#### 4.2.2 用户登录

```
POST /api/v1/auth/login
```

**请求体**:
```typescript
{
  email: string;
  password: string;
}
```

**响应**:
```typescript
{
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    email: string;
    name: string;
    avatar: string | null;
  }
}
```

#### 4.2.3 刷新Token

```
POST /api/v1/auth/refresh
```

### 4.3 家庭成员 API

#### 4.3.1 获取成员列表

```
GET /api/v1/members
```

**查询参数**:
```typescript
{
  includeDeleted?: boolean;  // 是否包含已删除
}
```

#### 4.3.2 创建成员

```
POST /api/v1/members
```

**请求体**:
```typescript
{
  name: string;
  relationship: Relationship;
  gender: Gender;
  birthDate: string;       // ISO 8601
  avatar?: string;
  bloodType?: BloodType;
  height?: number;
  weight?: number;
  chronicDiseases?: string[];
  allergies?: string;
  notes?: string;
}
```

#### 4.3.3 获取成员详情

```
GET /api/v1/members/:id
```

**响应**（包含健康概览）:
```typescript
{
  id: string;
  name: string;
  relationship: Relationship;
  gender: Gender;
  birthDate: string;
  age: number;              // 计算值
  avatar: string | null;
  bloodType: BloodType;
  height: number | null;
  weight: number | null;
  bmi: number | null;       // 计算值
  chronicDiseases: string[];
  allergies: string | null;
  notes: string | null;
  // 健康概览
  healthSummary: {
    lastCheckDate: string | null;
    documentCount: number;
    recordCount: number;
    latestAdviceDate: string | null;
    abnormalRecords: number;  // 近30天异常记录数
  };
}
```

#### 4.3.4 更新成员

```
PUT /api/v1/members/:id
```

#### 4.3.5 删除成员（软删除）

```
DELETE /api/v1/members/:id
```

### 4.4 健康文档 API

#### 4.4.1 获取文档列表

```
GET /api/v1/documents
```

**查询参数**:
```typescript
{
  memberId?: string;
  type?: DocumentType;
  startDate?: string;
  endDate?: string;
  page?: number;
  pageSize?: number;
}
```

#### 4.4.2 上传文档

```
POST /api/v1/documents
```

**请求体** (multipart/form-data):
```typescript
{
  memberId: string;
  type: DocumentType;
  name: string;
  checkDate: string;
  institution?: string;
  notes?: string;
  files: File[];           // 文件数组
  parseWithAI?: boolean;   // 是否AI解析
}
```

#### 4.4.3 获取文档详情

```
GET /api/v1/documents/:id
```

#### 4.4.4 删除文档

```
DELETE /api/v1/documents/:id
```

### 4.5 健康记录 API

#### 4.5.1 获取记录列表

```
GET /api/v1/records
```

**查询参数**:
```typescript
{
  memberId?: string;
  recordType?: RecordType;
  startDate?: string;
  endDate?: string;
  page?: number;
  pageSize?: number;
}
```

#### 4.5.2 添加记录

```
POST /api/v1/records
```

**请求体**:
```typescript
{
  memberId: string;
  recordDate: string;
  records: {
    recordType: RecordType;
    value: number;
    context?: MeasurementContext;
    notes?: string;
  }[];
}
```

#### 4.5.3 获取趋势数据

```
GET /api/v1/records/trends
```

**查询参数**:
```typescript
{
  memberId: string;
  recordTypes: RecordType[];  // 逗号分隔
  period: '7d' | '30d' | '90d' | '1y' | 'custom';
  startDate?: string;
  endDate?: string;
}
```

**响应**:
```typescript
{
  memberId: string;
  period: { start: string; end: string };
  trends: {
    recordType: RecordType;
    unit: string;
    referenceRange: { low: number; high: number };
    data: {
      date: string;
      value: number;
      isAbnormal: boolean;
    }[];
    statistics: {
      min: number;
      max: number;
      avg: number;
      abnormalCount: number;
    };
  }[];
}
```

#### 4.5.4 删除记录

```
DELETE /api/v1/records/:id
```

### 4.6 AI健康建议 API

#### 4.6.1 生成健康建议

```
POST /api/v1/advice/generate
```

**请求体**:
```typescript
{
  memberId: string;
}
```

**响应**:
```typescript
{
  id: string;
  memberId: string;
  healthScore: number;
  content: {
    overview: {
      score: number;
      strengths: string[];
      concerns: string[];
    };
    priorityItems: {
      title: string;
      description: string;
      priority: 'high' | 'medium' | 'low';
      suggestions: string[];
    }[];
    recommendations: {
      diet: string[];
      exercise: string[];
      lifestyle: string[];
      checkup: string[];
    };
    actionItems: {
      item: string;
      deadline?: string;
    }[];
  };
  generatedAt: string;
}
```

#### 4.6.2 获取历史建议

```
GET /api/v1/advice/history
```

**查询参数**:
```typescript
{
  memberId: string;
  page?: number;
  pageSize?: number;
}
```

### 4.7 AI咨询对话 API

#### 4.7.1 获取会话列表

```
GET /api/v1/chat/sessions
```

**查询参数**:
```typescript
{
  memberId?: string;
  page?: number;
  pageSize?: number;
}
```

#### 4.7.2 创建会话

```
POST /api/v1/chat/sessions
```

**请求体**:
```typescript
{
  memberId: string;
  title?: string;
}
```

#### 4.7.3 获取会话消息

```
GET /api/v1/chat/sessions/:sessionId/messages
```

#### 4.7.4 发送消息（流式响应）

```
POST /api/v1/chat/sessions/:sessionId/messages
```

**请求体**:
```typescript
{
  content: string;
}
```

**响应**: Server-Sent Events (SSE)
```
data: {"type": "start"}
data: {"type": "content", "content": "根据"}
data: {"type": "content", "content": "您的"}
...
data: {"type": "end", "messageId": "xxx"}
```

#### 4.7.5 删除会话

```
DELETE /api/v1/chat/sessions/:sessionId
```

### 4.8 文件上传 API

#### 4.8.1 上传文件

```
POST /api/v1/upload
```

**请求体** (multipart/form-data):
```typescript
{
  file: File;
  type: 'avatar' | 'document';
}
```

**响应**:
```typescript
{
  url: string;
  filename: string;
  size: number;
  mimeType: string;
}
```

---

## 5. 后端模块设计

### 5.1 模块结构

```
backend/
├── src/
│   ├── app.module.ts
│   ├── main.ts
│   │
│   ├── modules/
│   │   ├── auth/                    # 认证模块
│   │   │   ├── auth.module.ts
│   │   │   ├── auth.controller.ts
│   │   │   ├── auth.service.ts
│   │   │   ├── strategies/
│   │   │   │   ├── jwt.strategy.ts
│   │   │   │   └── local.strategy.ts
│   │   │   ├── guards/
│   │   │   │   └── jwt-auth.guard.ts
│   │   │   └── dto/
│   │   │
│   │   ├── users/                   # 用户模块
│   │   │   ├── users.module.ts
│   │   │   ├── users.controller.ts
│   │   │   └── users.service.ts
│   │   │
│   │   ├── members/                 # 家庭成员模块
│   │   │   ├── members.module.ts
│   │   │   ├── members.controller.ts
│   │   │   ├── members.service.ts
│   │   │   └── dto/
│   │   │
│   │   ├── documents/               # 健康文档模块
│   │   │   ├── documents.module.ts
│   │   │   ├── documents.controller.ts
│   │   │   ├── documents.service.ts
│   │   │   └── dto/
│   │   │
│   │   ├── records/                 # 健康记录模块
│   │   │   ├── records.module.ts
│   │   │   ├── records.controller.ts
│   │   │   ├── records.service.ts
│   │   │   ├── services/
│   │   │   │   ├── record-validation.service.ts
│   │   │   │   └── trend-analysis.service.ts
│   │   │   └── dto/
│   │   │
│   │   ├── advice/                  # AI健康建议模块
│   │   │   ├── advice.module.ts
│   │   │   ├── advice.controller.ts
│   │   │   ├── advice.service.ts
│   │   │   └── services/
│   │   │       └── advice-generator.service.ts
│   │   │
│   │   ├── chat/                    # AI咨询对话模块
│   │   │   ├── chat.module.ts
│   │   │   ├── chat.controller.ts
│   │   │   ├── chat.service.ts
│   │   │   └── services/
│   │   │       └── chat-context.service.ts
│   │   │
│   │   ├── storage/                 # 文件存储模块
│   │   │   ├── storage.module.ts
│   │   │   ├── storage.controller.ts
│   │   │   └── storage.service.ts
│   │   │
│   │   └── ai/                      # AI服务封装模块
│   │       ├── ai.module.ts
│   │       ├── ai.service.ts
│   │       └── providers/
│   │           └── dashscope.provider.ts
│   │
│   ├── common/
│   │   ├── decorators/
│   │   │   └── current-user.decorator.ts
│   │   ├── filters/
│   │   │   └── http-exception.filter.ts
│   │   ├── interceptors/
│   │   │   └── transform.interceptor.ts
│   │   ├── pipes/
│   │   │   └── validation.pipe.ts
│   │   └── prisma/
│   │       ├── prisma.module.ts
│   │       └── prisma.service.ts
│   │
│   └── config/
│       ├── configuration.ts
│       └── health-reference.ts
│
├── prisma/
│   ├── schema.prisma
│   ├── migrations/
│   └── seed.ts
│
├── test/
└── package.json
```

### 5.2 核心服务设计

#### 5.2.1 MembersService

```typescript
@Injectable()
export class MembersService {
  constructor(private readonly prisma: PrismaService) {}

  // 获取用户的所有家庭成员
  async findAll(userId: string, includeDeleted: boolean = false): Promise<FamilyMember[]>;

  // 创建家庭成员
  async create(userId: string, dto: CreateMemberDto): Promise<FamilyMember>;

  // 获取成员详情（含健康概览）
  async findOne(userId: string, memberId: string): Promise<MemberWithSummary>;

  // 更新成员信息
  async update(userId: string, memberId: string, dto: UpdateMemberDto): Promise<FamilyMember>;

  // 软删除成员
  async remove(userId: string, memberId: string): Promise<void>;

  // 验证成员归属
  async validateOwnership(userId: string, memberId: string): Promise<FamilyMember>;

  // 获取成员健康概览
  async getHealthSummary(memberId: string): Promise<HealthSummary>;
}
```

#### 5.2.2 RecordsService

```typescript
@Injectable()
export class RecordsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly validationService: RecordValidationService,
    private readonly trendService: TrendAnalysisService,
  ) {}

  // 添加健康记录
  async create(userId: string, dto: CreateRecordDto): Promise<HealthRecord[]>;

  // 获取记录列表
  async findAll(userId: string, query: QueryRecordsDto): Promise<PaginatedResult<HealthRecord>>;

  // 获取趋势数据
  async getTrends(userId: string, query: TrendQueryDto): Promise<TrendData>;

  // 验证并标记异常值
  private async validateAndMarkAbnormal(
    memberId: string,
    recordType: RecordType,
    value: number,
  ): Promise<boolean>;
}
```

#### 5.2.3 AdviceService

```typescript
@Injectable()
export class AdviceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly aiService: AiService,
    private readonly membersService: MembersService,
  ) {}

  // 生成健康建议
  async generate(userId: string, memberId: string): Promise<HealthAdvice>;

  // 获取历史建议
  async getHistory(userId: string, memberId: string, query: PaginationDto): Promise<PaginatedResult<HealthAdvice>>;

  // 构建AI Prompt
  private buildPrompt(memberData: MemberHealthData): string;

  // 解析AI响应
  private parseAdviceResponse(response: string): AdviceContent;
}
```

#### 5.2.4 ChatService

```typescript
@Injectable()
export class ChatService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly aiService: AiService,
    private readonly contextService: ChatContextService,
  ) {}

  // 创建会话
  async createSession(userId: string, dto: CreateSessionDto): Promise<ChatSession>;

  // 获取会话列表
  async getSessions(userId: string, query: QuerySessionsDto): Promise<PaginatedResult<ChatSession>>;

  // 获取会话消息
  async getMessages(userId: string, sessionId: string): Promise<ChatMessage[]>;

  // 发送消息（流式）
  async sendMessage(
    userId: string,
    sessionId: string,
    content: string,
  ): AsyncGenerator<ChatStreamEvent>;

  // 删除会话
  async deleteSession(userId: string, sessionId: string): Promise<void>;
}
```

---

## 6. 前端架构设计

### 6.1 目录结构

```
frontend/
├── src/
│   ├── main.tsx
│   ├── App.tsx
│   │
│   ├── pages/                       # 页面组件
│   │   ├── Dashboard/               # 首页仪表盘
│   │   │   ├── index.tsx
│   │   │   └── components/
│   │   │       ├── MemberCard.tsx
│   │   │       ├── QuickActions.tsx
│   │   │       └── HealthReminders.tsx
│   │   │
│   │   ├── Members/                 # 家庭成员
│   │   │   ├── List.tsx
│   │   │   ├── Add.tsx
│   │   │   ├── Detail.tsx
│   │   │   ├── Edit.tsx
│   │   │   └── components/
│   │   │       ├── MemberForm.tsx
│   │   │       └── HealthOverview.tsx
│   │   │
│   │   ├── Documents/               # 健康文档
│   │   │   ├── List.tsx
│   │   │   ├── Upload.tsx
│   │   │   ├── Detail.tsx
│   │   │   └── components/
│   │   │       ├── DocumentCard.tsx
│   │   │       ├── UploadForm.tsx
│   │   │       └── FilePreview.tsx
│   │   │
│   │   ├── Records/                 # 健康记录
│   │   │   ├── List.tsx
│   │   │   ├── Add.tsx
│   │   │   ├── Charts.tsx
│   │   │   └── components/
│   │   │       ├── RecordForm.tsx
│   │   │       ├── TrendChart.tsx
│   │   │       └── RecordTable.tsx
│   │   │
│   │   ├── Advice/                  # AI健康建议
│   │   │   ├── index.tsx
│   │   │   └── components/
│   │   │       ├── AdviceReport.tsx
│   │   │       ├── PriorityList.tsx
│   │   │       └── ActionChecklist.tsx
│   │   │
│   │   ├── Chat/                    # AI咨询对话
│   │   │   ├── Sessions.tsx
│   │   │   ├── Conversation.tsx
│   │   │   └── components/
│   │   │       ├── SessionList.tsx
│   │   │       ├── ChatBox.tsx
│   │   │       ├── MessageBubble.tsx
│   │   │       └── QuickQuestions.tsx
│   │   │
│   │   ├── Settings/                # 设置
│   │   │   └── index.tsx
│   │   │
│   │   └── Auth/                    # 认证页面
│   │       ├── Login.tsx
│   │       └── Register.tsx
│   │
│   ├── components/                  # 公共组件
│   │   ├── Layout/
│   │   │   ├── MainLayout.tsx
│   │   │   ├── Sidebar.tsx
│   │   │   └── Header.tsx
│   │   ├── Common/
│   │   │   ├── PageHeader.tsx
│   │   │   ├── EmptyState.tsx
│   │   │   ├── LoadingSpinner.tsx
│   │   │   └── ConfirmModal.tsx
│   │   └── Charts/
│   │       ├── LineChart.tsx
│   │       ├── RadarChart.tsx
│   │       └── GaugeChart.tsx
│   │
│   ├── api/                         # API调用
│   │   ├── client.ts                # Axios实例
│   │   ├── auth.ts
│   │   ├── members.ts
│   │   ├── documents.ts
│   │   ├── records.ts
│   │   ├── advice.ts
│   │   └── chat.ts
│   │
│   ├── store/                       # 状态管理
│   │   ├── authStore.ts
│   │   ├── memberStore.ts
│   │   └── chatStore.ts
│   │
│   ├── hooks/                       # 自定义Hooks
│   │   ├── useAuth.ts
│   │   ├── useMembers.ts
│   │   ├── useDocuments.ts
│   │   ├── useRecords.ts
│   │   └── useChat.ts
│   │
│   ├── utils/                       # 工具函数
│   │   ├── date.ts
│   │   ├── format.ts
│   │   ├── validation.ts
│   │   └── health.ts                # 健康相关计算
│   │
│   ├── types/                       # TypeScript类型
│   │   ├── api.ts
│   │   ├── member.ts
│   │   ├── document.ts
│   │   ├── record.ts
│   │   └── chat.ts
│   │
│   └── styles/                      # 样式
│       ├── global.css
│       └── variables.css
│
├── public/
├── index.html
├── vite.config.ts
├── tsconfig.json
└── package.json
```

### 6.2 路由设计

```typescript
// src/App.tsx

const router = createBrowserRouter([
  {
    path: '/login',
    element: <Login />,
  },
  {
    path: '/register',
    element: <Register />,
  },
  {
    path: '/',
    element: <MainLayout />,
    children: [
      { index: true, element: <Navigate to="/dashboard" /> },
      { path: 'dashboard', element: <Dashboard /> },

      // 家庭成员
      { path: 'members', element: <MemberList /> },
      { path: 'members/add', element: <MemberAdd /> },
      { path: 'members/:id', element: <MemberDetail /> },
      { path: 'members/:id/edit', element: <MemberEdit /> },
      { path: 'members/:id/advice', element: <Advice /> },

      // 健康文档
      { path: 'documents', element: <DocumentList /> },
      { path: 'documents/upload', element: <DocumentUpload /> },
      { path: 'documents/:id', element: <DocumentDetail /> },

      // 健康记录
      { path: 'records', element: <RecordList /> },
      { path: 'records/add', element: <RecordAdd /> },
      { path: 'records/charts', element: <RecordCharts /> },

      // AI咨询
      { path: 'chat', element: <ChatSessions /> },
      { path: 'chat/:sessionId', element: <ChatConversation /> },

      // 设置
      { path: 'settings', element: <Settings /> },
    ],
  },
]);
```

### 6.3 状态管理

```typescript
// store/memberStore.ts

interface MemberState {
  members: FamilyMember[];
  currentMember: FamilyMember | null;
  loading: boolean;

  // Actions
  fetchMembers: () => Promise<void>;
  fetchMemberDetail: (id: string) => Promise<void>;
  createMember: (data: CreateMemberDto) => Promise<FamilyMember>;
  updateMember: (id: string, data: UpdateMemberDto) => Promise<void>;
  deleteMember: (id: string) => Promise<void>;
  clearCurrentMember: () => void;
}

export const useMemberStore = create<MemberState>((set, get) => ({
  members: [],
  currentMember: null,
  loading: false,

  fetchMembers: async () => {
    set({ loading: true });
    try {
      const members = await memberApi.getAll();
      set({ members });
    } finally {
      set({ loading: false });
    }
  },

  // ... 其他actions
}));
```

---

## 7. AI功能实现

### 7.1 AI服务封装

```typescript
// src/modules/ai/ai.service.ts

@Injectable()
export class AiService {
  constructor(
    private readonly dashscopeProvider: DashscopeProvider,
    private readonly configService: ConfigService,
  ) {}

  // 生成健康建议
  async generateHealthAdvice(prompt: string): Promise<string> {
    return this.dashscopeProvider.chat({
      model: 'qwen-plus',
      messages: [
        { role: 'system', content: HEALTH_ADVISOR_SYSTEM_PROMPT },
        { role: 'user', content: prompt },
      ],
      temperature: 0.7,
    });
  }

  // 流式对话
  async *streamChat(
    messages: ChatMessage[],
    memberContext: MemberContext,
  ): AsyncGenerator<string> {
    const systemPrompt = this.buildChatSystemPrompt(memberContext);

    yield* this.dashscopeProvider.streamChat({
      model: 'qwen-plus',
      messages: [
        { role: 'system', content: systemPrompt },
        ...messages.map(m => ({ role: m.role, content: m.content })),
      ],
      temperature: 0.8,
    });
  }

  // 构建对话系统提示
  private buildChatSystemPrompt(context: MemberContext): string {
    return `${HEALTH_CONSULTANT_SYSTEM_PROMPT}

## 当前咨询对象
- 姓名：${context.name}
- 与用户关系：${context.relationship}
- 性别：${context.gender}
- 年龄：${context.age}岁
- 既往病史：${context.chronicDiseases?.join('、') || '无'}

## 可参考的健康数据
${context.healthDataSummary}
`;
  }
}
```

### 7.2 DashScope Provider

```typescript
// src/modules/ai/providers/dashscope.provider.ts

@Injectable()
export class DashscopeProvider {
  private readonly apiKey: string;
  private readonly baseUrl = 'https://dashscope.aliyuncs.com/api/v1';

  constructor(private readonly configService: ConfigService) {
    this.apiKey = this.configService.get('DASHSCOPE_API_KEY');
  }

  // 普通对话
  async chat(options: ChatOptions): Promise<string> {
    const response = await fetch(`${this.baseUrl}/services/aigc/text-generation/generation`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: options.model,
        input: { messages: options.messages },
        parameters: {
          temperature: options.temperature,
          result_format: 'text',
        },
      }),
    });

    const data = await response.json();
    return data.output.text;
  }

  // 流式对话
  async *streamChat(options: ChatOptions): AsyncGenerator<string> {
    const response = await fetch(`${this.baseUrl}/services/aigc/text-generation/generation`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
        'X-DashScope-SSE': 'enable',
      },
      body: JSON.stringify({
        model: options.model,
        input: { messages: options.messages },
        parameters: {
          temperature: options.temperature,
          incremental_output: true,
        },
      }),
    });

    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value);
      const lines = chunk.split('\n').filter(line => line.startsWith('data:'));

      for (const line of lines) {
        const data = JSON.parse(line.slice(5));
        if (data.output?.text) {
          yield data.output.text;
        }
      }
    }
  }
}
```

### 7.3 系统提示词

```typescript
// src/config/prompts.ts

export const HEALTH_ADVISOR_SYSTEM_PROMPT = `你是一位专业的健康管理顾问。请根据用户提供的健康档案生成个性化的健康建议报告。

## 输出格式要求
请以JSON格式输出，包含以下结构：
{
  "overview": {
    "score": <健康评分0-100>,
    "strengths": [<健康优势列表>],
    "concerns": [<需关注的方面>]
  },
  "priorityItems": [
    {
      "title": <问题标题>,
      "description": <问题描述>,
      "priority": <"high"|"medium"|"low">,
      "suggestions": [<具体建议>]
    }
  ],
  "recommendations": {
    "diet": [<饮食建议>],
    "exercise": [<运动建议>],
    "lifestyle": [<生活方式建议>],
    "checkup": [<复查建议>]
  },
  "actionItems": [
    { "item": <待办事项>, "deadline": <建议完成时间，可选> }
  ]
}

## 重要原则
1. 建议应具体、可执行
2. 不要做出医学诊断
3. 对于异常指标，建议就医而非自行处理
4. 语气温和专业，易于理解
5. 优先关注可能影响健康的关键问题`;

export const HEALTH_CONSULTANT_SYSTEM_PROMPT = `你是一位专业的健康顾问，正在为用户解答关于家庭成员的健康问题。

## 对话规则
1. 基于用户提供的信息和系统中的健康数据回答
2. 回答应准确、专业、易懂
3. 涉及具体治疗建议时，引导用户咨询医生
4. 识别紧急情况，提示用户及时就医
5. 可以主动询问更多信息以便更好地回答

## 回复格式
- 使用简洁清晰的语言
- 必要时使用列表格式
- 给出具体可行的建议
- 对于不确定的情况，诚实告知并建议咨询专业医生

## 安全边界
- 不能做出医学诊断
- 不能建议具体用药剂量
- 遇到紧急症状描述时，立即提示就医`;
```

---

## 8. 安全设计

### 8.1 认证与授权

- **JWT Token认证**：Access Token + Refresh Token
- **Token有效期**：Access Token 15分钟，Refresh Token 7天
- **密码加密**：bcrypt (cost factor 12)

### 8.2 数据安全

| 安全措施 | 说明 |
|---------|------|
| 数据隔离 | 用户只能访问自己创建的数据 |
| 文件加密 | 敏感健康文档加密存储 |
| HTTPS | 全站HTTPS传输 |
| 输入验证 | 所有输入严格校验 |
| SQL注入防护 | 使用Prisma ORM参数化查询 |
| XSS防护 | 输出内容转义 |

### 8.3 敏感数据处理

```typescript
// 日志脱敏
const sensitiveFields = ['password', 'passwordHash', 'accessToken', 'refreshToken'];

// 健康数据访问审计
interface AuditLog {
  userId: string;
  action: 'VIEW' | 'CREATE' | 'UPDATE' | 'DELETE';
  resource: string;
  resourceId: string;
  timestamp: Date;
  ip: string;
}
```

---

## 9. 部署架构

### 9.1 开发环境

```yaml
# docker-compose.dev.yml
version: '3.8'

services:
  postgres:
    image: postgres:15
    environment:
      POSTGRES_USER: dev
      POSTGRES_PASSWORD: dev123
      POSTGRES_DB: family_health
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7
    ports:
      - "6379:6379"

volumes:
  postgres_data:
```

### 9.2 生产环境架构

```
┌─────────────────────────────────────────────────────────────────────┐
│                        生产环境部署架构                               │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│                        ┌─────────────┐                              │
│                        │   Nginx     │                              │
│                        │  (反向代理)  │                              │
│                        └──────┬──────┘                              │
│                               │                                     │
│              ┌────────────────┼────────────────┐                   │
│              │                │                │                   │
│              ▼                ▼                ▼                   │
│       ┌──────────┐     ┌──────────┐     ┌──────────┐              │
│       │ Frontend │     │ Backend  │     │ Backend  │              │
│       │  (静态)   │     │ Instance1│     │ Instance2│              │
│       └──────────┘     └────┬─────┘     └────┬─────┘              │
│                             │                │                     │
│                             └───────┬────────┘                     │
│                                     │                              │
│              ┌──────────────────────┼──────────────────────┐      │
│              │                      │                      │      │
│              ▼                      ▼                      ▼      │
│       ┌──────────┐           ┌──────────┐           ┌──────────┐ │
│       │PostgreSQL│           │  Redis   │           │   OSS    │ │
│       │ (主从)   │           │ (缓存)   │           │ (文件)   │ │
│       └──────────┘           └──────────┘           └──────────┘ │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### 9.3 环境变量配置

```bash
# .env.example

# 数据库
DATABASE_URL="postgresql://user:password@localhost:5432/family_health"

# Redis（可选）
REDIS_URL="redis://localhost:6379"

# JWT
JWT_SECRET="your-super-secret-key"
JWT_ACCESS_EXPIRES_IN="15m"
JWT_REFRESH_EXPIRES_IN="7d"

# AI服务
DASHSCOPE_API_KEY="your-dashscope-api-key"

# 文件存储
STORAGE_TYPE="local"  # local | oss
STORAGE_PATH="./uploads"
# OSS配置（如使用云存储）
OSS_ACCESS_KEY_ID=""
OSS_ACCESS_KEY_SECRET=""
OSS_BUCKET=""
OSS_REGION=""

# 应用
PORT=5001
NODE_ENV=development
```

---

## 附录

### A. API错误码

| 错误码 | 说明 |
|-------|------|
| AUTH_001 | 未登录或Token无效 |
| AUTH_002 | Token已过期 |
| AUTH_003 | 密码错误 |
| MEMBER_001 | 成员不存在 |
| MEMBER_002 | 无权访问该成员 |
| MEMBER_003 | 成员数量已达上限 |
| DOC_001 | 文档不存在 |
| DOC_002 | 文件格式不支持 |
| DOC_003 | 文件大小超限 |
| RECORD_001 | 记录不存在 |
| RECORD_002 | 指标值超出合理范围 |
| AI_001 | AI服务不可用 |
| AI_002 | 数据不足，无法生成建议 |

### B. 参考文档

- `doc/design/product-design.md` - 产品设计文档
- `doc/planning/plan_whole_project.md` - 项目总计划
