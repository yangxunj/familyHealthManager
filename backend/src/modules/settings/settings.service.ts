import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ProxyAgent, fetch as undiciFetch } from 'undici';
import { PrismaService } from '../../common/prisma/prisma.service';
import { UpdateApiConfigDto } from './dto';

// 数据库中存储的配置 key
const CONFIG_KEYS = {
  DASHSCOPE_API_KEY: 'dashscope_api_key',
  GOOGLE_API_KEY: 'google_api_key',
  AI_PROVIDER: 'ai_provider',
  DASHSCOPE_VERIFIED: 'dashscope_verified',
  GOOGLE_VERIFIED: 'google_verified',
  DASHSCOPE_MODEL: 'dashscope_model',
  GEMINI_MODEL: 'gemini_model',
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

    const dashscopeVerified = await this.getConfigValue(CONFIG_KEYS.DASHSCOPE_VERIFIED);
    const googleVerified = await this.getConfigValue(CONFIG_KEYS.GOOGLE_VERIFIED);

    const dashscopeModel = await this.getConfigValue(CONFIG_KEYS.DASHSCOPE_MODEL);
    const geminiModel = await this.getConfigValue(CONFIG_KEYS.GEMINI_MODEL);

    return {
      dashscopeApiKey: this.maskKey(dashscopeKey),
      googleApiKey: this.maskKey(googleKey),
      aiProvider,
      hasDashscope: !!(dashscopeKey || envDashscope),
      hasGoogle: !!(googleKey || envGoogle),
      // 标识配置来源
      dashscopeSource: dashscopeKey ? 'database' : envDashscope ? 'env' : 'none',
      googleSource: googleKey ? 'database' : envGoogle ? 'env' : 'none',
      // 验证状态
      dashscopeVerified: dashscopeVerified === 'true',
      googleVerified: googleVerified === 'true',
      // 模型选择
      dashscopeModel: dashscopeModel || 'qwen3-max',
      geminiModel: geminiModel || 'gemini-3-flash-preview',
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
      // Key 变更，清除验证状态
      operations.push(this.deleteConfigValue(CONFIG_KEYS.DASHSCOPE_VERIFIED));
    }

    if (dto.googleApiKey !== undefined) {
      if (dto.googleApiKey === '') {
        operations.push(this.deleteConfigValue(CONFIG_KEYS.GOOGLE_API_KEY));
      } else {
        operations.push(this.setConfigValue(CONFIG_KEYS.GOOGLE_API_KEY, dto.googleApiKey));
      }
      // Key 变更，清除验证状态
      operations.push(this.deleteConfigValue(CONFIG_KEYS.GOOGLE_VERIFIED));
    }

    if (dto.aiProvider !== undefined) {
      operations.push(this.setConfigValue(CONFIG_KEYS.AI_PROVIDER, dto.aiProvider));
    }

    if (dto.dashscopeModel !== undefined) {
      operations.push(this.setConfigValue(CONFIG_KEYS.DASHSCOPE_MODEL, dto.dashscopeModel));
    }

    if (dto.geminiModel !== undefined) {
      operations.push(this.setConfigValue(CONFIG_KEYS.GEMINI_MODEL, dto.geminiModel));
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

  /**
   * 获取有效的 DashScope 模型
   */
  async getEffectiveDashscopeModel(): Promise<string> {
    const model = await this.getConfigValue(CONFIG_KEYS.DASHSCOPE_MODEL);
    return model || 'qwen3-max';
  }

  /**
   * 获取有效的 Gemini 模型
   */
  async getEffectiveGeminiModel(): Promise<string> {
    const model = await this.getConfigValue(CONFIG_KEYS.GEMINI_MODEL);
    if (model) return model;
    return this.configService.get<string>('GEMINI_MODEL') || 'gemini-3-flash-preview';
  }

  /**
   * 测试 API Key 连通性：发起一个最小化请求验证 Key 是否有效
   */
  async testApiKey(provider: 'dashscope' | 'google'): Promise<{ success: true }> {
    const apiKey =
      provider === 'dashscope'
        ? await this.getEffectiveDashscopeKey()
        : await this.getEffectiveGoogleKey();

    if (!apiKey) {
      throw new BadRequestException(`${provider === 'dashscope' ? 'DashScope' : 'Google Gemini'} API Key 未配置`);
    }

    const baseUrl =
      provider === 'dashscope'
        ? this.configService.get<string>('DASHSCOPE_BASE_URL') || 'https://dashscope.aliyuncs.com/compatible-mode/v1'
        : this.configService.get<string>('GOOGLE_API_BASE') || 'https://generativelanguage.googleapis.com/v1beta/openai';

    const model =
      provider === 'dashscope'
        ? 'qwen-plus'
        : this.configService.get<string>('GEMINI_MODEL') || 'gemini-3-flash-preview';

    // Google Gemini 可能需要代理
    const proxyUrl = provider === 'google' ? this.configService.get<string>('GEMINI_PROXY') : undefined;
    const dispatcher = proxyUrl ? new ProxyAgent(proxyUrl) : undefined;

    try {
      const response = await undiciFetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages: [{ role: 'user', content: 'Hi' }],
          max_tokens: 5,
        }),
        signal: AbortSignal.timeout(30_000),
        ...(dispatcher ? { dispatcher } : {}),
      });

      if (!response.ok) {
        const errorText = await response.text();
        this.logger.error(`API Key test failed for ${provider}: ${response.status} - ${errorText}`);
        throw new BadRequestException(`API 请求失败 (${response.status})：请检查 Key 是否正确`);
      }

      // 测试成功，持久化验证状态
      const verifiedKey = provider === 'dashscope' ? CONFIG_KEYS.DASHSCOPE_VERIFIED : CONFIG_KEYS.GOOGLE_VERIFIED;
      await this.setConfigValue(verifiedKey, 'true');

      this.logger.log(`API Key test succeeded for ${provider}`);
      return { success: true };
    } catch (error) {
      if (error instanceof BadRequestException) throw error;
      this.logger.error(`API Key test error for ${provider}: ${(error as Error).message}`);
      throw new BadRequestException(`连接失败：${(error as Error).message}`);
    }
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
