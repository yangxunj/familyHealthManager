import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
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
  private async validateMemberOwnership(memberId: string, userId: string) {
    const member = await this.prisma.familyMember.findFirst({
      where: {
        id: memberId,
        userId,
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

    // 获取最近的文档信息（仅标题和日期）
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
      },
    });

    // 构建文档摘要
    const documentSummary =
      documents.length > 0
        ? documents
            .map((d) => `${d.checkDate.toISOString().split('T')[0]} - ${d.name}`)
            .join('\n')
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
    };
  }

  // 生成健康建议
  async generate(userId: string, dto: GenerateAdviceDto) {
    // 检查 AI 服务是否配置
    if (!this.aiService.isConfigured()) {
      throw new BadRequestException('AI 服务未配置，请联系管理员');
    }

    // 验证成员归属
    await this.validateMemberOwnership(dto.memberId, userId);

    // 收集健康数据
    const healthData = await this.collectHealthData(dto.memberId);

    // 检查数据是否足够
    if (healthData.recentRecords.length === 0) {
      throw new BadRequestException(
        '健康数据不足，请先添加一些健康记录后再生成建议',
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
  async findAll(userId: string, query: QueryAdviceDto) {
    // 获取用户的所有成员 ID
    const members = await this.prisma.familyMember.findMany({
      where: { userId, deletedAt: null },
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
  async findOne(userId: string, id: string) {
    const advice = await this.prisma.healthAdvice.findUnique({
      where: { id },
      include: {
        member: {
          select: {
            id: true,
            name: true,
            userId: true,
          },
        },
      },
    });

    if (!advice) {
      throw new NotFoundException('建议不存在');
    }

    if (advice.member.userId !== userId) {
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
