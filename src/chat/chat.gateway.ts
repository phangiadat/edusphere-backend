import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { PrismaService } from 'src/prisma/prisma.service';

@WebSocketGateway({
  cors: { origin: '*' },
  namespace: '/chat',
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private logger: Logger = new Logger('ChatGateway');

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  async handleConnection(client: Socket) {
    try {
      const token = client.handshake.auth?.token?.split(' ')[1];
      if (!token) {
        client.disconnect();
        return;
      }
      const payload = await this.jwtService.verifyAsync(token);
      client.data.user = payload;
      this.logger.log(
        `✅ Client KẾT NỐI KÊNH CHAT: ${client.id} (User ID: ${payload.id})`,
      );
    } catch (error) {
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    if (client.data?.user) {
      this.logger.log(`❌ Client NGẮT KẾT NỐI KÊNH CHAT: ${client.id}`);
    }
  }

  @SubscribeMessage('join_conversation')
  handleJoinConversation(
    @ConnectedSocket() client: Socket,
    @MessageBody() conversationId: string,
  ) {
    client.join(conversationId);
    this.logger.log(
      `User ${client.data.user.id} đã tham gia phòng chat: ${conversationId}`,
    );
    return {
      status: 'Joined',
      conversationId,
    };
  }

  @SubscribeMessage('send_message')
  async handleMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { conversationId: string; content: string },
  ) {
    const senderId = client.data.user.id;

    const savedMessage = await this.prisma.message.create({
      data: {
        conversationId: payload.conversationId,
        senderId: senderId,
        content: payload.content,
      },
      include: {
        sender: {
          select: {
            id: true,
            email: true,
            role: true,
          },
        },
      },
    });

    this.server
      .to(payload.conversationId)
      .emit('receive_message', savedMessage);

    await this.prisma.conversation.update({
      where: { id: payload.conversationId },
      data: { updatedAt: new Date() },
    });

    return savedMessage;
  }
}
