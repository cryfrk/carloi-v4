import { MediaVisibility, type MediaAsset } from '@prisma/client';

type MediaAssetSnapshot = Pick<MediaAsset, 'id' | 'url' | 'storageKey' | 'visibility'>;

const KNOWN_LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '0.0.0.0', '10.0.2.2']);

function trimTrailingSlash(value: string) {
  return value.replace(/\/+$/, '');
}

function ensureLeadingSlash(value: string) {
  return value.startsWith('/') ? value : `/${value}`;
}

function toPosixPath(value: string) {
  return value.replace(/\\/g, '/');
}

function normalizeApiBaseUrl(fallbackOriginBaseUrl?: string | null) {
  const explicitApiBaseUrl =
    process.env.PUBLIC_API_BASE_URL?.trim() ||
    process.env.NEXT_PUBLIC_API_BASE_URL?.trim() ||
    process.env.EXPO_PUBLIC_API_BASE_URL?.trim();

  if (explicitApiBaseUrl) {
    return trimTrailingSlash(explicitApiBaseUrl);
  }

  const mediaBaseUrl = process.env.PUBLIC_MEDIA_BASE_URL?.trim();
  if (mediaBaseUrl) {
    try {
      const parsed = new URL(mediaBaseUrl);
      parsed.pathname = parsed.pathname.replace(/\/uploads(?:\/.*)?$/i, '') || '/';
      return trimTrailingSlash(parsed.toString());
    } catch {
      return trimTrailingSlash(mediaBaseUrl.replace(/\/uploads(?:\/.*)?$/i, ''));
    }
  }

  const fallback = fallbackOriginBaseUrl?.trim();
  if (fallback) {
    return trimTrailingSlash(fallback);
  }

  return 'http://localhost:3001';
}

function buildConfiguredPublicAssetUrl(storageKey: string, fallbackOriginBaseUrl?: string | null) {
  const normalizedStorageKey = toPosixPath(storageKey);
  const relativePublicKey = normalizedStorageKey.replace(/^public\//i, '');
  const provider = (process.env.MEDIA_STORAGE_PROVIDER || 'local').trim().toLowerCase();

  if (provider === 's3') {
    const customBaseUrl = process.env.S3_PUBLIC_BASE_URL?.trim();
    if (customBaseUrl) {
      return `${trimTrailingSlash(customBaseUrl)}/${normalizedStorageKey}`;
    }

    const endpoint = process.env.S3_ENDPOINT?.trim();
    const bucket = process.env.S3_BUCKET?.trim();
    const region = process.env.S3_REGION?.trim();
    const forcePathStyle = (process.env.S3_FORCE_PATH_STYLE || 'false').toLowerCase() === 'true';

    if (endpoint && bucket) {
      const normalizedEndpoint = trimTrailingSlash(endpoint);
      return forcePathStyle
        ? `${normalizedEndpoint}/${bucket}/${normalizedStorageKey}`
        : `${normalizedEndpoint}/${normalizedStorageKey}`;
    }

    if (bucket && region) {
      return `https://${bucket}.s3.${region}.amazonaws.com/${normalizedStorageKey}`;
    }
  }

  const publicMediaBaseUrl = process.env.PUBLIC_MEDIA_BASE_URL?.trim();
  if (publicMediaBaseUrl) {
    return `${trimTrailingSlash(publicMediaBaseUrl)}/${relativePublicKey}`;
  }

  return `${normalizeApiBaseUrl(fallbackOriginBaseUrl)}/uploads/${relativePublicKey}`;
}

function extractUploadPathFromAbsolutePath(value: string) {
  const normalized = toPosixPath(value);
  const publicMatch = normalized.match(/\/uploads\/public\/(.+)$/i);
  if (publicMatch?.[1]) {
    return `/uploads/${publicMatch[1]}`;
  }

  const mediaMatch = normalized.match(/\/uploads\/private\/(.+)$/i);
  if (mediaMatch?.[1]) {
    return `/uploads/private/${mediaMatch[1]}`;
  }

  return null;
}

export function buildCanonicalAssetUrl(
  asset: MediaAssetSnapshot,
  fallbackOriginBaseUrl?: string | null,
) {
  if (asset.visibility === MediaVisibility.PRIVATE) {
    return `${normalizeApiBaseUrl(fallbackOriginBaseUrl)}/media/assets/${asset.id}/file`;
  }

  return buildConfiguredPublicAssetUrl(asset.storageKey, fallbackOriginBaseUrl);
}

export function normalizePersistedMediaUrl(
  value: string | null | undefined,
  options?: {
    mediaAsset?: MediaAssetSnapshot | null;
    fallbackOriginBaseUrl?: string | null;
  },
) {
  const fallbackOriginBaseUrl = options?.fallbackOriginBaseUrl;
  const mediaAsset = options?.mediaAsset;

  if (mediaAsset?.storageKey) {
    return buildCanonicalAssetUrl(mediaAsset, fallbackOriginBaseUrl);
  }

  if (!value || value.startsWith('pending://')) {
    return mediaAsset ? buildCanonicalAssetUrl(mediaAsset, fallbackOriginBaseUrl) : null;
  }

  const apiBaseUrl = normalizeApiBaseUrl(fallbackOriginBaseUrl);
  const normalizedValue = toPosixPath(value.trim());

  if (/^[a-z]:\//i.test(normalizedValue)) {
    const uploadPath = extractUploadPathFromAbsolutePath(normalizedValue);
    return uploadPath ? `${apiBaseUrl}${uploadPath}` : null;
  }

  if (/^https?:\/\//i.test(normalizedValue)) {
    try {
      const parsed = new URL(normalizedValue);
      const pathnameWithSearch = `${parsed.pathname}${parsed.search}`;

      if (
        KNOWN_LOCAL_HOSTS.has(parsed.hostname) &&
        (parsed.pathname.startsWith('/uploads/') || parsed.pathname.startsWith('/media/assets/'))
      ) {
        return `${apiBaseUrl}${pathnameWithSearch}`;
      }

      return parsed.toString();
    } catch {
      return normalizedValue;
    }
  }

  if (normalizedValue.startsWith('/uploads/') || normalizedValue.startsWith('/media/assets/')) {
    return `${apiBaseUrl}${normalizedValue}`;
  }

  const uploadPath = extractUploadPathFromAbsolutePath(normalizedValue);
  if (uploadPath) {
    return `${apiBaseUrl}${uploadPath}`;
  }

  return `${apiBaseUrl}${ensureLeadingSlash(normalizedValue.replace(/^\.?\//, ''))}`;
}

export function shouldLogMediaDebug() {
  return process.env.NODE_ENV !== 'production';
}
