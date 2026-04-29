import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';

type ExceptionPayload = {
  success: false;
  message: string;
  code: string;
  errors?: string[];
  [key: string]: unknown;
};

type HttpRequestLike = {
  method?: string;
  url?: string;
};

type HttpResponseLike = {
  status: (statusCode: number) => HttpResponseLike;
  json: (payload: ExceptionPayload) => void;
};

@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(ApiExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const context = host.switchToHttp();
    const response = context.getResponse<HttpResponseLike>();
    const request = context.getRequest<HttpRequestLike>();
    const isProduction = process.env.NODE_ENV === 'production';

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const payload = this.buildPayload(exception, status, isProduction);

    if (status >= HttpStatus.INTERNAL_SERVER_ERROR) {
      const trace =
        exception instanceof Error
          ? exception.stack
          : JSON.stringify(exception ?? 'Unknown error');

      this.logger.error(`${request.method ?? 'HTTP'} ${request.url ?? ''} failed`, trace);
    } else if (!isProduction) {
      const trace =
        exception instanceof Error
          ? exception.stack
          : JSON.stringify(exception ?? 'Unknown error');

      this.logger.warn(`${request.method ?? 'HTTP'} ${request.url ?? ''} -> ${status}`);
      this.logger.debug(trace);
    }

    response.status(status).json(payload);
  }

  private buildPayload(
    exception: unknown,
    status: number,
    isProduction: boolean,
  ): ExceptionPayload {
    if (!(exception instanceof HttpException)) {
      return {
        success: false,
        message: isProduction
          ? 'Beklenmeyen bir hata olustu.'
          : exception instanceof Error
            ? exception.message
            : 'Beklenmeyen bir hata olustu.',
        code: 'INTERNAL_ERROR',
      };
    }

    const raw = exception.getResponse();

    if (typeof raw === 'string') {
      return {
        success: false,
        message: raw,
        code: this.defaultCodeForStatus(status),
      };
    }

    if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
      const record = raw as Record<string, unknown>;
      const rawMessage = record.message;
      const errors = Array.isArray(rawMessage)
        ? rawMessage.filter((item): item is string => typeof item === 'string')
        : undefined;
      const message =
        typeof rawMessage === 'string'
          ? rawMessage
          : errors?.[0] ?? this.defaultMessageForStatus(status);
      const code =
        typeof record.code === 'string'
          ? record.code
          : errors && errors.length > 0
            ? 'VALIDATION_ERROR'
            : this.defaultCodeForStatus(status);
      const extras = Object.fromEntries(
        Object.entries(record).filter(
          ([key]) => !['statusCode', 'message', 'error'].includes(key),
        ),
      );

      return {
        success: false,
        message,
        code,
        ...(errors && errors.length > 0 ? { errors } : {}),
        ...extras,
      };
    }

    return {
      success: false,
      message: this.defaultMessageForStatus(status),
      code: this.defaultCodeForStatus(status),
    };
  }

  private defaultMessageForStatus(status: number) {
    switch (status) {
      case HttpStatus.BAD_REQUEST:
        return 'Gonderilen veri gecersiz.';
      case HttpStatus.UNAUTHORIZED:
        return 'Yetkilendirme gereklidir.';
      case HttpStatus.FORBIDDEN:
        return 'Bu islem icin yetkiniz bulunmuyor.';
      case HttpStatus.NOT_FOUND:
        return 'Kaynak bulunamadi.';
      case HttpStatus.CONFLICT:
        return 'Islem cakisiyor.';
      case HttpStatus.TOO_MANY_REQUESTS:
        return 'Cok fazla istek gonderildi.';
      default:
        return 'Islem tamamlanamadi.';
    }
  }

  private defaultCodeForStatus(status: number) {
    switch (status) {
      case HttpStatus.BAD_REQUEST:
        return 'BAD_REQUEST';
      case HttpStatus.UNAUTHORIZED:
        return 'UNAUTHORIZED';
      case HttpStatus.FORBIDDEN:
        return 'FORBIDDEN';
      case HttpStatus.NOT_FOUND:
        return 'NOT_FOUND';
      case HttpStatus.CONFLICT:
        return 'CONFLICT';
      case HttpStatus.PAYLOAD_TOO_LARGE:
        return 'PAYLOAD_TOO_LARGE';
      case HttpStatus.TOO_MANY_REQUESTS:
        return 'RATE_LIMITED';
      default:
        return 'INTERNAL_ERROR';
    }
  }
}
