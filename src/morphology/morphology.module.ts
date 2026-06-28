import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MorphologyService } from './morphology.service';
import { MorphologyController } from './morphology.controller';
import { MorphologicalValue } from './entities/morphological-value.entity';
import { SpeciesRecord } from '../species/entities/species-record.entity';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([MorphologicalValue, SpeciesRecord]),
    AuthModule,
  ],
  providers: [MorphologyService],
  controllers: [MorphologyController],
})
export class MorphologyModule {}
