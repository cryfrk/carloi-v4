import { MediaAssetPurpose, type MediaAssetUploadResponse } from '@carloi-v4/types';
import { Redirect, useRouter } from 'expo-router';
import { useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { MobileShell } from '../components/mobile-shell';
import { useAuth } from '../context/auth-context';
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
    <MobileShell title="Hikaye olustur" subtitle="24 saatlik story icin fotograf veya 15 saniyelik video sec.">
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.card}>
          <Pressable style={styles.pickButton} onPress={() => void handlePickStoryMedia()}>
            <Text style={styles.pickLabel}>{uploading ? 'Medya yukleniyor...' : 'Galeri veya video sec'}</Text>
          </Pressable>

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
              <Text style={styles.placeholderTitle}>Henuz hikaye medyasi secilmedi</Text>
              <Text style={styles.placeholderCopy}>Foto veya video secildiginde burada onizleme goreceksiniz.</Text>
            </View>
          )}
        </View>

        <View style={styles.card}>
          <Text style={styles.label}>Caption</Text>
          <TextInput
            value={caption}
            onChangeText={setCaption}
            placeholder="Kisa bir hikaye notu"
            placeholderTextColor="#73879a"
            multiline
            maxLength={280}
            style={[styles.input, styles.textarea]}
          />
          <Text style={styles.label}>Konum</Text>
          <TextInput
            value={locationText}
            onChangeText={setLocationText}
            placeholder="Ornek: Istanbul / Besiktas"
            placeholderTextColor="#73879a"
            style={styles.input}
          />
        </View>

        {message ? <Text style={styles.notice}>{message}</Text> : null}
        {errorMessage ? <Text style={styles.error}>{errorMessage}</Text> : null}

        <Pressable style={[styles.submitButton, !uploadedMedia || submitting ? styles.submitButtonDisabled : null]} onPress={() => void handleSubmit()} disabled={!uploadedMedia || submitting || uploading}>
          <Text style={styles.submitLabel}>{submitting ? 'Paylasiliyor...' : 'Hikayeyi paylas'}</Text>
        </Pressable>
      </ScrollView>
    </MobileShell>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: 14,
    paddingBottom: 18,
  },
  card: {
    gap: 12,
    padding: 18,
    borderRadius: 26,
    backgroundColor: '#0d1d2a',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  pickButton: {
    borderRadius: 18,
    paddingVertical: 14,
    alignItems: 'center',
    backgroundColor: 'rgba(239,131,84,0.16)',
  },
  pickLabel: {
    color: '#ffd6c2',
    fontWeight: '800',
  },
  previewCard: {
    gap: 10,
  },
  previewImage: {
    width: '100%',
    aspectRatio: 0.65,
    borderRadius: 22,
  },
  videoPlaceholder: {
    aspectRatio: 0.65,
    borderRadius: 22,
    backgroundColor: '#08131d',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    gap: 8,
  },
  videoLabel: {
    color: '#ffd6c2',
    fontWeight: '800',
  },
  videoUrl: {
    color: '#c7d5de',
    textAlign: 'center',
  },
  meta: {
    color: '#9eb0be',
    fontSize: 12,
  },
  placeholderCard: {
    gap: 6,
    padding: 18,
    borderRadius: 20,
    backgroundColor: '#122334',
  },
  placeholderTitle: {
    color: '#f8f2ea',
    fontWeight: '800',
  },
  placeholderCopy: {
    color: '#a8b9c6',
    lineHeight: 20,
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
    minHeight: 96,
    textAlignVertical: 'top',
  },
  notice: {
    color: '#d6efcf',
  },
  error: {
    color: '#ffb4b4',
  },
  submitButton: {
    borderRadius: 22,
    paddingVertical: 16,
    alignItems: 'center',
    backgroundColor: '#ef8354',
  },
  submitButtonDisabled: {
    opacity: 0.45,
  },
  submitLabel: {
    color: '#08131d',
    fontWeight: '900',
  },
});
