import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { Prisma } from '@prisma/client';

export enum AuditAction {
  LOGIN = 'LOGIN',
  LOGOUT = 'LOGOUT',
  REGISTER = 'REGISTER',
  CREATE = 'CREATE',
  UPDATE = 'UPDATE',
  DELETE = 'DELETE',
  GENERATE = 'GENERATE',
}

export enum AuditResource {
  USER = 'USER',
  MEMBER = 'MEMBER',
  DOCUMENT = 'DOCUMENT',
  RECORD = 'RECORD',
  ADVICE = 'ADVICE',
  CHAT = 'CHAT',
}

export interface AuditContext {
  userId?: string;
  method: string;
  path: string;
  ip?: string;
  userAgent?: string;
}

export interface AuditEntry {
  action: AuditAction;
  resource: AuditResource;
  resourceId?: string;
  details?: Record<string, unknown>;
}

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private prisma: PrismaService) {}

  async log(context: AuditContext, entry: AuditEntry): Promise<void> {
    try {
      await this.prisma.auditLog.create({
        data: {
          userId: context.userId,
          action: entry.action,
          resource: entry.resource,
          resourceId: entry.resourceId,
          method: context.method,
          path: context.path,
          ip: context.ip,
          userAgent: context.userAgent,
          details: entry.details as Prisma.InputJsonValue | undefined,
        },
      });
    } catch (error) {
      // 审计日志失败不应影响业务流程，仅记录错误
      this.logger.error('Failed to write audit log', error);
    }
  }

  // 便捷方法：记录登录
  async logLogin(context: AuditContext, userId: string): Promise<void> {
    await this.log(
      { ...context, userId },
      {
        action: AuditAction.LOGIN,
        resource: AuditResource.USER,
        resourceId: userId,
      },
    );
  }

  // 便捷方法：记录创建操作
  async logCreate(
    context: AuditContext,
    resource: AuditResource,
    resourceId: string,
    details?: Record<string, unknown>,
  ): Promise<void> {
    await this.log(context, {
      action: AuditAction.CREATE,
      resource,
      resourceId,
      details,
    });
  }

  // 便捷方法：记录删除操作
  async logDelete(
    context: AuditContext,
    resource: AuditResource,
    resourceId: string,
  ): Promise<void> {
    await this.log(context, {
      action: AuditAction.DELETE,
      resource,
      resourceId,
    });
  }

  // 便捷方法：记录 AI 生成操作
  async logGenerate(
    context: AuditContext,
    resource: AuditResource,
    resourceId: string,
    details?: Record<string, unknown>,
  ): Promise<void> {
    await this.log(context, {
      action: AuditAction.GENERATE,
      resource,
      resourceId,
      details,
    });
  }
}
