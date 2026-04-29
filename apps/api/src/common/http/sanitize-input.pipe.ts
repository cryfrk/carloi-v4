import { ArgumentMetadata, Injectable, PipeTransform } from '@nestjs/common';

@Injectable()
export class SanitizeInputPipe implements PipeTransform {
  transform(value: unknown, _metadata: ArgumentMetadata) {
    return this.sanitize(value);
  }

  private sanitize(value: unknown): unknown {
    if (value === null || value === undefined) {
      return value;
    }

    if (typeof value === 'string') {
      return value.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '').trim();
    }

    if (Array.isArray(value)) {
      return value.map((item) => this.sanitize(item));
    }

    if (value instanceof Date || Buffer.isBuffer(value)) {
      return value;
    }

    if (typeof value === 'object') {
      return Object.fromEntries(
        Object.entries(value as Record<string, unknown>).map(([key, nestedValue]) => [key, this.sanitize(nestedValue)]),
      );
    }

    return value;
  }
}
