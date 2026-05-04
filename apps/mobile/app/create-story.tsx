import { Ionicons } from '@expo/vector-icons';
import { MediaAssetPurpose, type MediaAssetUploadResponse } from '@carloi-v4/types';
import { Redirect, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { MobileShell } from '../components/mobile-shell';
import { MobileMediaView } from '../components/mobile-media-view';
import { useAuth } from '../context/auth-context';
import { mobileTheme } from '../lib/design-system';
import { mobileMediaApi } from '../lib/media-api';
import { SocialApiError, mobileSocialApi } from '../lib/social-api';
import { pickCameraMedia, pickMediaFiles } from '../lib/upload-picker';

function inferMediaType(mimeType: string) {
  return mimeType.startsWith('video/') ? 'VIDEO' : 'IMAGE';
}

function formatUploadMeta(uploadedMedia: MediaAssetUploadResponse) {
  const sizeInMb = uploadedMedia.size / 1024 / 1024;
  return `${uploadedMedia.mimeType} - ${sizeInMb.toFixed(2)} MB`;
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
  const shareDisabled = !uploadedMedia || submitting || uploading;
  const previewCaption = caption.trim() || 'Hikaye notun burada gorunecek';
  const previewLocation = locationText.trim() || 'Konum etiketi eklenmedi';
  const helperChips = useMemo(
    () => [
      'Text ekle',
      'Emoji / sticker',
      'Konum etiketi',
      'Kirp / dondur',
    ],
    [],
  );

  async function uploadStoryFile(kind: 'gallery' | 'camera') {
    setUploading(true);
    setErrorMessage(null);
    setMessage(null);

    try {
      const files =
        kind === 'camera'
          ? await pickCameraMedia({ videoMaxDuration: 15 })
          : await pickMediaFiles({ videoMaxDuration: 15 });
      const selectedFile = files[0];

      if (!selectedFile) {
        return;
      }

      const upload = await mobileMediaApi.uploadFile(token, selectedFile, MediaAssetPurpose.STORY_MEDIA);
      setUploadedMedia(upload);
      setMessage(kind === 'camera' ? 'Kamera medyasi hazirlandi.' : 'Galeri medyasi yuklendi.');
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

  function showPlaceholderAction(label: string) {
    setMessage(`${label} alani hazir. Native editor baglandiginda bu aksiyon dogrudan calisacak.`);
  }

  return (
    <MobileShell title="Hikaye olustur" subtitle="Galeriden ya da kameradan sec, onizle ve birkac dokunusla paylas.">
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.section}>
          <View style={styles.sectionHead}>
            <View>
              <Text style={styles.sectionTitle}>Medya secimi</Text>
              <Text style={styles.sectionMeta}>Foto veya maksimum 15 saniyelik video</Text>
            </View>
            <View style={styles.actionCluster}>
              <Pressable style={styles.ghostButton} onPress={() => void uploadStoryFile('gallery')}>
                <Ionicons color={mobileTheme.colors.textStrong} name="images-outline" size={16} />
                <Text style={styles.ghostLabel}>{uploading ? 'Yukleniyor...' : 'Galeri'}</Text>
              </Pressable>
              <Pressable style={styles.ghostButton} onPress={() => void uploadStoryFile('camera')}>
                <Ionicons color={mobileTheme.colors.textStrong} name="camera-outline" size={16} />
                <Text style={styles.ghostLabel}>Kamera</Text>
              </Pressable>
            </View>
          </View>

          {uploadedMedia ? (
            <View style={styles.previewCard}>
              <MobileMediaView
                autoPlay={uploadedMedia.mimeType.startsWith('video/')}
                loop={uploadedMedia.mimeType.startsWith('video/')}
                mediaType={inferMediaType(uploadedMedia.mimeType)}
                muted
                style={styles.previewImage}
                uri={uploadedMedia.url}
              />
              <View style={styles.previewOverlay}>
                <Text style={styles.previewUsername}>@{session.user.username}</Text>
                <Text style={styles.previewCaption}>{previewCaption}</Text>
                <Text style={styles.previewLocation}>{previewLocation}</Text>
              </View>
            </View>
          ) : (
            <View style={styles.placeholderCard}>
              <View style={styles.placeholderTile}>
                <Ionicons color="#9aa3af" name="sparkles-outline" size={28} />
              </View>
              <Text style={styles.placeholderTitle}>Hikaye onizlemesi burada belirecek</Text>
              <Text style={styles.placeholderCopy}>
                Once galeri ya da kamera sec. Medya geldikten sonra text, sticker ve konum alanlari anlamli hale gelecek.
              </Text>
            </View>
          )}
          {uploadedMedia ? <Text style={styles.meta}>{formatUploadMeta(uploadedMedia)}</Text> : null}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Hikaye ustune eklenecekler</Text>
          <View style={styles.chipRow}>
            {helperChips.map((label) => (
              <Pressable key={label} style={styles.helperChip} onPress={() => showPlaceholderAction(label)}>
                <Text style={styles.helperChipLabel}>{label}</Text>
              </Pressable>
            ))}
          </View>
          <Text style={styles.sectionMeta}>
            Bu alanlar su an guvenli placeholder akisi olarak duruyor; native editor baglandiginda ayni yerden devam edecegiz.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Story metni</Text>
          <TextInput
            value={caption}
            onChangeText={setCaption}
            placeholder="Kisa bir hikaye notu"
            placeholderTextColor={mobileTheme.colors.textMuted}
            multiline
            maxLength={280}
            style={[styles.input, styles.textarea]}
          />
          <Text style={styles.label}>Konum etiketi</Text>
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

        <Pressable style={[styles.submitButton, shareDisabled ? styles.submitButtonDisabled : null]} onPress={() => void handleSubmit()} disabled={shareDisabled}>
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
  sectionHead: {
    gap: 12,
  },
  sectionTitle: {
    color: mobileTheme.colors.textStrong,
    fontSize: 17,
    fontWeight: '700',
  },
  sectionMeta: {
    color: mobileTheme.colors.textMuted,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 2,
  },
  actionCluster: {
    flexDirection: 'row',
    gap: 10,
    flexWrap: 'wrap',
  },
  ghostButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
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
    position: 'relative',
    overflow: 'hidden',
    borderRadius: mobileTheme.radius.xl,
    backgroundColor: '#0f172a',
  },
  previewImage: {
    width: '100%',
    aspectRatio: 0.62,
  },
  previewOverlay: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 16,
    gap: 6,
  },
  previewUsername: {
    color: '#ffffff',
    fontWeight: '800',
  },
  previewCaption: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '600',
    lineHeight: 20,
  },
  previewLocation: {
    color: 'rgba(255,255,255,0.82)',
    fontSize: 12,
  },
  meta: {
    color: mobileTheme.colors.textMuted,
    fontSize: 12,
  },
  placeholderCard: {
    gap: 10,
    paddingVertical: 18,
    alignItems: 'center',
  },
  placeholderTile: {
    width: 120,
    height: 182,
    borderRadius: mobileTheme.radius.lg,
    backgroundColor: mobileTheme.colors.surfaceMuted,
    borderWidth: 1,
    borderColor: mobileTheme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
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
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  helperChip: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: mobileTheme.colors.surfaceMuted,
  },
  helperChipLabel: {
    color: mobileTheme.colors.textStrong,
    fontSize: 12,
    fontWeight: '700',
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

