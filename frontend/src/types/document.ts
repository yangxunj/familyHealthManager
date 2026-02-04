export type DocumentType =
  | 'PHYSICAL_EXAM'
  | 'LAB_REPORT'
  | 'IMAGING_REPORT'
  | 'MEDICAL_RECORD'
  | 'PRESCRIPTION'
  | 'OTHER';

export interface FileInfo {
  url: string;
  name: string;
  originalName: string;
  size?: number;
  mimeType?: string;
}

export type OcrStatus = 'pending' | 'processing' | 'completed' | 'failed';
export type AnalyzeStatus = 'processing' | 'completed' | 'failed';

export interface HealthDocument {
  id: string;
  type: DocumentType;
  name: string;
  checkDate: string;
  institution?: string | null;
  files: FileInfo[];
  notes?: string | null;
  ocrText?: string | null;
  ocrStatus?: OcrStatus | null;
  ocrProgress?: number | null;
  ocrError?: string | null;
  analyzeStatus?: AnalyzeStatus | null;
  analyzeError?: string | null;
  parsedData?: unknown;
  createdAt: string;
  updatedAt?: string;
  member: {
    id: string;
    name: string;
    relationship?: string;
  };
}

export interface CreateDocumentRequest {
  memberId: string;
  type: DocumentType;
  name: string;
  checkDate: string;
  institution?: string;
  files: FileInfo[];
  notes?: string;
}

export interface UpdateDocumentRequest {
  type?: DocumentType;
  name?: string;
  checkDate?: string;
  institution?: string;
  files?: FileInfo[];
  notes?: string;
}

export interface QueryDocumentParams {
  memberId?: string;
  type?: DocumentType;
  startDate?: string;
  endDate?: string;
}

export const DocumentTypeLabels: Record<DocumentType, string> = {
  PHYSICAL_EXAM: '体检报告',
  LAB_REPORT: '检验报告',
  IMAGING_REPORT: '影像报告',
  MEDICAL_RECORD: '病历记录',
  PRESCRIPTION: '处方单',
  OTHER: '其他',
};

export const DocumentTypeColors: Record<DocumentType, string> = {
  PHYSICAL_EXAM: 'blue',
  LAB_REPORT: 'green',
  IMAGING_REPORT: 'purple',
  MEDICAL_RECORD: 'orange',
  PRESCRIPTION: 'cyan',
  OTHER: 'default',
};

// OCR 解析相关类型
export interface HealthIndicator {
  name: string;
  value: string | number;
  unit?: string;
  referenceRange?: string;
  isAbnormal?: boolean;
  category?: string;
}

export interface ParsedHealthData {
  reportDate?: string;
  institution?: string;
  patientInfo?: {
    name?: string;
    gender?: string;
    age?: number;
  };
  indicators: HealthIndicator[];
  summary?: string;
  rawText: string;
}

export interface DocumentParseResult {
  document: HealthDocument;
  parseResult: ParsedHealthData;
  tokensUsed?: number;
}

// OCR SSE 进度事件
export interface OcrProgressEvent {
  type: 'progress';
  status: OcrStatus;
  progress: number;
  current?: number;
  total?: number;
  message?: string;
}

export interface OcrCompleteEvent {
  type: 'complete';
  status: 'completed';
  progress: 100;
  ocrText: string;
  tokensUsed?: number;
}

export interface OcrErrorEvent {
  type: 'error';
  error: string;
}

export type OcrSseEvent = OcrProgressEvent | OcrCompleteEvent | OcrErrorEvent;

// AI 规整：触发结果
export interface AnalyzeStartResult {
  status: 'processing';
}

// AI 规整：状态查询结果
export interface AnalyzeStatusResult {
  status: AnalyzeStatus | null;
  error: string | null;
  parsedData: unknown;
}
