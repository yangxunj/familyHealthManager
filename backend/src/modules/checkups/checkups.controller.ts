import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  ParseUUIDPipe,
  ForbiddenException,
} from '@nestjs/common';
import { CheckupsService } from './checkups.service';
import { CreateCheckItemDto, UpdateCheckItemDto, CreateCheckRecordDto } from './dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { CurrentUserData } from '../auth/decorators/current-user.decorator';

@Controller('checkups')
export class CheckupsController {
  constructor(private readonly checkupsService: CheckupsService) {}

  private requireFamily(user: CurrentUserData): string {
    if (!user.familyId) {
      throw new ForbiddenException('请先创建或加入一个家庭');
    }
    return user.familyId;
  }

  // 获取预定义模板
  @Get('templates')
  getTemplates() {
    return this.checkupsService.getTemplates();
  }

  // 获取家庭概览
  @Get('summary')
  getSummary(@CurrentUser() user: CurrentUserData) {
    const familyId = this.requireFamily(user);
    return this.checkupsService.getSummary(familyId);
  }

  // 获取成员的检查项目列表（含状态）
  @Get('items/:memberId')
  getItems(
    @CurrentUser() user: CurrentUserData,
    @Param('memberId', ParseUUIDPipe) memberId: string,
  ) {
    const familyId = this.requireFamily(user);
    return this.checkupsService.getItemsByMember(familyId, memberId);
  }

  // 创建检查项目
  @Post('items')
  createItem(
    @CurrentUser() user: CurrentUserData,
    @Body() dto: CreateCheckItemDto,
  ) {
    const familyId = this.requireFamily(user);
    return this.checkupsService.createItem(familyId, dto);
  }

  // 更新检查项目
  @Patch('items/:id')
  updateItem(
    @CurrentUser() user: CurrentUserData,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCheckItemDto,
  ) {
    const familyId = this.requireFamily(user);
    return this.checkupsService.updateItem(familyId, id, dto);
  }

  // 删除检查项目
  @Delete('items/:id')
  deleteItem(
    @CurrentUser() user: CurrentUserData,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const familyId = this.requireFamily(user);
    return this.checkupsService.deleteItem(familyId, id);
  }

  // 跳过当前周期
  @Post('items/:id/skip')
  skipItem(
    @CurrentUser() user: CurrentUserData,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const familyId = this.requireFamily(user);
    return this.checkupsService.skipItem(familyId, id);
  }

  // 取消跳过
  @Delete('items/:id/skip')
  unskipItem(
    @CurrentUser() user: CurrentUserData,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const familyId = this.requireFamily(user);
    return this.checkupsService.unskipItem(familyId, id);
  }

  // 添加完成记录
  @Post('items/:id/records')
  addRecord(
    @CurrentUser() user: CurrentUserData,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateCheckRecordDto,
  ) {
    const familyId = this.requireFamily(user);
    return this.checkupsService.addRecord(familyId, id, dto);
  }

  // 删除完成记录
  @Delete('records/:id')
  deleteRecord(
    @CurrentUser() user: CurrentUserData,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const familyId = this.requireFamily(user);
    return this.checkupsService.deleteRecord(familyId, id);
  }
}
