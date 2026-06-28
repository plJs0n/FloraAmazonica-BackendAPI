import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

export enum SelectionType {
  SINGLE = 'single',
  MULTIPLE = 'multiple',
}

@Entity('morphological_values')
export class MorphologicalValue {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  habit: string;

  @Column()
  section: string;

  @Column()
  field_name: string;

  @Column()
  option_value: string;

  @Column({
    type: 'enum',
    enum: SelectionType,
    default: SelectionType.SINGLE,
  })
  selection_type: SelectionType;

  @Column({ default: false })
  is_required: boolean;

  @Column({ default: 0 })
  display_order: number;

  @Column({ default: true })
  is_active: boolean;

  @CreateDateColumn()
  created_at: Date;
}
