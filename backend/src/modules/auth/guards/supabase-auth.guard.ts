import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { WhitelistService } from '../../whitelist/whitelist.service';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

@Injectable()
export class SupabaseAuthGuard implements CanActivate {
  private supabase: SupabaseClient | null = null;

  constructor(
    private reflector: Reflector,
    private configService: ConfigService,
    private prisma: PrismaService,
    private whitelistService: WhitelistService,
  ) {
    const url = this.configService.get<string>('SUPABASE_URL');
    const serviceKey = this.configService.get<string>('SUPABASE_SERVICE_KEY');

    if (url && serviceKey) {
      this.supabase = createClient(url, serviceKey);
      console.log('SupabaseAuthGuard initialized with Supabase client');
    } else {
      console.warn(
        'SupabaseAuthGuard: SUPABASE_URL or SUPABASE_SERVICE_KEY not configured',
      );
    }
  }

  private static readonly DEFAULT_USER_ID =
    '00000000-0000-0000-0000-000000000001';
  private static readonly DEFAULT_EMAIL = 'local@localhost';
  private static readonly DEFAULT_NAME = '本地用户';

  /**
   * LAN 模式：创建默认本地用户和家庭，无需认证
   */
  private async handleLanMode(request: any): Promise<boolean> {
    const { DEFAULT_USER_ID, DEFAULT_EMAIL, DEFAULT_NAME } =
      SupabaseAuthGuard;

    // Upsert default user
    let user = await this.prisma.user.upsert({
      where: { id: DEFAULT_USER_ID },
      update: {},
      create: {
        id: DEFAULT_USER_ID,
        email: DEFAULT_EMAIL,
        name: DEFAULT_NAME,
        passwordHash: '',
      },
      select: {
        id: true,
        email: true,
        name: true,
        createdAt: true,
        familyId: true,
        isOwner: true,
      },
    });

    // Auto-create default family if user has none
    if (!user.familyId) {
      const family = await this.prisma.family.create({
        data: {
          name: '我的家庭',
          inviteCode: 'LOCAL001',
          users: { connect: { id: DEFAULT_USER_ID } },
        },
      });
      await this.prisma.user.update({
        where: { id: DEFAULT_USER_ID },
        data: { isOwner: true },
      });
      user = { ...user, familyId: family.id, isOwner: true };
    }

    request.user = user;
    return true;
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Check if route is marked as public
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest();

    // LAN mode: no Supabase configured, create default local user
    if (!this.supabase) {
      return this.handleLanMode(request);
    }
    const authHeader = request.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('缺少认证令牌');
    }

    const token = authHeader.substring(7);

    try {
      // Use Supabase SDK to verify the token
      const {
        data: { user: supabaseUser },
        error,
      } = await this.supabase.auth.getUser(token);

      if (error || !supabaseUser) {
        console.error('Supabase auth error:', error?.message || 'No user found');
        throw new UnauthorizedException('无效的认证令牌');
      }

      // Check email whitelist
      const userEmail = (supabaseUser.email || '').toLowerCase();
      const whitelistCount = await this.prisma.allowedEmail.count();

      if (whitelistCount === 0) {
        // 白名单为空：首个用户自动注册为管理员
        await this.whitelistService.autoRegisterFirstUser(userEmail);
      } else {
        // 白名单非空：检查用户是否在白名单中
        const isAllowed = await this.prisma.allowedEmail.findUnique({
          where: { email: userEmail },
        });

        if (!isAllowed) {
          console.warn(`Access denied for email: ${userEmail} (not in whitelist)`);
          throw new ForbiddenException('您的账号未被授权访问此系统');
        }
      }

      // Find or create local user using upsert to handle concurrent requests
      const name =
        supabaseUser.user_metadata?.full_name ||
        supabaseUser.user_metadata?.name ||
        supabaseUser.email?.split('@')[0] ||
        'User';

      const user = await this.prisma.user.upsert({
        where: { id: supabaseUser.id },
        update: {}, // Don't update anything if user exists
        create: {
          id: supabaseUser.id,
          email: supabaseUser.email || '',
          name,
          passwordHash: '',
        },
        select: {
          id: true,
          email: true,
          name: true,
          createdAt: true,
          familyId: true,
          isOwner: true,
        },
      });

      // Attach user to request
      request.user = user;
      return true;
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      console.error('Auth guard error:', error);
      throw new UnauthorizedException('认证失败');
    }
  }
}
