import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

@Entity('species_catalog')
export class SpeciesCatalog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  scientific_name: string;

  @Column()
  family: string;

  @Column({ default: true })
  is_active: boolean;

  @CreateDateColumn()
  created_at: Date;
}
