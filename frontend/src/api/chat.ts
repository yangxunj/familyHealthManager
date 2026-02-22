import apiClient from './client';
import { supabase } from '../lib/supabase';
import type {
  ChatSession,
  ChatSessionWithMessages,
  CreateSessionRequest,
  QuerySessionParams,
  SSEMessageEvent,
  SSEDoneEvent,
  AdviceSessionStats,
} from '../types';

// SSE 回调类型
export type SSECallback = (event: SSEMessageEvent | SSEDoneEvent) => void;

// 前端图片压缩：用 canvas 将图片缩放到长边 ≤ 1920px，输出 JPEG 85%
const MAX_DIMENSION = 1920;
const JPEG_QUALITY = 0.85;

function compressChatImage(file: File): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      const { width, height } = img;

      // 不需要缩放且本身就是 JPEG 且 < 500KB，直接返回
      if (width <= MAX_DIMENSION && height <= MAX_DIMENSION && file.type === 'image/jpeg' && file.size < 500 * 1024) {
        file.arrayBuffer().then(buf => resolve(new Blob([buf], { type: 'image/jpeg' }))).catch(reject);
        return;
      }

      // 计算缩放比例
      const scale = Math.min(MAX_DIMENSION / width, MAX_DIMENSION / height, 1);
      const canvasW = Math.round(width * scale);
      const canvasH = Math.round(height * scale);

      const canvas = document.createElement('canvas');
      canvas.width = canvasW;
      canvas.height = canvasH;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0, canvasW, canvasH);

      canvas.toBlob(
        (blob) => {
          if (blob) resolve(blob);
          else reject(new Error('Canvas toBlob failed'));
        },
        'image/jpeg',
        JPEG_QUALITY,
      );
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      // 压缩失败时 fallback 返回原文件
      file.arrayBuffer().then(buf => resolve(new Blob([buf], { type: file.type || 'image/jpeg' }))).catch(reject);
    };
    img.src = url;
  });
}

export const chatApi = {
  // 创建会话
  createSession: async (data: CreateSessionRequest): Promise<ChatSession> => {
    return apiClient.post('/chat/sessions', data);
  },

  // 获取会话列表
  getSessions: async (params?: QuerySessionParams): Promise<ChatSession[]> => {
    return apiClient.get('/chat/sessions', { params });
  },

  // 获取有会话记录的成员列表
  getMembersWithSessions: async (type?: string): Promise<{ id: string; name: string }[]> => {
    return apiClient.get('/chat/sessions/members', { params: type ? { type } : {} });
  },

  // 获取会话详情及消息
  getSession: async (sessionId: string): Promise<ChatSessionWithMessages> => {
    return apiClient.get(`/chat/sessions/${sessionId}`);
  },

  // 删除会话
  deleteSession: async (sessionId: string): Promise<{ success: boolean }> => {
    return apiClient.delete(`/chat/sessions/${sessionId}`);
  },

  // 获取建议的会话统计
  getAdviceSessionStats: async (adviceId: string): Promise<AdviceSessionStats> => {
    return apiClient.get(`/chat/advice/${adviceId}/stats`);
  },

  // 获取建议条目的关联会话列表
  getSessionsByAdvice: async (
    adviceId: string,
    params?: { itemType?: string; itemIndex?: number },
  ): Promise<ChatSession[]> => {
    return apiClient.get(`/chat/advice/${adviceId}/sessions`, { params });
  },

  // 上传聊天图片（上传前压缩，长边 ≤ 1920px，JPEG 85%）
  uploadChatImage: async (file: File): Promise<{ url: string }> => {
    const blob = await compressChatImage(file);

    const formData = new FormData();
    formData.append('file', blob, file.name?.replace(/\.\w+$/, '.jpg') || 'photo.jpg');

    // 使用 fetch 直接发送，不设置 Content-Type（让浏览器自动添加 boundary）
    const session = await supabase?.auth.getSession();
    const token = session?.data?.session?.access_token;
    const baseUrl = apiClient.defaults.baseURL || '';

    const response = await fetch(`${baseUrl}/storage/upload`, {
      method: 'POST',
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(errorText || `Upload failed: ${response.status}`);
    }

    const result = await response.json();
    // 后端 TransformInterceptor 包装为 { success, data, timestamp }
    return result.data || result;
  },

  // 发送消息（SSE 流式响应）
  sendMessage: async (
    sessionId: string,
    content: string,
    onMessage: SSECallback,
    onError?: (error: string) => void,
    imageUrls?: string[],
  ): Promise<void> => {
    // 从 Supabase session 获取 token
    const session = await supabase?.auth.getSession();
    const token = session?.data?.session?.access_token;
    const baseUrl = apiClient.defaults.baseURL || '';

    console.log('[chatApi.sendMessage] sessionId:', sessionId);
    console.log('[chatApi.sendMessage] baseUrl:', baseUrl);
    console.log('[chatApi.sendMessage] hasToken:', !!token);

    const response = await fetch(`${baseUrl}/chat/sessions/${sessionId}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ content, ...(imageUrls?.length ? { imageUrls } : {}) }),
    });

    console.log('[chatApi.sendMessage] response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[chatApi.sendMessage] error response:', errorText);
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
