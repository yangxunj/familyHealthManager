import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import {
  CreateVaccineRecordDto,
  UpdateVaccineRecordDto,
  QueryVaccineRecordDto,
} from './dto';
import {
  ALL_VACCINES,
  CHILD_VACCINES,
  ADULT_VACCINES,
  ELDERLY_VACCINES,
  getVaccineByCode,
  type VaccineDefinition,
} from './vaccine-definitions';

// 接种状态
export type VaccineStatus = 'completed' | 'pending' | 'overdue' | 'not_applicable';

// 推荐疫苗条目
export interface RecommendedVaccine {
  vaccine: VaccineDefinition;
  status: VaccineStatus;
  completedDoses: number;
  nextDoseNumber?: number;
  lastVaccinatedAt?: Date;
  records: Array<{
    id: string;
    doseNumber: number;
    vaccinatedAt: Date;
  }>;
}

// 接种计划
export interface VaccineSchedule {
  memberId: string;
  memberName: string;
  ageYears: number;
  ageMonths: number;
  childVaccines: RecommendedVaccine[];
  adultVaccines: RecommendedVaccine[];
  elderlyVaccines: RecommendedVaccine[];
  customRecords: Array<{
    id: string;
    vaccineName: string;
    doseNumber: number;
    totalDoses: number | null;
    vaccinatedAt: Date;
  }>;
}

@Injectable()
export class VaccinationService {
  constructor(private readonly prisma: PrismaService) {}

  // 创建接种记录
  async create(familyId: string, dto: CreateVaccineRecordDto) {
    // 验证成员属于该家庭
    const member = await this.prisma.familyMember.findFirst({
      where: { id: dto.memberId, familyId, deletedAt: null },
    });

    if (!member) {
      throw new NotFoundException('家庭成员不存在');
    }

    // 如果提供了疫苗代码，验证并自动填充信息
    let totalDoses = dto.totalDoses;
    if (dto.vaccineCode) {
      const vaccine = getVaccineByCode(dto.vaccineCode);
      if (vaccine) {
        totalDoses = vaccine.totalDoses;
      }
    }

    try {
      return await this.prisma.vaccineRecord.create({
        data: {
          memberId: dto.memberId,
          vaccineCode: dto.vaccineCode,
          vaccineName: dto.vaccineName,
          doseNumber: dto.doseNumber ?? 1,
          totalDoses,
          vaccinatedAt: new Date(dto.vaccinatedAt),
          location: dto.location,
          manufacturer: dto.manufacturer,
          batchNumber: dto.batchNumber,
          notes: dto.notes,
        },
        include: {
          member: {
            select: { id: true, name: true },
          },
        },
      });
    } catch (error: unknown) {
      if (
        error &&
        typeof error === 'object' &&
        'code' in error &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(
          `该成员已存在${dto.vaccineName}第${dto.doseNumber ?? 1}剂的接种记录`,
        );
      }
      throw error;
    }
  }

  // 获取接种记录列表
  async findAll(familyId: string, query: QueryVaccineRecordDto) {
    const where: Record<string, unknown> = {
      member: { familyId, deletedAt: null },
    };

    if (query.memberId) {
      where.memberId = query.memberId;
    }

    return this.prisma.vaccineRecord.findMany({
      where,
      include: {
        member: {
          select: { id: true, name: true },
        },
      },
      orderBy: [{ vaccinatedAt: 'desc' }, { createdAt: 'desc' }],
    });
  }

  // 获取单个记录
  async findOne(familyId: string, id: string) {
    const record = await this.prisma.vaccineRecord.findFirst({
      where: {
        id,
        member: { familyId, deletedAt: null },
      },
      include: {
        member: {
          select: { id: true, name: true },
        },
      },
    });

    if (!record) {
      throw new NotFoundException('接种记录不存在');
    }

    return record;
  }

  // 更新接种记录
  async update(familyId: string, id: string, dto: UpdateVaccineRecordDto) {
    const record = await this.findOne(familyId, id);

    try {
      return await this.prisma.vaccineRecord.update({
        where: { id: record.id },
        data: {
          vaccineCode: dto.vaccineCode,
          vaccineName: dto.vaccineName,
          doseNumber: dto.doseNumber,
          totalDoses: dto.totalDoses,
          vaccinatedAt: dto.vaccinatedAt
            ? new Date(dto.vaccinatedAt)
            : undefined,
          location: dto.location,
          manufacturer: dto.manufacturer,
          batchNumber: dto.batchNumber,
          notes: dto.notes,
        },
        include: {
          member: {
            select: { id: true, name: true },
          },
        },
      });
    } catch (error: unknown) {
      if (
        error &&
        typeof error === 'object' &&
        'code' in error &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(
          `该成员已存在${dto.vaccineName}第${dto.doseNumber}剂的接种记录`,
        );
      }
      throw error;
    }
  }

  // 删除接种记录
  async remove(familyId: string, id: string) {
    const record = await this.findOne(familyId, id);

    await this.prisma.vaccineRecord.delete({
      where: { id: record.id },
    });

    return { success: true };
  }

