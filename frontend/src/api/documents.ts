import apiClient from './client';
import type {
  HealthDocument,
  CreateDocumentRequest,
  UpdateDocumentRequest,
  QueryDocumentParams,
  FileInfo,
  DocumentParseResult,
  OcrSseEvent,
  AnalyzeDocumentResult,
} from '../types';
import { useAuthStore } from '../store/authStore';

export const documentsApi = {
  getAll: async (params?: QueryDocumentParams): Promise<HealthDocument[]> => {
    return apiClient.get('/documents', { params });
  },

  getById: async (id: string): Promise<HealthDocument> => {
    return apiClient.get(`/documents/${id}`);
  },

  create: async (data: CreateDocumentRequest): Promise<HealthDocument> => {
    return apiClient.post('/documents', data);
  },

  update: async (id: string, data: UpdateDocumentRequest): Promise<HealthDocument> => {
    return apiClient.patch(`/documents/${id}`, data);
  },

  delete: async (id: string): Promise<{ message: string }> => {
    return apiClient.delete(`/documents/${id}`);
  },

  // OCR 识别（SSE 流式返回进度）
  // 由于 EventSource 不支持 headers，使用 fetch + ReadableStream 方式
  startOcr: (
    id: string,
    onProgress: (event: OcrSseEvent) => void,
    onError: (error: Error) => void,
    onComplete: () => void,
  ): (() => void) => {
    const token = useAuthStore.getState().getAccessToken();
    const baseUrl = import.meta.env.VITE_API_BASE_URL || '/api/v1';
    const url = `${baseUrl}/documents/${id}/ocr`;
    const controller = new AbortController();

    fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'text/event-stream',
        'Authorization': `Bearer ${token}`,
      },
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(`OCR 请求失败: ${response.status}`);
        }

        const reader = response.body?.getReader();
        if (!reader) {
          throw new Error('无法获取响应流');
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
            if (!trimmedLine || !trimmedLine.startsWith('data:')) continue;

            try {
              const dataStr = trimmedLine.slice(5).trim();
              if (!dataStr) continue;
              const parsed = JSON.parse(dataStr);
              // NestJS SSE 将 MessageEvent.data 包装在 data 属性中
              const data = (parsed.data || parsed) as OcrSseEvent;
              console.log('[OCR SSE]', data);
              onProgress(data);
            } catch (e) {
              console.error('[OCR SSE parse error]', e, trimmedLine);
            }
          }
        }

        onComplete();
      })
      .catch((error) => {
        if (error.name !== 'AbortError') {
          onError(error);
        }
      });

    // 返回取消函数
    return () => {
      controller.abort();
    };
  },

  // 更新 OCR 文本（用户编辑后保存）
  updateOcrText: async (id: string, ocrText: string): Promise<{ id: string; ocrText: string; ocrStatus: string; updatedAt: string }> => {
    return apiClient.patch(`/documents/${id}/ocr`, { ocrText });
  },

  // AI 分析 OCR 文本
  analyzeDocument: async (id: string): Promise<AnalyzeDocumentResult> => {
    return apiClient.post(`/documents/${id}/analyze`, {}, { timeout: 300000 });
  },

  // 旧的 parseDocument 方法（保留向后兼容，但不推荐使用）
  parseDocument: async (id: string): Promise<DocumentParseResult> => {
    return apiClient.post(`/documents/${id}/parse`, {}, { timeout: 300000 });
  },
};

export const storageApi = {
  uploadFile: async (file: File): Promise<FileInfo> => {
    const formData = new FormData();
    formData.append('file', file);
    return apiClient.post('/storage/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },

  uploadFiles: async (files: File[]): Promise<FileInfo[]> => {
    const formData = new FormData();
    files.forEach((file) => {
      formData.append('files', file);
    });
    return apiClient.post('/storage/upload-multiple', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },
};
