import {
  UserType,
  VerificationCodePurpose,
  VerificationTargetType,
  type Prisma,
} from '@prisma/client';
import { createHash, randomInt } from 'node:crypto';
import { CODE_RESEND_COOLDOWN_SECONDS, VERIFICATION_CODE_LENGTH } from './auth.constants';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_DIGITS_REGEX = /^\d{10,15}$/;
const USERNAME_REGEX = /^[a-z0-9._-]{3,30}$/;
const DURATION_REGEX = /^(\d+)(ms|s|m|h|d)?$/i;

export type IdentifierKind = 'email' | 'phone' | 'username';

export type SessionContext = {
  ipAddress?: string;
  userAgent?: string;
  deviceName?: string;
  platform?: string;
  approximateLocation?: string;
};

export const authUserSelect = {
  id: true,
  userType: true,
  email: true,
  phone: true,
  username: true,
  firstName: true,
  lastName: true,
  isVerified: true,
  isCommercialApproved: true,
} satisfies Prisma.UserSelect;

export type AuthUserRecord = Prisma.UserGetPayload<{
  select: typeof authUserSelect;
}>;

export function trimToUndefined(value?: string | null) {
  if (typeof value !== 'string') {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

export function normalizeEmail(value?: string | null) {
  const trimmed = trimToUndefined(value);
  return trimmed ? trimmed.toLowerCase() : undefined;
}

export function normalizePhone(value?: string | null) {
  const trimmed = trimToUndefined(value);

  if (!trimmed) {
    return undefined;
  }

  const normalized = trimmed.replace(/[^\d+]/g, '');

  if (normalized.startsWith('+')) {
    const digits = normalized.slice(1).replace(/\D/g, '');
    return digits.length > 0 ? `+${digits}` : undefined;
  }

  const digits = normalized.replace(/\D/g, '');
  return digits.length > 0 ? digits : undefined;
}

export function normalizeUsername(value: string) {
  return value.trim().toLowerCase();
}

export function isEmail(value: string) {
  return EMAIL_REGEX.test(value);
}

export function isPhone(value: string) {
  const normalized = normalizePhone(value);
  const digits = normalized?.startsWith('+') ? normalized.slice(1) : normalized;
  return Boolean(digits && PHONE_DIGITS_REGEX.test(digits));
}

export function isUsername(value: string) {
  return USERNAME_REGEX.test(value.trim().toLowerCase());
}

export function detectIdentifierKind(identifier: string): IdentifierKind {
  const trimmed = identifier.trim();

  if (isEmail(trimmed)) {
    return 'email';
  }

  if (isPhone(trimmed)) {
    return 'phone';
  }

  return 'username';
}

export function normalizeIdentifier(identifier: string) {
  const kind = detectIdentifierKind(identifier);

  if (kind === 'email') {
    return {
      kind,
      value: normalizeEmail(identifier)!,
    };
  }

  if (kind === 'phone') {
    return {
      kind,
      value: normalizePhone(identifier)!,
    };
  }

  return {
    kind,
    value: normalizeUsername(identifier),
  };
}

export function resolveContactIdentifier(identifier: string) {
  const normalized = normalizeIdentifier(identifier);

  if (normalized.kind === 'username') {
    return undefined;
  }

  return {
    kind: normalized.kind,
    targetType:
      normalized.kind === 'email' ? VerificationTargetType.EMAIL : VerificationTargetType.PHONE,
    value: normalized.value,
  };
}

export function generateVerificationCode() {
  return randomInt(0, 10 ** VERIFICATION_CODE_LENGTH)
    .toString()
    .padStart(VERIFICATION_CODE_LENGTH, '0');
}

export function hashToken(token: string) {
  return createHash('sha256').update(token).digest('hex');
}

export function durationToMs(duration: string | number) {
  if (typeof duration === 'number') {
    return duration * 1000;
  }

  const trimmed = duration.trim();
  const match = DURATION_REGEX.exec(trimmed);

  if (!match) {
    throw new Error(`Invalid duration value: ${duration}`);
  }

  const [, rawAmount, rawUnit] = match;
  const amount = Number(rawAmount);
  const unit = rawUnit?.toLowerCase() ?? 's';

  switch (unit) {
    case 'ms':
      return amount;
    case 's':
      return amount * 1000;
    case 'm':
      return amount * 60_000;
    case 'h':
      return amount * 3_600_000;
    case 'd':
      return amount * 86_400_000;
    default:
      throw new Error(`Unsupported duration unit: ${unit}`);
  }
}

export function addMinutes(date: Date, minutes: number) {
  return new Date(date.getTime() + minutes * 60_000);
}

export function addSeconds(date: Date, seconds: number) {
  return new Date(date.getTime() + seconds * 1000);
}

export function isWithinCooldown(createdAt: Date, now = new Date()) {
  return createdAt.getTime() + CODE_RESEND_COOLDOWN_SECONDS * 1000 > now.getTime();
}

export function toSafeAuthUser(user: AuthUserRecord) {
  return {
    id: user.id,
    userType: user.userType,
    email: user.email,
    phone: user.phone,
    username: user.username,
    firstName: user.firstName,
    lastName: user.lastName,
    isVerified: user.isVerified,
    isCommercialApproved: user.isCommercialApproved,
  };
}

export function registrationRequiresCompanyFields(userType: UserType) {
  return userType === UserType.COMMERCIAL;
}

export function getVerificationPurpose() {
  return VerificationCodePurpose.SIGN_UP;
}
