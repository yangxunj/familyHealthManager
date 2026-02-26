import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  ParseUUIDPipe,
  ForbiddenException,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AdviceService } from './advice.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { CurrentUserData } from '../auth/decorators/current-user.decorator';
import { GenerateAdviceDto, QueryAdviceDto } from './dto';

@Controller('advice')
export class AdviceController {
  constructor(private readonly adviceService: AdviceService) {}

  private requireFamily(user: CurrentUserData): string {
    if (!user.familyId) {
      throw new ForbiddenException('请先创建或加入一个家庭');
    }
    return user.familyId;
  }

  // 检查是否有新的健康数据
  @Get('check/:memberId')
  checkNewData(
    @CurrentUser() user: CurrentUserData,
    @Param('memberId', ParseUUIDPipe) memberId: string,
  ) {
    const familyId = this.requireFamily(user);
    return this.adviceService.checkNewData(familyId, memberId);
  }

  // 生成健康建议
  @Post('generate')
  @Throttle({ short: { limit: 10, ttl: 60000 } }) // AI 生成限流：10次/分钟
  generate(
    @CurrentUser() user: CurrentUserData,
    @Body() dto: GenerateAdviceDto,
  ) {
    const familyId = this.requireFamily(user);
    return this.adviceService.generate(familyId, dto);
  }

  // 获取建议列表
  @Get()
  findAll(
    @CurrentUser() user: CurrentUserData,
    @Query() query: QueryAdviceDto,
  ) {
    const familyId = this.requireFamily(user);
    return this.adviceService.findAll(familyId, query, user.id);
  }

  // 获取单条建议详情
  @Get(':id')
  findOne(
    @CurrentUser() user: CurrentUserData,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const familyId = this.requireFamily(user);
    return this.adviceService.findOne(familyId, id);
  }

  // 删除建议
  @Delete(':id')
  remove(
    @CurrentUser() user: CurrentUserData,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const familyId = this.requireFamily(user);
    return this.adviceService.remove(familyId, id);
  }
}
