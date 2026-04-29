import { randomInt, createHash } from 'node:crypto';

export const LISTING_DAMAGE_PARTS = [
  'on tampon',
  'arka tampon',
  'kaput',
  'sag on camurluk',
  'sol on camurluk',
  'sol on kapi',
  'sol arka kapi',
  'sol arka camurluk',
  'bagaj kapagi',
  'sag arka camurluk',
  'sag arka kapi',
  'sag on kapi',
  'tavan',
] as const;

export function normalizeHumanName(value: string) {
  return value
    .trim()
    .toLocaleUpperCase('tr-TR')
    .replace(/\s+/g, ' ');
}

export function normalizePlateNumber(value: string) {
  return value
    .trim()
    .toLocaleUpperCase('tr-TR')
    .replace(/[^A-Z0-9]/g, '');
}

export function maskPlateNumber(value: string) {
  const normalized = normalizePlateNumber(value);

  if (normalized.length <= 4) {
    return '*'.repeat(Math.max(normalized.length, 1));
  }

  return `${normalized.slice(0, 2)}${'*'.repeat(Math.max(normalized.length - 4, 2))}${normalized.slice(-2)}`;
}

export function hashPlateNumber(value: string) {
  return createHash('sha256').update(normalizePlateNumber(value)).digest('hex');
}

export function inferMediaType(url: string) {
  return /\.(mp4|mov|avi|webm)$/i.test(url) ? 'VIDEO' : 'IMAGE';
}

export function trimNullable(value?: string | null) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

export function toTitleCase(value: string) {
  return value
    .trim()
    .split(/\s+/)
    .map((chunk) => chunk.charAt(0).toLocaleUpperCase('tr-TR') + chunk.slice(1).toLocaleLowerCase('tr-TR'))
    .join(' ');
}

export function buildListingNo() {
  return `CLV4-${Date.now().toString(36).toUpperCase()}-${randomInt(1000, 9999)}`;
}
