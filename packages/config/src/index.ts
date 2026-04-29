export const APP_NAMES = {
  api: 'carloi-v4-api',
  web: 'carloi-v4-web',
  mobile: 'carloi-v4-mobile',
  adminDesktop: 'carloi-v4-admin-desktop',
  adminMobile: 'carloi-v4-admin-mobile',
} as const;

export const REQUIRED_ENV_KEYS = [
  'DATABASE_URL',
  'JWT_ACCESS_SECRET',
  'JWT_REFRESH_SECRET',
  'GARANTI_MERCHANT_ID',
  'GARANTI_PROVISION_USER',
  'GARANTI_PROVISION_PASSWORD',
  'GARANTI_STORE_KEY',
  'OPENAI_API_KEY',
  'DEEPSEEK_API_KEY',
] as const;

export type RequiredEnvKey = (typeof REQUIRED_ENV_KEYS)[number];

export const OPTIONAL_ENV_KEYS = [
  'BREVO_API_KEY',
  'BREVO_SMS_SENDER',
  'BREVO_EMAIL_SENDER',
  'NEXT_PUBLIC_API_BASE_URL',
  'EXPO_PUBLIC_API_BASE_URL',
] as const;

export type OptionalEnvKey = (typeof OPTIONAL_ENV_KEYS)[number];
