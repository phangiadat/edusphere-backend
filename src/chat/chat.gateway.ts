import { Logger, UseGuards } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { ChatService } from './chat.service';
import { createWsAuthMiddleware } from 'src/auth/ws-auth.middleware';
import { WsJwtGuard } from 'src/auth/guards/ws-jwt.guard';

@WebSocketGateway({
  cors: { origin: process.env.FRONTEND_URL ?? 'http://localhost:5173' },
  namespace: '/chat',
})
export class ChatGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private logger: Logger = new Logger('ChatGateway');

  constructor(
    private chatService: ChatService,
    private jwtService: JwtService,
  ) {}

  afterInit(server: Server) {
    server.use(createWsAuthMiddleware(this.jwtService));
    this.logger.log('Chat WebSocket đã sẵn sàng hoạt động');
  }

  handleConnection(client: Socket) {
    if (client.data?.user) {
      this.logger.log(
        `✅ Client KẾT NỐI KÊNH CHAT: ${client.id} (User: ${client.data.user.sub || client.data.user.id})`,
      );
    }
  }

  handleDisconnect(client: Socket) {
    if (client.data?.user) {
      this.logger.log(`❌ Client NGẮT KẾT NỐI KÊNH CHAT: ${client.id}`);
    }
  }

  @UseGuards(WsJwtGuard)
  @SubscribeMessage('join_conversation')
  handleJoinConversation(
    @ConnectedSocket() client: Socket,
    @MessageBody() conversationId: string,
  ) {
    client.join(conversationId);
    this.logger.log(
      `User ${client.data.user.sub || client.data.user.id} đã tham gia phòng chat: ${conversationId}`,
    );
    return {
      status: 'Joined',
      conversationId,
    };
  }

  @UseGuards(WsJwtGuard)
  @SubscribeMessage('send_message')
  async handleMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { conversationId: string; content: string },
  ) {
    try {
      const senderId = client.data.user.sub || client.data.user.id;

      const savedMessage = await this.chatService.sendMessage(
        payload.conversationId,
        senderId,
        payload.content,
      );

      this.server
        .to(payload.conversationId)
        .emit('receive_message', savedMessage);

      return savedMessage;
    } catch (error) {
      this.logger.error(
        `Lỗi gửi tin nhắn: ${error instanceof Error ? error.message : 'Unknown'}`,
      );
      client.emit('error_message', {
        message: 'Không thể gửi tin nhắn. Vui lòng thử lại.',
      });
    }
  }
}
