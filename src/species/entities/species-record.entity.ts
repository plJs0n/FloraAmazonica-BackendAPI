import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  OneToMany,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { SpeciesCatalog } from '../../catalog/entities/species-catalog.entity';
import { RecordStatus } from '../../common/enums/record-status.enum';
import { SpeciesPhoto } from './species-photo.entity';
import { SpeciesHistory } from './species-history.entity';

@Entity('species_records')
export class SpeciesRecord {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, { eager: false })
  @JoinColumn({ name: 'registrar_id' })
  registrar: User;

  @Column()
  registrar_id: string;

  @ManyToOne(() => User, { nullable: true, eager: false })
  @JoinColumn({ name: 'validator_id' })
  validator: User;

  @Column({ nullable: true })
  validator_id: string;

  @ManyToOne(() => SpeciesCatalog, { nullable: true, eager: false })
  @JoinColumn({ name: 'species_catalog_id' })
  species_catalog: SpeciesCatalog;

  @Column({ nullable: true })
  species_catalog_id: string;

  /** Nombre del autor/registrador (desnormalizado para acceso rápido en iOS) */
  @Column({ nullable: true })
  author_name: string;

  @Column({ nullable: true, unique: true })
  tracking_code: string;

  @Column()
  scientific_name: string;

  @Column()
  family: string;

  @Column()
  habit: string;

  /** Tipo de vida (árbol, arbusto, hierba, liana, etc.) */
  @Column({ nullable: true })
  life_type: string;

  @Column({ type: 'text', array: true, default: [] })
  country_distribution: string[];

  @Column({ type: 'float', nullable: true })
  height: number;

  /** Diámetro de copa paralelo a la calle (m) */
  @Column({ type: 'float', nullable: true })
  crown_diameter_parallel: number;

  /** Diámetro de copa perpendicular a la calle (m) */
  @Column({ type: 'float', nullable: true })
  crown_diameter_perpendicular: number;

  /** Altura de inicio de copa (m) */
  @Column({ type: 'float', nullable: true })
  crown_base_height: number;

  @Column({ type: 'float', nullable: true })
  cap: number;

  @Column({ type: 'float', nullable: true })
  dap: number;

  @Column({ type: 'float', nullable: true })
  longitude: number;

  @Column({ type: 'float', nullable: true })
  latitude: number;

  @Column({ type: 'jsonb', default: {} })
  morphological_data: Record<string, any>;

  @Column({
    type: 'enum',
    enum: RecordStatus,
    default: RecordStatus.BORRADOR,
  })
  status: RecordStatus;

  @Column({ type: 'text', nullable: true })
  observation_notes: string;

  @Column({ default: true })
  is_draft: boolean;

  @Column({ nullable: true })
  submitted_at: Date;

  @Column({ nullable: true })
  validated_at: Date;

  /** Nombre local o vernáculo de la especie */
  @Column({ nullable: true })
  local_name: string;

  @OneToMany(() => SpeciesPhoto, (photo) => photo.species_record, { eager: true })
  photos: SpeciesPhoto[];

  @OneToMany(() => SpeciesHistory, (history) => history.species_record_id)
  history: SpeciesHistory[];

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
