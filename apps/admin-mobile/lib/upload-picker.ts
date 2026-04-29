import * as DocumentPicker from 'expo-document-picker';

export type AdminUploadFile = {
  uri: string;
  name: string;
  type: string;
};

export async function pickAdminDocuments(options?: { multiple?: boolean; type?: string | string[] }) {
  const result = await DocumentPicker.getDocumentAsync({
    multiple: options?.multiple ?? false,
    type: options?.type ?? ['application/pdf', 'image/*'],
    copyToCacheDirectory: true,
  });

  if (result.canceled) {
    return [];
  }

  return result.assets.map((asset) => ({
    uri: asset.uri,
    name: asset.name,
    type: asset.mimeType || 'application/pdf',
  })) as AdminUploadFile[];
}
