import { Controller, Get, Put, Body, UseGuards } from '@nestjs/common';
import { SettingsService } from './settings.service';
import { UpdateApiConfigDto } from './dto';
import { AdminGuard } from '../whitelist/guards/admin.guard';

@Controller('settings')
@UseGuards(AdminGuard)
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  /**
   * 获取 API 配置（脱敏显示）
   */
  @Get('api-config')
  async getApiConfig() {
    return this.settingsService.getApiConfig();
  }

  /**
   * 更新 API 配置
   */
  @Put('api-config')
  async updateApiConfig(@Body() dto: UpdateApiConfigDto) {
    await this.settingsService.updateApiConfig(dto);
    return { message: 'API 配置已更新' };
  }
}
