import apiClient from './client';
import type {
  HealthRecord,
  CreateRecordRequest,
  CreateBatchRecordRequest,
  QueryRecordParams,
  QueryTrendParams,
  TrendData,
  RecordType,
  ReferenceRange,
} from '../types';

export const recordsApi = {
  // 获取参考范围配置
  getReferenceRanges: async (): Promise<Record<RecordType, ReferenceRange & { unit: string; label: string }>> => {
    return apiClient.get('/records/reference-ranges');
  },

  // 获取记录列表
  getAll: async (params?: QueryRecordParams): Promise<HealthRecord[]> => {
    return apiClient.get('/records', { params });
  },

  // 获取单条记录
  getById: async (id: string): Promise<HealthRecord> => {
    return apiClient.get(`/records/${id}`);
  },

  // 添加单条记录
  create: async (data: CreateRecordRequest): Promise<HealthRecord> => {
    return apiClient.post('/records', data);
  },

  // 批量添加记录
  createBatch: async (data: CreateBatchRecordRequest): Promise<HealthRecord[]> => {
    return apiClient.post('/records/batch', data);
  },

  // 获取趋势数据
  getTrend: async (params: QueryTrendParams): Promise<TrendData> => {
    return apiClient.get('/records/trend', { params });
  },

  // 删除记录
  delete: async (id: string): Promise<{ message: string }> => {
    return apiClient.delete(`/records/${id}`);
  },
};
