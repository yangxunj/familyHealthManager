import apiClient from './client';

export interface AllowedEmail {
  id: number;
  email: string;
  addedBy: string | null;
  createdAt: string;
}

export interface WhitelistResponse {
  emails: AllowedEmail[];
  isAdmin: boolean;
}

export interface AdminCheckResponse {
  isAdmin: boolean;
}

export const whitelistApi = {
  // 获取白名单列表（仅管理员）
  getWhitelist: async (): Promise<WhitelistResponse> => {
    return apiClient.get('/whitelist');
  },

  // 添加邮箱到白名单（仅管理员）
  addEmail: async (email: string): Promise<AllowedEmail> => {
    return apiClient.post('/whitelist', { email });
  },

  // 从白名单移除邮箱（仅管理员）
  removeEmail: async (email: string): Promise<{ message: string }> => {
    return apiClient.delete(`/whitelist/${encodeURIComponent(email)}`);
  },

  // 检查当前用户是否是管理员
  checkAdmin: async (): Promise<AdminCheckResponse> => {
    return apiClient.get('/whitelist/check-admin');
  },
};
