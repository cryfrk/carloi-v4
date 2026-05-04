import { WEB_API_BASE_URL } from './api-base-url';

const KNOWN_LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '0.0.0.0']);

function getApiOrigin() {
  try {
    return new URL(WEB_API_BASE_URL).origin;
  } catch {
    return WEB_API_BASE_URL.replace(/\/+$/, '');
  }
}

function ensureLeadingSlash(path: string) {
  return path.startsWith('/') ? path : `/${path}`;
}

export function resolveWebMediaUrl(value: string | null | undefined) {
  if (!value || value.startsWith('pending://')) {
    return null;
  }

  if (value.startsWith('demo://')) {
    const key = value.slice('demo://'.length).trim();
    return key ? `/demo-media/${key}.png` : '/demo-media/carloi-placeholder.png';
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

export function inferWebMediaKind(mimeType?: string | null, url?: string | null) {
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
