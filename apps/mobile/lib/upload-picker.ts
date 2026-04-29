import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import type { ReactNativeUploadFile } from './media-api';

function inferName(uri: string, fallbackExtension: string) {
  const cleanUri = uri.split('?')[0] ?? uri;
  const segments = cleanUri.split('/');
  const last = segments[segments.length - 1];

  if (last && last.includes('.')) {
    return last;
  }

  return `upload-${Date.now()}.${fallbackExtension}`;
}

function inferExtension(mimeType: string) {
  if (mimeType.includes('png')) {
    return 'png';
  }
  if (mimeType.includes('webp')) {
    return 'webp';
  }
  if (mimeType.includes('mp4')) {
    return 'mp4';
  }
  if (mimeType.includes('mpeg')) {
    return 'mp3';
  }
  if (mimeType.includes('pdf')) {
    return 'pdf';
  }

  return 'jpg';
}

function normalizeFile(uri: string, mimeType?: string | null, fileName?: string | null): ReactNativeUploadFile {
  const safeMimeType = mimeType || 'image/jpeg';
  const extension = inferExtension(safeMimeType);

  return {
    uri,
    name: fileName || inferName(uri, extension),
    type: safeMimeType,
  };
}

export async function pickMediaFiles(options?: {
  allowsMultipleSelection?: boolean;
  videoMaxDuration?: number;
}) {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

  if (!permission.granted) {
    throw new Error('Medya secmek icin galeri izni vermelisiniz.');
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.All,
    allowsMultipleSelection: options?.allowsMultipleSelection ?? false,
    quality: 0.9,
    videoMaxDuration: options?.videoMaxDuration,
  });

  if (result.canceled) {
    return [];
  }

  return result.assets.map((asset) => normalizeFile(asset.uri, asset.mimeType, asset.fileName));
}

export async function pickDocumentFiles(options?: {
  multiple?: boolean;
  type?: string | string[];
}) {
  const result = await DocumentPicker.getDocumentAsync({
    multiple: options?.multiple ?? false,
    type: options?.type ?? '*/*',
    copyToCacheDirectory: true,
  });

  if (result.canceled) {
    return [];
  }

  return result.assets.map((asset) => normalizeFile(asset.uri, asset.mimeType, asset.name));
}
