import { SharedContentType } from '@carloi-v4/types';

const DEFAULT_PRODUCTION_APP_BASE_URL = 'https://www.carloi.com';
const DEFAULT_DEVELOPMENT_APP_BASE_URL = 'http://localhost:3000';

function normalizeBaseUrl(value: string) {
  return value.replace(/\/+$/, '');
}

function getPublicAppBaseUrl() {
  const explicitBaseUrl = process.env.EXPO_PUBLIC_WEB_APP_URL?.trim();

  if (explicitBaseUrl) {
    return normalizeBaseUrl(explicitBaseUrl);
  }

  if (process.env.NODE_ENV === 'production') {
    return DEFAULT_PRODUCTION_APP_BASE_URL;
  }

  return DEFAULT_DEVELOPMENT_APP_BASE_URL;
}

export function getMobileSharedContentPath(contentType: SharedContentType, contentId: string) {
  switch (contentType) {
    case SharedContentType.POST:
      return `/posts/${contentId}`;
    case SharedContentType.LISTING:
      return `/listings/${contentId}`;
    case SharedContentType.VEHICLE:
      return `/vehicles/${contentId}`;
    default:
      return '/';
  }
}

export function buildMobileSharedContentUrl(contentType: SharedContentType, contentId: string) {
  return `${getPublicAppBaseUrl()}${getMobileSharedContentPath(contentType, contentId)}`;
}
