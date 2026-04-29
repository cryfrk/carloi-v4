import 'reflect-metadata';
import './common/http/patch-statuses';
import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { mkdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import helmet from 'helmet';
import { ApiExceptionFilter } from './common/http/api-exception.filter';
import { SanitizeInputPipe } from './common/http/sanitize-input.pipe';
import { AppLogger } from './common/logging/app-logger';
import { AppModule } from './app.module';

export async function createApp() {
  const isProduction = process.env.NODE_ENV === 'production';
  const configuredCorsOrigins = (process.env.CORS_ORIGINS ?? '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);
  const defaultProductionOrigins = [
    'https://carloi-v4-web.vercel.app',
    'https://www.carloi.com',
    'https://carloi.com',
  ];
  const corsOrigins =
    configuredCorsOrigins.length > 0
      ? configuredCorsOrigins
      : isProduction
        ? defaultProductionOrigins
        : [];
  const logger = new AppLogger();

  const app = await NestFactory.create(AppModule, {
    logger,
    bufferLogs: true,
  });
  const express = require('express') as { static: (path: string) => unknown };
  const workspaceRoot = resolve(process.cwd(), '../..');
  const uploadDir = process.env.LOCAL_UPLOAD_DIR || 'uploads';
  const publicUploadsDir = join(workspaceRoot, uploadDir, 'public');
  const expressApp = app.getHttpAdapter().getInstance() as {
    set: (key: string, value: unknown) => void;
    disable: (key: string) => void;
  };
  const trustProxy = process.env.TRUST_PROXY ?? (isProduction ? '1' : '0');

  mkdirSync(publicUploadsDir, { recursive: true });

  expressApp.set('trust proxy', trustProxy === 'true' ? true : trustProxy === 'false' ? false : trustProxy);
  expressApp.disable('x-powered-by');

  app.use(
    helmet({
      contentSecurityPolicy: false,
      crossOriginResourcePolicy: false,
    }),
  );
  app.enableCors({
    origin: corsOrigins.length > 0 ? corsOrigins : !isProduction,
    credentials: true,
  });
  app.use('/uploads', express.static(publicUploadsDir));
  app.useGlobalPipes(
    new SanitizeInputPipe(),
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );
  app.useGlobalFilters(new ApiExceptionFilter());

  return app;
}

export async function bootstrap() {
  const app = await createApp();
  const port = Number(process.env.PORT ?? 3001);

  await app.listen(port);
  Logger.log(`carloi-v4-api listening on http://localhost:${port}`, 'Bootstrap');
}
