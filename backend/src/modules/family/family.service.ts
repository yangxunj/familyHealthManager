import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateFamilyDto, JoinFamilyDto, UpdateFamilyDto } from './dto';

@Injectable()
export class FamilyService {
  constructor(private prisma: PrismaService) {}

  // 生成随机邀请码
  private generateInviteCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }

  // 创建家庭
  async create(userId: string, dto: CreateFamilyDto) {
    // 检查用户是否已经属于某个家庭
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { familyId: true },
    });

    if (user?.familyId) {
      throw new ConflictException('您已经属于一个家庭，请先离开当前家庭');
    }

    // 生成唯一的邀请码
    let inviteCode: string;
    let attempts = 0;
    do {
      inviteCode = this.generateInviteCode();
      const existing = await this.prisma.family.findUnique({
        where: { inviteCode },
      });
      if (!existing) break;
      attempts++;
    } while (attempts < 10);

    if (attempts >= 10) {
      throw new BadRequestException('生成邀请码失败，请重试');
    }

    // 创建家庭并关联用户
    const family = await this.prisma.family.create({
      data: {
        name: dto.name,
        inviteCode,
        users: {
          connect: { id: userId },
        },
      },
      include: {
        _count: {
          select: {
            users: true,
            members: { where: { deletedAt: null } },
          },
        },
      },
    });

    // 更新用户为家庭创建者
    await this.prisma.user.update({
      where: { id: userId },
      data: { isOwner: true },
    });

    return {
      id: family.id,
      name: family.name,
      inviteCode: family.inviteCode,
      userCount: family._count.users,
      memberCount: family._count.members,
      isOwner: true,
      createdAt: family.createdAt.toISOString(),
    };
  }

  // 通过邀请码加入家庭
  async join(userId: string, dto: JoinFamilyDto) {
    // 检查用户是否已经属于某个家庭
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { familyId: true },
    });

    if (user?.familyId) {
      throw new ConflictException('您已经属于一个家庭，请先离开当前家庭');
    }

    // 查找家庭
    const family = await this.prisma.family.findUnique({
      where: { inviteCode: dto.inviteCode.toUpperCase() },
      include: {
        _count: {
          select: {
            users: true,
            members: { where: { deletedAt: null } },
          },
        },
      },
    });

    if (!family) {
      throw new NotFoundException('邀请码无效');
    }

    // 加入家庭
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        familyId: family.id,
        isOwner: false,
      },
    });

    return {
      id: family.id,
      name: family.name,
      inviteCode: family.inviteCode,
      userCount: family._count.users + 1,
      memberCount: family._count.members,
      isOwner: false,
      createdAt: family.createdAt.toISOString(),
    };
  }

  // 获取家庭信息
  async findOne(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        familyId: true,
        isOwner: true,
        family: {
          include: {
            users: {
              select: {
                id: true,
                name: true,
                email: true,
                isOwner: true,
                createdAt: true,
              },
            },
            _count: {
              select: {
                members: { where: { deletedAt: null } },
              },
            },
          },
        },
      },
    });

    if (!user?.family) {
      return null;
    }

    return {
      id: user.family.id,
      name: user.family.name,
      inviteCode: user.family.inviteCode,
      userCount: user.family.users.length,
      memberCount: user.family._count.members,
      isOwner: user.isOwner,
      users: user.family.users.map((u) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        isOwner: u.isOwner,
        joinedAt: u.createdAt.toISOString(),
      })),
      createdAt: user.family.createdAt.toISOString(),
    };
  }

  // 更新家庭信息
  async update(userId: string, dto: UpdateFamilyDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { familyId: true, isOwner: true },
    });

    if (!user?.familyId) {
      throw new ForbiddenException('您还没有加入任何家庭');
    }

    if (!user.isOwner) {
      throw new ForbiddenException('只有家庭创建者可以修改家庭信息');
    }

    const family = await this.prisma.family.update({
      where: { id: user.familyId },
      data: {
        name: dto.name,
      },
      include: {
        _count: {
          select: {
            users: true,
            members: { where: { deletedAt: null } },
          },
        },
      },
    });

    return {
      id: family.id,
      name: family.name,
      inviteCode: family.inviteCode,
      userCount: family._count.users,
      memberCount: family._count.members,
      isOwner: true,
      createdAt: family.createdAt.toISOString(),
    };
  }

  // 重新生成邀请码
  async regenerateInviteCode(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { familyId: true, isOwner: true },
    });

    if (!user?.familyId) {
      throw new ForbiddenException('您还没有加入任何家庭');
    }

    if (!user.isOwner) {
      throw new ForbiddenException('只有家庭创建者可以重新生成邀请码');
    }

    // 生成新的邀请码
    let inviteCode: string;
    let attempts = 0;
    do {
      inviteCode = this.generateInviteCode();
      const existing = await this.prisma.family.findUnique({
        where: { inviteCode },
      });
      if (!existing) break;
      attempts++;
    } while (attempts < 10);

    if (attempts >= 10) {
      throw new BadRequestException('生成邀请码失败，请重试');
    }

    await this.prisma.family.update({
      where: { id: user.familyId },
      data: { inviteCode },
    });

    return { inviteCode };
  }

  // 离开家庭
  async leave(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        familyId: true,
        isOwner: true,
        family: {
          include: {
            users: { select: { id: true } },
          },
        },
      },
    });

    if (!user?.familyId) {
      throw new ForbiddenException('您还没有加入任何家庭');
    }

    // 如果是创建者且家庭中还有其他成员，不能离开
    if (user.isOwner && user.family && user.family.users.length > 1) {
      throw new ForbiddenException(
        '作为家庭创建者，请先将其他成员移出家庭或转让所有权后再离开',
      );
    }

    // 清除用户与家庭成员的关联
    await this.prisma.familyMember.updateMany({
      where: { userId, familyId: user.familyId },
      data: { userId: null },
    });

    // 清除该用户的可见性配置（作为被配置方和被引用方）
    await this.prisma.memberVisibility.deleteMany({
      where: { userId },
    });

    // 离开家庭
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        familyId: null,
        isOwner: false,
        memberVisibilityConfigured: false,
      },
    });

    // 如果是最后一个成员，删除家庭
    if (user.family && user.family.users.length === 1) {
      // 先软删除相关数据
      await this.prisma.familyMember.updateMany({
        where: { familyId: user.familyId },
        data: { deletedAt: new Date() },
      });
      await this.prisma.document.updateMany({
        where: { member: { familyId: user.familyId } },
        data: { deletedAt: new Date() },
      });
      // 删除家庭
      await this.prisma.family.delete({
        where: { id: user.familyId },
      });
    }

    return { message: '已成功离开家庭' };
  }

  // 管理员：获取所有家庭的概览统计
  async getAdminOverview() {
    const families = await this.prisma.family.findMany({
      include: {
        users: {
          where: { isOwner: true },
          select: { email: true, name: true },
        },
        _count: {
          select: {
            members: { where: { deletedAt: null } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const result = await Promise.all(
      families.map(async (family) => {
        const [documentCount, recordCount, adviceCount] = await Promise.all([
          this.prisma.document.count({
            where: { member: { familyId: family.id, deletedAt: null }, deletedAt: null },
          }),
          this.prisma.healthRecord.count({
            where: { member: { familyId: family.id, deletedAt: null } },
          }),
          this.prisma.healthAdvice.count({
            where: { member: { familyId: family.id, deletedAt: null } },
          }),
        ]);

        const creator = family.users[0];
        return {
          familyId: family.id,
          familyName: family.name,
          creatorEmail: creator?.email || '未知',
          creatorName: creator?.name || '未知',
          memberCount: family._count.members,
          documentCount,
          recordCount,
          adviceCount,
          createdAt: family.createdAt.toISOString(),
        };
      }),
    );

    return { families: result };
  }

  // 获取可见性配置（管理员用）
  async getVisibilityConfig(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { familyId: true, isOwner: true },
    });

    if (!user?.familyId) {
      throw new ForbiddenException('您还没有加入任何家庭');
    }
    if (!user.isOwner) {
      throw new ForbiddenException('只有家庭管理员可以查看可见性配置');
    }

    // 查询家庭所有用户及其可见性配置
    const familyUsers = await this.prisma.user.findMany({
      where: { familyId: user.familyId },
      select: {
        id: true,
        name: true,
        email: true,
        isOwner: true,
        memberVisibilityConfigured: true,
        linkedMember: { select: { id: true } },
      },
    });

    // 查询所有可见性记录
    const allVisibility = await this.prisma.memberVisibility.findMany({
      where: { userId: { in: familyUsers.map((u) => u.id) } },
    });

    // 查询家庭所有成员
    const members = await this.prisma.familyMember.findMany({
      where: { familyId: user.familyId, deletedAt: null },
      select: { id: true, name: true, relationship: true, userId: true },
      orderBy: [{ relationship: 'asc' }, { createdAt: 'asc' }],
    });

    return {
      users: familyUsers.map((u) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        isOwner: u.isOwner,
        memberVisibilityConfigured: u.memberVisibilityConfigured,
        linkedMemberId: u.linkedMember?.id || null,
        visibleMemberIds: allVisibility
          .filter((v) => v.userId === u.id)
          .map((v) => v.memberId),
      })),
      members: members.map((m) => ({
        id: m.id,
        name: m.name,
        relationship: m.relationship,
        userId: m.userId,
      })),
    };
  }

  // 设置某用户的可见性配置（管理员用）
  async setVisibility(
    adminUserId: string,
    targetUserId: string,
    dto: { memberVisibilityConfigured: boolean; visibleMemberIds: string[] },
  ) {
    const admin = await this.prisma.user.findUnique({
      where: { id: adminUserId },
      select: { familyId: true, isOwner: true },
    });

    if (!admin?.familyId) {
      throw new ForbiddenException('您还没有加入任何家庭');
    }
    if (!admin.isOwner) {
      throw new ForbiddenException('只有家庭管理员可以配置可见性');
    }

    const targetUser = await this.prisma.user.findUnique({
      where: { id: targetUserId },
      select: { familyId: true },
    });

    if (!targetUser || targetUser.familyId !== admin.familyId) {
      throw new NotFoundException('该用户不在您的家庭中');
    }

    // 确保用户的 linkedMember 始终在可见列表中
    const linkedMember = await this.prisma.familyMember.findUnique({
      where: { userId: targetUserId },
      select: { id: true },
    });

    let visibleIds = [...dto.visibleMemberIds];
    if (linkedMember && !visibleIds.includes(linkedMember.id)) {
      visibleIds.push(linkedMember.id);
    }

    // 事务：更新 flag + 删旧记录 + 创建新记录
    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: targetUserId },
        data: { memberVisibilityConfigured: dto.memberVisibilityConfigured },
      });

      await tx.memberVisibility.deleteMany({
        where: { userId: targetUserId },
      });

      if (dto.memberVisibilityConfigured && visibleIds.length > 0) {
        await tx.memberVisibility.createMany({
          data: visibleIds.map((memberId) => ({
            userId: targetUserId,
            memberId,
          })),
        });
      }
    });

    return { message: '可见性配置已更新' };
  }

  // 移除家庭成员（只有创建者可以操作）
  async removeMember(userId: string, targetUserId: string) {
    if (userId === targetUserId) {
      throw new BadRequestException('不能移除自己，请使用离开家庭功能');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { familyId: true, isOwner: true },
    });

    if (!user?.familyId) {
      throw new ForbiddenException('您还没有加入任何家庭');
    }

    if (!user.isOwner) {
      throw new ForbiddenException('只有家庭创建者可以移除成员');
    }

    const targetUser = await this.prisma.user.findUnique({
      where: { id: targetUserId },
      select: { familyId: true },
    });

    if (!targetUser || targetUser.familyId !== user.familyId) {
      throw new NotFoundException('该用户不在您的家庭中');
    }

    // 清除被移除用户与家庭成员的关联
    await this.prisma.familyMember.updateMany({
      where: { userId: targetUserId, familyId: user.familyId },
      data: { userId: null },
    });

    // 清除被移除用户的可见性配置
    await this.prisma.memberVisibility.deleteMany({
      where: { userId: targetUserId },
    });

    await this.prisma.user.update({
      where: { id: targetUserId },
      data: {
        familyId: null,
        isOwner: false,
        memberVisibilityConfigured: false,
      },
    });

    return { message: '已成功移除该成员' };
  }
}
