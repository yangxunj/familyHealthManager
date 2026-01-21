import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AiService, AiStreamCallback } from '../ai/ai.service';
import { CreateSessionDto, SendMessageDto, QuerySessionDto } from './dto';

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

interface HealthContext {
  memberInfo: {
    name: string;
    age: number;
    gender: string;
    bloodType?: string;
    chronicDiseases?: string[];
  };
  recentRecords: {
    type: string;
    value: number;
    unit: string;
    date: string;
    isAbnormal: boolean;
  }[];
  documentSummary?: string;
}

@Injectable()
export class ChatService {
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

  // 验证会话归属
  private async validateSessionOwnership(sessionId: string, userId: string) {
    const session = await this.prisma.chatSession.findFirst({
      where: {
        id: sessionId,
        userId,
      },
      include: {
        member: {
          select: {
            id: true,
            name: true,
            gender: true,
            birthDate: true,
            bloodType: true,
            chronicDiseases: true,
          },
        },
      },
    });

    if (!session) {
      throw new ForbiddenException('无权操作此会话');
    }

    return session;
  }

  // 收集成员健康数据（用于上下文）
  private async collectHealthContext(memberId: string): Promise<HealthContext> {
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
      take: 30,
    });

    // 获取最近的文档信息
    const documents = await this.prisma.document.findMany({
      where: {
        memberId,
        deletedAt: null,
      },
      orderBy: { checkDate: 'desc' },
      take: 3,
      select: {
        name: true,
        type: true,
        checkDate: true,
      },
    });

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

  // 构建系统提示词
  private buildSystemPrompt(context: HealthContext): string {
    return `你是一位专业、友善的健康顾问AI助手。你正在为一位家庭成员提供健康咨询服务。

## 成员健康档案

**基本信息**
- 姓名：${context.memberInfo.name}
- 年龄：${context.memberInfo.age}岁
- 性别：${context.memberInfo.gender === 'MALE' ? '男' : '女'}
${context.memberInfo.bloodType ? `- 血型：${context.memberInfo.bloodType}` : ''}
${context.memberInfo.chronicDiseases?.length ? `- 慢性病史：${context.memberInfo.chronicDiseases.join('、')}` : ''}

**近期健康记录**
${
  context.recentRecords.length > 0
    ? context.recentRecords
        .slice(0, 15)
        .map(
          (r) =>
            `- ${r.date} ${r.type}：${r.value}${r.unit}${r.isAbnormal ? ' ⚠️异常' : ''}`,
        )
        .join('\n')
    : '暂无健康记录数据'
}

${context.documentSummary ? `**近期健康文档**\n${context.documentSummary}` : ''}

## 回答要求

1. **专业性**：基于成员的健康档案，提供个性化的建议
2. **简洁性**：回答简明扼要，重点突出，避免冗长
3. **实用性**：给出具体、可执行的建议
4. **安全性**：
   - 对于严重症状，建议及时就医
   - 不做医学诊断，只提供参考建议
   - 在涉及用药时，建议咨询医生或药师

## 免责说明
你的建议仅供参考，不能替代专业医疗诊断和治疗。如有健康问题，请及时咨询专业医生。`;
  }

  // 创建会话
  async createSession(userId: string, dto: CreateSessionDto) {
    await this.validateMemberOwnership(dto.memberId, userId);

    const session = await this.prisma.chatSession.create({
      data: {
        userId,
        memberId: dto.memberId,
        title: dto.title || '新对话',
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

    return this.formatSession(session);
  }

  // 获取会话列表
  async findAllSessions(userId: string, query: QuerySessionDto) {
    const where: { userId: string; memberId?: string } = { userId };
    if (query.memberId) {
      where.memberId = query.memberId;
    }

    const sessions = await this.prisma.chatSession.findMany({
      where,
      include: {
        member: {
          select: {
            id: true,
            name: true,
          },
        },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
      orderBy: { updatedAt: 'desc' },
      take: query.limit,
      skip: query.offset,
    });

    return sessions.map((s) => this.formatSession(s));
  }

  // 获取会话详情及消息
  async findSessionWithMessages(userId: string, sessionId: string) {
    const session = await this.prisma.chatSession.findFirst({
      where: {
        id: sessionId,
        userId,
      },
      include: {
        member: {
          select: {
            id: true,
            name: true,
          },
        },
        messages: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!session) {
      throw new NotFoundException('会话不存在');
    }

    return {
      ...this.formatSession(session),
      messages: session.messages.map((m) => ({
        id: m.id,
        role: m.role.toLowerCase(),
        content: m.content,
        createdAt: m.createdAt.toISOString(),
      })),
    };
  }

  // 删除会话
  async deleteSession(userId: string, sessionId: string) {
    await this.validateSessionOwnership(sessionId, userId);

    await this.prisma.chatSession.delete({
      where: { id: sessionId },
    });

    return { success: true };
  }

  // 发送消息并流式返回
  async sendMessageStream(
    userId: string,
    sessionId: string,
    dto: SendMessageDto,
    onChunk: AiStreamCallback,
  ) {
    // 检查 AI 服务是否配置
    if (!this.aiService.isConfigured()) {
      throw new BadRequestException('AI 服务未配置，请联系管理员');
    }

    // 验证会话
    const session = await this.validateSessionOwnership(sessionId, userId);

    // 保存用户消息
    await this.prisma.chatMessage.create({
      data: {
        sessionId,
        role: 'USER',
        content: dto.content,
      },
    });

    // 获取历史消息（最近 10 条）
    const historyMessages = await this.prisma.chatMessage.findMany({
      where: { sessionId },
      orderBy: { createdAt: 'asc' },
      take: 20,
    });

    // 收集健康上下文
    const healthContext = await this.collectHealthContext(session.memberId);

    // 构建消息数组
    const messages: { role: 'system' | 'user' | 'assistant'; content: string }[] = [
      { role: 'system', content: this.buildSystemPrompt(healthContext) },
      ...historyMessages.map((m) => ({
        role: m.role.toLowerCase() as 'user' | 'assistant',
        content: m.content,
      })),
    ];

    // 收集完整响应
    let fullContent = '';
    let tokensUsed = 0;

    // 调用 AI 流式 API
    await this.aiService.chatStream(messages, (chunk) => {
      if (!chunk.done) {
        fullContent += chunk.content;
      } else {
        tokensUsed = chunk.tokensUsed || 0;
      }
      onChunk(chunk);
    });

    // 保存 AI 响应
    if (fullContent) {
      await this.prisma.chatMessage.create({
        data: {
          sessionId,
          role: 'ASSISTANT',
          content: fullContent,
          tokensUsed,
        },
      });

      // 更新会话标题（如果是第一条消息）
      if (historyMessages.length <= 1) {
        const title = dto.content.length > 20 ? dto.content.substring(0, 20) + '...' : dto.content;
        await this.prisma.chatSession.update({
          where: { id: sessionId },
          data: { title },
        });
      }

      // 更新会话时间
      await this.prisma.chatSession.update({
        where: { id: sessionId },
        data: { updatedAt: new Date() },
      });
    }

    return { tokensUsed };
  }

  // 格式化会话输出
  private formatSession(
    session: {
      id: string;
      userId: string;
      memberId: string;
      title: string;
      createdAt: Date;
      updatedAt: Date;
      member: { id: string; name: string };
      messages?: { id: string; content: string; createdAt: Date }[];
    },
  ) {
    return {
      id: session.id,
      memberId: session.memberId,
      member: session.member,
      title: session.title,
      lastMessage: session.messages?.[0]?.content?.substring(0, 50),
      createdAt: session.createdAt.toISOString(),
      updatedAt: session.updatedAt.toISOString(),
    };
  }
}
