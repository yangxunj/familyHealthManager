import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { WhitelistService } from './whitelist.service';
import { AddEmailDto } from './dto/add-email.dto';
import { AdminGuard } from './guards/admin.guard';
import { CurrentUser } from '../auth/decorators';
import type { CurrentUserData } from '../auth/decorators';

@Controller('whitelist')
export class WhitelistController {
  constructor(private readonly whitelistService: WhitelistService) {}

  /**
   * 获取白名单列表（仅管理员）
   */
  @Get()
  @UseGuards(AdminGuard)
  async getWhitelist() {
    const emails = await this.whitelistService.getAllEmails();
    return {
      emails,
      isAdmin: true,
    };
  }

  /**
   * 添加邮箱到白名单（仅管理员）
   */
  @Post()
  @UseGuards(AdminGuard)
  async addEmail(
    @Body() dto: AddEmailDto,
    @CurrentUser() user: CurrentUserData,
  ) {
    const email = await this.whitelistService.addEmail(dto.email, user.email);
    return email;
  }

  /**
   * 从白名单移除邮箱（仅管理员）
   */
  @Delete(':email')
  @UseGuards(AdminGuard)
  async removeEmail(@Param('email') email: string) {
    await this.whitelistService.removeEmail(email);
    return { message: '邮箱已从白名单移除' };
  }

  /**
   * 检查当前用户是否是管理员
   */
  @Get('check-admin')
  async checkAdminStatus(@CurrentUser() user: CurrentUserData) {
    return {
      isAdmin: await this.whitelistService.isAdmin(user.email),
    };
  }
}
