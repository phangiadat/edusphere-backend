import { Controller, Get, Param, Patch, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { NotificationsService } from './notifications.service';

@ApiTags('Notifications')
@ApiBearerAuth('JWT-auth')
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationService: NotificationsService) {}

  @Get()
  @ApiOperation({ summary: 'Lấy danh sách 20 thông báo gần nhất' })
  getUserNotifications(@Req() req) {
    return this.notificationService.getUserNotifications(req.user.id);
  }

  @Patch(':id/read')
  @ApiOperation({ summary: 'Đánh dấu thông báo đã đọc' })
  markAsRead(@Param('id') id: string, @Req() req) {
    return this.notificationService.markAsRead(id, req.user.id);
  }
}
