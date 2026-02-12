import { Injectable, ConflictException, NotFoundException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class WhitelistService {
  private readonly logger = new Logger(WhitelistService.name);

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {}

  /**
   * 获取环境变量中配置的管理员邮箱列表
   */
  getAdminEmailsFromEnv(): string[] {
    const adminEmails = this.configService.get<string>('ADMIN_EMAILS') || '';
    return adminEmails
      .split(',')
      .map((e) => e.trim().toLowerCase())
      .filter((e) => e);
  }

  /**
   * 检查邮箱是否是管理员（环境变量 OR 数据库 is_admin=true）
   */
  async isAdmin(email: string): Promise<boolean> {
    // LAN 模式：所有用户都是管理员
    if (!this.configService.get('SUPABASE_URL')) {
      return true;
    }

    if (!email) return false;
    const normalized = email.toLowerCase();

    // 1. 检查环境变量
    if (this.getAdminEmailsFromEnv().includes(normalized)) {
      return true;
    }

    // 2. 检查数据库
    const record = await this.prisma.allowedEmail.findUnique({
      where: { email: normalized },
      select: { isAdmin: true },
    });

    return record?.isAdmin === true;
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
    const emails = await this.prisma.allowedEmail.findMany({
      orderBy: { createdAt: 'desc' },
    });

    // 批量查询 addedBy 邮箱对应的用户名
    const addedByEmails = [
      ...new Set(
        emails
          .map((e) => e.addedBy)
          .filter((v): v is string => !!v && !v.startsWith('system:')),
      ),
    ];

    const nameMap = new Map<string, string>();
    if (addedByEmails.length > 0) {
      const users = await this.prisma.user.findMany({
        where: { email: { in: addedByEmails } },
        select: { email: true, name: true },
      });
      for (const u of users) {
        nameMap.set(u.email, u.name);
      }
    }

    return emails.map((e) => ({
      ...e,
      addedByName: e.addedBy ? (nameMap.get(e.addedBy) || null) : null,
    }));
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
    if (await this.isAdmin(normalizedEmail)) {
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
   * 首个用户自动注册为管理员（白名单为空时触发）
   */
  async autoRegisterFirstUser(email: string): Promise<boolean> {
    const normalizedEmail = email.toLowerCase().trim();

    // 再次确认白名单为空（防止并发）
    const count = await this.prisma.allowedEmail.count();
    if (count > 0) return false;

    try {
      await this.prisma.allowedEmail.create({
        data: {
          email: normalizedEmail,
          isAdmin: true,
          addedBy: 'system:first-user',
        },
      });
      this.logger.log(`首个用户 ${normalizedEmail} 已自动注册为管理员`);
      return true;
    } catch {
      // 可能因并发导致唯一约束冲突，忽略
      return false;
    }
  }

  /**
   * 启动时同步环境变量中的管理员邮箱到白名单
   */
  async syncAdminEmailsFromEnv() {
    const adminEmails = this.getAdminEmailsFromEnv();
    if (adminEmails.length === 0) return;

    for (const email of adminEmails) {
      await this.prisma.allowedEmail.upsert({
        where: { email },
        update: { isAdmin: true },
        create: {
          email,
          isAdmin: true,
          addedBy: 'system:env',
        },
      });
    }

    this.logger.log(`已从环境变量同步 ${adminEmails.length} 个管理员邮箱到白名单`);
  }
}
