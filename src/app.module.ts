import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

// Módulos Sprint 1
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { SpeciesModule } from './species/species.module';
import { CatalogModule } from './catalog/catalog.module';
import { MorphologyModule } from './morphology/morphology.module';
import { CloudinaryModule } from './cloudinary/cloudinary.module';
// Módulos Sprint 2
import { ValidationModule } from './validation/validation.module';
import { SectionsModule } from './sections/sections.module';
import { PublicCatalogModule } from './public-catalog/public-catalog.module';
// Módulos Sprint 3
import { NotificationsModule } from './notifications/notifications.module';

// Entities
import { User } from './users/entities/user.entity';
import { SpeciesCatalog } from './catalog/entities/species-catalog.entity';
import { MorphologicalValue } from './morphology/entities/morphological-value.entity';
import { SpeciesRecord } from './species/entities/species-record.entity';
import { SpeciesPhoto } from './species/entities/species-photo.entity';
import { Notification } from './notifications/notification.entity';
import { SpeciesHistory } from './species/entities/species-history.entity';
import { Section } from './sections/entities/section.entity';
import { DownloadQuota } from './public-catalog/entities/download-quota.entity';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),

    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get<string>('DB_HOST', 'localhost'),
        port: configService.get<number>('DB_PORT', 5432),
        database: configService.get<string>('DB_NAME'),
        username: configService.get<string>('DB_USER'),
        password: configService.get<string>('DB_PASSWORD'),
        entities: [
          User,
          SpeciesCatalog,
          MorphologicalValue,
          SpeciesRecord,
          SpeciesPhoto,
          Notification,
          DownloadQuota,
          SpeciesHistory,
          Section,
        ],
        synchronize: configService.get<string>('NODE_ENV') !== 'production',
        logging: configService.get<string>('NODE_ENV') === 'development',
      }),
      inject: [ConfigService],
    }),

    // NotificationsModule primero porque es @Global() y otros módulos dependen de él
    NotificationsModule,

    // Sprint 1
    AuthModule,
    UsersModule,
    SpeciesModule,
    CatalogModule,
    MorphologyModule,
    CloudinaryModule,

    // Sprint 2
    ValidationModule,
    SectionsModule,
    PublicCatalogModule,
  ],
})
export class AppModule {}
