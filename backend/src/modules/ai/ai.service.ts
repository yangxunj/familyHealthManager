import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

// DashScope API 响应类型
interface DashScopeMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface DashScopeChoice {
  message: {
    role: string;
    content: string;
  };
  finish_reason: string;
}

interface DashScopeUsage {
  input_tokens: number;
  output_tokens: number;
  total_tokens: number;
}

interface DashScopeResponse {
  output: {
    choices: DashScopeChoice[];
  };
  usage: DashScopeUsage;
  request_id: string;
}

export interface AiCompletionResult {
  content: string;
  tokensUsed: number;
  model: string;
}

export interface AiStreamChunk {
  content: string;
  done: boolean;
  tokensUsed?: number;
}

export type AiStreamCallback = (chunk: AiStreamChunk) => void;

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private readonly apiKey: string;
  private readonly baseUrl = 'https://dashscope.aliyuncs.com/compatible-mode/v1';
  private readonly defaultModel = 'qwen-plus';

  constructor(private configService: ConfigService) {
    this.apiKey = this.configService.get<string>('DASHSCOPE_API_KEY') || '';
    if (!this.apiKey) {
      this.logger.warn('DASHSCOPE_API_KEY is not configured');
    }
  }

  // 检查 API Key 是否配置
  isConfigured(): boolean {
    return !!this.apiKey;
  }

  // 调用通义千问 API
  async chat(
    messages: DashScopeMessage[],
    options?: {
      model?: string;
      temperature?: number;
      maxTokens?: number;
    },
  ): Promise<AiCompletionResult> {
    if (!this.apiKey) {
      throw new Error('DASHSCOPE_API_KEY is not configured');
    }

    const model = options?.model || this.defaultModel;

    try {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages,
          temperature: options?.temperature ?? 0.7,
          max_tokens: options?.maxTokens ?? 2000,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        this.logger.error(`DashScope API error: ${response.status} - ${errorText}`);
        throw new Error(`AI service error: ${response.status}`);
      }

      const data = (await response.json()) as DashScopeResponse;

      const content = data.output?.choices?.[0]?.message?.content || '';
      const tokensUsed = data.usage?.total_tokens || 0;

      return {
        content,
        tokensUsed,
        model,
      };
    } catch (error) {
      this.logger.error('Failed to call DashScope API', error);
      throw error;
    }
  }

  // 流式调用通义千问 API
  async chatStream(
    messages: DashScopeMessage[],
    onChunk: AiStreamCallback,
    options?: {
      model?: string;
      temperature?: number;
      maxTokens?: number;
    },
  ): Promise<void> {
    if (!this.apiKey) {
      throw new Error('DASHSCOPE_API_KEY is not configured');
    }

    const model = options?.model || this.defaultModel;

    try {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages,
          temperature: options?.temperature ?? 0.7,
          max_tokens: options?.maxTokens ?? 2000,
          stream: true,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        this.logger.error(`DashScope API error: ${response.status} - ${errorText}`);
        throw new Error(`AI service error: ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('Failed to get response reader');
      }

      const decoder = new TextDecoder();
      let buffer = '';
      let totalTokens = 0;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmedLine = line.trim();
          if (!trimmedLine || trimmedLine === 'data: [DONE]') continue;

          if (trimmedLine.startsWith('data: ')) {
            try {
              const data = JSON.parse(trimmedLine.slice(6));
              const content = data.choices?.[0]?.delta?.content || '';

              if (data.usage) {
                totalTokens = data.usage.total_tokens || 0;
              }

              if (content) {
                onChunk({ content, done: false });
              }

              if (data.choices?.[0]?.finish_reason === 'stop') {
                onChunk({ content: '', done: true, tokensUsed: totalTokens });
              }
            } catch {
              // 忽略解析错误的行
            }
          }
        }
      }

      // 确保发送结束信号
      onChunk({ content: '', done: true, tokensUsed: totalTokens });
    } catch (error) {
      this.logger.error('Failed to call DashScope streaming API', error);
      throw error;
    }
  }

  // 生成健康建议
  async generateHealthAdvice(healthData: {
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
  }): Promise<AiCompletionResult> {
    const systemPrompt = `你是一位专业的健康顾问AI助手。你的任务是根据用户提供的健康数据，生成个性化的健康建议报告。

请严格按照以下JSON格式输出，不要输出任何其他内容：

{
  "healthScore": <0-100的整数，代表整体健康评分>,
  "summary": "<200字以内的健康状况总结>",
  "concerns": [
    {
      "level": "<critical/warning/info>",
      "title": "<关注事项标题>",
      "description": "<详细描述>"
    }
  ],
  "suggestions": [
    {
      "category": "<饮食/运动/作息/用药/检查/其他>",
      "title": "<建议标题>",
      "content": "<具体建议内容>"
    }
  ],
  "actionItems": [
    {
      "text": "<具体行动项>",
      "priority": "<high/medium/low>"
    }
  ]
}

评分规则：
- 90-100：健康状况优秀
- 80-89：健康状况良好
- 70-79：健康状况一般，需要关注
- 60-69：健康状况欠佳，需要改善
- 60以下：健康状况较差，建议就医

注意事项：
1. 如果数据不足，请在summary中说明，并给出保守的评分
2. concerns按严重程度排序，critical > warning > info
3. suggestions要具体可执行，不要泛泛而谈
4. actionItems控制在3-5项，优先级高的放前面
5. 所有建议仅供参考，不能替代专业医疗诊断`;

    const userPrompt = `请分析以下健康数据并生成建议报告：

## 基本信息
- 姓名：${healthData.memberInfo.name}
- 年龄：${healthData.memberInfo.age}岁
- 性别：${healthData.memberInfo.gender === 'MALE' ? '男' : '女'}
${healthData.memberInfo.bloodType ? `- 血型：${healthData.memberInfo.bloodType}` : ''}
${healthData.memberInfo.chronicDiseases?.length ? `- 慢性病史：${healthData.memberInfo.chronicDiseases.join('、')}` : ''}

## 近期健康记录
${
  healthData.recentRecords.length > 0
    ? healthData.recentRecords
        .map(
          (r) =>
            `- ${r.date} ${r.type}：${r.value}${r.unit}${r.isAbnormal ? ' ⚠️异常' : ''}`,
        )
        .join('\n')
    : '暂无健康记录数据'
}

${healthData.documentSummary ? `## 健康文档摘要\n${healthData.documentSummary}` : ''}

请根据以上数据生成健康建议报告。`;

    return this.chat([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ]);
  }

  // 解析 AI 返回的 JSON
  parseAdviceJson(content: string): {
    healthScore: number;
    summary: string;
    concerns: { level: string; title: string; description: string }[];
    suggestions: { category: string; title: string; content: string }[];
    actionItems: { text: string; priority: string }[];
  } | null {
    try {
      // 尝试提取 JSON 部分（处理可能的 markdown 代码块）
      let jsonStr = content;
      const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/);
      if (jsonMatch) {
        jsonStr = jsonMatch[1];
      } else {
        // 尝试直接查找 JSON 对象
        const startIndex = content.indexOf('{');
        const endIndex = content.lastIndexOf('}');
        if (startIndex !== -1 && endIndex !== -1) {
          jsonStr = content.substring(startIndex, endIndex + 1);
        }
      }

      const parsed = JSON.parse(jsonStr);

      // 验证必要字段
      if (
        typeof parsed.healthScore !== 'number' ||
        typeof parsed.summary !== 'string'
      ) {
        throw new Error('Invalid advice format');
      }

      return {
        healthScore: Math.min(100, Math.max(0, parsed.healthScore)),
        summary: parsed.summary,
        concerns: Array.isArray(parsed.concerns) ? parsed.concerns : [],
        suggestions: Array.isArray(parsed.suggestions) ? parsed.suggestions : [],
        actionItems: Array.isArray(parsed.actionItems) ? parsed.actionItems : [],
      };
    } catch (error) {
      this.logger.error('Failed to parse AI advice JSON', error);
      return null;
    }
  }
}
