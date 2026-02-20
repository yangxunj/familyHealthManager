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
  latestDocumentContent?: string; // 最新文档的 AI 解析内容
  sourceAdvice?: {
    summary: string;
    concerns: { level: string; title: string; description: string }[];
    suggestions: { category: string; title: string; content: string }[];
    actionItems: { priority: string; text: string }[];
  };
}

@Injectable()
export class ChatService {
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

  // 验证会话归属
  private async validateSessionOwnership(sessionId: string, familyId: string) {
    const session = await this.prisma.chatSession.findFirst({
      where: {
        id: sessionId,
        familyId,
      },
      select: {
        id: true,
        memberId: true,
        sourceAdviceId: true,
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
  private async collectHealthContext(
    memberId: string,
    sourceAdviceId?: string,
  ): Promise<HealthContext> {
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

    // 健康记录获取策略：至少取最近 30 天，不够 30 条就往前追溯
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // 先获取最近 30 天的记录
    let records = await this.prisma.healthRecord.findMany({
      where: {
        memberId,
        recordDate: { gte: thirtyDaysAgo },
      },
      orderBy: { recordDate: 'desc' },
    });

    // 如果不够 30 条，往前追溯凑够 30 条
    if (records.length < 30) {
      records = await this.prisma.healthRecord.findMany({
        where: { memberId },
        orderBy: { recordDate: 'desc' },
        take: 30,
      });
    }

    // 文档类型优先级（体检报告最重要，其次是检验报告等）
    const documentTypePriority: Record<string, number> = {
      PHYSICAL_EXAM: 1,   // 体检报告 - 最全面的健康信息
      LAB_REPORT: 2,      // 检验报告 - 具体指标数据
      MEDICAL_RECORD: 3,  // 病历记录 - 就诊信息
      IMAGING_REPORT: 4,  // 影像报告 - 特定检查
      PRESCRIPTION: 5,    // 处方单 - 用药信息
      OTHER: 6,           // 其他
    };

    // 获取最近的文档信息
    const documents = await this.prisma.document.findMany({
      where: {
        memberId,
        deletedAt: null,
      },
      orderBy: { checkDate: 'desc' },
      take: 10, // 多取一些，按优先级筛选
      select: {
        name: true,
        type: true,
        checkDate: true,
        parsedData: true,
      },
    });

    const documentSummary =
      documents.length > 0
        ? documents
            .slice(0, 3) // 摘要只显示最近 3 份
            .map((d) => `${d.checkDate.toISOString().split('T')[0]} - ${d.name}`)
            .join('\n')
        : undefined;

    // 按优先级选择一份有解析内容的文档
    // 策略：在有 parsedData 的文档中，选择优先级最高的那份
    let latestDocumentContent: string | undefined = undefined;
    const documentsWithContent = documents
      .filter((d) => d.parsedData)
      .sort((a, b) => {
        const priorityA = documentTypePriority[a.type] || 99;
        const priorityB = documentTypePriority[b.type] || 99;
        return priorityA - priorityB; // 优先级数字小的排前面
      });

    if (documentsWithContent.length > 0) {
      const selectedDoc = documentsWithContent[0];
      const parsed = selectedDoc.parsedData as { summary?: string; items?: unknown[] };
      if (parsed.summary) {
        latestDocumentContent = parsed.summary;
      } else if (typeof parsed === 'object') {
        latestDocumentContent = JSON.stringify(parsed, null, 2);
      }
    }

    // 如果有来源建议，获取其完整内容
    let sourceAdvice: HealthContext['sourceAdvice'] = undefined;
    if (sourceAdviceId) {
      const advice = await this.prisma.healthAdvice.findUnique({
        where: { id: sourceAdviceId },
      });
      if (advice && advice.content) {
        // content 是 JSON 格式，包含 summary, concerns, suggestions, actionItems
        const content = advice.content as {
          summary?: string;
          concerns?: { level: string; title: string; description: string }[];
          suggestions?: { category: string; title: string; content: string }[];
          actionItems?: { priority: string; text: string }[];
        };
        sourceAdvice = {
          summary: content.summary || '',
          concerns: content.concerns || [],
          suggestions: content.suggestions || [],
          actionItems: content.actionItems || [],
        };
      }
    }

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
      latestDocumentContent,
      sourceAdvice,
    };
  }

  // 构建系统提示词
  private buildSystemPrompt(context: HealthContext): string {
    // 构建健康建议部分（如果有来源建议）
    let adviceSection = '';
    if (context.sourceAdvice) {
      const { summary, concerns, suggestions, actionItems } = context.sourceAdvice;
      adviceSection = `
## 当前咨询的健康建议

**健康概述**
${summary}

**需要关注的问题**
${concerns.map((c) => `- [${c.level}] ${c.title}：${c.description}`).join('\n')}

**健康建议**
${suggestions.map((s) => `- [${s.category}] ${s.title}：${s.content}`).join('\n')}

**行动清单**
${actionItems.map((a) => `- [${a.priority}优先级] ${a.text}`).join('\n')}
`;
    }

    // 构建最新文档内容部分（如果有）
    let latestDocSection = '';
    if (context.latestDocumentContent) {
      // 限制文档内容长度，避免上下文过长
      const truncatedContent =
        context.latestDocumentContent.length > 3000
          ? context.latestDocumentContent.substring(0, 3000) + '...(内容已截断)'
          : context.latestDocumentContent;
      latestDocSection = `
**最新体检报告解析**
${truncatedContent}
`;
    }

    return `你是一位专业、友善的健康顾问AI助手。你正在为一位家庭成员提供健康咨询服务。

## 成员健康档案

**基本信息**
- 姓名：${context.memberInfo.name}
- 年龄：${context.memberInfo.age}岁
- 性别：${context.memberInfo.gender === 'MALE' ? '男' : '女'}
${context.memberInfo.bloodType ? `- 血型：${context.memberInfo.bloodType}` : ''}
${context.memberInfo.chronicDiseases?.length ? `- 慢性病史：${context.memberInfo.chronicDiseases.join('、')}` : ''}

**近期健康记录（${context.recentRecords.length} 条）**
${
  context.recentRecords.length > 0
    ? context.recentRecords
        .map(
          (r) =>
            `- ${r.date} ${r.type}：${r.value}${r.unit}${r.isAbnormal ? ' ⚠️异常' : ''}`,
        )
        .join('\n')
    : '暂无健康记录数据'
}

${context.documentSummary ? `**近期健康文档**\n${context.documentSummary}` : ''}
${latestDocSection}
${adviceSection}
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
  async createSession(familyId: string, userId: string, dto: CreateSessionDto) {
    await this.validateMemberOwnership(dto.memberId, familyId);

    // 如果指定了来源建议，验证其存在性和归属
    if (dto.sourceAdviceId) {
      const advice = await this.prisma.healthAdvice.findFirst({
        where: {
          id: dto.sourceAdviceId,
          member: { familyId },
        },
      });
      if (!advice) {
        throw new ForbiddenException('无权访问此健康建议');
      }
    }

    const session = await this.prisma.chatSession.create({
      data: {
        familyId,
        createdBy: userId,
        memberId: dto.memberId,
        title: dto.title || '新对话',
        // 来源追踪
        sourceAdviceId: dto.sourceAdviceId,
        sourceItemType: dto.sourceItemType,
        sourceItemIndex: dto.sourceItemIndex,
        sourceItemTitle: dto.sourceItemTitle,
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
  async findAllSessions(familyId: string, query: QuerySessionDto) {
    const where: { familyId: string; memberId?: string } = { familyId };
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

  // 获取有会话记录的成员列表
  async getMembersWithSessions(familyId: string) {
    const members = await this.prisma.chatSession.findMany({
      where: { familyId },
      select: {
        member: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      distinct: ['memberId'],
    });

    return members.map((m) => m.member);
  }

  // 获取会话详情及消息
  async findSessionWithMessages(familyId: string, sessionId: string) {
    const session = await this.prisma.chatSession.findFirst({
      where: {
        id: sessionId,
        familyId,
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
        imageUrls: m.imageUrls ?? undefined,
        createdAt: m.createdAt.toISOString(),
      })),
    };
  }

  // 删除会话
  async deleteSession(familyId: string, sessionId: string) {
    await this.validateSessionOwnership(sessionId, familyId);

    await this.prisma.chatSession.delete({
      where: { id: sessionId },
    });

    return { success: true };
  }

  // 发送消息并流式返回
  async sendMessageStream(
    familyId: string,
    sessionId: string,
    dto: SendMessageDto,
    onChunk: AiStreamCallback,
  ) {
    // 检查 AI 服务是否配置
    if (!(await this.aiService.isConfigured())) {
      throw new BadRequestException('AI 服务未配置，请联系管理员');
    }

    // 验证会话
    const session = await this.validateSessionOwnership(sessionId, familyId);

    // 保存用户消息
    await this.prisma.chatMessage.create({
      data: {
        sessionId,
        role: 'USER',
        content: dto.content,
        imageUrls: dto.imageUrls?.length ? dto.imageUrls : undefined,
      },
    });

    // 获取历史消息（最近 10 条）
    const historyMessages = await this.prisma.chatMessage.findMany({
      where: { sessionId },
      orderBy: { createdAt: 'asc' },
      take: 20,
    });

    // 收集健康上下文（包含来源建议信息）
    const healthContext = await this.collectHealthContext(
      session.memberId,
      session.sourceAdviceId || undefined,
    );

    // 构建消息数组（历史消息用纯文本，当前消息如果带图片则用多模态格式）
    const messages: { role: 'system' | 'user' | 'assistant'; content: any }[] = [
      { role: 'system', content: this.buildSystemPrompt(healthContext) },
      ...historyMessages.map((m) => ({
        role: m.role.toLowerCase() as 'user' | 'assistant',
        content: m.content,
      })),
    ];

    // 如果最后一条用户消息包含图片，构建多模态内容
    const lastDbMsg = historyMessages[historyMessages.length - 1];
    if (lastDbMsg?.role === 'USER' && lastDbMsg.imageUrls) {
      const imageUrls = lastDbMsg.imageUrls as string[];
      if (imageUrls.length > 0) {
        const imageParts = await Promise.all(
          imageUrls.map(async (url) => ({
            type: 'image_url' as const,
            image_url: { url: await this.aiService.imagePathToBase64(url) },
          })),
        );
        messages[messages.length - 1] = {
          role: 'user',
          content: [
            ...imageParts,
            { type: 'text', text: lastDbMsg.content },
          ],
        };
      }
    }

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

      // 更新会话标题（如果是第一条消息，用 AI 生成简短标题）
      // 同步等待标题生成完成，确保前端刷新时能看到新标题
      console.log(`[ChatService] historyMessages.length = ${historyMessages.length}, 是否生成标题: ${historyMessages.length <= 1}`);
      if (historyMessages.length <= 1) {
        console.log(`[ChatService] 开始生成会话标题, sessionId=${sessionId}`);
        await this.generateSessionTitle(sessionId, dto.content, fullContent);
        console.log(`[ChatService] 标题生成完成`);
      }

      // 更新会话时间
      await this.prisma.chatSession.update({
        where: { id: sessionId },
        data: { updatedAt: new Date() },
      });
    }

    return { tokensUsed };
  }

  // 用 AI 生成会话标题
  private async generateSessionTitle(
    sessionId: string,
    userQuestion: string,
    aiResponse: string,
  ): Promise<void> {
    console.log(`[generateSessionTitle] 开始调用 AI 生成标题...`);
    try {
      const result = await this.aiService.chat(
        [
          {
            role: 'user',
            content: `根据下面的健康咨询对话，生成一个简短的中文标题。

用户问题：${userQuestion.substring(0, 200)}

AI回答摘要：${aiResponse.substring(0, 500)}

请生成一个8-15个字的标题，概括这次健康咨询的主题。例如："血压偏高的饮食建议"、"糖尿病日常注意事项"、"体检报告异常指标分析"。

直接输出标题内容：`,
          },
        ],
        { maxTokens: 400, temperature: 0.3 },
      );

      // 清理标题：去除可能的引号、标点和多余空白
      let title = result.content.trim()
        .replace(/^["'"「『【]/, '')  // 去除开头引号
        .replace(/["'"」』】]$/, '')  // 去除结尾引号
        .replace(/^标题[：:]\s*/, '') // 去除可能的"标题："前缀
        .trim()
        .substring(0, 30);

      console.log(`[generateSessionTitle] AI 返回原始内容: "${result.content}", 处理后标题: "${title}"`);

      // 如果标题太短或为空，使用备用方案
      if (!title || title.length < 2) {
        title = userQuestion.length > 20
          ? userQuestion.substring(0, 20) + '...'
          : userQuestion;
        console.log(`[generateSessionTitle] 标题太短，使用备用: "${title}"`);
      }

      await this.prisma.chatSession.update({
        where: { id: sessionId },
        data: { title },
      });
      console.log(`[generateSessionTitle] 标题已更新到数据库`);
    } catch (error) {
      console.error(`[generateSessionTitle] AI 调用失败:`, error);
      // 生成失败时使用用户问题前几个字作为备用
      const fallbackTitle = userQuestion.length > 20
        ? userQuestion.substring(0, 20) + '...'
        : userQuestion;
      await this.prisma.chatSession.update({
        where: { id: sessionId },
        data: { title: fallbackTitle },
      });
      console.log(`[generateSessionTitle] 使用备用标题: "${fallbackTitle}"`);
    }
  }

  // 获取建议的会话统计（按条目类型和索引分组）
  async getAdviceSessionStats(familyId: string, adviceId: string) {
    // 验证建议归属
    const advice = await this.prisma.healthAdvice.findFirst({
      where: {
        id: adviceId,
        member: { familyId },
      },
    });
    if (!advice) {
      throw new ForbiddenException('无权访问此健康建议');
    }

    // 查询所有关联的会话
    const sessions = await this.prisma.chatSession.findMany({
      where: {
        sourceAdviceId: adviceId,
      },
      select: {
        sourceItemType: true,
        sourceItemIndex: true,
      },
    });

    // 构建统计结果
    const stats: Record<string, Record<number, number>> = {
      concern: {},
      suggestion: {},
      action: {},
    };

    for (const session of sessions) {
      if (session.sourceItemType && session.sourceItemIndex !== null) {
        if (!stats[session.sourceItemType][session.sourceItemIndex]) {
          stats[session.sourceItemType][session.sourceItemIndex] = 0;
        }
        stats[session.sourceItemType][session.sourceItemIndex]++;
      }
    }

    return stats;
  }

  // 获取建议条目的关联会话列表
  async findSessionsByAdvice(
    familyId: string,
    adviceId: string,
    itemType?: string,
    itemIndex?: number,
  ) {
    // 验证建议归属
    const advice = await this.prisma.healthAdvice.findFirst({
      where: {
        id: adviceId,
        member: { familyId },
      },
    });
    if (!advice) {
      throw new ForbiddenException('无权访问此健康建议');
    }

    const where: {
      familyId: string;
      sourceAdviceId: string;
      sourceItemType?: string;
      sourceItemIndex?: number;
    } = {
      familyId,
      sourceAdviceId: adviceId,
    };

    if (itemType) {
      where.sourceItemType = itemType;
    }
    if (itemIndex !== undefined) {
      where.sourceItemIndex = itemIndex;
    }

    const sessions = await this.prisma.chatSession.findMany({
      where,
      include: {
        member: { select: { id: true, name: true } },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return sessions.map((s) => this.formatSession(s));
  }

  // 格式化会话输出
  private formatSession(
    session: {
      id: string;
      familyId: string;
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
