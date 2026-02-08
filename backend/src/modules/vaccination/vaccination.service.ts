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
  SkipVaccineDto,
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
export type VaccineStatus = 'completed' | 'pending' | 'overdue' | 'skipped' | 'not_applicable';

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
  // 跳过相关
  skipId?: string;         // 跳过记录ID（用于取消跳过）
  seasonLabel?: string;    // 当前季节标签（用于跳过周期性疫苗）
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

    // 获取该成员所有跳过记录
    const skipRecords = await this.prisma.vaccineSkip.findMany({
      where: { memberId },
    });
    const skipsByVaccine = new Map<string, typeof skipRecords[0]>();
    for (const skip of skipRecords) {
      // 使用 vaccineCode + seasonLabel 作为 key
      skipsByVaccine.set(`${skip.vaccineCode}:${skip.seasonLabel}`, skip);
    }

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

    // 获取流感季节的起止日期
    // 流感季节：每年9月15日 - 次年9月14日
    const getFluSeasonRange = (date: Date): { start: Date; end: Date; label: string } => {
      const year = date.getFullYear();
      const month = date.getMonth(); // 0-11
      const day = date.getDate();

      // 9月15日之前属于上一个流感季（去年9月15日 - 今年9月14日）
      // 9月15日及之后属于当前流感季（今年9月15日 - 明年9月14日）
      if (month < 8 || (month === 8 && day < 15)) {
        // 属于上一个流感季
        return {
          start: new Date(year - 1, 8, 15), // 去年9月15日
          end: new Date(year, 8, 14),       // 今年9月14日
          label: `${year - 1}-${year}`,
        };
      } else {
        // 属于当前流感季
        return {
          start: new Date(year, 8, 15),     // 今年9月15日
          end: new Date(year + 1, 8, 14),   // 明年9月14日
          label: `${year}-${year + 1}`,
        };
      }
    };

    // 检查日期是否在指定范围内
    const isDateInRange = (date: Date, start: Date, end: Date): boolean => {
      return date >= start && date <= end;
    };

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
        let skipId: string | undefined;
        let seasonLabel: string | undefined;

        // 检查年龄是否适用
        const minAge = vaccine.minAgeYears ?? 0;
        const maxAge = vaccine.maxAgeYears ?? 150;

        if (ageYears < minAge || ageYears > maxAge) {
          status = 'not_applicable';
        } else if (vaccine.frequency === 'YEARLY') {
          // 周期性疫苗（如流感）：检查当前季节是否已接种
          const currentSeason = getFluSeasonRange(now);
          seasonLabel = currentSeason.label;
          const hasCurrentSeason = vaccineRecords.some((r) =>
            isDateInRange(new Date(r.vaccinatedAt), currentSeason.start, currentSeason.end),
          );

          // 检查是否有跳过记录
          const skipKey = `${vaccine.code}:${currentSeason.label}`;
          const skipRecord = skipsByVaccine.get(skipKey);

          if (hasCurrentSeason) {
            status = 'completed';
          } else if (skipRecord) {
            status = 'skipped';
            skipId = skipRecord.id;
          } else {
            status = 'pending';
            nextDoseNumber = 1;
          }
        } else if (completedDoses >= vaccine.totalDoses) {
          // 终身疫苗：完成所有剂次后标记为完成
          status = 'completed';
        } else {
          // 非周期性疫苗使用 "lifetime" 作为 seasonLabel
          seasonLabel = 'lifetime';

          // 检查是否有跳过记录
          const skipKey = `${vaccine.code}:lifetime`;
          const skipRecord = skipsByVaccine.get(skipKey);

          if (skipRecord) {
            status = 'skipped';
            skipId = skipRecord.id;
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
          skipId,
          seasonLabel,
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

  // 跳过疫苗
  async skipVaccine(familyId: string, dto: SkipVaccineDto) {
    // 验证成员属于该家庭
    const member = await this.prisma.familyMember.findFirst({
      where: { id: dto.memberId, familyId, deletedAt: null },
    });

    if (!member) {
      throw new NotFoundException('家庭成员不存在');
    }

    // 验证疫苗代码存在
    const vaccine = getVaccineByCode(dto.vaccineCode);
    if (!vaccine) {
      throw new NotFoundException('疫苗不存在');
    }

    try {
      return await this.prisma.vaccineSkip.create({
        data: {
          memberId: dto.memberId,
          vaccineCode: dto.vaccineCode,
          seasonLabel: dto.seasonLabel,
          reason: dto.reason,
        },
      });
    } catch (error: unknown) {
      if (
        error &&
        typeof error === 'object' &&
        'code' in error &&
        error.code === 'P2002'
      ) {
        throw new ConflictException('该疫苗已被跳过');
      }
      throw error;
    }
  }

  // 取消跳过疫苗
  async unskipVaccine(familyId: string, id: string) {
    // 查找跳过记录
    const skipRecord = await this.prisma.vaccineSkip.findFirst({
      where: {
        id,
        member: { familyId, deletedAt: null },
      },
    });

    if (!skipRecord) {
      throw new NotFoundException('跳过记录不存在');
    }

    await this.prisma.vaccineSkip.delete({
      where: { id },
    });

    return { success: true };
  }
}
