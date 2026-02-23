import { useEffect } from 'react';
import { useAuthStore } from '../store/authStore';
import type { FamilyMember } from '../types';

/**
 * 自动设置默认选中的成员 ID：
 * 1. 优先选中 userId === 当前登录用户 ID 的成员（"自己"）
 * 2. 找不到则选第一个成员
 */
export function useDefaultMemberId(
  members: FamilyMember[] | undefined,
  selectedMemberId: string | undefined,
  setSelectedMemberId: (id: string) => void,
) {
  const user = useAuthStore((s) => s.user);

  useEffect(() => {
    if (!members?.length || selectedMemberId) return;
    const myMember = user ? members.find((m) => m.userId === user.id) : null;
    setSelectedMemberId(myMember?.id || members[0].id);
  }, [members, user, selectedMemberId, setSelectedMemberId]);
}
