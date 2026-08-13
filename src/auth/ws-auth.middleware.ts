import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Socket } from 'socket.io';

/**
 * Socket.io middleware xác thực JWT cho tất cả WebSocket Gateway.
 * Gắn vào gateway qua afterInit(): server.use(createWsAuthMiddleware(jwtService))
 *
 * Xử lý connection-level authentication — client bị disconnect trước khi vào room
 * nếu token không hợp lệ hoặc hết hạn.
 */
export function createWsAuthMiddleware(jwtService: JwtService) {
  const logger = new Logger('WsAuthMiddleware');

  return async (socket: Socket, next: (err?: Error) => void) => {
    try {
      const authHeader = socket.handshake.auth?.token;
      const token = authHeader?.split(' ')[1] ?? authHeader;

      if (!token) {
        logger.warn(`Client ${socket.id} bị từ chối: không có token`);
        return next(new Error('Unauthorized: Token không được cung cấp'));
      }

      const payload = await jwtService.verifyAsync(token);
      socket.data.user = payload;

      logger.log(
        `✅ Client ${socket.id} xác thực thành công (User: ${payload.sub || payload.id})`,
      );
      next();
    } catch (error) {
      logger.error(
        `❌ Client ${socket.id} xác thực thất bại: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      next(new Error('Unauthorized: Token không hợp lệ hoặc đã hết hạn'));
    }
  };
}
