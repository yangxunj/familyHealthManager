export type ConcernLevel = 'critical' | 'warning' | 'info';
export type SuggestionCategory = '饮食' | '运动' | '作息' | '用药' | '检查' | '其他';
export type ActionPriority = 'high' | 'medium' | 'low';

export interface Concern {
  level: ConcernLevel;
  title: string;
  description: string;
}

export interface Suggestion {
  category: SuggestionCategory | string;
  title: string;
  content: string;
}

export interface ActionItem {
  text: string;
  priority: ActionPriority;
}

export interface HealthAdvice {
  id: string;
  memberId: string;
  member: {
    id: string;
    name: string;
  };
  healthScore: number | null;
  summary: string;
  concerns: Concern[];
  suggestions: Suggestion[];
  actionItems: ActionItem[];
  modelUsed: string | null;
  tokensUsed: number | null;
  generatedAt: string;
}

export interface GenerateAdviceRequest {
  memberId: string;
}

export interface QueryAdviceParams {
  memberId?: string;
}

export interface NewDataCheckResult {
  hasNewData: boolean;
  newDocuments: number;
  newRecords: number;
  lastAdviceDate: string | null;
}

// 关注级别标签和颜色
export const ConcernLevelConfig: Record<
  ConcernLevel,
  { label: string; color: string }
> = {
  critical: { label: '严重', color: 'red' },
  warning: { label: '警告', color: 'orange' },
  info: { label: '提示', color: 'blue' },
};

// 优先级标签和颜色
export const ActionPriorityConfig: Record<
  ActionPriority,
  { label: string; color: string }
> = {
  high: { label: '高', color: 'red' },
  medium: { label: '中', color: 'orange' },
  low: { label: '低', color: 'green' },
};

// 建议类别图标（用于前端展示）
export const SuggestionCategoryIcons: Record<string, string> = {
  '饮食': '🍎',
  '运动': '🏃',
  '作息': '🌙',
  '用药': '💊',
  '检查': '🏥',
  '其他': '📝',
};
