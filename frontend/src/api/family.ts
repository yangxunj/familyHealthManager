import apiClient from './client';

export interface Family {
  id: string;
  name: string;
  inviteCode: string;
  userCount: number;
  memberCount: number;
  isOwner: boolean;
  users?: FamilyUser[];
  createdAt: string;
}

export interface FamilyUser {
  id: string;
  name: string;
  email: string;
  isOwner: boolean;
  joinedAt: string;
}

export interface CreateFamilyDto {
  name: string;
}

export interface JoinFamilyDto {
  inviteCode: string;
}

export interface UpdateFamilyDto {
  name?: string;
}

export const familyApi = {
  // 获取当前家庭信息
  get: async (): Promise<Family | null> => {
    const response = await apiClient.get<Family | null>('/family');
    return response as unknown as Family | null;
  },

  // 创建家庭
  create: async (dto: CreateFamilyDto): Promise<Family> => {
    const response = await apiClient.post<Family>('/family', dto);
    return response as unknown as Family;
  },

  // 加入家庭
  join: async (dto: JoinFamilyDto): Promise<Family> => {
    const response = await apiClient.post<Family>('/family/join', dto);
    return response as unknown as Family;
  },

  // 更新家庭信息
  update: async (dto: UpdateFamilyDto): Promise<Family> => {
    const response = await apiClient.patch<Family>('/family', dto);
    return response as unknown as Family;
  },

  // 重新生成邀请码
  regenerateInviteCode: async (): Promise<{ inviteCode: string }> => {
    const response = await apiClient.post<{ inviteCode: string }>('/family/regenerate-code');
    return response as unknown as { inviteCode: string };
  },

  // 离开家庭
  leave: async (): Promise<{ message: string }> => {
    const response = await apiClient.delete<{ message: string }>('/family/leave');
    return response as unknown as { message: string };
  },

  // 移除成员
  removeMember: async (userId: string): Promise<{ message: string }> => {
    const response = await apiClient.delete<{ message: string }>(`/family/members/${userId}`);
    return response as unknown as { message: string };
  },
};
