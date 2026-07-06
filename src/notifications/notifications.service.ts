import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MailerService } from '@nestjs-modules/mailer';
import { Notification, NotificationEventType } from './notification.entity';
import { User } from '../users/entities/user.entity';
import { SpeciesRecord } from '../species/entities/species-record.entity';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    @InjectRepository(Notification)
    private notificationRepo: Repository<Notification>,
    private mailerService: MailerService,
  ) {}

  // ─── Helpers ─────────────────────────────────────────────────────────────

  /**
   * Verifica si ya se envió una notificación del mismo tipo para el mismo registro/usuario.
   * Evita duplicados.
   */
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
   * Persiste la notificación en BD y dispara el correo de forma asíncrona.
   * El envío nunca bloquea ni lanza error hacia el llamador.
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

    // Crear registro en BD (sent = false por defecto)
    const notification = this.notificationRepo.create({
      user_id: user.id,
      species_record_id: species_record_id ?? null,
      event_type,
      sent: false,
    });
    const saved = await this.notificationRepo.save(notification);

    // Envío asíncrono — nunca interrumpe la operación principal
    this.mailerService
      .sendMail({
        to: user.email,
        subject,
        template,
        context: {
          ...context,
          user_name: `${user.first_name} ${user.paternal_last_name}`.trim(),
        },
      })
      .then(async () => {
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

  /**
   * Llamado desde UsersService.toggleActive() cuando is_active pasa a true.
   */
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
        login_url: process.env.FRONTEND_URL + '/auth/login',
      },
    });
  }

  // ─── Evento 2: Registro recibido ─────────────────────────────────────────

  /**
   * Llamado desde SpeciesService.create() cuando is_draft = false,
   * y desde SpeciesService.submit() al enviar un borrador.
   */
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

  /**
   * Llamado desde ValidationService.changeStatus().
   */
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
