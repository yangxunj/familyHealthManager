import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  ParseUUIDPipe,
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

  // 获取参考范围配置
  @Get('reference-ranges')
  getReferenceRanges() {
    return this.recordsService.getReferenceRanges();
  }

  // 添加单条记录
  @Post()
  create(@CurrentUser() user: CurrentUserData, @Body() dto: CreateRecordDto) {
    return this.recordsService.create(user.id, dto);
  }

  // 批量添加记录
  @Post('batch')
  createBatch(
    @CurrentUser() user: CurrentUserData,
    @Body() dto: CreateBatchRecordDto,
  ) {
    return this.recordsService.createBatch(user.id, dto);
  }

  // 获取记录列表
  @Get()
  findAll(@CurrentUser() user: CurrentUserData, @Query() query: QueryRecordDto) {
    return this.recordsService.findAll(user.id, query);
  }

  // 获取趋势数据
  @Get('trend')
  getTrend(@CurrentUser() user: CurrentUserData, @Query() query: QueryTrendDto) {
    return this.recordsService.getTrend(user.id, query);
  }

  // 获取单条记录
  @Get(':id')
  findOne(
    @CurrentUser() user: CurrentUserData,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.recordsService.findOne(user.id, id);
  }

  // 删除记录
  @Delete(':id')
  delete(
    @CurrentUser() user: CurrentUserData,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.recordsService.delete(user.id, id);
  }
}
