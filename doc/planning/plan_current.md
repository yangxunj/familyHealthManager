# AI 聊天多模态图片支持 — 工作计划

## 背景

当前 AI 健康咨询（聊天）只支持纯文本输入。用户（尤其老年人）经常需要拍照提问，比如"这个东西我能不能吃"。需要添加图片支持，分两个阶段实施：

1. **第一阶段**：聊天窗口支持发送图片（基础能力）
2. **第二阶段**：独立的"拍照提问"快捷功能（老人模式专属）

### 技术前提

- 所有当前 AI 模型（DashScope 全系列 + Gemini 全系列）均支持多模态（视觉）输入
- OCR 功能已使用多模态调用格式（`image_url` + `text` 内容数组），可参考复用
- 文件上传服务（StorageService）已存在，支持 JPEG/PNG，最大 10MB
- AI Service 使用 OpenAI 兼容 API 格式，天然支持 `content` 数组

---

## 第一阶段：聊天窗口支持发送图片

### 步骤 1：数据库 Schema 扩展

**修改** `backend/prisma/schema.prisma`

ChatMessage 表新增 `imageUrls` 字段，用于存储用户消息附带的图片路径列表：

```prisma
model ChatMessage {
  ...
  content       String      @db.Text
  imageUrls     Json?       @map("image_urls")   // 新增：图片 URL 数组，如 ["/uploads/chat/xxx/1.jpg"]
  ...
}
```

**说明**：选择新增字段而非改 `content` 为 Json，是为了保持向后兼容——所有现有代码读取 `content` 的地方不需要改动，纯文本消息 `imageUrls` 为 null。

**执行**：`npx prisma migrate dev --name add-chat-image-urls`

### 步骤 2：后端 DTO 扩展

**修改** `backend/src/modules/chat/dto/send-message.dto.ts`

```typescript
export class SendMessageDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(5000)
  content: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  imageUrls?: string[];   // 新增：图片 URL 列表（已上传到 storage 的路径）
}
```

### 步骤 3：后端聊天服务改造

**修改** `backend/src/modules/chat/chat.service.ts`

`sendMessageStream()` 方法改造：

1. **保存消息**时包含 `imageUrls`：
   ```typescript
   await this.prisma.chatMessage.create({
     data: {
       sessionId,
       role: 'USER',
       content: dto.content,
       imageUrls: dto.imageUrls?.length ? dto.imageUrls : undefined,
     },
   });
   ```

2. **构建 AI 消息数组**时，检测 `imageUrls`，对最后一条用户消息构建多模态 content：
   ```typescript
   // 历史消息仍用纯文本（节省 token）
   // 仅当前消息（最后一条）如果带图片，才构建 content 数组
   const lastMsg = historyMessages[historyMessages.length - 1];
   const imageUrls = lastMsg.imageUrls as string[] | null;
   if (lastMsg.role === 'USER' && imageUrls?.length) {
     // 用 imagePathToBase64 转换后构建多模态格式
     messages[messages.length - 1] = {
       role: 'user',
       content: [
         ...await Promise.all(imageUrls.map(url =>
           this.aiService.imagePathToBase64(url).then(b64 => ({
             type: 'image_url' as const,
             image_url: { url: b64 },
           }))
         )),
         { type: 'text' as const, text: lastMsg.content },
       ],
     };
   }
   ```

### 步骤 4：AI Service 接口适配

**修改** `backend/src/modules/ai/ai.service.ts`

1. **扩展 ChatMessage 接口**（行 14-18）：
   ```typescript
   type MessageContent = string | Array<
     | { type: 'text'; text: string }
     | { type: 'image_url'; image_url: { url: string } }
   >;

   interface ChatMessage {
     role: 'system' | 'user' | 'assistant';
     content: MessageContent;
   }
   ```

2. **公开 `imagePathToBase64`**：将 `private` 改为 `public`（或抽取为工具方法），供 ChatService 调用。

