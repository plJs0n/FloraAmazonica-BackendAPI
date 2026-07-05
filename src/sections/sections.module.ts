import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SectionsService } from './sections.service';
import { SectionsController } from './sections.controller';
import { Section } from './entities/section.entity';
import { MorphologicalValue } from '../morphology/entities/morphological-value.entity';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Section, MorphologicalValue]),
    AuthModule,
  ],
  providers: [SectionsService],
  controllers: [SectionsController],
})
export class SectionsModule {}
