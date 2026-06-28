import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { PhotoType } from '../../common/enums/photo-type.enum';
import { User } from '../../users/entities/user.entity';

@Entity('species_photos')
export class SpeciesPhoto {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  species_record_id: string;

  @ManyToOne('SpeciesRecord', 'photos', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'species_record_id' })
  species_record: any;

  @Column({
    type: 'enum',
    enum: PhotoType,
  })
  photo_type: PhotoType;

  @Column()
  cloudinary_url: string;

  @Column()
  cloudinary_public_id: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'author_id' })
  author: User;

  @Column()
  author_id: string;

  @CreateDateColumn()
  created_at: Date;
}
