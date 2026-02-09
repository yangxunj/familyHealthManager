import apiClient from './client';
import type {
  VaccineRecord,
  VaccineSchedule,
  VaccineSummary,
  VaccineDefinitionsResponse,
  CreateVaccineRecordRequest,
  UpdateVaccineRecordRequest,
  SkipVaccineRequest,
  CustomVaccine,
  CreateCustomVaccineRequest,
} from '../types/vaccination';

export const vaccinationsApi = {
  // 获取疫苗定义列表
  getDefinitions: async (): Promise<VaccineDefinitionsResponse> => {
    return apiClient.get('/vaccinations/definitions');
  },

  // 获取家庭疫苗接种概览
  getSummary: async (): Promise<VaccineSummary> => {
    return apiClient.get('/vaccinations/summary');
  },

  // 获取成员的接种计划
  getSchedule: async (memberId: string): Promise<VaccineSchedule> => {
    return apiClient.get(`/vaccinations/schedule/${memberId}`);
  },

  // 获取接种记录列表
  getRecords: async (memberId?: string): Promise<VaccineRecord[]> => {
    const params = memberId ? { memberId } : {};
    return apiClient.get('/vaccinations', { params });
  },

  // 获取单个接种记录
  getRecord: async (id: string): Promise<VaccineRecord> => {
    return apiClient.get(`/vaccinations/${id}`);
  },

  // 创建接种记录
  createRecord: async (data: CreateVaccineRecordRequest): Promise<VaccineRecord> => {
    return apiClient.post('/vaccinations', data);
  },

  // 更新接种记录
  updateRecord: async (id: string, data: UpdateVaccineRecordRequest): Promise<VaccineRecord> => {
    return apiClient.patch(`/vaccinations/${id}`, data);
  },

  // 删除接种记录
  deleteRecord: async (id: string): Promise<{ success: boolean }> => {
    return apiClient.delete(`/vaccinations/${id}`);
  },

  // 跳过疫苗
  skipVaccine: async (data: SkipVaccineRequest): Promise<{ id: string }> => {
    return apiClient.post('/vaccinations/skip', data);
  },

  // 取消跳过疫苗
  unskipVaccine: async (id: string): Promise<{ success: boolean }> => {
    return apiClient.delete(`/vaccinations/skip/${id}`);
  },

  // 创建自定义疫苗类型
  createCustomVaccine: async (data: CreateCustomVaccineRequest): Promise<CustomVaccine> => {
    return apiClient.post('/vaccinations/custom', data);
  },

  // 获取自定义疫苗类型列表
  getCustomVaccines: async (): Promise<CustomVaccine[]> => {
    return apiClient.get('/vaccinations/custom');
  },

  // 删除自定义疫苗类型
  deleteCustomVaccine: async (id: string): Promise<{ success: boolean }> => {
    return apiClient.delete(`/vaccinations/custom/${id}`);
  },
};
