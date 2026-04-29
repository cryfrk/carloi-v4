import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { MobileShell } from '../components/mobile-shell';
import { useAuth } from '../context/auth-context';
import { mobileProfileApi } from '../lib/profile-api';
import type { SavedItemsResponse } from '@carloi-v4/types';

export default function SavedItemsScreen() {
  const router = useRouter();
  const { session } = useAuth();
  const [saved, setSaved] = useState<SavedItemsResponse | null>(null);
  const [activeTab, setActiveTab] = useState<'posts' | 'listings'>('posts');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!session?.accessToken) {
      return;
    }

    void mobileProfileApi
      .getSavedItems(session.accessToken)
      .then(setSaved)
      .catch((error) => {
        setErrorMessage(error instanceof Error ? error.message : 'Kaydedilenler yuklenemedi.');
      });
  }, [session?.accessToken]);

  return (
    <MobileShell title="Kaydedilenler" subtitle="Sana daha sonra donmek istedigin gonderi ve ilanlar burada saklanir.">
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.tabsRow}>
          <Pressable style={[styles.tab, activeTab === 'posts' ? styles.tabActive : null]} onPress={() => setActiveTab('posts')}>
            <Text style={[styles.tabLabel, activeTab === 'posts' ? styles.tabLabelActive : null]}>Gonderiler</Text>
          </Pressable>
          <Pressable style={[styles.tab, activeTab === 'listings' ? styles.tabActive : null]} onPress={() => setActiveTab('listings')}>
            <Text style={[styles.tabLabel, activeTab === 'listings' ? styles.tabLabelActive : null]}>Ilanlar</Text>
          </Pressable>
        </View>
        {errorMessage ? <Text style={styles.error}>{errorMessage}</Text> : null}
        {activeTab === 'posts'
          ? saved?.savedPosts.map((item) => (
              <Pressable key={item.post.id} style={styles.card} onPress={() => router.push(`/posts/${item.post.id}`)}>
                <Text style={styles.cardTitle}>@{item.post.owner.username}</Text>
                <Text style={styles.cardBody} numberOfLines={3}>{item.post.caption ?? item.post.media[0]?.url ?? 'Kaydedilen gonderi'}</Text>
                <Text style={styles.meta}>{new Date(item.savedAt).toLocaleString('tr-TR')}</Text>
              </Pressable>
            ))
          : saved?.savedListings.map((item) => (
              <Pressable key={item.listing.listingId} style={styles.card} onPress={() => router.push(`/listings/${item.listing.listingId}`)}>
                <Text style={styles.cardTitle}>{item.listing.title}</Text>
                <Text style={styles.cardBody}>{[item.listing.brand, item.listing.model, item.listing.package].filter(Boolean).join(' · ')}</Text>
                <Text style={styles.meta}>{item.listing.price.toLocaleString('tr-TR')} TL</Text>
              </Pressable>
            ))}
        {!saved?.savedPosts.length && activeTab === 'posts' ? <Text style={styles.meta}>Kaydedilen gonderi yok.</Text> : null}
        {!saved?.savedListings.length && activeTab === 'listings' ? <Text style={styles.meta}>Kaydedilen ilan yok.</Text> : null}
      </ScrollView>
    </MobileShell>
  );
}

const styles = StyleSheet.create({
  content: { gap: 12, paddingBottom: 18 },
  tabsRow: { flexDirection: 'row', gap: 8 },
  tab: { flex: 1, alignItems: 'center', borderRadius: 18, paddingVertical: 12, backgroundColor: '#102030' },
  tabActive: { backgroundColor: '#ef8354' },
  tabLabel: { color: '#9fb0be', fontWeight: '800' },
  tabLabelActive: { color: '#08131d' },
  card: { gap: 8, padding: 16, borderRadius: 22, backgroundColor: '#102030' },
  cardTitle: { color: '#f8f2ea', fontWeight: '800' },
  cardBody: { color: '#c5d4de', lineHeight: 20 },
  meta: { color: '#8fa4b5', fontSize: 12 },
  error: { color: '#ffb4b4' },
});
