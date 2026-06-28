import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity('download_quotas')
@Index(['user_id', 'date'], { unique: true })
export class DownloadQuota {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  user_id: string;

  /**
   * Fecha en formato YYYY-MM-DD (sin hora) para agrupar por día
   */
  @Column({ type: 'date' })
  date: string;

  @Column({ default: 0 })
  count: number;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
