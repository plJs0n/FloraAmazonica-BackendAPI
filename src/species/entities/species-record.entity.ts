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

  @Column({ nullable: true, unique: true })
  tracking_code: string;

  @Column()
  scientific_name: string;

  @Column()
  family: string;

  @Column()
  habit: string;

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

  // Nuevos campos descriptivos requeridos por la app iOS
  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ nullable: true })
  growth_stage: string;

  @Column({ nullable: true })
  bark_texture: string;

  @Column({ type: 'text', nullable: true })
  uses: string;

  @Column({ nullable: true })
  conservation_status: string;

  @Column({ nullable: true })
  health_status: string;

  @OneToMany(() => SpeciesPhoto, (photo) => photo.species_record, { eager: true })
  photos: SpeciesPhoto[];

  @OneToMany(() => SpeciesHistory, (history) => history.species_record_id)
  history: SpeciesHistory[];

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
