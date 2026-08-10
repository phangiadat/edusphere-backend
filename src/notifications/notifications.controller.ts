import { Controller, Get, Param, Patch, Req } from '@nestjs/common';
import { NotificationsService } from './notifications.service';

@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationService: NotificationsService) {}

  @Get()
  getUserNotifications(@Req() req) {
    return this.notificationService.getUserNotifications(req.user.id);
  }

  @Patch(':id/read')
  markAsRead(@Param('id') id: string, @Req() req) {
    return this.notificationService.markAsRead(id, req.user.id);
  }
}
