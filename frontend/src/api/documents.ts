import apiClient from './client';
import type {
  HealthDocument,
  CreateDocumentRequest,
  UpdateDocumentRequest,
  QueryDocumentParams,
  FileInfo,
} from '../types';

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
