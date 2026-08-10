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

@WebSocketGateway({
  cors: {
    origin: '*',
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
    this.logger.log('Websockets đã sẵn sàng hoạt động');
  }

  async handleConnection(client: Socket, ...args: any[]) {
    try {
      const token = client.handshake.auth?.token?.split(' ')[1];
      if (!token) {
        this.logger.warn(`Client ${client.id} bị đuổi vì không có Token`);
        client.disconnect();
        return;
      }

      const payload = await this.jwtService.verifyAsync(token);

      const roomName = payload.id;
      client.join(roomName);

      client.data.user = payload;

      this.logger.log(
        `✅ Client ${client.id} KẾT NỐI và đã chui vào phòng: ${roomName}`,
      );
    } catch (error) {
      this.logger.error(
        `❌ Client ${client.id} bị ĐUỔI vì Token sai hoặc hết hạn!`,
      );
      client.disconnect();
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
