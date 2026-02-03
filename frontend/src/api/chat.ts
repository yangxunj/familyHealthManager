import apiClient from './client';
import { supabase } from '../lib/supabase';
import type {
  ChatSession,
  ChatSessionWithMessages,
  CreateSessionRequest,
  QuerySessionParams,
  SSEMessageEvent,
  SSEDoneEvent,
} from '../types';

// SSE 回调类型
export type SSECallback = (event: SSEMessageEvent | SSEDoneEvent) => void;

export const chatApi = {
  // 创建会话
  createSession: async (data: CreateSessionRequest): Promise<ChatSession> => {
    return apiClient.post('/chat/sessions', data);
  },

  // 获取会话列表
  getSessions: async (params?: QuerySessionParams): Promise<ChatSession[]> => {
    return apiClient.get('/chat/sessions', { params });
  },

  // 获取会话详情及消息
  getSession: async (sessionId: string): Promise<ChatSessionWithMessages> => {
    return apiClient.get(`/chat/sessions/${sessionId}`);
  },

  // 删除会话
  deleteSession: async (sessionId: string): Promise<{ success: boolean }> => {
    return apiClient.delete(`/chat/sessions/${sessionId}`);
  },

  // 发送消息（SSE 流式响应）
  sendMessage: async (
    sessionId: string,
    content: string,
    onMessage: SSECallback,
    onError?: (error: string) => void,
  ): Promise<void> => {
    // 从 Supabase session 获取 token
    const session = await supabase?.auth.getSession();
    const token = session?.data?.session?.access_token;
    const baseUrl = apiClient.defaults.baseURL || '';

    const response = await fetch(`${baseUrl}/chat/sessions/${sessionId}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ content }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(errorText || `HTTP error ${response.status}`);
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('Failed to get response reader');
    }

    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmedLine = line.trim();
        if (!trimmedLine) continue;

        if (trimmedLine.startsWith('event: ')) {
          // 跳过 event 行，数据在下一行
          continue;
        }

        if (trimmedLine.startsWith('data: ')) {
          try {
            const data = JSON.parse(trimmedLine.slice(6));

            if (data.error) {
              onError?.(data.error);
              return;
            }

            if (data.tokensUsed !== undefined) {
              // 完成事件
              onMessage({ tokensUsed: data.tokensUsed } as SSEDoneEvent);
            } else if (data.content !== undefined) {
              // 消息事件
              onMessage({ content: data.content, done: data.done } as SSEMessageEvent);
            }
          } catch {
            // 忽略解析错误
          }
        }
      }
    }
  },
};