  // 获取成员的接种计划（含推荐疫苗和已接种记录）
  async getSchedule(familyId: string, memberId: string): Promise<VaccineSchedule> {
    // 获取成员信息
    const member = await this.prisma.familyMember.findFirst({
      where: { id: memberId, familyId, deletedAt: null },
    });

    if (!member) {
      throw new NotFoundException('家庭成员不存在');
    }

    // 计算年龄
    const now = new Date();
    const birth = new Date(member.birthDate);
    const ageMs = now.getTime() - birth.getTime();
    const ageMonths = Math.floor(ageMs / (1000 * 60 * 60 * 24 * 30.44));
    const ageYears = Math.floor(ageMonths / 12);

    // 获取该成员所有接种记录
    const records = await this.prisma.vaccineRecord.findMany({
      where: { memberId },
      orderBy: { vaccinatedAt: 'asc' },
    });

    // 按疫苗代码/名称分组
    const recordsByVaccine = new Map<string, typeof records>();
    const customRecords: VaccineSchedule['customRecords'] = [];

    for (const record of records) {
      const key = record.vaccineCode || record.vaccineName;
      const vaccine = record.vaccineCode
        ? getVaccineByCode(record.vaccineCode)
        : null;

      if (vaccine) {
        if (!recordsByVaccine.has(key)) {
          recordsByVaccine.set(key, []);
        }
        recordsByVaccine.get(key)!.push(record);
      } else {
        // 自定义疫苗
        customRecords.push({
          id: record.id,
          vaccineName: record.vaccineName,
          doseNumber: record.doseNumber,
          totalDoses: record.totalDoses,
          vaccinatedAt: record.vaccinatedAt,
        });
      }
    }

    // 计算各类疫苗的接种状态
    const calculateVaccineStatus = (
      vaccines: VaccineDefinition[],
    ): RecommendedVaccine[] => {
      return vaccines.map((vaccine) => {
        const vaccineRecords = recordsByVaccine.get(vaccine.code) || [];
        const completedDoses = vaccineRecords.length;
        const lastRecord = vaccineRecords[vaccineRecords.length - 1];

        let status: VaccineStatus;
        let nextDoseNumber: number | undefined;

        // 检查年龄是否适用
        const minAge = vaccine.minAgeYears ?? 0;
        const maxAge = vaccine.maxAgeYears ?? 150;

        if (ageYears < minAge || ageYears > maxAge) {
          status = 'not_applicable';
        } else if (completedDoses >= vaccine.totalDoses) {
          // 对于年度疫苗，检查今年是否已接种
          if (vaccine.frequency === 'YEARLY') {
            const currentYear = now.getFullYear();
            const hasThisYear = vaccineRecords.some(
              (r) => new Date(r.vaccinatedAt).getFullYear() === currentYear,
            );
            status = hasThisYear ? 'completed' : 'pending';
            if (!hasThisYear) {
              nextDoseNumber = 1;
            }
          } else {
            status = 'completed';
          }
        } else {
          // 检查是否逾期（简化逻辑：儿童疫苗超过推荐月龄12个月视为逾期）
          if (vaccine.scheduleMonths && vaccine.category === 'CHILD') {
            const nextScheduleMonth =
              vaccine.scheduleMonths[completedDoses] ?? 0;
            if (ageMonths > nextScheduleMonth + 12) {
              status = 'overdue';
            } else {
              status = 'pending';
            }
          } else {
            status = 'pending';
          }
          nextDoseNumber = completedDoses + 1;
        }

        return {
          vaccine,
          status,
          completedDoses,
          nextDoseNumber,
          lastVaccinatedAt: lastRecord?.vaccinatedAt,
          records: vaccineRecords.map((r) => ({
            id: r.id,
            doseNumber: r.doseNumber,
            vaccinatedAt: r.vaccinatedAt,
          })),
        };
      });
    };

    // 根据年龄筛选适用的疫苗
    const childVaccines =
      ageYears <= 7 ? calculateVaccineStatus(CHILD_VACCINES) : [];
    const adultVaccines =
      ageYears >= 6 ? calculateVaccineStatus(ADULT_VACCINES) : [];
    const elderlyVaccines =
      ageYears >= 50 ? calculateVaccineStatus(ELDERLY_VACCINES) : [];

    return {
      memberId: member.id,
      memberName: member.name,
      ageYears,
      ageMonths,
      childVaccines,
      adultVaccines,
      elderlyVaccines,
      customRecords,
    };
  }

  // 获取家庭疫苗接种概览
  async getSummary(familyId: string) {
    // 获取所有家庭成员
    const members = await this.prisma.familyMember.findMany({
      where: { familyId, deletedAt: null },
      select: { id: true, name: true, birthDate: true },
    });

    // 获取所有接种记录
    const records = await this.prisma.vaccineRecord.findMany({
      where: { member: { familyId, deletedAt: null } },
    });

    // 统计待接种和逾期
    const pendingList: Array<{
      memberId: string;
      memberName: string;
      vaccineName: string;
      status: 'pending' | 'overdue';
      description?: string;
    }> = [];

    for (const member of members) {
      const schedule = await this.getSchedule(familyId, member.id);

      const allVaccines = [
        ...schedule.childVaccines,
        ...schedule.adultVaccines,
        ...schedule.elderlyVaccines,
      ];

      for (const item of allVaccines) {
        if (item.status === 'pending' || item.status === 'overdue') {
          pendingList.push({
            memberId: member.id,
            memberName: member.name,
            vaccineName: item.vaccine.name,
            status: item.status,
            description: item.vaccine.description,
          });
        }
      }
    }

    return {
      totalMembers: members.length,
      totalRecords: records.length,
      pendingCount: pendingList.filter((p) => p.status === 'pending').length,
      overdueCount: pendingList.filter((p) => p.status === 'overdue').length,
      pendingList,
    };
  }

  // 获取疫苗定义列表（供前端使用）
  getVaccineDefinitions() {
    return {
      child: CHILD_VACCINES,
      adult: ADULT_VACCINES,
      elderly: ELDERLY_VACCINES,
      all: ALL_VACCINES,
    };
  }
}
