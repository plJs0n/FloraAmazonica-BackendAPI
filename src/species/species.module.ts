import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SpeciesService } from './species.service';
import { SpeciesController } from './species.controller';
import { SpeciesRecord } from './entities/species-record.entity';
import { SpeciesPhoto } from './entities/species-photo.entity';
import { AuthModule } from '../auth/auth.module';
import { CloudinaryModule } from '../cloudinary/cloudinary.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([SpeciesRecord, SpeciesPhoto]),
    AuthModule,
    CloudinaryModule,
  ],
  providers: [SpeciesService],
  controllers: [SpeciesController],
})
export class SpeciesModule {}
