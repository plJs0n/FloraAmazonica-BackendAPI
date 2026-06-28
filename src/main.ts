import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Validación global con class-validator
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,           // elimina campos no declarados en DTOs
      forbidNonWhitelisted: false,
      transform: true,           // transforma tipos automáticamente
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // CORS para el frontend Angular/React
  app.enableCors({
    origin: process.env.FRONTEND_URL || 'http://localhost:4200',
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'PUT'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  const port = process.env.PORT || 3000;
  await app.listen(port);
  console.log(`🌿 Flora Amazónica API corriendo en http://localhost:${port}`);
}

bootstrap();
