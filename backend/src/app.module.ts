import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ServeStaticModule } from '@nestjs/serve-static';
import { CacheModule } from '@nestjs/cache-manager';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { join } from 'path';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './common/prisma/prisma.module';
import { AuditModule } from './common/audit/audit.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { MembersModule } from './modules/members/members.module';
import { StorageModule } from './modules/storage/storage.module';
import { DocumentsModule } from './modules/documents/documents.module';
import { RecordsModule } from './modules/records/records.module';
import { AiModule } from './modules/ai/ai.module';
import { AdviceModule } from './modules/advice/advice.module';
import { ChatModule } from './modules/chat/chat.module';
import { WhitelistModule } from './modules/whitelist/whitelist.module';
import { FamilyModule } from './modules/family/family.module';
import { VaccinationModule } from './modules/vaccination/vaccination.module';
import { CheckupsModule } from './modules/checkups/checkups.module';
import { SettingsModule } from './modules/settings/settings.module';
import { SupabaseAuthGuard } from './modules/auth/guards/supabase-auth.guard';

@Module({
  imports: [
    // 环境变量配置
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    // 静态文件服务（用于访问上传的文件）
    ServeStaticModule.forRoot({
      rootPath: join(process.cwd(), 'uploads'),
      serveRoot: '/uploads',
    }),
    // 全局缓存模块
    CacheModule.register({
      isGlobal: true,
      ttl: 300000, // 默认 5 分钟 (毫秒)
      max: 100, // 最大缓存条目数
    }),
    // 全局限流模块
    ThrottlerModule.forRoot([
      {
        name: 'short',
        ttl: 60000, // 1 分钟
        limit: 100, // 100 次请求
      },
      {
        name: 'long',
        ttl: 3600000, // 1 小时
        limit: 1000, // 1000 次请求
      },
    ]),
    // Prisma 数据库模块
    PrismaModule,
    // 审计日志模块
    AuditModule,
    // 功能模块
    AuthModule,
    UsersModule,
    MembersModule,
    StorageModule,
    DocumentsModule,
    RecordsModule,
    AiModule,
    AdviceModule,
    ChatModule,
    WhitelistModule,
    FamilyModule,
    VaccinationModule,
    CheckupsModule,
    SettingsModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    // 全局 Supabase 认证守卫
    {
      provide: APP_GUARD,
      useClass: SupabaseAuthGuard,
    },
    // 全局限流守卫
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
