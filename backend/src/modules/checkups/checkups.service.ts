import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateCheckItemDto, UpdateCheckItemDto, CreateCheckRecordDto } from './dto';
import { CHECK_TEMPLATES } from './check-templates';

// 检查项目状态
export type CheckItemStatus = 'pending' | 'completed' | 'skipped';

export interface CheckItemWithStatus {
  id: string;
  name: string;
  intervalMonths: number;
  description: string | null;
  isActive: boolean;
  skippedUntil: Date | null;
  status: CheckItemStatus;
  lastCheckDate: Date | null;
  nextDueDate: Date | null;
  overdueDays: number;
  records: Array<{
    id: string;
    checkDate: Date;
    location: string | null;
    doctor: string | null;
    findings: string | null;
    notes: string | null;
  }>;
}

@Injectable()
export class CheckupsService {
  constructor(private readonly prisma: PrismaService) {}

  // 获取预定义模板
  getTemplates() {
    return CHECK_TEMPLATES;
  }

  // 创建检查项目
  async createItem(familyId: string, dto: CreateCheckItemDto) {
    const member = await this.prisma.familyMember.findFirst({
      where: { id: dto.memberId, familyId, deletedAt: null },
    });

    if (!member) {
      throw new NotFoundException('家庭成员不存在');
    }

    return this.prisma.periodicCheckItem.create({
      data: {
        memberId: dto.memberId,
        name: dto.name,
        intervalMonths: dto.intervalMonths,
        description: dto.description,
      },
    });
  }

  // 更新检查项目
  async updateItem(familyId: string, id: string, dto: UpdateCheckItemDto) {
    const item = await this.findItemWithAuth(familyId, id);

    return this.prisma.periodicCheckItem.update({
      where: { id: item.id },
      data: {
        name: dto.name,
        intervalMonths: dto.intervalMonths,
        description: dto.description,
      },
    });
  }

  // 删除检查项目
  async deleteItem(familyId: string, id: string) {
    const item = await this.findItemWithAuth(familyId, id);

    await this.prisma.periodicCheckItem.delete({
      where: { id: item.id },
    });

    return { success: true };
  }

  // 获取成员的检查项目列表（含状态计算）
  async getItemsByMember(familyId: string, memberId: string): Promise<CheckItemWithStatus[]> {
    const member = await this.prisma.familyMember.findFirst({
      where: { id: memberId, familyId, deletedAt: null },
    });

    if (!member) {
      throw new NotFoundException('家庭成员不存在');
    }

    const items = await this.prisma.periodicCheckItem.findMany({
      where: { memberId, isActive: true },
      include: {
        records: {
          orderBy: { checkDate: 'desc' },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    return items.map((item) => {
      const lastRecord = item.records[0] || null;
      const lastCheckDate = lastRecord ? new Date(lastRecord.checkDate) : null;

      let status: CheckItemStatus;
      let nextDueDate: Date | null = null;
      let overdueDays = 0;

      // 跳过判断
      if (item.skippedUntil && new Date(item.skippedUntil) > today) {
        status = 'skipped';
        nextDueDate = new Date(item.skippedUntil);
      } else if (lastCheckDate) {
        // 计算下次应检查日期
        nextDueDate = new Date(lastCheckDate);
        nextDueDate.setMonth(nextDueDate.getMonth() + item.intervalMonths);

        if (nextDueDate > today) {
          status = 'completed';
        } else {
          status = 'pending';
          overdueDays = Math.floor((today.getTime() - nextDueDate.getTime()) / (1000 * 60 * 60 * 24));
        }
      } else {
        // 无记录 → 待检查
        status = 'pending';
      }

      return {
        id: item.id,
        name: item.name,
        intervalMonths: item.intervalMonths,
        description: item.description,
        isActive: item.isActive,
        skippedUntil: item.skippedUntil,
        status,
        lastCheckDate,
        nextDueDate,
        overdueDays,
        records: item.records.map((r) => ({
          id: r.id,
          checkDate: r.checkDate,
          location: r.location,
          doctor: r.doctor,
          findings: r.findings,
          notes: r.notes,
        })),
      };
    });
  }

  // 获取家庭概览（待检查数）
  async getSummary(familyId: string) {
    const members = await this.prisma.familyMember.findMany({
      where: { familyId, deletedAt: null },
      select: { id: true, name: true },
    });

    const memberSummaries: Array<{
      memberId: string;
      memberName: string;
      pendingCount: number;
    }> = [];

    let totalPending = 0;

    for (const member of members) {
      const items = await this.getItemsByMember(familyId, member.id);
      const pendingCount = items.filter((i) => i.status === 'pending').length;
      totalPending += pendingCount;

      memberSummaries.push({
        memberId: member.id,
        memberName: member.name,
        pendingCount,
      });
    }

    return {
      totalMembers: members.length,
      totalPending,
      members: memberSummaries,
    };
  }

  // 跳过当前周期
  async skipItem(familyId: string, id: string) {
    const item = await this.findItemWithAuth(familyId, id);

    // 跳过到下一个周期：从今天起算，跳过 intervalMonths 个月
    const skipUntil = new Date();
    skipUntil.setMonth(skipUntil.getMonth() + item.intervalMonths);

    return this.prisma.periodicCheckItem.update({
      where: { id: item.id },
      data: { skippedUntil: skipUntil },
    });
  }

  // 取消跳过
  async unskipItem(familyId: string, id: string) {
    const item = await this.findItemWithAuth(familyId, id);

    return this.prisma.periodicCheckItem.update({
      where: { id: item.id },
      data: { skippedUntil: null },
    });
  }

  // 添加完成记录
  async addRecord(familyId: string, itemId: string, dto: CreateCheckRecordDto) {
    const item = await this.findItemWithAuth(familyId, itemId);

    // 添加记录的同时清除 skippedUntil
    const [record] = await this.prisma.$transaction([
      this.prisma.periodicCheckRecord.create({
        data: {
          itemId: item.id,
          checkDate: new Date(dto.checkDate),
          location: dto.location,
          doctor: dto.doctor,
          findings: dto.findings,
          notes: dto.notes,
        },
      }),
      this.prisma.periodicCheckItem.update({
        where: { id: item.id },
        data: { skippedUntil: null },
      }),
    ]);

    return record;
  }

  // 删除完成记录
  async deleteRecord(familyId: string, recordId: string) {
    const record = await this.prisma.periodicCheckRecord.findFirst({
      where: { id: recordId },
      include: {
        item: {
          include: {
            member: { select: { familyId: true } },
          },
        },
      },
    });

    if (!record || record.item.member.familyId !== familyId) {
      throw new NotFoundException('记录不存在');
    }

    await this.prisma.periodicCheckRecord.delete({
      where: { id: recordId },
    });

    return { success: true };
  }

  // 私有方法：查找检查项目并验证权限
  private async findItemWithAuth(familyId: string, itemId: string) {
    const item = await this.prisma.periodicCheckItem.findFirst({
      where: { id: itemId },
      include: {
        member: { select: { familyId: true } },
      },
    });

    if (!item) {
      throw new NotFoundException('检查项目不存在');
    }

    if (item.member.familyId !== familyId) {
      throw new ForbiddenException('无权操作该检查项目');
    }

    return item;
  }
}
