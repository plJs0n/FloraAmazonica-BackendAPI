import { Module, Global } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MailerModule } from '@nestjs-modules/mailer';
import { HandlebarsAdapter } from '@nestjs-modules/mailer/dist/adapters/handlebars.adapter';
import { join } from 'path';
import { Notification } from './notification.entity';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { SpeciesRecord } from '../species/entities/species-record.entity';

/**
 * Global: cualquier módulo puede inyectar NotificationsService sin importar NotificationsModule.
 */
@Global()
@Module({
  imports: [
    TypeOrmModule.forFeature([Notification, SpeciesRecord]),
    MailerModule.forRootAsync({
      useFactory: () => ({
        transport: {
          host: process.env.MAIL_HOST,
          port: parseInt(process.env.MAIL_PORT ?? '587'),
          secure: false,
          auth: {
            user: process.env.MAIL_USER,
            pass: process.env.MAIL_PASSWORD,
          },
        },
        defaults: {
          from: process.env.MAIL_FROM ?? 'Flora Amazónica <no-reply@flora.local>',
        },
        template: {
          dir: join(__dirname, 'templates'),
          adapter: new HandlebarsAdapter({
            eq:  (a: unknown, b: unknown) => a === b,
            neq: (a: unknown, b: unknown) => a !== b,
            gt:  (a: number,  b: number)  => a > b,
            lt:  (a: number,  b: number)  => a < b,
          }),
          options: { strict: true },
        },
      }),
    }),
  ],
  providers: [NotificationsService],
  controllers: [NotificationsController],
  exports: [NotificationsService],
})
export class NotificationsModule {}
