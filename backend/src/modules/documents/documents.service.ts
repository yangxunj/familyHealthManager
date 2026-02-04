import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { Observable, Subject } from 'rxjs';
import { MessageEvent } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { MembersService } from '../members/members.service';
import { StorageService } from '../storage/storage.service';
import { AiService } from '../ai/ai.service';
import { CreateDocumentDto, UpdateDocumentDto, QueryDocumentDto } from './dto';
import * as path from 'path';

@Injectable()
export class DocumentsService {
  private readonly logger = new Logger(DocumentsService.name);

  constructor(
    private prisma: PrismaService,
    private membersService: MembersService,
    private storageService: StorageService,
    private aiService: AiService,
  ) {}

  async findAll(familyId: string, query: QueryDocumentDto) {
    const where: Prisma.DocumentWhereInput = {
      member: {
        familyId,
        deletedAt: null,
      },
      deletedAt: null,
    };

    if (query.memberId) {
      where.memberId = query.memberId;
    }

    if (query.type) {
      where.type = query.type;
    }

    if (query.startDate || query.endDate) {
      where.checkDate = {};
      if (query.startDate) {
        where.checkDate.gte = new Date(query.startDate);
      }
      if (query.endDate) {
        where.checkDate.lte = new Date(query.endDate);
      }
    }

    const documents = await this.prisma.document.findMany({
      where,
      orderBy: { checkDate: 'desc' },
      select: {
        id: true,
        type: true,
        name: true,
        checkDate: true,
        institution: true,
        files: true,
        notes: true,
        ocrStatus: true,
        ocrProgress: true,
        createdAt: true,
        member: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return documents;
  }

  async findOne(id: string, familyId: string) {
    const document = await this.prisma.document.findFirst({
      where: {
        id,
        deletedAt: null,
        member: {
          familyId,
          deletedAt: null,
        },
      },
      select: {
        id: true,
        type: true,
        name: true,
        checkDate: true,
        institution: true,
        files: true,
        notes: true,
        ocrText: true,
        ocrStatus: true,
        ocrProgress: true,
        ocrError: true,
        analyzeStatus: true,
        analyzeError: true,
        parsedData: true,
        createdAt: true,
        updatedAt: true,
        member: {
          select: {
            id: true,
            name: true,
            relationship: true,
          },
        },
      },
    });

    if (!document) {
      throw new NotFoundException('文档不存在');
    }

    return document;
  }

  async create(familyId: string, dto: CreateDocumentDto) {
    // 验证成员归属
    await this.membersService.validateOwnership(dto.memberId, familyId);

    const document = await this.prisma.document.create({
      data: {
        memberId: dto.memberId,
        type: dto.type,
        name: dto.name,
        checkDate: new Date(dto.checkDate),
        institution: dto.institution,
        files: dto.files as unknown as Prisma.JsonArray,
        notes: dto.notes,
      },
      select: {
        id: true,
        type: true,
        name: true,
        checkDate: true,
        institution: true,
        files: true,
        notes: true,
        createdAt: true,
        member: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return document;
  }

  async update(id: string, familyId: string, dto: UpdateDocumentDto) {
    // 验证文档存在且属于当前家庭
    const existingDoc = await this.prisma.document.findFirst({
      where: {
        id,
        deletedAt: null,
        member: {
          familyId,
          deletedAt: null,
        },
      },
    });

    if (!existingDoc) {
      throw new NotFoundException('文档不存在');
    }

    const updateData: Prisma.DocumentUpdateInput = {};

    if (dto.type !== undefined) updateData.type = dto.type;
    if (dto.name !== undefined) updateData.name = dto.name;
    if (dto.checkDate !== undefined) updateData.checkDate = new Date(dto.checkDate);
    if (dto.institution !== undefined) updateData.institution = dto.institution;
    if (dto.files !== undefined) updateData.files = dto.files as unknown as Prisma.JsonArray;
    if (dto.notes !== undefined) updateData.notes = dto.notes;

    const document = await this.prisma.document.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        type: true,
        name: true,
        checkDate: true,
        institution: true,
        files: true,
        notes: true,
        createdAt: true,
        updatedAt: true,
        member: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return document;
  }

  async remove(id: string, familyId: string) {
    // 验证文档存在且属于当前家庭
    const existingDoc = await this.prisma.document.findFirst({
      where: {
        id,
        deletedAt: null,
        member: {
          familyId,
          deletedAt: null,
        },
      },
    });

    if (!existingDoc) {
      throw new NotFoundException('文档不存在');
    }

    // 软删除文档
    await this.prisma.document.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    // 删除关联的文件
    const files = existingDoc.files as { url: string }[];
    if (files && files.length > 0) {
      await this.storageService.deleteFiles(files.map((f) => f.url));
    }

    return { message: '删除成功' };
  }

  // OCR 识别（SSE 返回进度）
  ocrDocument(id: string, familyId: string): Observable<MessageEvent> {
    const subject = new Subject<MessageEvent>();

    // 异步执行 OCR
    this.performOcr(id, familyId, subject).catch((error) => {
      subject.next({
        data: {
          type: 'error',
          error: error.message || 'OCR 识别失败',
        },
      });
      subject.complete();
    });

    return subject.asObservable();
  }

  private async performOcr(id: string, familyId: string, subject: Subject<MessageEvent>) {
    // 验证文档存在且属于当前家庭
    const document = await this.prisma.document.findFirst({
      where: {
        id,
        deletedAt: null,
        member: {
          familyId,
          deletedAt: null,
        },
      },
    });

    if (!document) {
      throw new NotFoundException('文档不存在');
    }

    // 检查文件
    const files = document.files as { url: string; name: string; mimeType: string }[];
    if (!files || files.length === 0) {
      throw new BadRequestException('文档没有可解析的文件');
    }

    // 获取第一个图片或 PDF 文件
    const supportedTypes = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf'];
    const parseableFile = files.find(f => supportedTypes.includes(f.mimeType));

    if (!parseableFile) {
      throw new BadRequestException('没有可解析的图片或 PDF 文件');
    }

    // 更新状态为 processing
    await this.prisma.document.update({
      where: { id },
      data: {
        ocrStatus: 'processing',
        ocrProgress: 0,
        ocrError: null,
      },
    });

    subject.next({
      data: {
        type: 'progress',
        status: 'processing',
        progress: 0,
        message: '开始 OCR 识别...',
      },
    });

    // 构建文件的完整路径
    const filePath = path.join(process.cwd(), '.' + parseableFile.url);

    // 定义进度回调
    const onProgress = async (current: number, total: number, message: string) => {
      const progress = Math.round((current / total) * 100);

      // 更新数据库进度
      await this.prisma.document.update({
        where: { id },
        data: { ocrProgress: progress },
      });

      // 推送进度
      subject.next({
        data: {
          type: 'progress',
          status: 'processing',
          progress,
          current,
          total,
          message,
        },
      });
    };

    // 调用 AI 服务进行 OCR
    const result = await this.aiService.ocrDocument(filePath, onProgress);

    if (!result.success) {
      // 更新状态为失败
      await this.prisma.document.update({
        where: { id },
        data: {
          ocrStatus: 'failed',
          ocrError: result.error,
        },
      });

      subject.next({
        data: {
          type: 'error',
          error: result.error || 'OCR 识别失败',
        },
      });
      subject.complete();
      return;
    }

    // 保存 OCR 结果
    const updatedDocument = await this.prisma.document.update({
      where: { id },
      data: {
        ocrText: result.text,
        ocrStatus: 'completed',
        ocrProgress: 100,
      },
      select: {
        id: true,
        ocrText: true,
        ocrStatus: true,
        ocrProgress: true,
      },
    });

    // 推送完成消息
    subject.next({
      data: {
        type: 'complete',
        status: 'completed',
        progress: 100,
        ocrText: updatedDocument.ocrText,
        tokensUsed: result.tokensUsed,
      },
    });

    subject.complete();
  }

  // 更新 OCR 文本（用户编辑后保存）
  async updateOcrText(id: string, familyId: string, ocrText: string) {
    // 验证文档存在且属于当前家庭
    const existingDoc = await this.prisma.document.findFirst({
      where: {
        id,
        deletedAt: null,
        member: {
          familyId,
          deletedAt: null,
        },
      },
    });

    if (!existingDoc) {
      throw new NotFoundException('文档不存在');
    }

    const document = await this.prisma.document.update({
      where: { id },
      data: { ocrText },
      select: {
        id: true,
        ocrText: true,
        ocrStatus: true,
        updatedAt: true,
      },
    });

    return document;
  }

  // AI 规整：触发后台任务（立即返回）
  async startAnalyzeDocument(id: string, familyId: string) {
    const document = await this.prisma.document.findFirst({
      where: {
        id,
        deletedAt: null,
        member: { familyId, deletedAt: null },
      },
    });

    if (!document) {
      throw new NotFoundException('文档不存在');
    }

    if (!document.ocrText) {
      throw new BadRequestException('请先进行 OCR 识别');
    }

    if (document.analyzeStatus === 'processing') {
      throw new ConflictException('AI 规整正在进行中，请稍候');
    }

    // 标记为处理中
    await this.prisma.document.update({
      where: { id },
      data: { analyzeStatus: 'processing', analyzeError: null },
    });

    // 启动后台任务（不 await）
    this.performAnalyze(id, document.ocrText).catch((err) => {
      this.logger.error(`performAnalyze unexpected error for doc ${id}`, err);
    });

    return { status: 'processing' };
  }

  // AI 规整：后台执行
  private async performAnalyze(id: string, ocrText: string) {
    try {
      this.logger.log(`AI 规整开始: docId=${id}, textLen=${ocrText.length}`);
      const result = await this.aiService.formatOcrText(ocrText);

      if (!result.success) {
        await this.prisma.document.update({
          where: { id },
          data: { analyzeStatus: 'failed', analyzeError: result.error || 'AI 规整失败' },
        });
        this.logger.warn(`AI 规整失败: docId=${id}, error=${result.error}`);
        return;
      }

      await this.prisma.document.update({
        where: { id },
        data: {
          parsedData: { type: 'markdown', content: result.markdown } as unknown as Prisma.JsonObject,
          analyzeStatus: 'completed',
          analyzeError: null,
        },
      });
      this.logger.log(`AI 规整完成: docId=${id}, tokensUsed=${result.tokensUsed}`);
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
      await this.prisma.document.update({
        where: { id },
        data: { analyzeStatus: 'failed', analyzeError: errMsg },
      }).catch((e) => this.logger.error(`Failed to update analyze error status for doc ${id}`, e));
      this.logger.error(`AI 规整异常: docId=${id}, error=${errMsg}`);
    }
  }

  // AI 规整：查询状态
  async getAnalyzeStatus(id: string, familyId: string) {
    const document = await this.prisma.document.findFirst({
      where: {
        id,
        deletedAt: null,
        member: { familyId, deletedAt: null },
      },
      select: {
        analyzeStatus: true,
        analyzeError: true,
        parsedData: true,
      },
    });

    if (!document) {
      throw new NotFoundException('文档不存在');
    }

    return {
      status: document.analyzeStatus,
      error: document.analyzeError,
      parsedData: document.parsedData,
    };
  }
}
