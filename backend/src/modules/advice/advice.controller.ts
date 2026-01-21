import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  ParseUUIDPipe,
} from '@nestjs/common';
import { AdviceService } from './advice.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { CurrentUserData } from '../auth/decorators/current-user.decorator';
import { GenerateAdviceDto, QueryAdviceDto } from './dto';

@Controller('advice')
export class AdviceController {
  constructor(private readonly adviceService: AdviceService) {}

  // 生成健康建议
  @Post('generate')
  generate(
    @CurrentUser() user: CurrentUserData,
    @Body() dto: GenerateAdviceDto,
  ) {
    return this.adviceService.generate(user.id, dto);
  }

  // 获取建议列表
  @Get()
  findAll(
    @CurrentUser() user: CurrentUserData,
    @Query() query: QueryAdviceDto,
  ) {
    return this.adviceService.findAll(user.id, query);
  }

  // 获取单条建议详情
  @Get(':id')
  findOne(
    @CurrentUser() user: CurrentUserData,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.adviceService.findOne(user.id, id);
  }
}
