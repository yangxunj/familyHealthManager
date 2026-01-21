export type RecordType =
  | 'HEIGHT'
  | 'WEIGHT'
  | 'WAIST'
  | 'SYSTOLIC_BP'
  | 'DIASTOLIC_BP'
  | 'HEART_RATE'
  | 'FASTING_GLUCOSE'
  | 'POSTPRANDIAL_GLUCOSE'
  | 'HBA1C'
  | 'TOTAL_CHOLESTEROL'
  | 'TRIGLYCERIDES'
  | 'HDL'
  | 'LDL'
  | 'TEMPERATURE'
  | 'BLOOD_OXYGEN';

export type MeasurementContext =
  | 'MORNING'
  | 'BEFORE_MEAL'
  | 'AFTER_MEAL'
  | 'AFTER_EXERCISE'
  | 'BEFORE_SLEEP'
  | 'OTHER';

export interface ReferenceRange {
  min: number;
  max: number;
}

export interface HealthRecord {
  id: string;
  memberId: string;
  recordDate: string;
  recordType: RecordType;
  recordTypeLabel: string;
  value: number;
  unit: string;
  context: MeasurementContext;
  isAbnormal: boolean;
  notes?: string | null;
  source: string;
  createdAt: string;
  member: {
    id: string;
    name: string;
  };
  referenceRange: ReferenceRange | null;
}

export interface CreateRecordRequest {
  memberId: string;
  recordDate: string;
  recordType: RecordType;
  value: number;
  unit: string;
  context?: MeasurementContext;
  notes?: string;
}

export interface RecordItem {
  recordType: RecordType;
  value: number;
  unit: string;
}

export interface CreateBatchRecordRequest {
  memberId: string;
  recordDate: string;
  context?: MeasurementContext;
  notes?: string;
  records: RecordItem[];
}

export interface QueryRecordParams {
  memberId?: string;
  recordType?: RecordType;
  startDate?: string;
  endDate?: string;
}

export interface QueryTrendParams {
  memberId: string;
  recordType: RecordType;
  period?: 'week' | 'month' | 'quarter' | 'all';
}

export interface TrendDataPoint {
  id: string;
  date: string;
  value: number;
  isAbnormal: boolean;
  context: MeasurementContext;
}

export interface TrendData {
  recordType: RecordType;
  label: string;
  unit: string;
  referenceRange: ReferenceRange | null;
  data: TrendDataPoint[];
}

// 记录类型标签
export const RecordTypeLabels: Record<RecordType, string> = {
  HEIGHT: '身高',
  WEIGHT: '体重',
  WAIST: '腰围',
  SYSTOLIC_BP: '收缩压',
  DIASTOLIC_BP: '舒张压',
  HEART_RATE: '心率',
  FASTING_GLUCOSE: '空腹血糖',
  POSTPRANDIAL_GLUCOSE: '餐后血糖',
  HBA1C: '糖化血红蛋白',
  TOTAL_CHOLESTEROL: '总胆固醇',
  TRIGLYCERIDES: '甘油三酯',
  HDL: '高密度脂蛋白',
  LDL: '低密度脂蛋白',
  TEMPERATURE: '体温',
  BLOOD_OXYGEN: '血氧饱和度',
};

// 记录类型单位
export const RecordTypeUnits: Record<RecordType, string> = {
  HEIGHT: 'cm',
  WEIGHT: 'kg',
  WAIST: 'cm',
  SYSTOLIC_BP: 'mmHg',
  DIASTOLIC_BP: 'mmHg',
  HEART_RATE: '次/分',
  FASTING_GLUCOSE: 'mmol/L',
  POSTPRANDIAL_GLUCOSE: 'mmol/L',
  HBA1C: '%',
  TOTAL_CHOLESTEROL: 'mmol/L',
  TRIGLYCERIDES: 'mmol/L',
  HDL: 'mmol/L',
  LDL: 'mmol/L',
  TEMPERATURE: '°C',
  BLOOD_OXYGEN: '%',
};

// 测量场景标签
export const MeasurementContextLabels: Record<MeasurementContext, string> = {
  MORNING: '晨起',
  BEFORE_MEAL: '餐前',
  AFTER_MEAL: '餐后',
  AFTER_EXERCISE: '运动后',
  BEFORE_SLEEP: '睡前',
  OTHER: '其他',
};

// 记录类型分组
export const RecordTypeGroups = {
  bloodPressure: {
    label: '血压监测',
    types: ['SYSTOLIC_BP', 'DIASTOLIC_BP', 'HEART_RATE'] as RecordType[],
  },
  bloodSugar: {
    label: '血糖监测',
    types: ['FASTING_GLUCOSE', 'POSTPRANDIAL_GLUCOSE', 'HBA1C'] as RecordType[],
  },
  bloodLipid: {
    label: '血脂监测',
    types: ['TOTAL_CHOLESTEROL', 'TRIGLYCERIDES', 'HDL', 'LDL'] as RecordType[],
  },
  basic: {
    label: '基础指标',
    types: ['HEIGHT', 'WEIGHT', 'WAIST', 'TEMPERATURE', 'BLOOD_OXYGEN'] as RecordType[],
  },
};
