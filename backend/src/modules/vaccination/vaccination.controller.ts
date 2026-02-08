import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  ParseUUIDPipe,
  ForbiddenException,
} from '@nestjs/common';
import { VaccinationService } from './vaccination.service';
import {
  CreateVaccineRecordDto,
  UpdateVaccineRecordDto,
  QueryVaccineRecordDto,
  SkipVaccineDto,
} from './dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { CurrentUserData } from '../auth/decorators/current-user.decorator';

@Controller('vaccinations')
export class VaccinationController {
  constructor(private readonly vaccinationService: VaccinationService) {}

  private requireFamily(user: CurrentUserData): string {
    if (!user.familyId) {
      throw new ForbiddenException('请先创建或加入一个家庭');
    }
    return user.familyId;
  }

  // 获取疫苗定义列表
  @Get('definitions')
  getDefinitions() {
    return this.vaccinationService.getVaccineDefinitions();
  }

  // 获取家庭疫苗接种概览
  @Get('summary')
  getSummary(@CurrentUser() user: CurrentUserData) {
    const familyId = this.requireFamily(user);
    return this.vaccinationService.getSummary(familyId);
  }

  // 获取成员的接种计划
  @Get('schedule/:memberId')
  getSchedule(
    @CurrentUser() user: CurrentUserData,
    @Param('memberId', ParseUUIDPipe) memberId: string,
  ) {
    const familyId = this.requireFamily(user);
    return this.vaccinationService.getSchedule(familyId, memberId);
  }

  // 获取接种记录列表
  @Get()
  findAll(
    @CurrentUser() user: CurrentUserData,
    @Query() query: QueryVaccineRecordDto,
  ) {
    const familyId = this.requireFamily(user);
    return this.vaccinationService.findAll(familyId, query);
  }

  // 获取单个接种记录
  @Get(':id')
  findOne(
    @CurrentUser() user: CurrentUserData,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const familyId = this.requireFamily(user);
    return this.vaccinationService.findOne(familyId, id);
  }

  // 创建接种记录
  @Post()
  create(
    @CurrentUser() user: CurrentUserData,
    @Body() dto: CreateVaccineRecordDto,
  ) {
    const familyId = this.requireFamily(user);
    return this.vaccinationService.create(familyId, dto);
  }

  // 更新接种记录
  @Patch(':id')
  update(
    @CurrentUser() user: CurrentUserData,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateVaccineRecordDto,
  ) {
    const familyId = this.requireFamily(user);
    return this.vaccinationService.update(familyId, id, dto);
  }

  // 删除接种记录
  @Delete(':id')
  remove(
    @CurrentUser() user: CurrentUserData,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const familyId = this.requireFamily(user);
    return this.vaccinationService.remove(familyId, id);
  }

  // 跳过疫苗
  @Post('skip')
  skipVaccine(
    @CurrentUser() user: CurrentUserData,
    @Body() dto: SkipVaccineDto,
  ) {
    const familyId = this.requireFamily(user);
    return this.vaccinationService.skipVaccine(familyId, dto);
  }

  // 取消跳过疫苗
  @Delete('skip/:id')
  unskipVaccine(
    @CurrentUser() user: CurrentUserData,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const familyId = this.requireFamily(user);
    return this.vaccinationService.unskipVaccine(familyId, id);
  }
}
