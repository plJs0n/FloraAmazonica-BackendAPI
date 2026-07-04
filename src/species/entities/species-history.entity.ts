import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

export enum HistoryAction {
  EDICION = 'edicion',
  APROBACION = 'aprobacion',
  RECHAZO = 'rechazo',
}

@Entity('species_history')
export class SpeciesHistory {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  species_record_id: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ nullable: true })
  user_id: string;

  @Column({ type: 'text', nullable: true })
  change_description: string;

  @Column({ type: 'jsonb', nullable: true })
  previous_state: Record<string, any>;

  @Column({ type: 'jsonb', nullable: true })
  new_state: Record<string, any>;

  @Column({
    type: 'enum',
    enum: HistoryAction,
  })
  action: HistoryAction;

  @CreateDateColumn()
  created_at: Date;
}
