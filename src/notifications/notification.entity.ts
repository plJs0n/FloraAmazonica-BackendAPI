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
  RECORD_RECEIVED = 'record_received',
  STATUS_CHANGED = 'status_changed',
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

  @Column({ default: false })
  sent: boolean;

  @Column({ nullable: true })
  sent_at: Date;

  @CreateDateColumn()
  created_at: Date;
}
