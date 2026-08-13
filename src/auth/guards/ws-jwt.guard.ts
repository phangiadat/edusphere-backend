import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { WsException } from '@nestjs/websockets';
import { Socket } from 'socket.io';

/**
 * Guard bảo vệ từng @SubscribeMessage() handler trên WebSocket.
 * Kiểm tra client.data.user đã được set bởi WsAuthMiddleware ở connection-level.
 * Throw WsException nếu chưa xác thực.
 */
@Injectable()
export class WsJwtGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const client: Socket = context.switchToWs().getClient<Socket>();

    if (!client.data?.user) {
      throw new WsException(
        'Unauthorized: Token không hợp lệ hoặc đã hết hạn',
      );
    }

    return true;
  }
}
