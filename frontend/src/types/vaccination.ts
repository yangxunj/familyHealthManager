// 疫苗分类
export type VaccineCategory = 'CHILD' | 'ADULT' | 'ELDERLY';

// 接种频率
export type VaccineFrequency = 'ONCE' | 'YEARLY' | 'MULTI_DOSE';

// 疫苗定义
export interface VaccineDefinition {
  code: string;
  name: string;
  category: VaccineCategory;
  frequency: VaccineFrequency;
  totalDoses: number;
  scheduleMonths?: number[];
  minAgeYears?: number;
  maxAgeYears?: number;
  description?: string;
}

// 接种状态
export type VaccineStatus = 'completed' | 'pending' | 'overdue' | 'skipped' | 'not_applicable';

// 接种记录
export interface VaccineRecord {
  id: string;
  memberId: string;
  vaccineCode?: string;
  vaccineName: string;
  doseNumber: number;
  totalDoses?: number;
  vaccinatedAt: string;
  location?: string;
  manufacturer?: string;
  batchNumber?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  member?: {
    id: string;
    name: string;
  };
}

// 推荐疫苗条目（接种计划中使用）
export interface RecommendedVaccine {
  vaccine: VaccineDefinition;
  status: VaccineStatus;
  completedDoses: number;
  nextDoseNumber?: number;
  lastVaccinatedAt?: string;
  records: Array<{
    id: string;
    doseNumber: number;
    vaccinatedAt: string;
  }>;
  // 跳过相关
  skipId?: string;         // 跳过记录ID（用于取消跳过）
  seasonLabel?: string;    // 当前季节标签（用于跳过周期性疫苗）
}

// 成员接种计划
export interface VaccineSchedule {
  memberId: string;
  memberName: string;
  ageYears: number;
  ageMonths: number;
  childVaccines: RecommendedVaccine[];
  adultVaccines: RecommendedVaccine[];
  elderlyVaccines: RecommendedVaccine[];
  customVaccines: RecommendedVaccine[];
  customRecords: Array<{
    id: string;
    vaccineName: string;
    doseNumber: number;
    totalDoses: number | null;
    vaccinatedAt: string;
  }>;
}

// 自定义疫苗类型
export interface CustomVaccine {
  id: string;
  familyId: string;
  name: string;
  frequency: string;
  totalDoses: number;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

// 创建自定义疫苗请求
export interface CreateCustomVaccineRequest {
  name: string;
  frequency: string;
  totalDoses?: number;
  description?: string;
}

// 家庭接种概览
export interface VaccineSummary {
  totalMembers: number;
  totalRecords: number;
  pendingCount: number;
  overdueCount: number;
  pendingList: Array<{
    memberId: string;
    memberName: string;
    vaccineName: string;
    status: 'pending' | 'overdue';
    description?: string;
  }>;
}

// 创建接种记录请求
export interface CreateVaccineRecordRequest {
  memberId: string;
  vaccineCode?: string;
  vaccineName: string;
  doseNumber?: number;
  totalDoses?: number;
  vaccinatedAt: string;
  location?: string;
  manufacturer?: string;
  batchNumber?: string;
  notes?: string;
}

// 更新接种记录请求
export interface UpdateVaccineRecordRequest {
  vaccineCode?: string;
  vaccineName?: string;
  doseNumber?: number;
  totalDoses?: number;
  vaccinatedAt?: string;
  location?: string;
  manufacturer?: string;
  batchNumber?: string;
  notes?: string;
}

// 疫苗定义响应
export interface VaccineDefinitionsResponse {
  child: VaccineDefinition[];
  adult: VaccineDefinition[];
  elderly: VaccineDefinition[];
  all: VaccineDefinition[];
}

// 跳过疫苗请求
export interface SkipVaccineRequest {
  memberId: string;
  vaccineCode: string;
  seasonLabel: string;
  reason?: string;
}
