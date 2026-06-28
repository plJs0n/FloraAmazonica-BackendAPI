import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PublicCatalogService } from './public-catalog.service';
import { PublicCatalogController } from './public-catalog.controller';
import { SpeciesRecord } from '../species/entities/species-record.entity';
import { SpeciesPhoto } from '../species/entities/species-photo.entity';
import { DownloadQuota } from './entities/download-quota.entity';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([SpeciesRecord, SpeciesPhoto, DownloadQuota]),
    AuthModule,
  ],
  providers: [PublicCatalogService],
  controllers: [PublicCatalogController],
})
export class PublicCatalogModule {}
