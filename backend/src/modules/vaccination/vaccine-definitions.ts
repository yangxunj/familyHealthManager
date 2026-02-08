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
  scheduleMonths?: number[]; // 推荐接种月龄（儿童疫苗）
  minAgeYears?: number;
  maxAgeYears?: number;
  description?: string;
}

// 儿童计划免疫疫苗（0-6岁）
export const CHILD_VACCINES: VaccineDefinition[] = [
  {
    code: 'HEP_B',
    name: '乙肝疫苗',
    category: 'CHILD',
    frequency: 'MULTI_DOSE',
    totalDoses: 3,
    scheduleMonths: [0, 1, 6],
    maxAgeYears: 6,
    description: '出生时、1月龄、6月龄各接种1剂',
  },
  {
    code: 'BCG',
    name: '卡介苗',
    category: 'CHILD',
    frequency: 'ONCE',
    totalDoses: 1,
    scheduleMonths: [0],
    maxAgeYears: 1,
    description: '出生时接种',
  },
  {
    code: 'POLIO',
    name: '脊灰疫苗',
    category: 'CHILD',
    frequency: 'MULTI_DOSE',
    totalDoses: 4,
    scheduleMonths: [2, 3, 4, 48],
    maxAgeYears: 6,
    description: '2、3、4月龄及4岁各接种1剂',
  },
  {
    code: 'DTP',
    name: '百白破疫苗',
    category: 'CHILD',
    frequency: 'MULTI_DOSE',
    totalDoses: 4,
    scheduleMonths: [3, 4, 5, 18],
    maxAgeYears: 6,
    description: '3、4、5月龄及18月龄各接种1剂',
  },
  {
    code: 'MR',
    name: '麻风疫苗',
    category: 'CHILD',
    frequency: 'ONCE',
    totalDoses: 1,
    scheduleMonths: [8],
    maxAgeYears: 6,
    description: '8月龄接种',
  },
  {
    code: 'JE',
    name: '乙脑疫苗',
    category: 'CHILD',
    frequency: 'MULTI_DOSE',
    totalDoses: 2,
    scheduleMonths: [8, 24],
    maxAgeYears: 6,
    description: '8月龄、2岁各接种1剂',
  },
  {
    code: 'MEN_A',
    name: 'A群流脑疫苗',
    category: 'CHILD',
    frequency: 'MULTI_DOSE',
    totalDoses: 2,
    scheduleMonths: [6, 9],
    maxAgeYears: 6,
    description: '6、9月龄各接种1剂',
  },
  {
    code: 'MMR',
    name: '麻腮风疫苗',
    category: 'CHILD',
    frequency: 'ONCE',
    totalDoses: 1,
    scheduleMonths: [18],
    maxAgeYears: 6,
    description: '18月龄接种',
  },
  {
    code: 'HEP_A',
    name: '甲肝疫苗',
    category: 'CHILD',
    frequency: 'ONCE',
    totalDoses: 1,
    scheduleMonths: [24],
    maxAgeYears: 6,
    description: '2岁接种',
  },
  {
    code: 'MEN_AC',
    name: 'A+C群流脑疫苗',
    category: 'CHILD',
    frequency: 'MULTI_DOSE',
    totalDoses: 2,
    scheduleMonths: [36, 72],
    maxAgeYears: 6,
    description: '3岁、6岁各接种1剂',
  },
  {
    code: 'DT',
    name: '白破疫苗',
    category: 'CHILD',
    frequency: 'ONCE',
    totalDoses: 1,
    scheduleMonths: [72],
    maxAgeYears: 7,
    description: '6岁接种',
  },
];

// 成人疫苗
export const ADULT_VACCINES: VaccineDefinition[] = [
  {
    code: 'FLU',
    name: '流感疫苗',
    category: 'ADULT',
    frequency: 'YEARLY',
    totalDoses: 1,
    minAgeYears: 6,
    description: '每年接种1剂，建议秋冬季节前接种',
  },
  {
    code: 'COVID',
    name: '新冠疫苗',
    category: 'ADULT',
    frequency: 'YEARLY',
    totalDoses: 1,
    minAgeYears: 3,
    description: '建议每年加强接种',
  },
  {
    code: 'HPV',
    name: 'HPV疫苗',
    category: 'ADULT',
    frequency: 'MULTI_DOSE',
    totalDoses: 3,
    minAgeYears: 9,
    maxAgeYears: 45,
    description: '9-45岁女性，共3剂',
  },
  {
    code: 'HEP_B_ADULT',
    name: '乙肝疫苗(成人)',
    category: 'ADULT',
    frequency: 'MULTI_DOSE',
    totalDoses: 3,
    minAgeYears: 18,
    description: '未接种者可补种，共3剂',
  },
];

// 老年人疫苗（60岁+）
export const ELDERLY_VACCINES: VaccineDefinition[] = [
  {
    code: 'PPSV23',
    name: '肺炎疫苗(23价)',
    category: 'ELDERLY',
    frequency: 'ONCE',
    totalDoses: 1,
    minAgeYears: 60,
    description: '60岁以上老人推荐接种',
  },
  {
    code: 'SHINGLES',
    name: '带状疱疹疫苗',
    category: 'ELDERLY',
    frequency: 'MULTI_DOSE',
    totalDoses: 2,
    minAgeYears: 50,
    description: '50岁以上推荐接种，共2剂',
  },
];

// 所有预定义疫苗
export const ALL_VACCINES: VaccineDefinition[] = [
  ...CHILD_VACCINES,
  ...ADULT_VACCINES,
  ...ELDERLY_VACCINES,
];

// 根据代码获取疫苗定义
export function getVaccineByCode(code: string): VaccineDefinition | undefined {
  return ALL_VACCINES.find((v) => v.code === code);
}

// 根据年龄获取适用的疫苗列表
export function getVaccinesForAge(ageYears: number): VaccineDefinition[] {
  return ALL_VACCINES.filter((v) => {
    const minAge = v.minAgeYears ?? 0;
    const maxAge = v.maxAgeYears ?? 150;
    return ageYears >= minAge && ageYears <= maxAge;
  });
}
