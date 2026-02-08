import apiClient from './client';
import type {
  CheckTemplate,
  CheckItemWithStatus,
  CheckupsSummary,
  CreateCheckItemRequest,
  UpdateCheckItemRequest,
  CreateCheckRecordRequest,
} from '../types/checkup';

export const checkupsApi = {
  // 获取预定义模板
  getTemplates: async (): Promise<CheckTemplate[]> => {
    return apiClient.get('/checkups/templates');
  },

  // 获取家庭概览
  getSummary: async (): Promise<CheckupsSummary> => {
    return apiClient.get('/checkups/summary');
  },

  // 获取成员的检查项目列表
  getItems: async (memberId: string): Promise<CheckItemWithStatus[]> => {
    return apiClient.get(`/checkups/items/${memberId}`);
  },

  // 创建检查项目
  createItem: async (data: CreateCheckItemRequest) => {
    return apiClient.post('/checkups/items', data);
  },

  // 更新检查项目
  updateItem: async (id: string, data: UpdateCheckItemRequest) => {
    return apiClient.patch(`/checkups/items/${id}`, data);
  },

  // 删除检查项目
  deleteItem: async (id: string): Promise<{ success: boolean }> => {
    return apiClient.delete(`/checkups/items/${id}`);
  },

  // 跳过当前周期
  skipItem: async (id: string) => {
    return apiClient.post(`/checkups/items/${id}/skip`);
  },

  // 取消跳过
  unskipItem: async (id: string) => {
    return apiClient.delete(`/checkups/items/${id}/skip`);
  },

  // 添加完成记录
  addRecord: async (itemId: string, data: CreateCheckRecordRequest) => {
    return apiClient.post(`/checkups/items/${itemId}/records`, data);
  },

  // 删除完成记录
  deleteRecord: async (recordId: string): Promise<{ success: boolean }> => {
    return apiClient.delete(`/checkups/records/${recordId}`);
  },
};
