import { Body, Controller, Get, Post, Req, Param, Query } from '@nestjs/common';
import { ChatService } from './chat.service';

@Controller('chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Get('conversations')
  getMyConversations(
    @Req() req,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '20',
  ) {
    return this.chatService.getUserConversation(req.user.id, +page, +limit);
  }

  @Post('conversations')
  startConversation(@Req() req, @Body('targetUserId') targetUserId: string) {
    return this.chatService.findOrCreateConversation(req.user.id, targetUserId);
  }

  @Get('conversations/:id/messages')
  getChatHistory(
    @Param('id') conversationId: string,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '50',
  ) {
    return this.chatService.getMessages(conversationId, +page, +limit);
  }
}
