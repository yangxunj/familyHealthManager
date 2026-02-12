import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  ParseUUIDPipe,
  UseGuards,
} from '@nestjs/common';
import { FamilyService } from './family.service';
import { CreateFamilyDto, JoinFamilyDto, UpdateFamilyDto } from './dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { CurrentUserData } from '../auth/decorators/current-user.decorator';
import { AdminGuard } from '../whitelist/guards/admin.guard';

@Controller('family')
export class FamilyController {
  constructor(private readonly familyService: FamilyService) {}

  // 管理员：获取所有家庭概览
  @Get('admin/overview')
  @UseGuards(AdminGuard)
  getAdminOverview() {
    return this.familyService.getAdminOverview();
  }

  // 创建家庭
  @Post()
  create(
    @CurrentUser() user: CurrentUserData,
    @Body() dto: CreateFamilyDto,
  ) {
    return this.familyService.create(user.id, dto);
  }

  // 加入家庭
  @Post('join')
  join(
    @CurrentUser() user: CurrentUserData,
    @Body() dto: JoinFamilyDto,
  ) {
    return this.familyService.join(user.id, dto);
  }

  // 获取当前家庭信息
  @Get()
  findOne(@CurrentUser() user: CurrentUserData) {
    return this.familyService.findOne(user.id);
  }

  // 更新家庭信息
  @Patch()
  update(
    @CurrentUser() user: CurrentUserData,
    @Body() dto: UpdateFamilyDto,
  ) {
    return this.familyService.update(user.id, dto);
  }

  // 重新生成邀请码
  @Post('regenerate-code')
  regenerateInviteCode(@CurrentUser() user: CurrentUserData) {
    return this.familyService.regenerateInviteCode(user.id);
  }

  // 离开家庭
  @Delete('leave')
  leave(@CurrentUser() user: CurrentUserData) {
    return this.familyService.leave(user.id);
  }

  // 移除家庭成员
  @Delete('members/:id')
  removeMember(
    @CurrentUser() user: CurrentUserData,
    @Param('id', ParseUUIDPipe) targetUserId: string,
  ) {
    return this.familyService.removeMember(user.id, targetUserId);
  }
}
