import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AiService } from '../ai/ai.service';
import { GenerateAdviceDto, QueryAdviceDto } from './dto';

// 记录类型标签映射
const RecordTypeLabels: Record<string, string> = {
  HEIGHT: '身高',
  WEIGHT: '体重',
  WAIST: '腰围',
  SYSTOLIC_BP: '收缩压',
  DIASTOLIC_BP: '舒张压',
  HEART_RATE: '心率',
  FASTING_GLUCOSE: '空腹血糖',
  POSTPRANDIAL_GLUCOSE: '餐后血糖',
  HBA1C: '糖化血红蛋白',
  TOTAL_CHOLESTEROL: '总胆固醇',
  TRIGLYCERIDES: '甘油三酯',
  HDL: '高密度脂蛋白',
  LDL: '低密度脂蛋白',
  TEMPERATURE: '体温',
  BLOOD_OXYGEN: '血氧饱和度',
};

@Injectable()
export class AdviceService {
  constructor(
    private prisma: PrismaService,
    private aiService: AiService,
  ) {}

  // 验证成员归属
  private async validateMemberOwnership(memberId: string, familyId: string) {
    const member = await this.prisma.familyMember.findFirst({
      where: {
        id: memberId,
        familyId,
        deletedAt: null,
      },
    });

    if (!member) {
      throw new ForbiddenException('无权操作此成员的数据');
    }

    return member;
  }

  // 收集成员健康数据
  private async collectHealthData(memberId: string) {
    // 获取成员基本信息
    const member = await this.prisma.familyMember.findUnique({
      where: { id: memberId },
      select: {
        id: true,
        name: true,
        gender: true,
        birthDate: true,
        bloodType: true,
        chronicDiseases: true,
        height: true,
        weight: true,
      },
    });

    if (!member) {
      throw new NotFoundException('成员不存在');
    }

    // 计算年龄
    const birthDate = new Date(member.birthDate);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }

    // 获取最近 30 天的健康记录
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const records = await this.prisma.healthRecord.findMany({
      where: {
        memberId,
        recordDate: { gte: thirtyDaysAgo },
      },
      orderBy: { recordDate: 'desc' },
      take: 50,
    });

    // 获取最近的文档信息（包含 AI 规整结果）
    const documents = await this.prisma.document.findMany({
      where: {
        memberId,
        deletedAt: null,
      },
      orderBy: { checkDate: 'desc' },
      take: 5,
      select: {
        name: true,
        type: true,
        checkDate: true,
        parsedData: true,
      },
    });

    // 构建文档摘要（标题列表）
    const documentSummary =
      documents.length > 0
        ? documents
            .map((d) => `${d.checkDate.toISOString().split('T')[0]} - ${d.name}`)
            .join('\n')
        : undefined;

    // 构建文档详细内容（来自 AI 规整的 markdown）
    const docsWithContent = documents.filter(
      (d) => d.parsedData && (d.parsedData as { content?: string }).content,
    );
    const documentContent =
      docsWithContent.length > 0
        ? docsWithContent
            .map((d) => {
              const parsed = d.parsedData as { content?: string };
              return `### ${d.checkDate.toISOString().split('T')[0]} - ${d.name}\n${parsed.content}`;
            })
            .join('\n\n')
        : undefined;

