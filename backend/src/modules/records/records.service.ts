import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { RecordType, Prisma, MeasurementContext } from '@prisma/client';
import {
  CreateRecordDto,
  CreateBatchRecordDto,
  QueryRecordDto,
  QueryTrendDto,
} from './dto';

// 健康指标参考范围配置
export interface ReferenceRange {
  min: number;
  max: number;
  unit: string;
  label: string;
}

const REFERENCE_RANGES: Record<RecordType, ReferenceRange> = {
  // 基础指标
  HEIGHT: { min: 0, max: 300, unit: 'cm', label: '身高' },
  WEIGHT: { min: 0, max: 500, unit: 'kg', label: '体重' },
  WAIST: { min: 0, max: 200, unit: 'cm', label: '腰围' },
  // 心血管
  SYSTOLIC_BP: { min: 90, max: 139, unit: 'mmHg', label: '收缩压' },
  DIASTOLIC_BP: { min: 60, max: 89, unit: 'mmHg', label: '舒张压' },
  HEART_RATE: { min: 60, max: 100, unit: '次/分', label: '心率' },
  // 血糖
  FASTING_GLUCOSE: { min: 3.9, max: 6.1, unit: 'mmol/L', label: '空腹血糖' },
  POSTPRANDIAL_GLUCOSE: { min: 3.9, max: 7.8, unit: 'mmol/L', label: '餐后血糖' },
  HBA1C: { min: 4.0, max: 6.0, unit: '%', label: '糖化血红蛋白' },
  // 血脂
  TOTAL_CHOLESTEROL: { min: 2.8, max: 5.2, unit: 'mmol/L', label: '总胆固醇' },
  TRIGLYCERIDES: { min: 0.56, max: 1.7, unit: 'mmol/L', label: '甘油三酯' },
  HDL: { min: 1.0, max: 1.5, unit: 'mmol/L', label: '高密度脂蛋白' },
  LDL: { min: 0, max: 3.4, unit: 'mmol/L', label: '低密度脂蛋白' },
  // 其他
  TEMPERATURE: { min: 36.0, max: 37.3, unit: '°C', label: '体温' },
  BLOOD_OXYGEN: { min: 95, max: 100, unit: '%', label: '血氧饱和度' },
};

// 记录包含成员信息的类型
type RecordWithMember = {
  id: string;
  memberId: string;
  recordDate: Date;
  recordType: RecordType;
  value: Prisma.Decimal;
  unit: string;
  context: MeasurementContext;
  isAbnormal: boolean;
  notes: string | null;
  source: string;
  documentId: string | null;
  createdAt: Date;
  member: {
    id: string;
    name: string;
  };
};

@Injectable()
export class RecordsService {
  constructor(private prisma: PrismaService) {}

  // 获取指标参考范围
  getReferenceRanges(): Record<RecordType, ReferenceRange> {
    return REFERENCE_RANGES;
  }

  // 判断值是否异常
  private isValueAbnormal(recordType: RecordType, value: number): boolean {
    const range = REFERENCE_RANGES[recordType];
    if (!range) return false;

    // 身高、体重、腰围没有严格的异常标准，不标记为异常
    if (['HEIGHT', 'WEIGHT', 'WAIST'].includes(recordType)) {
      return false;
    }

    return value < range.min || value > range.max;
  }

  // 验证成员归属
  private async validateMemberOwnership(memberId: string, userId: string) {
    const member = await this.prisma.familyMember.findFirst({
      where: {
        id: memberId,
        userId,
        deletedAt: null,
      },
    });

    if (!member) {
      throw new ForbiddenException('无权操作此成员的记录');
    }

    return member;
  }

