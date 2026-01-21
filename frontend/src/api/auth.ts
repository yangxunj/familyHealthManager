import apiClient from './client';
import type {
  LoginRequest,
  RegisterRequest,
  AuthResponse,
  RefreshTokenRequest,
  User,
} from '../types';

export const authApi = {
  login: async (data: LoginRequest): Promise<AuthResponse> => {
    return apiClient.post('/auth/login', data);
  },

  register: async (data: RegisterRequest): Promise<User> => {
    return apiClient.post('/auth/register', data);
  },

  refreshToken: async (data: RefreshTokenRequest): Promise<AuthResponse> => {
    return apiClient.post('/auth/refresh', data);
  },

  getMe: async (): Promise<User> => {
    return apiClient.get('/users/me');
  },
};
