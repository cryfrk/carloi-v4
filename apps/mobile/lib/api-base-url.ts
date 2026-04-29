const DEFAULT_PRODUCTION_API_BASE_URL = 'https://api.carloi.com';
const DEFAULT_DEVELOPMENT_API_BASE_URL = 'http://localhost:3001';

function normalizeBaseUrl(value: string) {
  return value.replace(/\/+$/, '');
}

export function getMobileApiBaseUrl() {
  const explicitBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL?.trim();

  if (explicitBaseUrl) {
    return normalizeBaseUrl(explicitBaseUrl);
  }

  if (process.env.NODE_ENV === 'production') {
    return DEFAULT_PRODUCTION_API_BASE_URL;
  }

  return DEFAULT_DEVELOPMENT_API_BASE_URL;
}

export const MOBILE_API_BASE_URL = getMobileApiBaseUrl();

export function isMobileApiDebugEnabled() {
  return process.env.NODE_ENV !== 'production';
}
