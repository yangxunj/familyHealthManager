import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../common/prisma/prisma.service';
import { UpdateApiConfigDto } from './dto';

// 数据库中存储的配置 key
const CONFIG_KEYS = {
  DASHSCOPE_API_KEY: 'dashscope_api_key',
  GOOGLE_API_KEY: 'google_api_key',
  AI_PROVIDER: 'ai_provider',
} as const;

@Injectable()
export class SettingsService {
  private readonly logger = new Logger(SettingsService.name);

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {}

  /**
   * 获取 API 配置（脱敏显示）
   */
  async getApiConfig() {
    const dashscopeKey = await this.getConfigValue(CONFIG_KEYS.DASHSCOPE_API_KEY);
    const googleKey = await this.getConfigValue(CONFIG_KEYS.GOOGLE_API_KEY);
    const aiProvider = await this.getConfigValue(CONFIG_KEYS.AI_PROVIDER) || 'auto';

    const envDashscope = this.configService.get<string>('DASHSCOPE_API_KEY') || '';
    const envGoogle = this.configService.get<string>('GOOGLE_API_KEY') || '';

    return {
      dashscopeApiKey: this.maskKey(dashscopeKey),
      googleApiKey: this.maskKey(googleKey),
      aiProvider,
      hasDashscope: !!(dashscopeKey || envDashscope),
      hasGoogle: !!(googleKey || envGoogle),
      // 标识配置来源
      dashscopeSource: dashscopeKey ? 'database' : envDashscope ? 'env' : 'none',
      googleSource: googleKey ? 'database' : envGoogle ? 'env' : 'none',
    };
  }

  /**
   * 更新 API 配置
   */
  async updateApiConfig(dto: UpdateApiConfigDto) {
    const operations: Promise<unknown>[] = [];

    if (dto.dashscopeApiKey !== undefined) {
      if (dto.dashscopeApiKey === '') {
        // 空字符串表示清除数据库配置
        operations.push(this.deleteConfigValue(CONFIG_KEYS.DASHSCOPE_API_KEY));
      } else {
        operations.push(this.setConfigValue(CONFIG_KEYS.DASHSCOPE_API_KEY, dto.dashscopeApiKey));
      }
    }

    if (dto.googleApiKey !== undefined) {
      if (dto.googleApiKey === '') {
        operations.push(this.deleteConfigValue(CONFIG_KEYS.GOOGLE_API_KEY));
      } else {
        operations.push(this.setConfigValue(CONFIG_KEYS.GOOGLE_API_KEY, dto.googleApiKey));
      }
    }

    if (dto.aiProvider !== undefined) {
      operations.push(this.setConfigValue(CONFIG_KEYS.AI_PROVIDER, dto.aiProvider));
    }

    await Promise.all(operations);

    this.logger.log('API 配置已更新');
  }

  /**
   * 获取有效的 DashScope API Key（DB 优先，回退到环境变量）
   */
  async getEffectiveDashscopeKey(): Promise<string> {
    const dbKey = await this.getConfigValue(CONFIG_KEYS.DASHSCOPE_API_KEY);
    if (dbKey) return dbKey;
    return this.configService.get<string>('DASHSCOPE_API_KEY') || '';
  }

  /**
   * 获取有效的 Google API Key（DB 优先，回退到环境变量）
   */
  async getEffectiveGoogleKey(): Promise<string> {
    const dbKey = await this.getConfigValue(CONFIG_KEYS.GOOGLE_API_KEY);
    if (dbKey) return dbKey;
    return this.configService.get<string>('GOOGLE_API_KEY') || '';
  }

  /**
   * 获取 AI 服务提供商偏好
   */
  async getAiProvider(): Promise<string> {
    const provider = await this.getConfigValue(CONFIG_KEYS.AI_PROVIDER);
    return provider || 'auto';
  }

  // ---- 私有方法 ----

  private async getConfigValue(key: string): Promise<string> {
    const config = await this.prisma.systemConfig.findUnique({ where: { key } });
    return config?.value || '';
  }

  private async setConfigValue(key: string, value: string): Promise<void> {
    await this.prisma.systemConfig.upsert({
      where: { key },
      update: { value },
      create: { key, value },
    });
  }

  private async deleteConfigValue(key: string): Promise<void> {
    await this.prisma.systemConfig.deleteMany({ where: { key } });
  }

  /**
   * API Key 脱敏：显示前4位和后4位
   */
  private maskKey(key: string): string {
    if (!key) return '';
    if (key.length <= 8) return '****';
    return `${key.slice(0, 4)}****${key.slice(-4)}`;
  }
}
