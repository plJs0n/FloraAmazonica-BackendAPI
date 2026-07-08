import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Resend } from 'resend';
import * as fs from 'fs';
import * as path from 'path';
import * as Handlebars from 'handlebars';
import { Notification, NotificationEventType } from './notification.entity';
import { User } from '../users/entities/user.entity';
import { SpeciesRecord } from '../species/entities/species-record.entity';

// Registrar helpers de Handlebars
Handlebars.registerHelper('eq',  (a: unknown, b: unknown) => a === b);
Handlebars.registerHelper('neq', (a: unknown, b: unknown) => a !== b);
Handlebars.registerHelper('gt',  (a: number,  b: number)  => a > b);
Handlebars.registerHelper('lt',  (a: number,  b: number)  => a < b);

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);
  private readonly resend: Resend;

  constructor(
    @InjectRepository(Notification)
    private notificationRepo: Repository<Notification>,
  ) {
    this.resend = new Resend(process.env.RESEND_API_KEY);
  }

  // ─── Helpers ─────────────────────────────────────────────────────────────

  /**
   * Carga y compila una plantilla Handlebars desde el sistema de archivos.
   * Busca en dist/ (producción) y en src/ (desarrollo).
   */
  private compileTemplate(templateName: string, context: Record<string, any>): string {
    const distPath = path.join(__dirname, 'templates', `${templateName}.hbs`);
    const srcPath  = path.join(process.cwd(), 'src', 'notifications', 'templates', `${templateName}.hbs`);

    let templatePath: string;
    if (fs.existsSync(distPath)) {
      templatePath = distPath;
    } else if (fs.existsSync(srcPath)) {
      templatePath = srcPath;
    } else {
      throw new Error(`Template "${templateName}.hbs" no encontrada en dist/ ni en src/`);
    }

    const source = fs.readFileSync(templatePath, 'utf-8');
    const compiled = Handlebars.compile(source);
    return compiled(context);
  }

  private async alreadySent(
    user_id: string,
    event_type: NotificationEventType,
    species_record_id?: string,
  ): Promise<boolean> {
    const where: any = { user_id, event_type, sent: true };
    if (species_record_id) where.species_record_id = species_record_id;
    const existing = await this.notificationRepo.findOne({ where });
    return !!existing;
  }

  /**
   * Persiste la notificación en BD y envía el correo via Resend (HTTPS).
   * Asíncrono — nunca interrumpe la operación principal.
   */
  private async dispatch(params: {
    user: User;
    event_type: NotificationEventType;
    template: string;
    subject: string;
    context: Record<string, any>;
    species_record_id?: string;
  }): Promise<void> {
    const { user, event_type, template, subject, context, species_record_id } = params;

    const notification = this.notificationRepo.create({
      user_id: user.id,
      species_record_id: species_record_id ?? null,
      event_type,
      sent: false,
    });
    const saved = await this.notificationRepo.save(notification);

    // Compilar HTML localmente con Handlebars
    let html: string;
    try {
      html = this.compileTemplate(template, {
        ...context,
        user_name: `${user.first_name} ${user.paternal_last_name}`.trim(),
      });
    } catch (err) {
      this.logger.error(`Error compilando template [${template}]: ${err.message}`);
      return;
    }

    // Enviar via Resend (HTTPS — no bloqueado por Railway)
    this.resend.emails
      .send({
        from: process.env.MAIL_FROM ?? 'Flora Amazónica <no-reply@flora-amazonica.com>',
        to: [user.email],
        subject,
        html,
      })
      .then(async ({ error }) => {
        if (error) {
          this.logger.error(`Error Resend [${event_type}] a ${user.email}: ${error.message}`);
          return;
        }
        await this.notificationRepo.update(saved.id, {
          sent: true,
          sent_at: new Date(),
        });
        this.logger.log(`Notificación [${event_type}] enviada a ${user.email}`);
      })
      .catch((err) => {
        this.logger.error(
          `Error enviando notificación [${event_type}] a ${user.email}: ${err.message}`,
        );
      });
  }

  // ─── Evento 1: Cuenta activada ───────────────────────────────────────────

  async notifyAccountActivated(user: User): Promise<void> {
    const already = await this.alreadySent(user.id, NotificationEventType.ACCOUNT_ACTIVATED);
    if (already) return;

    await this.dispatch({
      user,
      event_type: NotificationEventType.ACCOUNT_ACTIVATED,
      template: 'account-activated',
      subject: '¡Tu cuenta en Flora Amazónica ha sido activada!',
      context: {
        role: user.role,
        login_url: (process.env.FRONTEND_URL ?? 'http://localhost:4200') + '/auth/login',
      },
    });
  }

  // ─── Evento 2: Registro recibido ─────────────────────────────────────────

  async notifyRecordReceived(user: User, record: SpeciesRecord): Promise<void> {
    const already = await this.alreadySent(
      user.id,
      NotificationEventType.RECORD_RECEIVED,
      record.id,
    );
    if (already) return;

    await this.dispatch({
      user,
      event_type: NotificationEventType.RECORD_RECEIVED,
      template: 'record-received',
      subject: `Flora Amazónica — Registro recibido: ${record.scientific_name}`,
      context: {
        scientific_name: record.scientific_name,
        tracking_code: record.tracking_code,
        family: record.family,
      },
      species_record_id: record.id,
    });
  }

  // ─── Evento 3: Estado cambiado ───────────────────────────────────────────

  async notifyStatusChanged(
    registrar: User,
    record: SpeciesRecord,
    new_status: string,
    observation_notes?: string,
  ): Promise<void> {
    await this.dispatch({
      user: registrar,
      event_type: NotificationEventType.STATUS_CHANGED,
      template: 'status-changed',
      subject: `Flora Amazónica — Actualización de tu registro: ${record.scientific_name}`,
      context: {
        scientific_name: record.scientific_name,
        tracking_code: record.tracking_code,
        new_status,
        has_notes: !!observation_notes,
        observation_notes: observation_notes ?? '',
      },
      species_record_id: record.id,
    });
  }

  // ─── API REST para app iOS ────────────────────────────────────────────────

  async findAll(user_id: string): Promise<Notification[]> {
    return this.notificationRepo.find({
      where: { user_id },
      order: { created_at: 'DESC' },
    });
  }

  async markAsRead(id: string, user_id: string): Promise<void> {
    await this.notificationRepo.update({ id, user_id }, { is_read: true });
  }

  async markAllAsRead(user_id: string): Promise<void> {
    await this.notificationRepo.update({ user_id, is_read: false }, { is_read: true });
  }
}
