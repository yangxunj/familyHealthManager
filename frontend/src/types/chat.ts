// 消息角色
export type ChatRole = 'user' | 'assistant';

// 聊天消息
export interface ChatMessage {
  id: string;
  role: ChatRole;
  content: string;
  imageUrls?: string[];
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
  // 来源追踪（从健康建议页面创建时使用）
  sourceAdviceId?: string;
  sourceItemType?: 'concern' | 'suggestion' | 'action';
  sourceItemIndex?: number;
  sourceItemTitle?: string;
}

// 建议会话统计（按条目类型和索引分组）
export interface AdviceSessionStats {
  concern: Record<number, number>;
  suggestion: Record<number, number>;
  action: Record<number, number>;
}

// 发送消息请求
export interface SendMessageRequest {
  content: string;
  imageUrls?: string[];
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
