const DEFAULT_PRODUCTION_API_BASE_URL = 'https://api.carloi.com';
const DEFAULT_DEVELOPMENT_API_BASE_URL = 'http://localhost:3001';

function normalizeBaseUrl(value: string) {
  return value.replace(/\/+$/, '');
}

export function getWebApiBaseUrl() {
  const explicitBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL?.trim();

  if (explicitBaseUrl) {
    return normalizeBaseUrl(explicitBaseUrl);
  }

  if (process.env.NODE_ENV === 'production') {
    return DEFAULT_PRODUCTION_API_BASE_URL;
  }

  return DEFAULT_DEVELOPMENT_API_BASE_URL;
}

export const WEB_API_BASE_URL = getWebApiBaseUrl();

export function isWebApiDebugEnabled() {
  return process.env.NODE_ENV !== 'production';
}
