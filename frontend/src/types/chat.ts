// 消息角色
export type ChatRole = 'user' | 'assistant';

// 聊天消息
export interface ChatMessage {
  id: string;
  role: ChatRole;
  content: string;
  createdAt: string;
}

// 聊天会话
export interface ChatSession {
  id: string;
  memberId: string;
  member: {
    id: string;
    name: string;
  };
  title: string;
  lastMessage?: string;
  createdAt: string;
  updatedAt: string;
}

// 会话详情（含消息）
export interface ChatSessionWithMessages extends ChatSession {
  messages: ChatMessage[];
}

// 创建会话请求
export interface CreateSessionRequest {
  memberId: string;
  title?: string;
}

// 发送消息请求
export interface SendMessageRequest {
  content: string;
}

// 查询会话参数
export interface QuerySessionParams {
  memberId?: string;
  limit?: number;
  offset?: number;
}

// SSE 消息事件
export interface SSEMessageEvent {
  content: string;
  done: boolean;
}

// SSE 完成事件
export interface SSEDoneEvent {
  tokensUsed: number;
}

// SSE 错误事件
export interface SSEErrorEvent {
  error: string;
}