    return {
      memberInfo: {
        name: member.name,
        age,
        gender: member.gender,
        bloodType: member.bloodType !== 'UNKNOWN' ? member.bloodType : undefined,
        chronicDiseases:
          member.chronicDiseases.length > 0 ? member.chronicDiseases : undefined,
      },
      recentRecords: records.map((r) => ({
        type: RecordTypeLabels[r.recordType] || r.recordType,
        value: Number(r.value),
        unit: r.unit,
        date: r.recordDate.toISOString().split('T')[0],
        isAbnormal: r.isAbnormal,
      })),
      documentSummary,
      documentContent,
    };
  }

  // 检查是否有新的健康数据
  async checkNewData(familyId: string, memberId: string) {
    await this.validateMemberOwnership(memberId, familyId);

    // 获取最近一条建议的生成时间
    const latestAdvice = await this.prisma.healthAdvice.findFirst({
      where: { memberId },
      orderBy: { generatedAt: 'desc' },
      select: { generatedAt: true },
    });

    const lastAdviceDate = latestAdvice?.generatedAt || null;

    if (!lastAdviceDate) {
      // 从未生成过建议，检查是否有任何数据可用
      const [docCount, recordCount] = await Promise.all([
        this.prisma.document.count({
          where: { memberId, deletedAt: null, parsedData: { not: Prisma.JsonNull } },
        }),
        this.prisma.healthRecord.count({
          where: { memberId },
        }),
      ]);
      return {
        hasNewData: docCount > 0 || recordCount > 0,
        newDocuments: docCount,
        newRecords: recordCount,
        lastAdviceDate: null,
      };
    }

    // 检查在最近建议之后是否有新数据
    const [newDocCount, newRecordCount] = await Promise.all([
      this.prisma.document.count({
        where: {
          memberId,
          deletedAt: null,
          updatedAt: { gt: lastAdviceDate },
          parsedData: { not: Prisma.JsonNull },
        },
      }),
      this.prisma.healthRecord.count({
        where: {
          memberId,
          createdAt: { gt: lastAdviceDate },
        },
      }),
    ]);

    return {
      hasNewData: newDocCount > 0 || newRecordCount > 0,
      newDocuments: newDocCount,
      newRecords: newRecordCount,
      lastAdviceDate: lastAdviceDate.toISOString(),
    };
  }

  // 生成健康建议
  async generate(familyId: string, dto: GenerateAdviceDto) {
    // 检查 AI 服务是否配置
    if (!this.aiService.isConfigured()) {
      throw new BadRequestException('AI 服务未配置，请联系管理员');
    }

    // 验证成员归属
    await this.validateMemberOwnership(dto.memberId, familyId);

    // 收集健康数据
    const healthData = await this.collectHealthData(dto.memberId);

    // 检查数据是否足够（健康记录或文档内容至少有其一）
    if (healthData.recentRecords.length === 0 && !healthData.documentContent) {
      throw new BadRequestException(
        '健康数据不足，请先添加健康记录或上传健康文档并完成 AI 规整后再生成建议',
      );
    }

    // 调用 AI 生成建议
    const aiResult = await this.aiService.generateHealthAdvice(healthData);

    // 解析 AI 返回的内容
    const parsedAdvice = this.aiService.parseAdviceJson(aiResult.content);

    if (!parsedAdvice) {
      throw new BadRequestException('AI 建议生成失败，请稍后重试');
    }

    // 保存建议到数据库
    const advice = await this.prisma.healthAdvice.create({
      data: {
        memberId: dto.memberId,
        content: parsedAdvice,
        healthScore: parsedAdvice.healthScore,
        dataSnapshot: healthData,
        modelUsed: aiResult.model,
        tokensUsed: aiResult.tokensUsed,
      },
      include: {
        member: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return this.formatAdvice(advice);
  }

  // 获取建议列表
  async findAll(familyId: string, query: QueryAdviceDto) {
    // 获取家庭的所有成员 ID
    const members = await this.prisma.familyMember.findMany({
      where: { familyId, deletedAt: null },
      select: { id: true },
    });
    const memberIds = members.map((m: { id: string }) => m.id);

    const where = {
      memberId: query.memberId
        ? { equals: query.memberId, in: memberIds }
        : { in: memberIds },
    };

    const advices = await this.prisma.healthAdvice.findMany({
      where,
      include: {
        member: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: { generatedAt: 'desc' },
      take: 20,
    });

    return advices.map((a) => this.formatAdvice(a));
  }

  // 获取单条建议详情
  async findOne(familyId: string, id: string) {
    const advice = await this.prisma.healthAdvice.findUnique({
      where: { id },
      include: {
        member: {
          select: {
            id: true,
            name: true,
            familyId: true,
          },
        },
      },
    });

    if (!advice) {
      throw new NotFoundException('建议不存在');
    }

    if (advice.member.familyId !== familyId) {
      throw new ForbiddenException('无权查看此建议');
    }

    return this.formatAdvice(advice);
  }

  // 格式化建议输出
  private formatAdvice(
    advice: {
      id: string;
      memberId: string;
      content: unknown;
      healthScore: number | null;
      dataSnapshot: unknown;
      modelUsed: string | null;
      tokensUsed: number | null;
      generatedAt: Date;
      member: { id: string; name: string };
    },
  ) {
    const content = advice.content as {
      healthScore: number;
      summary: string;
      concerns: { level: string; title: string; description: string }[];
      suggestions: { category: string; title: string; content: string }[];
      actionItems: { text: string; priority: string }[];
    };

    return {
      id: advice.id,
      memberId: advice.memberId,
      member: advice.member,
      healthScore: advice.healthScore,
      summary: content.summary,
      concerns: content.concerns,
      suggestions: content.suggestions,
      actionItems: content.actionItems,
      modelUsed: advice.modelUsed,
      tokensUsed: advice.tokensUsed,
      generatedAt: advice.generatedAt.toISOString(),
    };
  }
}
