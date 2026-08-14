import { Body, Controller, Get, Post, Req, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ChatService } from './chat.service';

@ApiTags('Chat')
@ApiBearerAuth('JWT-auth')
@Controller('chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Get('conversations')
  @ApiOperation({ summary: 'Lấy danh sách cuộc hội thoại của tôi' })
  getMyConversations(
    @Req() req,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '20',
  ) {
    return this.chatService.getUserConversation(req.user.id, +page, +limit);
  }

  @Post('conversations')
  @ApiOperation({ summary: 'Bắt đầu cuộc hội thoại 1-1 với user khác' })
  startConversation(@Req() req, @Body('targetUserId') targetUserId: string) {
    return this.chatService.findOrCreateConversation(req.user.id, targetUserId);
  }

  @Get('conversations/:id/messages')
  @ApiOperation({ summary: 'Lấy lịch sử tin nhắn của cuộc hội thoại (phân trang)' })
  getChatHistory(
    @Param('id') conversationId: string,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '50',
  ) {
    return this.chatService.getMessages(conversationId, +page, +limit);
  }
}