  // 添加单条记录
  async create(userId: string, dto: CreateRecordDto) {
    await this.validateMemberOwnership(dto.memberId, userId);

    const isAbnormal = this.isValueAbnormal(dto.recordType, dto.value);

    const record = await this.prisma.healthRecord.create({
      data: {
        memberId: dto.memberId,
        recordDate: new Date(dto.recordDate),
        recordType: dto.recordType,
        value: new Prisma.Decimal(dto.value),
        unit: dto.unit,
        context: dto.context,
        isAbnormal,
        notes: dto.notes,
        source: 'MANUAL',
      },
      include: {
        member: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    // 如果是身高或体重，同步更新成员基础数据
    if (dto.recordType === 'HEIGHT' || dto.recordType === 'WEIGHT') {
      await this.prisma.familyMember.update({
        where: { id: dto.memberId },
        data: {
          [dto.recordType.toLowerCase()]: new Prisma.Decimal(dto.value),
        },
      });
    }

    return this.formatRecord(record as RecordWithMember);
  }

  // 批量添加记录（同一次测量的多个指标）
  async createBatch(userId: string, dto: CreateBatchRecordDto) {
    await this.validateMemberOwnership(dto.memberId, userId);

    const records = await this.prisma.$transaction(
      dto.records.map((item) =>
        this.prisma.healthRecord.create({
          data: {
            memberId: dto.memberId,
            recordDate: new Date(dto.recordDate),
            recordType: item.recordType,
            value: new Prisma.Decimal(item.value),
            unit: item.unit,
            context: dto.context,
            isAbnormal: this.isValueAbnormal(item.recordType, item.value),
            notes: dto.notes,
            source: 'MANUAL',
          },
          include: {
            member: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        }),
      ),
    );

    // 同步更新成员身高体重
    for (const item of dto.records) {
      if (item.recordType === 'HEIGHT' || item.recordType === 'WEIGHT') {
        await this.prisma.familyMember.update({
          where: { id: dto.memberId },
          data: {
            [item.recordType.toLowerCase()]: new Prisma.Decimal(item.value),
          },
        });
      }
    }

    return records.map((r: RecordWithMember) => this.formatRecord(r));
  }

  // 获取记录列表
  async findAll(userId: string, query: QueryRecordDto) {
    // 获取用户的所有成员ID
    const members = await this.prisma.familyMember.findMany({
      where: { userId, deletedAt: null },
      select: { id: true },
    });
    const memberIds = members.map((m: { id: string }) => m.id);

    const where: Prisma.HealthRecordWhereInput = {
      memberId: query.memberId
        ? { equals: query.memberId, in: memberIds }
        : { in: memberIds },
    };

    if (query.recordType) {
      where.recordType = query.recordType;
    }

    if (query.startDate || query.endDate) {
      where.recordDate = {};
      if (query.startDate) {
        where.recordDate.gte = new Date(query.startDate);
      }
      if (query.endDate) {
        where.recordDate.lte = new Date(query.endDate + 'T23:59:59.999Z');
      }
    }

    const records = await this.prisma.healthRecord.findMany({
      where,
      include: {
        member: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: { recordDate: 'desc' },
    });

    return records.map((r: RecordWithMember) => this.formatRecord(r));
  }

  // 获取单条记录
  async findOne(userId: string, id: string) {
    const record = await this.prisma.healthRecord.findUnique({
      where: { id },
      include: {
        member: {
          select: {
            id: true,
            name: true,
            userId: true,
          },
        },
      },
    });

    if (!record) {
      throw new NotFoundException('记录不存在');
    }

    if (record.member.userId !== userId) {
      throw new ForbiddenException('无权查看此记录');
    }

    return this.formatRecord(record as unknown as RecordWithMember);
  }

  // 获取趋势数据
  async getTrend(userId: string, query: QueryTrendDto) {
    await this.validateMemberOwnership(query.memberId, userId);

    // 计算时间范围
    let startDate: Date | undefined;
    const now = new Date();

    switch (query.period) {
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case 'quarter':
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      case 'all':
      default:
        startDate = undefined;
    }

    const where: Prisma.HealthRecordWhereInput = {
      memberId: query.memberId,
      recordType: query.recordType,
    };

    if (startDate) {
      where.recordDate = { gte: startDate };
    }

    const records = await this.prisma.healthRecord.findMany({
      where,
      orderBy: { recordDate: 'asc' },
      select: {
        id: true,
        recordDate: true,
        value: true,
        unit: true,
        isAbnormal: true,
        context: true,
      },
    });

    const referenceRange = REFERENCE_RANGES[query.recordType];

    return {
      recordType: query.recordType,
      label: referenceRange?.label || query.recordType,
      unit: referenceRange?.unit || '',
      referenceRange: referenceRange
        ? { min: referenceRange.min, max: referenceRange.max }
        : null,
      data: records.map(
        (r: {
          id: string;
          recordDate: Date;
          value: Prisma.Decimal;
          isAbnormal: boolean;
          context: MeasurementContext;
        }) => ({
          id: r.id,
          date: r.recordDate.toISOString().split('T')[0],
          value: Number(r.value),
          isAbnormal: r.isAbnormal,
          context: r.context,
        }),
      ),
    };
  }

  // 删除记录
  async delete(userId: string, id: string) {
    const record = await this.prisma.healthRecord.findUnique({
      where: { id },
      include: {
        member: {
          select: { userId: true },
        },
      },
    });

    if (!record) {
      throw new NotFoundException('记录不存在');
    }

    if (record.member.userId !== userId) {
      throw new ForbiddenException('无权删除此记录');
    }

    await this.prisma.healthRecord.delete({
      where: { id },
    });

    return { message: '删除成功' };
  }

  // 格式化记录输出
  private formatRecord(record: RecordWithMember) {
    const referenceRange = REFERENCE_RANGES[record.recordType];
    return {
      id: record.id,
      memberId: record.memberId,
      recordDate: record.recordDate.toISOString(),
      recordType: record.recordType,
      recordTypeLabel: referenceRange?.label || record.recordType,
      value: Number(record.value),
      unit: record.unit,
      context: record.context,
      isAbnormal: record.isAbnormal,
      notes: record.notes,
      source: record.source,
      createdAt: record.createdAt.toISOString(),
      member: record.member,
      referenceRange: referenceRange
        ? { min: referenceRange.min, max: referenceRange.max }
        : null,
    };
  }
}
