import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ValidationService } from './validation.service';
import { ValidationController } from './validation.controller';
import { SpeciesRecord } from '../species/entities/species-record.entity';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [TypeOrmModule.forFeature([SpeciesRecord]), AuthModule],
  providers: [ValidationService],
  controllers: [ValidationController],
})
export class ValidationModule {}
