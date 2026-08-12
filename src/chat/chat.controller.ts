import { Body, Controller, Get, Post, Req, Param } from '@nestjs/common';
import { ChatService } from './chat.service';

@Controller('chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Get('conversations')
  getMyConversations(@Req() req) {
    return this.chatService.getUserConversation(req.user.id);
  }

  @Post('conversations')
  startConversation(@Req() req, @Body('targetUserId') targetUserId: string) {
    return this.chatService.findOrCreateConversation(req.user.id, targetUserId);
  }

  @Get('conversations/:id/messages')
  getChatHistory(@Param('id') conversationId: string) {
    return this.chatService.getMessages(conversationId);
  }
}