3. **`chat()` 和 `chatStream()`**：无需改动——它们已经把 `messages` 数组直接传给 OpenAI API，API 本身支持 content 数组格式。

### 步骤 5：聊天图片上传端点

**修改** `backend/src/modules/storage/storage.service.ts`

新增 `saveChatImage()` 方法，存储到 `uploads/chat/{userId}/` 目录（与文档存储分开），并压缩大图：

```typescript
async saveChatImage(file: Express.Multer.File, userId: string): Promise<UploadedFile> {
  this.validateFile(file); // 复用现有验证（类型+大小）
  const userDir = this.ensureChatDir(userId);
  // ... 保存逻辑同 saveFile，改目录
}
```

**修改** `backend/src/modules/storage/storage.controller.ts`

新增端点 `POST /storage/upload-chat-image`（或复用现有 `upload` 端点，前端指定用途即可）。

### 步骤 6：前端类型扩展

**修改** `frontend/src/types/chat.ts`

```typescript
export interface ChatMessage {
  id: string;
  role: ChatRole;
  content: string;
  imageUrls?: string[];   // 新增
  createdAt: string;
}

export interface SendMessageRequest {
  content: string;
  imageUrls?: string[];   // 新增
}
```

### 步骤 7：前端 API 层改造

**修改** `frontend/src/api/chat.ts`

`sendMessage` 函数签名扩展：
```typescript
sendMessage: async (
  sessionId: string,
  content: string,
  onMessage: SSECallback,
  onError?: (error: string) => void,
  imageUrls?: string[],           // 新增
): Promise<void> => {
  // body 中包含 imageUrls
  body: JSON.stringify({ content, imageUrls }),
}
```

新增图片上传函数：
```typescript
uploadChatImage: async (file: File): Promise<{ url: string }> => {
  const formData = new FormData();
  formData.append('file', file);
  const response = await apiClient.post('/storage/upload', formData);
  return response.data;
}
```

### 步骤 8：前端 ChatPage UI 改造

**修改** `frontend/src/pages/Chat/ChatPage.tsx`

1. **新增状态**：
   ```typescript
   const [pendingImages, setPendingImages] = useState<File[]>([]);
   const [imagePreviewUrls, setImagePreviewUrls] = useState<string[]>([]);
   const [uploading, setUploading] = useState(false);
   ```

2. **输入区改造**：在 TextArea 左侧或上方添加图片按钮：
   ```
   [图片预览区（选中的图片缩略图，可删除）]
   [📎 图片按钮] [TextArea 输入框...] [发送按钮]
   ```
   - 图片按钮：`<input type="file" accept="image/*" capture="environment" />`（`capture` 属性可直接调起摄像头）
   - 支持选择多张（最多 3 张）
   - 选中后显示缩略图预览，带删除按钮

3. **发送流程改造**：
   ```typescript
   const handleSend = async () => {
     // 1. 先上传图片到服务器
     let uploadedUrls: string[] = [];
     if (pendingImages.length) {
       setUploading(true);
       uploadedUrls = await Promise.all(
         pendingImages.map(f => chatApi.uploadChatImage(f).then(r => r.url))
       );
       setUploading(false);
     }
     // 2. 发送消息（文本 + 图片 URL）
     await chatApi.sendMessage(sessionId, content, callback, onError, uploadedUrls);
     // 3. 清空图片
     setPendingImages([]);
     setImagePreviewUrls([]);
   };
   ```

4. **消息气泡渲染**：`renderMessage()` 中检查 `msg.imageUrls`，如果有则显示图片缩略图：
   ```typescript
   {msg.imageUrls?.map((url, i) => (
     <img key={i} src={apiBaseUrl + url} style={{ maxWidth: 200, borderRadius: 8 }} />
   ))}
   ```

### 步骤 9：验证

