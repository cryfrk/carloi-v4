import { MediaAssetPurpose, MediaVisibility } from '@prisma/client';

export const ALLOWED_MEDIA_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'video/mp4',
  'audio/mpeg',
  'audio/mp4',
  'application/pdf',
] as const;

export const MIME_SIZE_LIMITS: Record<string, number> = {
  'image/jpeg': 10 * 1024 * 1024,
  'image/png': 10 * 1024 * 1024,
  'image/webp': 10 * 1024 * 1024,
  'video/mp4': 100 * 1024 * 1024,
  'audio/mpeg': 25 * 1024 * 1024,
  'audio/mp4': 25 * 1024 * 1024,
  'application/pdf': 20 * 1024 * 1024,
};

export const MIME_ALLOWED_EXTENSIONS: Record<string, string[]> = {
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
  'image/webp': ['.webp'],
  'video/mp4': ['.mp4'],
  'audio/mpeg': ['.mp3'],
  'audio/mp4': ['.m4a', '.mp4'],
  'application/pdf': ['.pdf'],
};

export const PURPOSE_VISIBILITY_MAP: Record<MediaAssetPurpose, MediaVisibility> = {
  POST_MEDIA: MediaVisibility.PUBLIC,
  STORY_MEDIA: MediaVisibility.PUBLIC,
  LISTING_MEDIA: MediaVisibility.PUBLIC,
  PROFILE_AVATAR: MediaVisibility.PUBLIC,
  MESSAGE_ATTACHMENT: MediaVisibility.PRIVATE,
  COMMERCIAL_DOCUMENT: MediaVisibility.PRIVATE,
  INSURANCE_OFFER: MediaVisibility.PRIVATE,
  INSURANCE_POLICY: MediaVisibility.PRIVATE,
  INSURANCE_INVOICE: MediaVisibility.PRIVATE,
  GARAGE_VEHICLE_MEDIA: MediaVisibility.PUBLIC,
};

export const INSURANCE_ADMIN_MEDIA_PURPOSES = new Set<MediaAssetPurpose>([
  MediaAssetPurpose.INSURANCE_OFFER,
  MediaAssetPurpose.INSURANCE_POLICY,
  MediaAssetPurpose.INSURANCE_INVOICE,
]);

export const COMMERCIAL_ADMIN_MEDIA_PURPOSES = new Set<MediaAssetPurpose>([
  MediaAssetPurpose.COMMERCIAL_DOCUMENT,
]);
