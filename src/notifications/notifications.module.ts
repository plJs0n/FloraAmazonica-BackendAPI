import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Notification } from './notification.entity';

/**
 * Módulo de notificaciones — Sprint 3
 * Por ahora solo registra la entidad en TypeORM para que se cree la tabla.
 * La lógica de envío por Nodemailer se implementará en Sprint 3.
 */
@Module({
  imports: [TypeOrmModule.forFeature([Notification])],
  exports: [TypeOrmModule],
})
export class NotificationsModule {}
