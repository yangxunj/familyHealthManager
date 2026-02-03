import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class WhitelistService {
  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {}

  /**
   * 获取管理员邮箱列表
   */
  getAdminEmails(): string[] {
    const adminEmails = this.configService.get<string>('ADMIN_EMAILS') || '';
    return adminEmails
      .split(',')
      .map((e) => e.trim().toLowerCase())
      .filter((e) => e);
  }

  /**
   * 检查邮箱是否是管理员
   */
  isAdmin(email: string): boolean {
    if (!email) return false;
    return this.getAdminEmails().includes(email.toLowerCase());
  }

  /**
   * 检查邮箱是否在白名单中
   */
  async isEmailAllowed(email: string): Promise<boolean> {
    if (!email) return false;

    const count = await this.prisma.allowedEmail.count();
    // 如果白名单为空，允许所有认证用户
    if (count === 0) return true;

    const allowed = await this.prisma.allowedEmail.findUnique({
      where: { email: email.toLowerCase() },
    });

    return !!allowed;
  }

  /**
   * 获取白名单条目数量
   */
  async getWhitelistCount(): Promise<number> {
    return this.prisma.allowedEmail.count();
  }

  /**
   * 获取所有白名单邮箱
   */
  async getAllEmails() {
    return this.prisma.allowedEmail.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * 添加邮箱到白名单
   */
  async addEmail(email: string, addedBy?: string) {
    const normalizedEmail = email.toLowerCase().trim();

    // 检查是否已存在
    const existing = await this.prisma.allowedEmail.findUnique({
      where: { email: normalizedEmail },
    });

    if (existing) {
      throw new ConflictException('该邮箱已在白名单中');
    }

    return this.prisma.allowedEmail.create({
      data: {
        email: normalizedEmail,
        addedBy: addedBy?.toLowerCase(),
      },
    });
  }

  /**
   * 从白名单移除邮箱
   */
  async removeEmail(email: string) {
    const normalizedEmail = email.toLowerCase().trim();

    // 检查是否是管理员邮箱
    if (this.isAdmin(normalizedEmail)) {
      throw new ConflictException('不能从白名单中移除管理员邮箱');
    }

    const existing = await this.prisma.allowedEmail.findUnique({
      where: { email: normalizedEmail },
    });

    if (!existing) {
      throw new NotFoundException('该邮箱不在白名单中');
    }

    return this.prisma.allowedEmail.delete({
      where: { email: normalizedEmail },
    });
  }

  /**
   * 从环境变量初始化白名单（首次启动时）
   */
  async initFromEnv() {
    const count = await this.prisma.allowedEmail.count();
    if (count > 0) return; // 已有数据，不初始化

    const initialEmails =
      this.configService.get<string>('INITIAL_WHITELIST_EMAILS') || '';
    const emails = initialEmails
      .split(',')
      .map((e) => e.trim().toLowerCase())
      .filter((e) => e);

    // 同时添加管理员邮箱
    const adminEmails = this.getAdminEmails();
    const allEmails = [...new Set([...emails, ...adminEmails])];

    for (const email of allEmails) {
      try {
        await this.prisma.allowedEmail.create({
          data: {
            email,
            addedBy: 'system',
          },
        });
      } catch {
        // 忽略重复错误
      }
    }
  }
}
