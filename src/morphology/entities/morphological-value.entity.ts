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

export enum FieldType {
  OPTION = 'option',
  NUMBER = 'number',
}

@Entity('morphological_values')
export class MorphologicalValue {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  habit: string;

  @Column({ nullable: true, default: '' })
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

  @Column({
    type: 'enum',
    enum: FieldType,
    default: FieldType.OPTION,
  })
  field_type: FieldType;

  @Column({ default: false })
  is_required: boolean;

  @Column({ default: 0 })
  display_order: number;

  @Column({ default: true })
  is_active: boolean;

  /**
   * Indica si este campo aparece como filtro en el buscador del catálogo público.
   * Se aplica a nivel de field_name completo (todas las opciones del campo comparten este valor).
   */
  @Column({ default: false })
  use_in_search: boolean;

  @CreateDateColumn()
  created_at: Date;
}
