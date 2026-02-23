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
import { MembersService } from './members.service';
import { CreateMemberDto, UpdateMemberDto } from './dto';
import { CurrentUser } from '../auth/decorators';
import type { CurrentUserData } from '../auth/decorators';

@Controller('members')
export class MembersController {
  constructor(private readonly membersService: MembersService) {}

  private requireFamily(user: CurrentUserData): string {
    if (!user.familyId) {
      throw new ForbiddenException('请先创建或加入一个家庭');
    }
    return user.familyId;
  }

  @Get()
  async findAll(@CurrentUser() user: CurrentUserData) {
    const familyId = this.requireFamily(user);
    return this.membersService.findAll(familyId);
  }

  @Get('me')
  async getMyMember(@CurrentUser() user: CurrentUserData) {
    const familyId = this.requireFamily(user);
    return this.membersService.getMyMember(user.id, familyId);
  }

  @Get('stats')
  async getStats(@CurrentUser() user: CurrentUserData) {
    const familyId = this.requireFamily(user);
    return this.membersService.getStats(familyId);
  }

  @Get(':id')
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: CurrentUserData,
  ) {
    const familyId = this.requireFamily(user);
    return this.membersService.findOne(id, familyId);
  }

  @Post()
  async create(
    @CurrentUser() user: CurrentUserData,
    @Body() dto: CreateMemberDto,
  ) {
    const familyId = this.requireFamily(user);
    return this.membersService.create(familyId, dto, user.id);
  }

  @Post(':id/link')
  async linkToUser(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: CurrentUserData,
  ) {
    const familyId = this.requireFamily(user);
    return this.membersService.linkToUser(id, user.id, familyId);
  }

  @Delete('me/link')
  async unlinkFromUser(@CurrentUser() user: CurrentUserData) {
    const familyId = this.requireFamily(user);
    return this.membersService.unlinkFromUser(user.id, familyId);
  }

  @Patch(':id')
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: CurrentUserData,
    @Body() dto: UpdateMemberDto,
  ) {
    const familyId = this.requireFamily(user);
    return this.membersService.update(id, familyId, dto);
  }

  @Delete(':id')
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: CurrentUserData,
  ) {
    const familyId = this.requireFamily(user);
    return this.membersService.remove(id, familyId);
  }
}
