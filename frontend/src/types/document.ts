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

export interface HealthDocument {
  id: string;
  type: DocumentType;
  name: string;
  checkDate: string;
  institution?: string | null;
  files: FileInfo[];
  notes?: string | null;
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
