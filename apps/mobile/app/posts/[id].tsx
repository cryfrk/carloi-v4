import { SharedContentType, type PostDetailResponse } from '@carloi-v4/types';
import { Redirect, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { MobileMediaView } from '../../components/mobile-media-view';
import { ShareContentSheet } from '../../components/share-content-sheet';
import { MobileShell } from '../../components/mobile-shell';
import { useAuth } from '../../context/auth-context';
import { demoFeedPostById } from '../../lib/demo-content';
import { mobileSocialApi } from '../../lib/social-api';

export default function PostDetailScreen() {
  const params = useLocalSearchParams<{ id: string }>();
  const { session } = useAuth();
  const [post, setPost] = useState<PostDetailResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [shareOpen, setShareOpen] = useState(false);

  useEffect(() => {
    if (!params.id) {
      return;
    }

    if (params.id.startsWith('demo-post-')) {
      setPost(demoFeedPostById[params.id] ?? null);
      return;
    }

    if (!session?.accessToken) {
      return;
    }

    void mobileSocialApi
      .getPostDetail(session.accessToken, params.id)
      .then(setPost)
      .catch((error) => {
        setErrorMessage(error instanceof Error ? error.message : 'Gonderi yuklenemedi.');
      });
  }, [params.id, session?.accessToken]);

  if (!session?.accessToken) {
    return <Redirect href="/login" />;
  }

  return (
    <MobileShell title="Post" subtitle="Gonderi detayi">
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        {notice ? <Text style={styles.noticeText}>{notice}</Text> : null}
        {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}
        {post ? (
          <View style={styles.card}>
            <View style={styles.header}>
              <Text style={styles.kicker}>@{post.owner.username}</Text>
              <Text style={styles.meta}>{new Date(post.createdAt).toLocaleDateString('tr-TR')}</Text>
            </View>

            <ScrollView
              horizontal
              pagingEnabled
              removeClippedSubviews
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.mediaTrack}
            >
              {post.media.map((item, index) => (
                <View key={item.id} style={styles.mediaFrame}>
                  <MobileMediaView
                    autoPlay={item.mediaType === 'VIDEO'}
                    mediaType={item.mediaType}
                    nativeControls={item.mediaType === 'VIDEO'}
                    style={styles.media}
                    uri={item.url}
                  />
                  {post.media.length > 1 ? (
                    <View style={styles.mediaCounter}>
                      <Text style={styles.mediaCounterLabel}>
                        {index + 1}/{post.media.length}
                      </Text>
                    </View>
                  ) : null}
                </View>
              ))}
            </ScrollView>

            {post.caption ? <Text style={styles.copy}>{post.caption}</Text> : null}
            <Text style={styles.meta}>{post.likeCount} begeni | {post.commentCount} yorum</Text>
            <View style={styles.actionRow}>
              <Pressable onPress={() => setShareOpen(true)} style={styles.shareButton}>
                <Text style={styles.shareButtonLabel}>Paylas</Text>
              </Pressable>
            </View>
          </View>
        ) : (
          <Text style={styles.loadingText}>Gonderi yukleniyor...</Text>
        )}
      </ScrollView>
      <ShareContentSheet
        accessToken={session.accessToken}
        contentId={params.id}
        contentType={SharedContentType.POST}
        currentUserId={session.user.id}
        onClose={() => setShareOpen(false)}
        onShared={(count) => setNotice(`${count} kisiye gonderildi.`)}
        visible={shareOpen}
      />
    </MobileShell>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { gap: 12, paddingBottom: 24 },
  card: {
    gap: 10,
    marginHorizontal: -14,
    paddingTop: 12,
    paddingBottom: 14,
    backgroundColor: '#ffffff',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#eceff3',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
    paddingHorizontal: 14,
  },
  kicker: {
    color: '#111111',
    fontSize: 13.5,
    fontWeight: '800',
  },
  mediaTrack: {
    gap: 0,
  },
  mediaFrame: {
    width: 360,
    aspectRatio: 4 / 5,
    backgroundColor: '#eef1f4',
  },
  media: {
    width: '100%',
    height: '100%',
    backgroundColor: '#eef1f4',
  },
  mediaCounter: {
    position: 'absolute',
    top: 10,
    right: 10,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    backgroundColor: 'rgba(17,17,17,0.58)',
  },
  mediaCounterLabel: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '700',
  },
  copy: {
    color: '#111111',
    lineHeight: 22,
    paddingHorizontal: 14,
  },
  actionRow: {
    paddingHorizontal: 14,
    paddingTop: 4,
  },
  shareButton: {
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    backgroundColor: '#111111',
  },
  shareButtonLabel: {
    color: '#ffffff',
    fontWeight: '800',
  },
  meta: {
    color: '#6b7280',
    paddingHorizontal: 14,
  },
  noticeText: {
    color: '#2563eb',
    paddingHorizontal: 14,
  },
  loadingText: {
    color: '#6b7280',
    paddingHorizontal: 14,
  },
  errorText: {
    color: '#dc2626',
    paddingHorizontal: 14,
  },
});
