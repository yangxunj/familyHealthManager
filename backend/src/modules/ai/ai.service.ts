import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import * as fs from 'fs';
import * as path from 'path';
import * as pdfPoppler from 'pdf-poppler';

// DashScope API 响应类型
interface DashScopeMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

// OCR 识别结果
export interface OcrResult {
  success: boolean;
  text: string;
  error?: string;
  tokensUsed?: number;
}

// 健康报告解析结果
export interface HealthReportParseResult {
  success: boolean;
  data?: ParsedHealthData;
  error?: string;
  tokensUsed?: number;
}

// 健康指标
export interface HealthIndicator {
  name: string;
  value: string | number;
  unit?: string;
  referenceRange?: string;
  isAbnormal?: boolean;
  category?: string;
}

// 解析后的健康数据
export interface ParsedHealthData {
  reportDate?: string;
  institution?: string;
  patientInfo?: {
    name?: string;
    gender?: string;
    age?: number;
  };
  indicators: HealthIndicator[];
  summary?: string;
  rawText: string;
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
export class AiService implements OnModuleInit {
  private readonly logger = new Logger(AiService.name);
  private readonly apiKey: string;
  private readonly baseUrl = 'https://dashscope.aliyuncs.com/compatible-mode/v1';
  private readonly defaultModel = 'qwen-plus';
  private readonly ocrModel = 'qwen-vl-ocr';
  private openaiClient: OpenAI | null = null;

  constructor(private configService: ConfigService) {
    this.apiKey = this.configService.get<string>('DASHSCOPE_API_KEY') || '';
    if (!this.apiKey) {
      this.logger.warn('DASHSCOPE_API_KEY is not configured');
    }
  }

  onModuleInit() {
    this.initOpenAIClient();
  }

