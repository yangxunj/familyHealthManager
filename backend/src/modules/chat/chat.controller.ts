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
} from '@nestjs/common';
import type { Response } from 'express';
import { ChatService } from './chat.service';
import { CreateSessionDto, SendMessageDto, QuerySessionDto } from './dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { CurrentUserData } from '../auth/decorators/current-user.decorator';

@Controller('chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  // 创建会话
  @Post('sessions')
  createSession(
    @CurrentUser() user: CurrentUserData,
    @Body() dto: CreateSessionDto,
  ) {
    return this.chatService.createSession(user.id, dto);
  }

  // 获取会话列表
  @Get('sessions')
  findAllSessions(
    @CurrentUser() user: CurrentUserData,
    @Query() query: QuerySessionDto,
  ) {
    return this.chatService.findAllSessions(user.id, query);
  }

  // 获取会话详情及消息
  @Get('sessions/:id')
  findSession(
    @CurrentUser() user: CurrentUserData,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.chatService.findSessionWithMessages(user.id, id);
  }

  // 删除会话
  @Delete('sessions/:id')
  deleteSession(
    @CurrentUser() user: CurrentUserData,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.chatService.deleteSession(user.id, id);
  }

  // 发送消息（SSE 流式响应）
  @Post('sessions/:id/messages')
  async sendMessage(
    @CurrentUser() user: CurrentUserData,
    @Param('id', ParseUUIDPipe) sessionId: string,
    @Body() dto: SendMessageDto,
    @Res() res: Response,
  ) {
    // 设置 SSE 响应头
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');

    try {
      await this.chatService.sendMessageStream(
        user.id,
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
