import apiClient from './client';
import type {
  HealthAdvice,
  GenerateAdviceRequest,
  QueryAdviceParams,
  NewDataCheckResult,
} from '../types';

export const adviceApi = {
  // 检查是否有新的健康数据
  checkNewData: async (memberId: string): Promise<NewDataCheckResult> => {
    return apiClient.get(`/advice/check/${memberId}`);
  },

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

  // 删除建议
  delete: async (id: string): Promise<{ message: string }> => {
    return apiClient.delete(`/advice/${id}`);
  },
};
