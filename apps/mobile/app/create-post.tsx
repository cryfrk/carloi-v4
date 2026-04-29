import { MediaAssetPurpose, type CreatePostMediaInput, type MediaAssetUploadResponse } from '@carloi-v4/types';
import { Redirect, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { MobileShell } from '../components/mobile-shell';
import { useAuth } from '../context/auth-context';
import { mobileMediaApi } from '../lib/media-api';
import { pickMediaFiles } from '../lib/upload-picker';
import { SocialApiError, mobileSocialApi } from '../lib/social-api';

function inferMediaType(mimeType: string): CreatePostMediaInput['mediaType'] {
  return mimeType.startsWith('video/') ? 'VIDEO' : 'IMAGE';
}

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
      const files = await pickMediaFiles({ allowsMultipleSelection: true });

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
      subtitle="Galeriden sec, sirala, onizle ve dogrudan Carloi medya upload hattina gonder."
    >
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.card}>
          <Text style={styles.label}>Caption</Text>
          <TextInput
            value={caption}
            onChangeText={setCaption}
            placeholder="Maksimum 600 karakter"
            placeholderTextColor="#6d8090"
            multiline
            maxLength={600}
            style={[styles.input, styles.textarea]}
          />

          <Text style={styles.label}>Konum</Text>
          <TextInput
            value={locationText}
            onChangeText={setLocationText}
            placeholder="Ornek: Istanbul / Sariyer"
            placeholderTextColor="#6d8090"
            style={styles.input}
          />
        </View>

        <View style={styles.card}>
          <View style={styles.rowBetween}>
            <Text style={styles.sectionTitle}>Medya listesi</Text>
            <Pressable onPress={() => void handlePickMedia()} style={styles.ghostButton}>
              <Text style={styles.ghostLabel}>{uploading ? 'Yukleniyor...' : 'Galeriden sec'}</Text>
            </Pressable>
          </View>

          {!media.length ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyTitle}>Henuz medya secilmedi</Text>
              <Text style={styles.emptyCopy}>Bir veya daha fazla gorsel/video secin. En fazla 10 medya desteklenir.</Text>
            </View>
          ) : null}

          {media.map((item, index) => (
            <View key={item.id} style={styles.mediaCard}>
              <Text style={styles.mediaIndex}>Medya {index + 1}</Text>
              <View style={styles.previewFrame}>
                {inferMediaType(item.mimeType) === 'IMAGE' ? (
                  <Image source={{ uri: item.url }} style={styles.previewImage} resizeMode="cover" />
                ) : (
                  <View style={styles.previewVideo}>
                    <Text style={styles.previewVideoLabel}>VIDEO PREVIEW</Text>
                    <Text style={styles.previewVideoUrl}>{item.url}</Text>
                  </View>
                )}
              </View>
              <Text style={styles.mediaMeta}>{item.mimeType} · {(item.size / 1024 / 1024).toFixed(2)} MB</Text>
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

        <Pressable onPress={() => void handleSubmit()} disabled={submitting || uploading || !hasValidMedia} style={[styles.submitButton, submitting || uploading || !hasValidMedia ? styles.submitButtonDisabled : null]}>
          <Text style={styles.submitLabel}>{submitting ? 'Paylasiliyor...' : 'Paylas'}</Text>
        </Pressable>
      </ScrollView>
    </MobileShell>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: 14,
    paddingBottom: 10,
  },
  card: {
    gap: 12,
    padding: 18,
    borderRadius: 26,
    backgroundColor: '#0d1d2a',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  label: {
    color: '#f8f2ea',
    fontWeight: '700',
    fontSize: 13,
  },
  input: {
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: '#f8f2ea',
    backgroundColor: '#08131d',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
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
    color: '#f8f2ea',
    fontSize: 18,
    fontWeight: '800',
  },
  ghostButton: {
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: 'rgba(239,131,84,0.14)',
  },
  ghostLabel: {
    color: '#ffd6c2',
    fontWeight: '800',
    fontSize: 12,
  },
  emptyState: {
    gap: 6,
    padding: 18,
    borderRadius: 20,
    backgroundColor: '#122334',
  },
  emptyTitle: {
    color: '#f8f2ea',
    fontWeight: '800',
  },
  emptyCopy: {
    color: '#a9bac7',
    lineHeight: 20,
  },
  mediaCard: {
    gap: 10,
    padding: 14,
    borderRadius: 20,
    backgroundColor: '#122334',
  },
  mediaIndex: {
    color: '#f8f2ea',
    fontWeight: '800',
  },
  mediaMeta: {
    color: '#9ab0bf',
    fontSize: 12,
  },
  previewFrame: {
    aspectRatio: 1,
    overflow: 'hidden',
    borderRadius: 20,
    backgroundColor: '#08131d',
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
    color: '#ffd6c2',
    fontWeight: '800',
    fontSize: 12,
  },
  previewVideoUrl: {
    color: '#d5e0e7',
    textAlign: 'center',
    lineHeight: 20,
  },
  toolsRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  toolButton: {
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#08131d',
  },
  toolButtonDisabled: {
    opacity: 0.4,
  },
  toolLabel: {
    color: '#f8f2ea',
    fontSize: 12,
    fontWeight: '700',
  },
  messageBox: {
    borderRadius: 18,
    padding: 14,
  },
  messageSuccess: {
    backgroundColor: 'rgba(143,214,148,0.16)',
    borderWidth: 1,
    borderColor: 'rgba(143,214,148,0.24)',
  },
  messageError: {
    backgroundColor: 'rgba(216,82,82,0.16)',
    borderWidth: 1,
    borderColor: 'rgba(216,82,82,0.24)',
  },
  messageText: {
    color: '#f8f2ea',
    lineHeight: 20,
  },
  submitButton: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 22,
    paddingVertical: 16,
    backgroundColor: '#ef8354',
    marginBottom: 6,
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitLabel: {
    color: '#08131d',
    fontSize: 15,
    fontWeight: '800',
  },
});
