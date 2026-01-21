import apiClient from './client';
import type {
  HealthAdvice,
  GenerateAdviceRequest,
  QueryAdviceParams,
} from '../types';

export const adviceApi = {
  // 生成健康建议
  generate: async (data: GenerateAdviceRequest): Promise<HealthAdvice> => {
    return apiClient.post('/advice/generate', data);
  },

  // 获取建议列表
  getAll: async (params?: QueryAdviceParams): Promise<HealthAdvice[]> => {
    return apiClient.get('/advice', { params });
  },

  // 获取单条建议详情
  getById: async (id: string): Promise<HealthAdvice> => {
    return apiClient.get(`/advice/${id}`);
  },
};
