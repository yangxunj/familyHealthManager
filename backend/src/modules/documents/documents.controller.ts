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
  Sse,
  MessageEvent,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { DocumentsService } from './documents.service';
import { CreateDocumentDto, UpdateDocumentDto, QueryDocumentDto, UpdateOcrTextDto } from './dto';
import { CurrentUser } from '../auth/decorators';
import type { CurrentUserData } from '../auth/decorators';

@Controller('documents')
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  private requireFamily(user: CurrentUserData): string {
    if (!user.familyId) {
      throw new ForbiddenException('请先创建或加入一个家庭');
    }
    return user.familyId;
  }

  @Get()
  async findAll(
    @CurrentUser() user: CurrentUserData,
    @Query() query: QueryDocumentDto,
  ) {
    const familyId = this.requireFamily(user);
    return this.documentsService.findAll(familyId, query);
  }

  @Get(':id')
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: CurrentUserData,
  ) {
    const familyId = this.requireFamily(user);
    return this.documentsService.findOne(id, familyId);
  }

  @Post()
  async create(
    @CurrentUser() user: CurrentUserData,
    @Body() dto: CreateDocumentDto,
  ) {
    const familyId = this.requireFamily(user);
    return this.documentsService.create(familyId, dto);
  }

  @Patch(':id')
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: CurrentUserData,
    @Body() dto: UpdateDocumentDto,
  ) {
    const familyId = this.requireFamily(user);
    return this.documentsService.update(id, familyId, dto);
  }

  @Delete(':id')
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: CurrentUserData,
  ) {
    const familyId = this.requireFamily(user);
    return this.documentsService.remove(id, familyId);
  }

  // OCR 识别（SSE 返回进度）
  @Sse(':id/ocr')
  ocrDocument(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: CurrentUserData,
  ): Observable<MessageEvent> {
    const familyId = this.requireFamily(user);
    return this.documentsService.ocrDocument(id, familyId);
  }

  // 更新 OCR 文本（用户编辑后保存）
  @Patch(':id/ocr')
  async updateOcrText(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: CurrentUserData,
    @Body() dto: UpdateOcrTextDto,
  ) {
    const familyId = this.requireFamily(user);
    return this.documentsService.updateOcrText(id, familyId, dto.ocrText);
  }

  // AI 规整：触发后台任务
  @Post(':id/analyze')
  async startAnalyzeDocument(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: CurrentUserData,
  ) {
    const familyId = this.requireFamily(user);
    return this.documentsService.startAnalyzeDocument(id, familyId);
  }

  // AI 规整：查询状态
  @Get(':id/analyze')
  async getAnalyzeStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: CurrentUserData,
  ) {
    const familyId = this.requireFamily(user);
    return this.documentsService.getAnalyzeStatus(id, familyId);
  }
}
