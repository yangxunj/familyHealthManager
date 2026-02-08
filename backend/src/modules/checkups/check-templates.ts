// 预定义检查模板（常见的定期检查项目）
export interface CheckTemplate {
  name: string;
  intervalMonths: number;
  description: string;
}

export const CHECK_TEMPLATES: CheckTemplate[] = [
  {
    name: '洗牙',
    intervalMonths: 6,
    description: '建议每半年洗牙一次',
  },
  {
    name: '年度体检',
    intervalMonths: 12,
    description: '每年一次全面体检',
  },
  {
    name: '眼科检查',
    intervalMonths: 24,
    description: '每2年检查一次视力',
  },
  {
    name: '口腔检查',
    intervalMonths: 12,
    description: '每年一次口腔全面检查',
  },
  {
    name: '乳腺检查',
    intervalMonths: 12,
    description: '女性40岁以上建议每年一次',
  },
  {
    name: '肠镜',
    intervalMonths: 60,
    description: '40岁以上建议每5年一次',
  },
  {
    name: '骨密度检查',
    intervalMonths: 24,
    description: '50岁以上建议每2年一次',
  },
];
