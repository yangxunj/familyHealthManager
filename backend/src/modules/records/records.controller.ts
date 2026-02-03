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
import { RecordsService } from './records.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { CurrentUserData } from '../auth/decorators/current-user.decorator';
import {
  CreateRecordDto,
  CreateBatchRecordDto,
  QueryRecordDto,
  QueryTrendDto,
} from './dto';

@Controller('records')
export class RecordsController {
  constructor(private readonly recordsService: RecordsService) {}

  private requireFamily(user: CurrentUserData): string {
    if (!user.familyId) {
      throw new ForbiddenException('请先创建或加入一个家庭');
    }
    return user.familyId;
  }

  // 获取参考范围配置
  @Get('reference-ranges')
  getReferenceRanges() {
    return this.recordsService.getReferenceRanges();
  }

  // 添加单条记录
  @Post()
  create(@CurrentUser() user: CurrentUserData, @Body() dto: CreateRecordDto) {
    const familyId = this.requireFamily(user);
    return this.recordsService.create(familyId, dto);
  }

  // 批量添加记录
  @Post('batch')
  createBatch(
    @CurrentUser() user: CurrentUserData,
    @Body() dto: CreateBatchRecordDto,
  ) {
    const familyId = this.requireFamily(user);
    return this.recordsService.createBatch(familyId, dto);
  }

  // 获取记录列表
  @Get()
  findAll(@CurrentUser() user: CurrentUserData, @Query() query: QueryRecordDto) {
    const familyId = this.requireFamily(user);
    return this.recordsService.findAll(familyId, query);
  }

  // 获取趋势数据
  @Get('trend')
  getTrend(@CurrentUser() user: CurrentUserData, @Query() query: QueryTrendDto) {
    const familyId = this.requireFamily(user);
    return this.recordsService.getTrend(familyId, query);
  }

  // 获取单条记录
  @Get(':id')
  findOne(
    @CurrentUser() user: CurrentUserData,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const familyId = this.requireFamily(user);
    return this.recordsService.findOne(familyId, id);
  }

  // 删除记录
  @Delete(':id')
  delete(
    @CurrentUser() user: CurrentUserData,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const familyId = this.requireFamily(user);
    return this.recordsService.delete(familyId, id);
  }
}
