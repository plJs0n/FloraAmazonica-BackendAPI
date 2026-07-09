import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../users/entities/user.entity';

export enum NotificationEventType {
  ACCOUNT_ACTIVATED = 'account_activated',
  ACCOUNT_DEACTIVATED = 'account_deactivated',
  RECORD_RECEIVED = 'record_received',
  STATUS_CHANGED = 'status_changed',
  ROLE_CHANGED = 'role_changed',
}

@Entity('notifications')
export class Notification {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column()
  user_id: string;

  @Column({ nullable: true })
  species_record_id: string;

  @Column({
    type: 'enum',
    enum: NotificationEventType,
  })
  event_type: NotificationEventType;

  // Campos para notificaciones push y en-app
  @Column({ nullable: true })
  title: string;

  @Column({ type: 'text', nullable: true })
  message: string;

  @Column({ nullable: true })
  type: string;

  @Column({ default: false })
  is_read: boolean;

  // Para navegación en la app al tocar la notificación
  @Column({ nullable: true })
  related_entity_type: string;

  @Column({ nullable: true })
  related_entity_id: string;

  // Estado de envío por correo
  @Column({ default: false })
  sent: boolean;

  @Column({ nullable: true })
  sent_at: Date;

  @CreateDateColumn()
  created_at: Date;
}
