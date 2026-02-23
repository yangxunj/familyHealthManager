export type Relationship =
  | 'SELF'
  | 'SPOUSE'
  | 'FATHER'
  | 'MOTHER'
  | 'SON'
  | 'DAUGHTER'
  | 'GRANDFATHER'
  | 'GRANDMOTHER'
  | 'OTHER';

export type Gender = 'MALE' | 'FEMALE';

export type BloodType = 'A' | 'B' | 'AB' | 'O' | 'UNKNOWN';

export interface FamilyMember {
  id: string;
  name: string;
  relationship: Relationship;
  gender: Gender;
  birthDate: string;
  avatar?: string | null;
  bloodType: BloodType;
  height?: number | null;
  weight?: number | null;
  userId?: string | null;
  chronicDiseases?: string[];
  allergies?: string | null;
  notes?: string | null;
  createdAt: string;
  updatedAt?: string;
  documentCount?: number;
  recordCount?: number;
  adviceCount?: number;
}

export interface CreateMemberRequest {
  name: string;
  relationship: Relationship;
  gender: Gender;
  birthDate: string;
  avatar?: string;
  bloodType?: BloodType;
  height?: number;
  weight?: number;
  chronicDiseases?: string[];
  allergies?: string;
  notes?: string;
  linkToCurrentUser?: boolean;
}

export interface UpdateMemberRequest {
  name?: string;
  relationship?: Relationship;
  gender?: Gender;
  birthDate?: string;
  avatar?: string;
  bloodType?: BloodType;
  height?: number;
  weight?: number;
  chronicDiseases?: string[];
  allergies?: string;
  notes?: string;
}

export interface MemberStats {
  memberCount: number;
  documentCount: number;
  recordCount: number;
  adviceCount: number;
}

export const RelationshipLabels: Record<Relationship, string> = {
  SELF: '本人',
  SPOUSE: '配偶',
  FATHER: '父亲',
  MOTHER: '母亲',
  SON: '儿子',
  DAUGHTER: '女儿',
  GRANDFATHER: '祖父/外祖父',
  GRANDMOTHER: '祖母/外祖母',
  OTHER: '其他',
};

export const GenderLabels: Record<Gender, string> = {
  MALE: '男',
  FEMALE: '女',
};

export const BloodTypeLabels: Record<BloodType, string> = {
  A: 'A型',
  B: 'B型',
  AB: 'AB型',
  O: 'O型',
  UNKNOWN: '未知',
};
