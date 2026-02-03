import apiClient from './client';
import type { User } from '../types';

export const authApi = {
  // 获取当前用户信息
  getMe: async (): Promise<User> => {
    return apiClient.get('/users/me');
  },
};
