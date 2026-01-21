import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { MembersService } from '../members/members.service';
import { StorageService } from '../storage/storage.service';
import { CreateDocumentDto, UpdateDocumentDto, QueryDocumentDto } from './dto';

@Injectable()
export class DocumentsService {
  constructor(
    private prisma: PrismaService,
    private membersService: MembersService,
    private storageService: StorageService,
  ) {}

  async findAll(userId: string, query: QueryDocumentDto) {
    const where: Prisma.DocumentWhereInput = {
      member: {
        userId,
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

  async findOne(id: string, userId: string) {
    const document = await this.prisma.document.findFirst({
      where: {
        id,
        deletedAt: null,
        member: {
          userId,
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

  async create(userId: string, dto: CreateDocumentDto) {
    // 验证成员归属
    await this.membersService.validateOwnership(dto.memberId, userId);

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

  async update(id: string, userId: string, dto: UpdateDocumentDto) {
    // 验证文档存在且属于当前用户
    const existingDoc = await this.prisma.document.findFirst({
      where: {
        id,
        deletedAt: null,
        member: {
          userId,
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

  async remove(id: string, userId: string) {
    // 验证文档存在且属于当前用户
    const existingDoc = await this.prisma.document.findFirst({
      where: {
        id,
        deletedAt: null,
        member: {
          userId,
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
}
