import apiClient from './client';
import type {
  FamilyMember,
  CreateMemberRequest,
  UpdateMemberRequest,
  MemberStats,
} from '../types';

export const membersApi = {
  getAll: async (params?: { scope?: 'all' }): Promise<FamilyMember[]> => {
    const query = params?.scope ? `?scope=${params.scope}` : '';
    return apiClient.get(`/members${query}`);
  },

  getById: async (id: string): Promise<FamilyMember> => {
    return apiClient.get(`/members/${id}`);
  },

  getStats: async (): Promise<MemberStats> => {
    return apiClient.get('/members/stats');
  },

  create: async (data: CreateMemberRequest): Promise<FamilyMember> => {
    return apiClient.post('/members', data);
  },

  update: async (id: string, data: UpdateMemberRequest): Promise<FamilyMember> => {
    return apiClient.patch(`/members/${id}`, data);
  },

  delete: async (id: string): Promise<{ message: string }> => {
    return apiClient.delete(`/members/${id}`);
  },

  getMyMember: async (): Promise<FamilyMember | null> => {
    return apiClient.get('/members/me');
  },

  linkToUser: async (memberId: string): Promise<{ message: string }> => {
    return apiClient.post(`/members/${memberId}/link`);
  },

  unlinkFromUser: async (): Promise<{ message: string }> => {
    return apiClient.delete('/members/me/link');
  },
};
