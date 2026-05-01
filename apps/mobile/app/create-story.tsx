import { MediaAssetPurpose, type MediaAssetUploadResponse } from '@carloi-v4/types';
import { Redirect, useRouter } from 'expo-router';
import { useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { MobileShell } from '../components/mobile-shell';
import { useAuth } from '../context/auth-context';
import { mobileTheme } from '../lib/design-system';
import { mobileMediaApi } from '../lib/media-api';
import { SocialApiError, mobileSocialApi } from '../lib/social-api';
import { pickMediaFiles } from '../lib/upload-picker';

function inferMediaType(mimeType: string) {
  return mimeType.startsWith('video/') ? 'VIDEO' : 'IMAGE';
}

export default function CreateStoryScreen() {
  const router = useRouter();
  const { session } = useAuth();
  const [caption, setCaption] = useState('');
  const [locationText, setLocationText] = useState('');
  const [uploadedMedia, setUploadedMedia] = useState<MediaAssetUploadResponse | null>(null);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const accessToken = session?.accessToken;

  if (!accessToken) {
    return <Redirect href="/login" />;
  }

  const token = accessToken;

  async function handlePickStoryMedia() {
    setUploading(true);
    setErrorMessage(null);
    setMessage(null);

    try {
      const files = await pickMediaFiles({ videoMaxDuration: 15 });
      const selectedFile = files[0];

      if (!selectedFile) {
        return;
      }

      const upload = await mobileMediaApi.uploadFile(token, selectedFile, MediaAssetPurpose.STORY_MEDIA);
      setUploadedMedia(upload);
      setMessage('Hikaye medyasi yuklendi.');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Hikaye medyasi yuklenemedi.');
    } finally {
      setUploading(false);
    }
  }

  async function handleSubmit() {
    if (!uploadedMedia) {
      setErrorMessage('Hikaye icin bir medya secmelisiniz.');
      return;
    }

    setSubmitting(true);
    setErrorMessage(null);

    try {
      await mobileSocialApi.createStory(token, {
        caption: caption.trim() || undefined,
        locationText: locationText.trim() || undefined,
        media: {
          url: uploadedMedia.url,
          mediaAssetId: uploadedMedia.id,
          mediaType: inferMediaType(uploadedMedia.mimeType),
        },
      });
      setMessage('Hikaye paylasildi.');
      router.replace('/home');
    } catch (error) {
      if (error instanceof SocialApiError || error instanceof Error) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage('Hikaye paylasilamadi.');
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <MobileShell title="Hikaye olustur" subtitle="24 saatlik story akisi icin tek medya sec ve aninda paylas.">
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.section}>
          <View style={styles.rowBetween}>
            <View>
              <Text style={styles.sectionTitle}>Story medyasi</Text>
              <Text style={styles.sectionMeta}>Foto veya 15 saniyelik video</Text>
            </View>
            <Pressable style={styles.ghostButton} onPress={() => void handlePickStoryMedia()}>
              <Text style={styles.ghostLabel}>{uploading ? 'Yukleniyor...' : 'Sec'}</Text>
            </Pressable>
          </View>

          {uploadedMedia ? (
            <View style={styles.previewCard}>
              {uploadedMedia.mimeType.startsWith('image/') ? (
                <Image source={{ uri: uploadedMedia.url }} style={styles.previewImage} resizeMode="cover" />
              ) : (
                <View style={styles.videoPlaceholder}>
                  <Text style={styles.videoLabel}>VIDEO STORY</Text>
                  <Text style={styles.videoUrl}>{uploadedMedia.url}</Text>
                </View>
              )}
              <Text style={styles.meta}>{uploadedMedia.mimeType} · {(uploadedMedia.size / 1024 / 1024).toFixed(2)} MB</Text>
            </View>
          ) : (
            <View style={styles.placeholderCard}>
              <View style={styles.placeholderTile} />
              <Text style={styles.placeholderTitle}>Henuz hikaye medyasi secilmedi</Text>
              <Text style={styles.placeholderCopy}>Foto veya video secildiginde burada onizleme goreceksiniz.</Text>
            </View>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Caption</Text>
          <TextInput
            value={caption}
            onChangeText={setCaption}
            placeholder="Kisa bir hikaye notu"
            placeholderTextColor={mobileTheme.colors.textMuted}
            multiline
            maxLength={280}
            style={[styles.input, styles.textarea]}
          />
          <Text style={styles.label}>Konum</Text>
          <TextInput
            value={locationText}
            onChangeText={setLocationText}
            placeholder="Ornek: Istanbul / Besiktas"
            placeholderTextColor={mobileTheme.colors.textMuted}
            style={styles.input}
          />
        </View>

        {message ? (
          <View style={[styles.messageBox, styles.messageSuccess]}>
            <Text style={styles.messageText}>{message}</Text>
          </View>
        ) : null}
        {errorMessage ? (
          <View style={[styles.messageBox, styles.messageError]}>
            <Text style={styles.messageText}>{errorMessage}</Text>
          </View>
        ) : null}

        <Pressable
          style={[styles.submitButton, !uploadedMedia || submitting ? styles.submitButtonDisabled : null]}
          onPress={() => void handleSubmit()}
          disabled={!uploadedMedia || submitting || uploading}
        >
          <Text style={styles.submitLabel}>{submitting ? 'Paylasiliyor...' : 'Hikayeyi paylas'}</Text>
        </Pressable>
      </ScrollView>
    </MobileShell>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: mobileTheme.spacing.md,
    paddingBottom: 18,
  },
  section: {
    gap: 12,
    padding: 18,
    borderRadius: mobileTheme.radius.xl,
    backgroundColor: mobileTheme.colors.surface,
    borderWidth: 1,
    borderColor: mobileTheme.colors.border,
  },
  rowBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  sectionTitle: {
    color: mobileTheme.colors.textStrong,
    fontSize: 17,
    fontWeight: '700',
  },
  sectionMeta: {
    color: mobileTheme.colors.textMuted,
    fontSize: 12,
    marginTop: 2,
  },
  ghostButton: {
    borderRadius: mobileTheme.radius.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: mobileTheme.colors.surfaceMuted,
  },
  ghostLabel: {
    color: mobileTheme.colors.textStrong,
    fontWeight: '700',
    fontSize: 12,
  },
  previewCard: {
    gap: 10,
  },
  previewImage: {
    width: '100%',
    aspectRatio: 0.72,
    borderRadius: mobileTheme.radius.lg,
  },
  videoPlaceholder: {
    aspectRatio: 0.72,
    borderRadius: mobileTheme.radius.lg,
    backgroundColor: mobileTheme.colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    gap: 8,
  },
  videoLabel: {
    color: mobileTheme.colors.textStrong,
    fontWeight: '800',
  },
  videoUrl: {
    color: mobileTheme.colors.textMuted,
    textAlign: 'center',
  },
  meta: {
    color: mobileTheme.colors.textMuted,
    fontSize: 12,
  },
  placeholderCard: {
    gap: 8,
    paddingVertical: 18,
    alignItems: 'center',
  },
  placeholderTile: {
    width: 96,
    height: 136,
    borderRadius: mobileTheme.radius.lg,
    backgroundColor: mobileTheme.colors.surfaceMuted,
    borderWidth: 1,
    borderColor: mobileTheme.colors.border,
  },
  placeholderTitle: {
    color: mobileTheme.colors.textStrong,
    fontWeight: '700',
  },
  placeholderCopy: {
    color: mobileTheme.colors.textMuted,
    lineHeight: 20,
    textAlign: 'center',
  },
  label: {
    color: mobileTheme.colors.textStrong,
    fontWeight: '700',
    fontSize: 13,
  },
  input: {
    borderRadius: mobileTheme.radius.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: mobileTheme.colors.textStrong,
    backgroundColor: mobileTheme.colors.surfaceMuted,
    borderWidth: 1,
    borderColor: mobileTheme.colors.border,
  },
  textarea: {
    minHeight: 96,
    textAlignVertical: 'top',
  },
  messageBox: {
    borderRadius: mobileTheme.radius.md,
    padding: 14,
    borderWidth: 1,
  },
  messageSuccess: {
    backgroundColor: '#f0fdf4',
    borderColor: '#bbf7d0',
  },
  messageError: {
    backgroundColor: '#fff5f5',
    borderColor: '#fecaca',
  },
  messageText: {
    color: mobileTheme.colors.text,
    lineHeight: 20,
  },
  submitButton: {
    borderRadius: mobileTheme.radius.lg,
    paddingVertical: 16,
    alignItems: 'center',
    backgroundColor: mobileTheme.colors.textStrong,
  },
  submitButtonDisabled: {
    opacity: 0.45,
  },
  submitLabel: {
    color: mobileTheme.colors.white,
    fontWeight: '800',
  },
});
