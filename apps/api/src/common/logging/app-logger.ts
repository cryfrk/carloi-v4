import { Injectable, type LoggerService } from '@nestjs/common';
import { mkdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import pino, { multistream, type LevelWithSilent, type Logger as PinoLogger } from 'pino';

@Injectable()
export class AppLogger implements LoggerService {
  private readonly logger: PinoLogger;

  constructor() {
    const isProduction = process.env.NODE_ENV === 'production';
    const workspaceRoot = resolve(process.cwd(), '../..');
    const logDir = resolve(workspaceRoot, process.env.LOG_DIR || 'logs');
    const enableFileLogs = (process.env.ENABLE_FILE_LOGS || 'true').toLowerCase() !== 'false';
    const level = ((process.env.LOG_LEVEL || (isProduction ? 'info' : 'debug')) as LevelWithSilent);
    const streams: Array<{ level?: LevelWithSilent; stream: NodeJS.WritableStream }> = [{ stream: process.stdout }];

    if (enableFileLogs) {
      mkdirSync(logDir, { recursive: true });
      streams.push({ level: 'info', stream: pino.destination({ dest: join(logDir, 'app.log'), mkdir: true, sync: false }) as unknown as NodeJS.WritableStream });
      streams.push({ level: 'error', stream: pino.destination({ dest: join(logDir, 'error.log'), mkdir: true, sync: false }) as unknown as NodeJS.WritableStream });
    }

    this.logger = pino(
      {
        level,
        base: {
          app: 'carloi-v4-api',
          env: process.env.NODE_ENV || 'development',
        },
        redact: {
          paths: [
            'req.headers.authorization',
            'headers.authorization',
            'password',
            'passwordHash',
            'token',
            'refreshToken',
            'tcIdentityNo',
          ],
          remove: true,
        },
      },
      multistream(streams),
    );
  }

  log(message: unknown, context?: string) {
    this.logger.info({ context }, this.serialize(message));
  }

  error(message: unknown, trace?: string, context?: string) {
    this.logger.error({ context, trace }, this.serialize(message));
  }

  warn(message: unknown, context?: string) {
    this.logger.warn({ context }, this.serialize(message));
  }

  debug(message: unknown, context?: string) {
    this.logger.debug({ context }, this.serialize(message));
  }

  verbose(message: unknown, context?: string) {
    this.logger.trace({ context }, this.serialize(message));
  }

  fatal(message: unknown, trace?: string, context?: string) {
    this.logger.fatal({ context, trace }, this.serialize(message));
  }

  private serialize(message: unknown) {
    if (typeof message === 'string') {
      return message;
    }

    if (message instanceof Error) {
      return message.message;
    }

    try {
      return JSON.stringify(message);
    } catch {
      return String(message);
    }
  }
}

