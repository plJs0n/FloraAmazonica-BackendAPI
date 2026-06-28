import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { SpeciesModule } from './species/species.module';
import { CatalogModule } from './catalog/catalog.module';
import { MorphologyModule } from './morphology/morphology.module';
import { CloudinaryModule } from './cloudinary/cloudinary.module';

// Entities
import { User } from './users/entities/user.entity';
import { SpeciesCatalog } from './catalog/entities/species-catalog.entity';
import { MorphologicalValue } from './morphology/entities/morphological-value.entity';
import { SpeciesRecord } from './species/entities/species-record.entity';
import { SpeciesPhoto } from './species/entities/species-photo.entity';
import { Notification } from './notifications/notification.entity';

@Module({
  imports: [
    // Configuración global de variables de entorno
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),

    // Conexión TypeORM con PostgreSQL
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
        ],
        synchronize: configService.get<string>('NODE_ENV') !== 'production',
        logging: configService.get<string>('NODE_ENV') === 'development',
      }),
      inject: [ConfigService],
    }),

    // Módulos de negocio
    AuthModule,
    UsersModule,
    SpeciesModule,
    CatalogModule,
    MorphologyModule,
    CloudinaryModule,
  ],
})
export class AppModule {}
