import { MOBILE_API_BASE_URL } from './api-base-url';
import { mobileRuntimeIsProduction } from './demo-runtime';
import { isDemoMediaKey, resolveDemoMediaUri } from './demo-media-assets';

const KNOWN_LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '0.0.0.0', '10.0.2.2']);

function getApiOrigin() {
  try {
    return new URL(MOBILE_API_BASE_URL).origin;
  } catch {
    return MOBILE_API_BASE_URL.replace(/\/+$/, '');
  }
}

function ensureLeadingSlash(path: string) {
  return path.startsWith('/') ? path : `/${path}`;
}

export function resolveMobileMediaUrl(value: string | null | undefined) {
  if (!value || value.startsWith('pending://')) {
    return null;
  }

  if (value.startsWith('demo://')) {
    if (mobileRuntimeIsProduction) {
      return null;
    }

    return isDemoMediaKey(value) ? resolveDemoMediaUri(value) : resolveDemoMediaUri('demo://placeholder');
  }

  if (isDemoMediaKey(value)) {
    if (mobileRuntimeIsProduction) {
      return null;
    }

    return resolveDemoMediaUri(value);
  }

  const apiOrigin = getApiOrigin();

  if (/^https?:\/\//i.test(value)) {
    try {
      const parsed = new URL(value);
      const pathnameWithSearch = `${parsed.pathname}${parsed.search}`;

      if (
        KNOWN_LOCAL_HOSTS.has(parsed.hostname) &&
        (parsed.pathname.startsWith('/uploads/') || parsed.pathname.startsWith('/media/assets/'))
      ) {
        return `${apiOrigin}${pathnameWithSearch}`;
      }

      return parsed.toString();
    } catch {
      return value;
    }
  }

  const normalizedPath = ensureLeadingSlash(value.replace(/^\.?\//, ''));
  return `${apiOrigin}${normalizedPath}`;
}

export function inferMobileMediaKind(mimeType?: string | null, url?: string | null) {
  const safeMimeType = mimeType?.toLowerCase() ?? '';
  const safeUrl = url?.toLowerCase() ?? '';

  if (safeMimeType.startsWith('video/') || /\.(mp4|mov|m4v|webm)$/i.test(safeUrl)) {
    return 'video';
  }

  if (safeMimeType === 'application/pdf' || /\.pdf$/i.test(safeUrl)) {
    return 'pdf';
  }

  return 'image';
}

export function formatMediaSize(sizeBytes?: number | null) {
  if (!sizeBytes || sizeBytes <= 0) {
    return null;
  }

  const sizeInMb = sizeBytes / 1024 / 1024;
  if (sizeInMb >= 1) {
    return `${sizeInMb.toFixed(1)} MB`;
  }

  const sizeInKb = sizeBytes / 1024;
  return `${Math.max(1, Math.round(sizeInKb))} KB`;
}
