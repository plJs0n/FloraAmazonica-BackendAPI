import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

@Entity('sections')
@Index(['habit', 'name'], { unique: true })
export class Section {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  habit: string;

  @Column()
  name: string;

  @Column({ default: 0 })
  display_order: number;

  @CreateDateColumn()
  created_at: Date;
}
