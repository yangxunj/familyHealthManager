import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  Res,
  ParseUUIDPipe,
  ForbiddenException,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { Response } from 'express';
import { ChatService } from './chat.service';
import { CreateSessionDto, SendMessageDto, QuerySessionDto } from './dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { CurrentUserData } from '../auth/decorators/current-user.decorator';

@Controller('chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  private requireFamily(user: CurrentUserData): string {
    if (!user.familyId) {
      throw new ForbiddenException('请先创建或加入一个家庭');
    }
    return user.familyId;
  }

  // 创建会话
  @Post('sessions')
  createSession(
    @CurrentUser() user: CurrentUserData,
    @Body() dto: CreateSessionDto,
  ) {
    const familyId = this.requireFamily(user);
    return this.chatService.createSession(familyId, user.id, dto);
  }

  // 获取会话列表
  @Get('sessions')
  findAllSessions(
    @CurrentUser() user: CurrentUserData,
    @Query() query: QuerySessionDto,
  ) {
    const familyId = this.requireFamily(user);
    return this.chatService.findAllSessions(familyId, query);
  }

  // 获取会话详情及消息
  @Get('sessions/:id')
  findSession(
    @CurrentUser() user: CurrentUserData,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const familyId = this.requireFamily(user);
    return this.chatService.findSessionWithMessages(familyId, id);
  }

  // 删除会话
  @Delete('sessions/:id')
  deleteSession(
    @CurrentUser() user: CurrentUserData,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const familyId = this.requireFamily(user);
    return this.chatService.deleteSession(familyId, id);
  }

  // 发送消息（SSE 流式响应）
  @Post('sessions/:id/messages')
  @Throttle({ short: { limit: 20, ttl: 60000 } }) // AI 对话限流：20次/分钟
  async sendMessage(
    @CurrentUser() user: CurrentUserData,
    @Param('id', ParseUUIDPipe) sessionId: string,
    @Body() dto: SendMessageDto,
    @Res() res: Response,
  ) {
    const familyId = this.requireFamily(user);

    // 设置 SSE 响应头
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');

    try {
      await this.chatService.sendMessageStream(
        familyId,
        sessionId,
        dto,
        (chunk) => {
          if (chunk.done) {
            res.write(`event: done\ndata: ${JSON.stringify({ tokensUsed: chunk.tokensUsed })}\n\n`);
          } else {
            res.write(`event: message\ndata: ${JSON.stringify({ content: chunk.content, done: false })}\n\n`);
          }
        },
      );

      res.end();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '未知错误';
      res.write(`event: error\ndata: ${JSON.stringify({ error: errorMessage })}\n\n`);
      res.end();
    }
  }
}
