import apiClient from './client';

export interface ApiConfig {
  dashscopeApiKey: string;    // 脱敏后的值
  googleApiKey: string;       // 脱敏后的值
  aiProvider: string;         // 'auto' | 'alibaba' | 'google'
  hasDashscope: boolean;
  hasGoogle: boolean;
  dashscopeSource: 'database' | 'env' | 'none';
  googleSource: 'database' | 'env' | 'none';
}

export interface UpdateApiConfigRequest {
  dashscopeApiKey?: string;
  googleApiKey?: string;
  aiProvider?: string;
}

export const settingsApi = {
  getApiConfig: async (): Promise<ApiConfig> => {
    return apiClient.get('/settings/api-config');
  },

  updateApiConfig: async (data: UpdateApiConfigRequest): Promise<{ message: string }> => {
    return apiClient.put('/settings/api-config', data);
  },
};
