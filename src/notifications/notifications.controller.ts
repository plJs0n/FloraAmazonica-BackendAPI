import {
  Controller,
  Get,
  Patch,
  Param,
  UseGuards,
  ParseUUIDPipe,
  Request,
} from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  /**
   * GET /notifications/user/:userId
   * Lista notificaciones del usuario autenticado (ignora el userId del param,
   * usa el del JWT para evitar que un usuario vea las de otro).
   */
  @Get('user/:userId')
  findAll(@Param('userId', ParseUUIDPipe) _userId: string, @Request() req) {
    return this.notificationsService.findAll(req.user.id);
  }

  /**
   * PATCH /notifications/:id/read
   * Marca una notificación como leída.
   */
  @Patch(':id/read')
  markAsRead(@Param('id', ParseUUIDPipe) id: string, @Request() req) {
    return this.notificationsService.markAsRead(id, req.user.id);
  }

  /**
   * PATCH /notifications/user/:userId/read-all
   * Marca todas las notificaciones del usuario como leídas.
   */
  @Patch('user/:userId/read-all')
  markAllAsRead(@Param('userId', ParseUUIDPipe) _userId: string, @Request() req) {
    return this.notificationsService.markAllAsRead(req.user.id);
  }
}