- [ ] TypeScript 编译零错误
- [ ] 纯文本消息收发不受影响（向后兼容）
- [ ] 选择图片后显示预览，可删除
- [ ] 图片 + 文字消息成功发送，AI 能识别图片内容并回复
- [ ] 消息气泡中正确显示用户发送的图片
- [ ] DashScope 和 Gemini 两个提供商均测试通过
- [ ] 移动端（App / 手机浏览器）拍照功能正常

---

## 第二阶段：独立"拍照提问"功能（老人模式）

> 第一阶段完成后再实施

### 步骤 10：产品设计

老人模式底部 Tab 栏改为 4 个 Tab，中间新增"拍照"：

```
[健康咨询]  [健康建议]  [📷 拍一拍]  [健康记录]
```

或者在健康咨询页面顶部添加一个醒目的"拍照提问"大按钮。

**交互流程**：
1. 点击"拍照提问" → 调起摄像头（或相册选择）
2. 拍照/选择后 → 显示图片预览 + 预填提问文字（"根据我的健康状况，这个我能吃吗？"）
3. 用户可编辑提问文字 → 点击发送
4. 自动创建一个新的聊天会话（关联当前用户/成员），发送图片 + 文字
5. 等待 AI 回复 → 以简洁卡片形式展示结果

### 步骤 11：实现拍照提问页面

**新建** `frontend/src/pages/Chat/PhotoAsk.tsx`

- 全屏页面，极简设计
- 大按钮"拍照" / "从相册选择"
- 图片预览 + 可编辑的提问输入框
- 发送后显示 AI 回复（流式）
- 底部复用第一阶段的 `sendMessage` + `uploadChatImage` API

### 步骤 12：路由与导航集成

- 新增路由 `/photo-ask`
- 老人模式底部 Tab 或首页按钮跳转到此页面
- MainLayout 中 `elderTabs` 配置更新

### 步骤 13：Capacitor Camera 插件集成（可选增强）

如果在 App 环境中，可集成 `@capacitor/camera` 插件获得更好的原生拍照体验：

```bash
pnpm add @capacitor/camera
npx cap sync
```

Web 环境下 fallback 到 `<input type="file" capture="environment">`。

### 步骤 14：验证

- [ ] 老人模式下拍照提问入口醒目可见
- [ ] 拍照 → 预览 → 编辑提问 → 发送 → AI 回复，全流程通畅
- [ ] AI 回复结合用户健康档案（血糖高的人不建议吃甜食等）
- [ ] App 和手机浏览器均正常工作

---

## 涉及文件汇总

### 第一阶段

| 操作 | 文件 |
|------|------|
| 修改 | `backend/prisma/schema.prisma` — ChatMessage 新增 imageUrls 字段 |
| 新增 | `backend/prisma/migrations/xxx_add_chat_image_urls/` — 数据库迁移 |
| 修改 | `backend/src/modules/chat/dto/send-message.dto.ts` — 新增 imageUrls 字段 |
| 修改 | `backend/src/modules/chat/chat.service.ts` — 消息保存和 AI 调用支持图片 |
| 修改 | `backend/src/modules/ai/ai.service.ts` — ChatMessage 类型扩展，公开 imagePathToBase64 |
| 修改 | `backend/src/modules/storage/storage.service.ts` — 新增聊天图片存储方法（可选） |
| 修改 | `frontend/src/types/chat.ts` — ChatMessage 和 SendMessageRequest 扩展 |
| 修改 | `frontend/src/api/chat.ts` — sendMessage 支持图片，新增 uploadChatImage |
| 修改 | `frontend/src/pages/Chat/ChatPage.tsx` — 输入区图片按钮、预览、发送、气泡渲染 |

### 第二阶段

| 操作 | 文件 |
|------|------|
| 新建 | `frontend/src/pages/Chat/PhotoAsk.tsx` — 拍照提问独立页面 |
| 修改 | `frontend/src/App.tsx` — 新增路由 |
| 修改 | `frontend/src/components/Layout/MainLayout.tsx` — 老人模式 Tab 更新 |
