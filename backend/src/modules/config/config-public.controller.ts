import { Controller, Get } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Public } from '../auth/decorators/public.decorator';

@Controller('config')
export class ConfigPublicController {
  constructor(private readonly configService: ConfigService) {}

  /**
   * 公开配置端点（无需认证）
   * App 首次启动时调用，用于检测服务器认证模式
   */
  @Public()
  @Get('public')
  getPublicConfig() {
    const supabaseUrl = this.configService.get<string>('SUPABASE_URL');
    return {
      authRequired: !!supabaseUrl,
      appName: '家庭健康管理',
    };
  }
}
