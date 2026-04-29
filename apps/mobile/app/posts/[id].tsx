import type { PostDetailResponse } from '@carloi-v4/types';
import { Redirect, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { MobileShell } from '../../components/mobile-shell';
import { useAuth } from '../../context/auth-context';
import { mobileLoiAiApi } from '../../lib/loi-ai-api';

export default function PostDetailScreen() {
  const params = useLocalSearchParams<{ id: string }>();
  const { session } = useAuth();
  const [post, setPost] = useState<PostDetailResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!session?.accessToken || !params.id) {
      return;
    }

    void mobileLoiAiApi
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
    <MobileShell title="Post" subtitle="Loi AI kartindan acilan gonderi detayi">
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}
        {post ? (
          <View style={styles.card}>
            <Text style={styles.kicker}>@{post.owner.username}</Text>
            {post.media[0] ? <Text style={styles.media}>{post.media[0].url}</Text> : null}
            {post.caption ? <Text style={styles.copy}>{post.caption}</Text> : null}
            <Text style={styles.meta}>{post.likeCount} begeni · {post.commentCount} yorum</Text>
          </View>
        ) : (
          <Text style={styles.copy}>Gonderi yukleniyor...</Text>
        )}
      </ScrollView>
    </MobileShell>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { gap: 12, paddingBottom: 24 },
  card: { borderRadius: 24, padding: 18, backgroundColor: 'rgba(255,255,255,0.05)', gap: 10 },
  kicker: { color: '#f2b6a1', fontWeight: '800' },
  media: { color: '#8fd694' },
  copy: { color: '#f7efe7', lineHeight: 22 },
  meta: { color: '#a9bac7' },
  errorText: { color: '#ffd5d5' },
});