  // 初始化 OpenAI 客户端（用于 OCR）
  private initOpenAIClient(): boolean {
    if (!this.apiKey) {
      this.logger.warn('无法初始化 OpenAI 客户端：API Key 未配置');
      return false;
    }

    try {
      this.openaiClient = new OpenAI({
        apiKey: this.apiKey,
        baseURL: this.baseUrl,
      });
      this.logger.log('OpenAI 客户端初始化成功');
      return true;
    } catch (error) {
      this.logger.error('OpenAI 客户端初始化失败', error);
      this.openaiClient = null;
      return false;
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

      const data = await response.json();
      this.logger.log(`DashScope 响应 keys: ${Object.keys(data).join(', ')}`);

      // 兼容 DashScope 原生格式和 OpenAI 兼容格式
      const content =
        data.output?.choices?.[0]?.message?.content ||
        data.choices?.[0]?.message?.content ||
        '';
      const tokensUsed =
        data.usage?.total_tokens || 0;

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
    documentContent?: string;
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

${healthData.documentContent ? `## 健康文档详细内容\n${healthData.documentContent}` : healthData.documentSummary ? `## 健康文档摘要\n${healthData.documentSummary}` : ''}

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

  // 将本地图片路径转换为 base64 Data URL
  private async imagePathToBase64(imagePath: string): Promise<string> {
    // 如果已经是 URL（http/https/data:），直接返回
    if (
      imagePath.startsWith('http://') ||
      imagePath.startsWith('https://') ||
      imagePath.startsWith('data:')
    ) {
      return imagePath;
    }

    // 处理本地文件路径
    let fullPath = imagePath;

    // 如果是相对路径（以 /uploads 开头），转换为绝对路径
    if (imagePath.startsWith('/uploads')) {
      fullPath = path.join(process.cwd(), '.' + imagePath);
    }

    // 检查文件是否存在
    if (!fs.existsSync(fullPath)) {
      throw new Error(`图片文件不存在: ${fullPath}`);
    }

    // 读取文件并转换为 base64
    const fileBuffer = fs.readFileSync(fullPath);
    const base64 = fileBuffer.toString('base64');

    // 获取文件扩展名来确定 MIME 类型
    const ext = path.extname(fullPath).toLowerCase();
    const mimeTypes: Record<string, string> = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.webp': 'image/webp',
      '.pdf': 'application/pdf',
    };
    const mimeType = mimeTypes[ext] || 'image/jpeg';

    return `data:${mimeType};base64,${base64}`;
  }

  // 检查文件是否为 PDF
  private isPdf(filePath: string): boolean {
    return path.extname(filePath).toLowerCase() === '.pdf';
  }

  // 将 PDF 转换为图片（每页一张）
  private async convertPdfToImages(pdfPath: string): Promise<string[]> {
    // 创建临时目录存放转换后的图片
    const tempDir = path.join(path.dirname(pdfPath), 'temp_pdf_images');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    const outputPrefix = path.join(tempDir, 'page');

    const options: Parameters<typeof pdfPoppler.convert>[1] = {
      format: 'png' as const,
      out_dir: tempDir,
      out_prefix: 'page',
      page: null, // 转换所有页面
      scale: 2048, // 输出图片宽度，保证清晰度
    };

    try {
      this.logger.log(`开始将 PDF 转换为图片: ${pdfPath}`);
      await pdfPoppler.convert(pdfPath, options);

      // 获取生成的图片文件列表
      const files = fs.readdirSync(tempDir)
        .filter(f => f.startsWith('page') && f.endsWith('.png'))
        .sort((a, b) => {
          // 按页码排序：page-1.png, page-2.png, ...
          const numA = parseInt(a.match(/page-(\d+)/)?.[1] || '0');
          const numB = parseInt(b.match(/page-(\d+)/)?.[1] || '0');
          return numA - numB;
        })
        .map(f => path.join(tempDir, f));

      this.logger.log(`PDF 转换完成，共 ${files.length} 页`);
      return files;
    } catch (error) {
      this.logger.error(`PDF 转换失败: ${(error as Error).message}`);
      throw new Error(`PDF 转换失败: ${(error as Error).message}`);
    }
  }

  // 清理临时文件
  private cleanupTempFiles(files: string[]): void {
    for (const file of files) {
      try {
        if (fs.existsSync(file)) {
          fs.unlinkSync(file);
        }
      } catch {
        // 忽略清理错误
      }
    }
    // 尝试删除临时目录
    if (files.length > 0) {
      const tempDir = path.dirname(files[0]);
      try {
        if (fs.existsSync(tempDir) && fs.readdirSync(tempDir).length === 0) {
          fs.rmdirSync(tempDir);
        }
      } catch {
        // 忽略删除目录错误
      }
    }
  }

  // OCR 图片识别
  async recognizeImage(imageUrl: string): Promise<OcrResult> {
    if (!this.openaiClient) {
      return {
        success: false,
        text: '',
        error: 'OpenAI 客户端未初始化',
      };
    }

    try {
      this.logger.log(`开始 OCR 识别: ${imageUrl.substring(0, 50)}...`);

      // 将本地路径转换为 base64
      const processedUrl = await this.imagePathToBase64(imageUrl);
      this.logger.log('图片已转换为 base64 格式');

      const response = await this.openaiClient.chat.completions.create({
        model: this.ocrModel,
        messages: [
          {
            role: 'user',
            content: [
              { type: 'image_url', image_url: { url: processedUrl } },
              {
                type: 'text',
                text: `请识别图片中的所有文字内容。
要求：
1. 完整识别所有文字，包括标题、表格、数值等
2. 保持原文的结构和格式
3. 如有表格，请保持表格结构
4. 只返回识别出的文字，不要添加解释`,
              },
            ],
          },
        ],
      });

      if (!response.choices || response.choices.length === 0) {
        return {
          success: false,
          text: '',
          error: 'OCR API 返回的 choices 为空',
        };
      }

      const content = response.choices[0].message.content || '';
      const cleanedText = this.cleanOcrText(content);

      this.logger.log('OCR 识别成功');

      return {
        success: true,
        text: cleanedText,
        tokensUsed: response.usage?.total_tokens,
      };
    } catch (error) {
      this.logger.error(`OCR 识别失败: ${(error as Error).message}`);
      return {
        success: false,
        text: '',
        error: `OCR 识别失败: ${(error as Error).message}`,
      };
    }
  }

  // 清理 OCR 文本
  private cleanOcrText(text: string): string {
    return text
      .replace(/```[\s\S]*?```/g, '')
      .replace(/```/g, '')
      .trim();
  }

  // 解析健康报告（支持图片和 PDF）
  async parseHealthReport(filePath: string): Promise<HealthReportParseResult> {
    let ocrResult: OcrResult;
    let tempFiles: string[] = [];

    try {
      // 检查是否为 PDF 文件
      if (this.isPdf(filePath)) {
        this.logger.log('检测到 PDF 文件，开始转换为图片...');

        // 将 PDF 转换为图片
        const imageFiles = await this.convertPdfToImages(filePath);
        tempFiles = imageFiles;

        if (imageFiles.length === 0) {
          return {
            success: false,
            error: 'PDF 转换失败：未生成任何图片',
          };
        }

        // 逐页进行 OCR 识别
        const pageTexts: string[] = [];
        let totalTokens = 0;

        for (let i = 0; i < imageFiles.length; i++) {
          this.logger.log(`正在识别第 ${i + 1}/${imageFiles.length} 页...`);
          const pageResult = await this.recognizeImage(imageFiles[i]);

          if (!pageResult.success) {
            this.logger.warn(`第 ${i + 1} 页识别失败: ${pageResult.error}`);
            continue; // 跳过失败的页面，继续处理其他页
          }

          pageTexts.push(`--- 第 ${i + 1} 页 ---\n${pageResult.text}`);
          totalTokens += pageResult.tokensUsed || 0;
        }

        if (pageTexts.length === 0) {
          return {
            success: false,
            error: 'PDF 所有页面 OCR 识别均失败',
          };
        }

        // 合并所有页面的文本
        ocrResult = {
          success: true,
          text: pageTexts.join('\n\n'),
          tokensUsed: totalTokens,
        };

        this.logger.log(`PDF OCR 完成，共识别 ${pageTexts.length} 页`);
      } else {
        // 普通图片直接 OCR
        ocrResult = await this.recognizeImage(filePath);
        if (!ocrResult.success) {
          return {
            success: false,
            error: ocrResult.error,
          };
        }
      }

      // 使用 AI 解析健康数据
      const parsePrompt = `你是一位专业的医疗数据分析师。请分析以下健康报告/体检报告的 OCR 文本，提取其中的健康指标数据。

请严格按照以下 JSON 格式输出，不要输出任何其他内容：

{
  "reportDate": "YYYY-MM-DD 格式的报告日期，如无法确定则为 null",
  "institution": "医疗机构名称，如无法确定则为 null",
  "patientInfo": {
    "name": "患者姓名，如无法确定则为 null",
    "gender": "性别（男/女），如无法确定则为 null",
    "age": 年龄数字，如无法确定则为 null
  },
  "indicators": [
    {
      "name": "指标名称",
      "value": "数值或文字结果",
      "unit": "单位，如无则为 null",
      "referenceRange": "参考范围，如无则为 null",
      "isAbnormal": true/false 是否异常,
      "category": "分类（如：血常规、肝功能、肾功能、血脂、血糖、尿常规、其他）"
    }
  ],
  "summary": "报告整体总结，100字以内"
}

注意事项：
1. 尽可能识别所有健康指标
2. 根据参考范围判断是否异常
3. 如果某个字段无法确定，使用 null
4. indicators 数组不能为空，至少要提取出一些信息

以下是 OCR 识别出的文本内容：

${ocrResult.text}`;

      const result = await this.chat(
        [{ role: 'user', content: parsePrompt }],
        { maxTokens: 8000 }, // 健康报告可能包含大量指标，需要更多输出空间
      );

      // 解析返回的 JSON
      const parsedData = this.parseHealthReportJson(result.content);

      if (!parsedData) {
        return {
          success: false,
          error: '无法解析健康报告数据',
          tokensUsed: (ocrResult.tokensUsed || 0) + result.tokensUsed,
        };
      }

      // 添加原始文本
      parsedData.rawText = ocrResult.text;

      return {
        success: true,
        data: parsedData,
        tokensUsed: (ocrResult.tokensUsed || 0) + result.tokensUsed,
      };
    } catch (error) {
      this.logger.error(`健康报告解析失败: ${(error as Error).message}`);
      return {
        success: false,
        error: `健康报告解析失败: ${(error as Error).message}`,
      };
    } finally {
      // 清理临时文件
      if (tempFiles.length > 0) {
        this.cleanupTempFiles(tempFiles);
      }
    }
  }

  // 解析健康报告 JSON
  private parseHealthReportJson(content: string): ParsedHealthData | null {
    try {
      // 尝试提取 JSON 部分
      let jsonStr = content;
      const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/);
      if (jsonMatch) {
        jsonStr = jsonMatch[1];
      } else {
        const startIndex = content.indexOf('{');
        const endIndex = content.lastIndexOf('}');
        if (startIndex !== -1 && endIndex !== -1) {
          jsonStr = content.substring(startIndex, endIndex + 1);
        }
      }

      const parsed = JSON.parse(jsonStr);

      // 验证必要字段
      if (!Array.isArray(parsed.indicators)) {
        throw new Error('Invalid health report format: indicators must be an array');
      }

      return {
        reportDate: parsed.reportDate || undefined,
        institution: parsed.institution || undefined,
        patientInfo: parsed.patientInfo || undefined,
        indicators: parsed.indicators.map((ind: HealthIndicator) => ({
          name: ind.name || '未知指标',
          value: ind.value,
          unit: ind.unit || undefined,
          referenceRange: ind.referenceRange || undefined,
          isAbnormal: ind.isAbnormal || false,
          category: ind.category || '其他',
        })),
        summary: parsed.summary || undefined,
        rawText: '',
      };
    } catch (error) {
      this.logger.error('Failed to parse health report JSON', error);
      return null;
    }
  }

  // OCR 文档（带进度回调）
  async ocrDocument(
    filePath: string,
    onProgress?: (current: number, total: number, message: string) => void,
  ): Promise<OcrResult> {
    let tempFiles: string[] = [];

    try {
      // 检查是否为 PDF 文件
      if (this.isPdf(filePath)) {
        this.logger.log('检测到 PDF 文件，开始转换为图片...');
        onProgress?.(0, 1, '正在将 PDF 转换为图片...');

        // 将 PDF 转换为图片
        const imageFiles = await this.convertPdfToImages(filePath);
        tempFiles = imageFiles;

        if (imageFiles.length === 0) {
          return {
            success: false,
            text: '',
            error: 'PDF 转换失败：未生成任何图片',
          };
        }

        const totalPages = imageFiles.length;
        onProgress?.(0, totalPages, `PDF 共 ${totalPages} 页，开始 OCR 识别...`);

        // 逐页进行 OCR 识别
        const pageTexts: string[] = [];
        let totalTokens = 0;

        for (let i = 0; i < imageFiles.length; i++) {
          const pageNum = i + 1;
          this.logger.log(`正在识别第 ${pageNum}/${totalPages} 页...`);
          onProgress?.(pageNum, totalPages, `正在识别第 ${pageNum}/${totalPages} 页...`);

          const pageResult = await this.recognizeImage(imageFiles[i]);

          if (!pageResult.success) {
            this.logger.warn(`第 ${pageNum} 页识别失败: ${pageResult.error}`);
            continue; // 跳过失败的页面，继续处理其他页
          }

          pageTexts.push(`--- 第 ${pageNum} 页 ---\n${pageResult.text}`);
          totalTokens += pageResult.tokensUsed || 0;
        }

        if (pageTexts.length === 0) {
          return {
            success: false,
            text: '',
            error: 'PDF 所有页面 OCR 识别均失败',
          };
        }

        this.logger.log(`PDF OCR 完成，共识别 ${pageTexts.length} 页`);

        return {
          success: true,
          text: pageTexts.join('\n\n'),
          tokensUsed: totalTokens,
        };
      } else {
        // 普通图片直接 OCR
        onProgress?.(1, 1, '正在识别图片...');
        return await this.recognizeImage(filePath);
      }
    } catch (error) {
      this.logger.error(`OCR 文档失败: ${(error as Error).message}`);
      return {
        success: false,
        text: '',
        error: `OCR 文档失败: ${(error as Error).message}`,
      };
    } finally {
      // 清理临时文件
      if (tempFiles.length > 0) {
        this.cleanupTempFiles(tempFiles);
      }
    }
  }

  // AI 规整 OCR 文本（纠正错别字 + 整理为 Markdown 格式）
  async formatOcrText(ocrText: string): Promise<{ success: boolean; markdown?: string; error?: string; tokensUsed?: number }> {
    try {
      const prompt = `你是一位医疗文档整理助手。下面是一份健康报告/体检报告经过 OCR 识别得到的原始文本。

请你完成以下两项工作：
1. **纠正错别字**：OCR 识别可能存在错误，请根据医学常识修正明显的错别字（如"白细胞"被识别为"白细胸"、"血红蛋白"被识别为"血红蛋日"等）
2. **整理为 Markdown 格式**：将内容整理成结构清晰、易于阅读的 Markdown 文档

要求：
- 忠实还原原文内容，不要添加原文中没有的信息
- 不要做任何医学分析或解读
- 不要添加建议或评论
- 保留所有指标的数值、单位、参考范围等原始信息
- 用表格呈现检验指标（列：项目名称、结果、单位、参考范围）
- 如果原文有异常标记（如↑↓、H/L、*号等），在结果中保留这些标记
- 按报告的原始分类（如血常规、肝功能等）分组
- 如果能识别出报告日期、机构、患者信息，放在开头

请直接输出 Markdown 内容，不要用代码块包裹。

以下是 OCR 识别出的原始文本：

${ocrText}`;

      this.logger.log(`AI 规整: OCR 文本长度 = ${ocrText.length}`);

      const result = await this.chat(
        [{ role: 'user', content: prompt }],
        { maxTokens: 8000 },
      );

      this.logger.log(`AI 规整: 返回内容长度 = ${result.content.length}, tokens = ${result.tokensUsed}`);

      if (!result.content || result.content.trim().length === 0) {
        return {
          success: false,
          error: 'AI 返回内容为空',
          tokensUsed: result.tokensUsed,
        };
      }

      return {
        success: true,
        markdown: result.content.trim(),
        tokensUsed: result.tokensUsed,
      };
    } catch (error) {
      this.logger.error(`AI 规整 OCR 文本失败: ${(error as Error).message}`);
      return {
        success: false,
        error: `AI 规整失败: ${(error as Error).message}`,
      };
    }
  }
}
