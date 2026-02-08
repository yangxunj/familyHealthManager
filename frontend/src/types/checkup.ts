// 检查项目状态
export type CheckItemStatus = 'pending' | 'completed' | 'skipped';

// 检查模板
export interface CheckTemplate {
  name: string;
  intervalMonths: number;
  description: string;
}

// 检查记录
export interface CheckRecord {
  id: string;
  checkDate: string;
  location: string | null;
  doctor: string | null;
  findings: string | null;
  notes: string | null;
}

// 检查项目（含状态）
export interface CheckItemWithStatus {
  id: string;
  name: string;
  intervalMonths: number;
  description: string | null;
  isActive: boolean;
  skippedUntil: string | null;
  status: CheckItemStatus;
  lastCheckDate: string | null;
  nextDueDate: string | null;
  overdueDays: number;
  records: CheckRecord[];
}

// 家庭概览
export interface CheckupsSummary {
  totalMembers: number;
  totalPending: number;
  members: Array<{
    memberId: string;
    memberName: string;
    pendingCount: number;
  }>;
}

// 创建检查项目请求
export interface CreateCheckItemRequest {
  memberId: string;
  name: string;
  intervalMonths: number;
  description?: string;
}

// 更新检查项目请求
export interface UpdateCheckItemRequest {
  name?: string;
  intervalMonths?: number;
  description?: string;
}

// 创建检查记录请求
export interface CreateCheckRecordRequest {
  checkDate: string;
  location?: string;
  doctor?: string;
  findings?: string;
  notes?: string;
}
