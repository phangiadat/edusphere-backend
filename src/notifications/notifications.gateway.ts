import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { createWsAuthMiddleware } from 'src/auth/ws-auth.middleware';

@WebSocketGateway({
  cors: {
    origin: process.env.FRONTEND_URL ?? 'http://localhost:5173',
  },
})
export class NotificationsGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private logger: Logger = new Logger('NotificationsGateway');

  constructor(private readonly jwtService: JwtService) {}

  afterInit(server: Server) {
    server.use(createWsAuthMiddleware(this.jwtService));
    this.logger.log('Notifications WebSocket đã sẵn sàng hoạt động');
  }

  handleConnection(client: Socket) {
    if (client.data?.user) {
      const userId = client.data.user.sub || client.data.user.id;
      client.join(userId);

      this.logger.log(
        `✅ Client ${client.id} KẾT NỐI và đã chui vào phòng: ${userId}`,
      );
    }
  }

  public sendNotificationToUser(userId: string, data: any) {
    this.server.to(userId).emit('new_notification', data);

    this.logger.log(`Đã bắn thông báo vào phòng của User ${userId}`);
  }

  handleDisconnect(client: Socket) {
    if (client.data?.user) {
      this.logger.log(`Client NGẮT KẾT NỐI: ${client.id}`);
    }
  }
}
