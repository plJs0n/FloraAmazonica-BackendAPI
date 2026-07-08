import { Module, Global } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Notification } from './notification.entity';
import { NotificationsService } from './notifications.service';
import { NotificationsController } from './notifications.controller';
import { SpeciesRecord } from '../species/entities/species-record.entity';

/**
 * Global: cualquier módulo puede inyectar NotificationsService sin importar NotificationsModule.
 * El envío de correo usa Resend (HTTPS) en lugar de SMTP para compatibilidad con Railway.
 */
@Global()
@Module({
  imports: [TypeOrmModule.forFeature([Notification, SpeciesRecord])],
  providers: [NotificationsService],
  controllers: [NotificationsController],
  exports: [NotificationsService],
})
export class NotificationsModule {}
