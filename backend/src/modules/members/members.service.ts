import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateMemberDto, UpdateMemberDto } from './dto';

@Injectable()
export class MembersService {
  constructor(private prisma: PrismaService) {}

  async findAll(familyId: string) {
    const members = await this.prisma.familyMember.findMany({
      where: {
        familyId,
        deletedAt: null,
      },
      orderBy: [
        { relationship: 'asc' },
        { createdAt: 'asc' },
      ],
      select: {
        id: true,
        name: true,
        relationship: true,
        gender: true,
        birthDate: true,
        avatar: true,
        bloodType: true,
        height: true,
        weight: true,
        userId: true,
        createdAt: true,
        _count: {
          select: {
            documents: { where: { deletedAt: null } },
            records: true,
          },
        },
      },
    });

    return members.map((member) => ({
      ...member,
      height: member.height ? Number(member.height) : null,
      weight: member.weight ? Number(member.weight) : null,
      documentCount: member._count.documents,
      recordCount: member._count.records,
      _count: undefined,
    }));
  }

  async findOne(id: string, familyId: string) {
    const member = await this.prisma.familyMember.findFirst({
      where: {
        id,
        familyId,
        deletedAt: null,
      },
      select: {
        id: true,
        name: true,
        relationship: true,
        gender: true,
        birthDate: true,
        avatar: true,
        bloodType: true,
        height: true,
        weight: true,
        userId: true,
        chronicDiseases: true,
        allergies: true,
        notes: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            documents: { where: { deletedAt: null } },
            records: true,
            advices: true,
          },
        },
      },
    });

    if (!member) {
      throw new NotFoundException('家庭成员不存在');
    }

    return {
      ...member,
      height: member.height ? Number(member.height) : null,
      weight: member.weight ? Number(member.weight) : null,
      documentCount: member._count.documents,
      recordCount: member._count.records,
      adviceCount: member._count.advices,
      _count: undefined,
    };
  }

  async create(familyId: string, dto: CreateMemberDto, userId?: string) {
    // 如果关系是"本人"，检查是否已存在
    if (dto.relationship === 'SELF') {
      const existingSelf = await this.prisma.familyMember.findFirst({
        where: {
          familyId,
          relationship: 'SELF',
          deletedAt: null,
        },
      });

      if (existingSelf) {
        throw new ConflictException('已存在"本人"档案，不能重复创建');
      }
    }

    // 如果需要关联当前用户，检查该用户是否已关联其他成员
    if (dto.linkToCurrentUser && userId) {
      const existingLink = await this.prisma.familyMember.findUnique({
        where: { userId },
      });
      if (existingLink) {
        throw new ConflictException('您已关联到其他家庭成员，请先解除关联');
      }
    }

    const data: Prisma.FamilyMemberCreateInput = {
      family: { connect: { id: familyId } },
      name: dto.name,
      relationship: dto.relationship,
      gender: dto.gender,
      birthDate: new Date(dto.birthDate),
      avatar: dto.avatar,
      bloodType: dto.bloodType,
      height: dto.height,
      weight: dto.weight,
      chronicDiseases: dto.chronicDiseases || [],
      allergies: dto.allergies,
      notes: dto.notes,
      ...(dto.linkToCurrentUser && userId
        ? { user: { connect: { id: userId } } }
        : {}),
    };

    const member = await this.prisma.familyMember.create({
      data,
      select: {
        id: true,
        name: true,
        relationship: true,
        gender: true,
        birthDate: true,
        avatar: true,
        bloodType: true,
        height: true,
        weight: true,
        userId: true,
        chronicDiseases: true,
        allergies: true,
        notes: true,
        createdAt: true,
      },
    });

    return {
      ...member,
      height: member.height ? Number(member.height) : null,
      weight: member.weight ? Number(member.weight) : null,
    };
  }

  async update(id: string, familyId: string, dto: UpdateMemberDto) {
    // 验证成员存在且属于当前家庭
    const existingMember = await this.prisma.familyMember.findFirst({
      where: {
        id,
        familyId,
        deletedAt: null,
      },
    });

    if (!existingMember) {
      throw new NotFoundException('家庭成员不存在');
    }

    // 如果要修改关系为"本人"，检查是否已存在其他"本人"
    if (dto.relationship === 'SELF' && existingMember.relationship !== 'SELF') {
      const existingSelf = await this.prisma.familyMember.findFirst({
        where: {
          familyId,
          relationship: 'SELF',
          deletedAt: null,
          id: { not: id },
        },
      });

      if (existingSelf) {
        throw new ConflictException('已存在"本人"档案');
      }
    }

    const updateData: Prisma.FamilyMemberUpdateInput = {};

    if (dto.name !== undefined) updateData.name = dto.name;
    if (dto.relationship !== undefined) updateData.relationship = dto.relationship;
    if (dto.gender !== undefined) updateData.gender = dto.gender;
    if (dto.birthDate !== undefined) updateData.birthDate = new Date(dto.birthDate);
    if (dto.avatar !== undefined) updateData.avatar = dto.avatar;
    if (dto.bloodType !== undefined) updateData.bloodType = dto.bloodType;
    if (dto.height !== undefined) updateData.height = dto.height;
    if (dto.weight !== undefined) updateData.weight = dto.weight;
    if (dto.chronicDiseases !== undefined) updateData.chronicDiseases = dto.chronicDiseases;
    if (dto.allergies !== undefined) updateData.allergies = dto.allergies;
    if (dto.notes !== undefined) updateData.notes = dto.notes;

    const member = await this.prisma.familyMember.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        name: true,
        relationship: true,
        gender: true,
        birthDate: true,
        avatar: true,
        bloodType: true,
        height: true,
        weight: true,
        chronicDiseases: true,
        allergies: true,
        notes: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return {
      ...member,
      height: member.height ? Number(member.height) : null,
      weight: member.weight ? Number(member.weight) : null,
    };
  }

  async remove(id: string, familyId: string) {
    // 验证成员存在且属于当前家庭
    const existingMember = await this.prisma.familyMember.findFirst({
      where: {
        id,
        familyId,
        deletedAt: null,
      },
    });

    if (!existingMember) {
      throw new NotFoundException('家庭成员不存在');
    }

    // 软删除，同时清除 userId 避免唯一约束冲突
    await this.prisma.familyMember.update({
      where: { id },
      data: { deletedAt: new Date(), userId: null },
    });

    return { message: '删除成功' };
  }

  async linkToUser(memberId: string, userId: string, familyId: string) {
    // 验证成员属于当前家庭
    const member = await this.prisma.familyMember.findFirst({
      where: { id: memberId, familyId, deletedAt: null },
    });
    if (!member) {
      throw new NotFoundException('家庭成员不存在');
    }

    // 检查该成员是否已关联其他用户
    if (member.userId) {
      throw new ConflictException('该成员已关联到其他用户');
    }

    // 检查当前用户是否已关联其他成员
    const existingLink = await this.prisma.familyMember.findUnique({
      where: { userId },
    });
    if (existingLink) {
      throw new ConflictException('您已关联到其他家庭成员，请先解除关联');
    }

    await this.prisma.familyMember.update({
      where: { id: memberId },
      data: { userId },
    });

    return { message: '关联成功' };
  }

  async unlinkFromUser(userId: string, familyId: string) {
    const member = await this.prisma.familyMember.findUnique({
      where: { userId },
    });

    if (!member || member.familyId !== familyId) {
      throw new NotFoundException('未找到关联的家庭成员');
    }

    await this.prisma.familyMember.update({
      where: { id: member.id },
      data: { userId: null },
    });

    return { message: '已解除关联' };
  }

  async getMyMember(userId: string, familyId: string) {
    const member = await this.prisma.familyMember.findUnique({
      where: { userId },
      select: {
        id: true,
        name: true,
        relationship: true,
        gender: true,
        birthDate: true,
        avatar: true,
        bloodType: true,
        height: true,
        weight: true,
        userId: true,
        createdAt: true,
      },
    });

    if (!member || member.userId !== userId) {
      return null;
    }

    // 验证成员属于当前家庭（通过 familyId 查询确认）
    const verified = await this.prisma.familyMember.findFirst({
      where: { id: member.id, familyId, deletedAt: null },
    });
    if (!verified) {
      return null;
    }

    return {
      ...member,
      height: member.height ? Number(member.height) : null,
      weight: member.weight ? Number(member.weight) : null,
    };
  }

  async validateOwnership(memberId: string, familyId: string): Promise<boolean> {
    const member = await this.prisma.familyMember.findFirst({
      where: {
        id: memberId,
        familyId,
        deletedAt: null,
      },
    });

    if (!member) {
      throw new ForbiddenException('无权访问该家庭成员');
    }

    return true;
  }

  async getStats(familyId: string) {
    const [memberCount, documentCount, recordCount, adviceCount] = await Promise.all([
      this.prisma.familyMember.count({
        where: { familyId, deletedAt: null },
      }),
      this.prisma.document.count({
        where: {
          member: { familyId, deletedAt: null },
          deletedAt: null,
        },
      }),
      this.prisma.healthRecord.count({
        where: {
          member: { familyId, deletedAt: null },
        },
      }),
      this.prisma.healthAdvice.count({
        where: {
          member: { familyId, deletedAt: null },
        },
      }),
    ]);

    return {
      memberCount,
      documentCount,
      recordCount,
      adviceCount,
    };
  }
}
