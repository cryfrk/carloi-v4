import { MediaAssetPurpose, type CreatePostMediaInput, type MediaAssetUploadResponse } from '@carloi-v4/types';
import { Redirect, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { MobileShell } from '../components/mobile-shell';
import { MobileMediaView } from '../components/mobile-media-view';
import { useAuth } from '../context/auth-context';
import { mobileTheme } from '../lib/design-system';
import { mobileMediaApi } from '../lib/media-api';
import { SocialApiError, mobileSocialApi } from '../lib/social-api';
import { pickMediaFiles } from '../lib/upload-picker';

function inferMediaType(mimeType: string): CreatePostMediaInput['mediaType'] {
  return mimeType.startsWith('video/') ? 'VIDEO' : 'IMAGE';
}

const EDITOR_CHIPS = ['Kirp', 'Dondur', 'Filtre', 'Kapak sec'];

export default function CreatePostScreen() {
  const router = useRouter();
  const { session } = useAuth();
  const [caption, setCaption] = useState('');
  const [locationText, setLocationText] = useState('');
  const [media, setMedia] = useState<MediaAssetUploadResponse[]>([]);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const maybeAccessToken = session?.accessToken;
  const hasValidMedia = useMemo(() => media.length > 0, [media]);

  if (!maybeAccessToken) {
    return <Redirect href="/login" />;
  }

  const accessToken: string = maybeAccessToken;

  async function handlePickMedia() {
    setUploading(true);
    setErrorMessage(null);
    setMessage(null);

    try {
      const files = await pickMediaFiles({
        allowsMultipleSelection: true,
        videoMaxDuration: 45,
        quality: 0.82,
        maxFileSizeMb: 80,
      });

      if (!files.length) {
        return;
      }

      const uploads = await mobileMediaApi.uploadFiles(accessToken, files, MediaAssetPurpose.POST_MEDIA);
      setMedia((current) => [...current, ...uploads].slice(0, 10));
      setMessage(`${uploads.length} medya yuklendi.`);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Medya yuklenemedi.');
    } finally {
      setUploading(false);
    }
  }

  async function handleSubmit() {
    if (!hasValidMedia) {
      setErrorMessage('En az bir medya yuklemelisiniz.');
      return;
    }

    setSubmitting(true);
    setErrorMessage(null);
    setMessage(null);

    try {
      await mobileSocialApi.createPost(accessToken, {
        caption: caption.trim() || undefined,
        locationText: locationText.trim() || undefined,
        media: media.map((item) => ({
          url: item.url,
          mediaAssetId: item.id,
          mediaType: inferMediaType(item.mimeType),
        })),
      });

      setMessage('Post paylasildi. Feed aciliyor.');
      router.replace('/home');
    } catch (error) {
      if (error instanceof SocialApiError || error instanceof Error) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage('Post su anda olusturulamadi.');
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <MobileShell
      title="Post olustur"
      subtitle="Temiz bir composer ile medya sec, sirala ve feed'e gonder."
    >
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.section}>
          <Text style={styles.sectionHint}>
            Foto ve videolar yukleme oncesi hafif sikistirilir. Videoda 45 saniye ve 80 MB siniri uygulanir.
          </Text>
          <Text style={styles.label}>Caption</Text>
          <TextInput
            value={caption}
            onChangeText={setCaption}
            placeholder="Maksimum 600 karakter"
            placeholderTextColor={mobileTheme.colors.textMuted}
            multiline
            maxLength={600}
            style={[styles.input, styles.textarea]}
          />

          <Text style={styles.label}>Konum</Text>
          <TextInput
            value={locationText}
            onChangeText={setLocationText}
            placeholder="Ornek: Istanbul / Sariyer"
            placeholderTextColor={mobileTheme.colors.textMuted}
            style={styles.input}
          />
        </View>

        <View style={styles.section}>
          <View style={styles.rowBetween}>
            <View>
              <Text style={styles.sectionTitle}>Medya</Text>
              <Text style={styles.sectionMeta}>{media.length}/10 secildi</Text>
            </View>
            <Pressable onPress={() => void handlePickMedia()} style={styles.ghostButton}>
              <Text style={styles.ghostLabel}>{uploading ? 'Yukleniyor...' : 'Galeriden sec'}</Text>
            </Pressable>
          </View>

          {!media.length ? (
            <View style={styles.emptyState}>
              <View style={styles.placeholderTile} />
              <Text style={styles.emptyTitle}>Henuz medya secilmedi</Text>
              <Text style={styles.emptyCopy}>Bir veya daha fazla gorsel veya video sec. En fazla 10 medya desteklenir.</Text>
            </View>
          ) : null}

          {media.map((item, index) => (
            <View key={item.id} style={styles.mediaCard}>
              <View style={styles.mediaHead}>
                <Text style={styles.mediaIndex}>Medya {index + 1}</Text>
                <Text style={styles.mediaMeta}>{item.mimeType} · {(item.size / 1024 / 1024).toFixed(2)} MB</Text>
              </View>
              <View style={styles.previewFrame}>
                <MobileMediaView
                  autoPlay={(inferMediaType(item.mimeType) ?? 'IMAGE') === 'VIDEO'}
                  loop={(inferMediaType(item.mimeType) ?? 'IMAGE') === 'VIDEO'}
                  mediaType={inferMediaType(item.mimeType) ?? 'IMAGE'}
                  muted
                  style={styles.previewImage}
                  uri={item.url}
                />
              </View>
              <View style={styles.toolsRow}>
                <Pressable
                  disabled={index === 0}
                  onPress={() =>
                    setMedia((current) => {
                      const next = [...current];
                      const currentItem = next[index];
                      const previousItem = next[index - 1];

                      if (!currentItem || !previousItem) {
                        return current;
                      }

                      next[index - 1] = currentItem;
                      next[index] = previousItem;
                      return next;
                    })
                  }
                  style={[styles.toolButton, index === 0 ? styles.toolButtonDisabled : null]}
                >
                  <Text style={styles.toolLabel}>Yukari</Text>
                </Pressable>
                <Pressable
                  disabled={index === media.length - 1}
                  onPress={() =>
                    setMedia((current) => {
                      const next = [...current];
                      const currentItem = next[index];
                      const nextItem = next[index + 1];

                      if (!currentItem || !nextItem) {
                        return current;
                      }

                      next[index + 1] = currentItem;
                      next[index] = nextItem;
                      return next;
                    })
                  }
                  style={[styles.toolButton, index === media.length - 1 ? styles.toolButtonDisabled : null]}
                >
                  <Text style={styles.toolLabel}>Asagi</Text>
                </Pressable>
                <Pressable
                  onPress={() => setMedia((current) => current.filter((entry) => entry.id !== item.id))}
                  style={styles.toolButton}
                >
                  <Text style={styles.toolLabel}>Sil</Text>
                </Pressable>
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.editorChipRow}>
                {EDITOR_CHIPS.map((chip) => (
                  <Pressable
                    key={`${item.id}-${chip}`}
                    onPress={() => setMessage(`${chip} araci bu medya icin editor katmanina baglanmaya hazir.`)}
                    style={styles.editorChip}
                  >
                    <Text style={styles.editorChipLabel}>{chip}</Text>
                  </Pressable>
                ))}
              </ScrollView>
            </View>
          ))}
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
          onPress={() => void handleSubmit()}
          disabled={submitting || uploading || !hasValidMedia}
          style={[
            styles.submitButton,
            submitting || uploading || !hasValidMedia ? styles.submitButtonDisabled : null,
          ]}
        >
          <Text style={styles.submitLabel}>{submitting ? 'Paylasiliyor...' : 'Paylas'}</Text>
        </Pressable>
      </ScrollView>
    </MobileShell>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: mobileTheme.spacing.md,
    paddingBottom: 10,
  },
  section: {
    gap: 12,
    padding: 18,
    borderRadius: mobileTheme.radius.xl,
    backgroundColor: mobileTheme.colors.surface,
    borderWidth: 1,
    borderColor: mobileTheme.colors.border,
  },
  sectionHint: {
    color: mobileTheme.colors.textMuted,
    fontSize: 12,
    lineHeight: 18,
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
    minHeight: 110,
    textAlignVertical: 'top',
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
  emptyState: {
    gap: 8,
    paddingVertical: 18,
    alignItems: 'center',
  },
  placeholderTile: {
    width: 92,
    height: 92,
    borderRadius: 20,
    backgroundColor: mobileTheme.colors.surfaceMuted,
    borderWidth: 1,
    borderColor: mobileTheme.colors.border,
  },
  emptyTitle: {
    color: mobileTheme.colors.textStrong,
    fontWeight: '700',
  },
  emptyCopy: {
    color: mobileTheme.colors.textMuted,
    lineHeight: 20,
    textAlign: 'center',
  },
  mediaCard: {
    gap: 10,
    paddingTop: 2,
    borderTopWidth: 1,
    borderTopColor: mobileTheme.colors.border,
  },
  mediaHead: {
    gap: 3,
  },
  mediaIndex: {
    color: mobileTheme.colors.textStrong,
    fontWeight: '700',
  },
  mediaMeta: {
    color: mobileTheme.colors.textMuted,
    fontSize: 12,
  },
  previewFrame: {
    aspectRatio: 1,
    overflow: 'hidden',
    borderRadius: mobileTheme.radius.lg,
    backgroundColor: mobileTheme.colors.surfaceMuted,
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  previewVideo: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    gap: 8,
  },
  previewVideoLabel: {
    color: mobileTheme.colors.textStrong,
    fontWeight: '800',
    fontSize: 12,
  },
  previewVideoUrl: {
    color: mobileTheme.colors.textMuted,
    textAlign: 'center',
    lineHeight: 20,
  },
  toolsRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  editorChipRow: {
    gap: 8,
  },
  editorChip: {
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 999,
    backgroundColor: '#f7f8fa',
    borderWidth: 1,
    borderColor: '#eceff3',
  },
  editorChipLabel: {
    color: mobileTheme.colors.textStrong,
    fontSize: 12,
    fontWeight: '700',
  },
  toolButton: {
    borderRadius: mobileTheme.radius.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: mobileTheme.colors.surfaceMuted,
  },
  toolButtonDisabled: {
    opacity: 0.4,
  },
  toolLabel: {
    color: mobileTheme.colors.textStrong,
    fontSize: 12,
    fontWeight: '700',
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
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: mobileTheme.radius.lg,
    paddingVertical: 16,
    backgroundColor: mobileTheme.colors.textStrong,
    marginBottom: 6,
  },
  submitButtonDisabled: {
    opacity: 0.45,
  },
  submitLabel: {
    color: mobileTheme.colors.white,
    fontSize: 15,
    fontWeight: '800',
  },
});


