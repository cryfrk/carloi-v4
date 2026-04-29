import { Redirect, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import type { MessageParticipantSummary, MessageThreadSummary } from '@carloi-v4/types';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { MobileShell } from '../components/mobile-shell';
import { useAuth } from '../context/auth-context';
import { mobileMessagesApi } from '../lib/messages-api';

function formatTime(value: string) {
  return new Date(value).toLocaleString('tr-TR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function MessagesScreen() {
  const router = useRouter();
  const { session } = useAuth();
  const [threads, setThreads] = useState<MessageThreadSummary[]>([]);
  const [friends, setFriends] = useState<MessageParticipantSummary[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<MessageParticipantSummary[]>([]);
  const [groupOpen, setGroupOpen] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [selectedParticipants, setSelectedParticipants] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const accessToken = session?.accessToken ?? null;
  const selectableParticipants = useMemo(() => {
    const map = new Map<string, MessageParticipantSummary>();
    for (const friend of friends) {
      map.set(friend.id, friend);
    }
    for (const result of searchResults) {
      map.set(result.id, result);
    }
    return [...map.values()];
  }, [friends, searchResults]);

  useEffect(() => {
    if (!accessToken) {
      return;
    }

    setLoading(true);
    void Promise.all([mobileMessagesApi.getThreads(accessToken), mobileMessagesApi.getFriends(accessToken)])
      .then(([threadResponse, friendResponse]) => {
        setThreads(threadResponse.items);
        setFriends(friendResponse.items);
      })
      .catch((error) => {
        setErrorMessage(error instanceof Error ? error.message : 'Mesajlar yuklenemedi.');
      })
      .finally(() => setLoading(false));
  }, [accessToken]);

  useEffect(() => {
    if (!accessToken || searchQuery.trim().length < 2) {
      setSearchResults([]);
      return;
    }

    const timeout = setTimeout(() => {
      void mobileMessagesApi
        .searchUsers(accessToken, searchQuery.trim())
        .then((response) => setSearchResults(response.items))
        .catch(() => setSearchResults([]));
    }, 250);

    return () => clearTimeout(timeout);
  }, [accessToken, searchQuery]);

  if (!accessToken) {
    return <Redirect href="/login" />;
  }

  const token: string = accessToken;

  async function refreshThreads() {
    const response = await mobileMessagesApi.getThreads(token);
    setThreads(response.items);
  }

  async function openDirect(userId: string) {
    try {
      const response = await mobileMessagesApi.createDirectThread(token, {
        targetUserId: userId,
      });
      setSearchQuery('');
      setSearchResults([]);
      await refreshThreads();
      router.push(`/messages/${response.thread.id}`);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Direct sohbet acilamadi.');
    }
  }

  async function createGroup() {
    try {
      const response = await mobileMessagesApi.createGroupThread(token, {
        groupName: groupName.trim(),
        participantIds: selectedParticipants,
      });
      setGroupOpen(false);
      setGroupName('');
      setSelectedParticipants([]);
      await refreshThreads();
      router.push(`/messages/${response.thread.id}`);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Grup olusturulamadi.');
    }
  }

  function toggleParticipant(userId: string) {
    setSelectedParticipants((current) =>
      current.includes(userId) ? current.filter((item) => item !== userId) : [...current, userId],
    );
  }

  return (
    <MobileShell
      title="Messages"
      subtitle="Direct, grup ve ilan pazarlik threadlerini tek yerde yonet."
      actionLabel="Grup kur"
      onActionPress={() => setGroupOpen((current) => !current)}
    >
      <ScrollView contentContainerStyle={styles.content}>
        {errorMessage ? (
          <View style={[styles.banner, styles.errorBanner]}>
            <Text style={styles.bannerText}>{errorMessage}</Text>
          </View>
        ) : null}

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Kullanici ara</Text>
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="username, ad veya soyad"
            placeholderTextColor="#7f92a1"
            style={styles.input}
          />
          {searchResults.map((user) => (
            <Pressable key={user.id} style={styles.userCard} onPress={() => void openDirect(user.id)}>
              <View>
                <Text style={styles.userTitle}>@{user.username}</Text>
                <Text style={styles.userMeta}>{user.fullName}{user.isPrivate ? ' · Gizli hesap' : ''}</Text>
              </View>
              <Text style={styles.userAction}>Direct</Text>
            </Pressable>
          ))}
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Arkadaslar / Takip edilenler</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.friendRow}>
            {friends.map((friend) => (
              <Pressable key={friend.id} style={styles.friendPill} onPress={() => void openDirect(friend.id)}>
                <Text style={styles.friendTitle}>@{friend.username}</Text>
                <Text style={styles.friendMeta}>{friend.isMutualFollow ? 'Karsilikli' : 'Takip'}</Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>

        {groupOpen ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Grup olustur</Text>
            <TextInput
              value={groupName}
              onChangeText={setGroupName}
              placeholder="Grup adi"
              placeholderTextColor="#7f92a1"
              style={styles.input}
            />
            <View style={styles.selectorGrid}>
              {selectableParticipants.map((user) => (
                <Pressable
                  key={user.id}
                  style={[styles.selectorPill, selectedParticipants.includes(user.id) ? styles.selectorPillActive : null]}
                  onPress={() => toggleParticipant(user.id)}
                >
                  <Text style={styles.selectorLabel}>@{user.username}</Text>
                </Pressable>
              ))}
            </View>
            <Pressable style={styles.primaryButton} onPress={() => void createGroup()}>
              <Text style={styles.primaryButtonLabel}>Grubu olustur</Text>
            </Pressable>
          </View>
        ) : null}

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Thread listesi</Text>
          {loading ? (
            <View style={styles.loadingWrap}>
              <ActivityIndicator color="#ef8354" />
            </View>
          ) : threads.length === 0 ? (
            <Text style={styles.emptyText}>Henuz sohbet yok. Bir direct veya listing deal baslatabilirsiniz.</Text>
          ) : (
            threads.map((thread) => (
              <Pressable key={thread.id} style={styles.threadCard} onPress={() => router.push(`/messages/${thread.id}`)}>
                <View style={styles.threadTop}>
                  <Text style={styles.threadTitle}>{thread.groupName ?? thread.listing?.title ?? 'Sohbet'}</Text>
                  {thread.unreadCount > 0 ? <Text style={styles.unreadBadge}>{thread.unreadCount}</Text> : null}
                </View>
                <Text style={styles.threadMeta}>{thread.lastMessage?.bodyPreview ?? 'Henuz mesaj yok'}</Text>
                <Text style={styles.threadMeta}>{thread.lastMessage ? formatTime(thread.lastMessage.createdAt) : formatTime(thread.createdAt)}</Text>
              </Pressable>
            ))
          )}
        </View>
      </ScrollView>
    </MobileShell>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: 14,
    paddingBottom: 12,
  },
  banner: {
    borderRadius: 18,
    padding: 14,
  },
  errorBanner: {
    backgroundColor: 'rgba(216,82,82,0.2)',
  },
  bannerText: {
    color: '#f8f2ea',
    lineHeight: 20,
  },
  card: {
    gap: 12,
    padding: 18,
    borderRadius: 24,
    backgroundColor: '#0d1d2a',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  cardTitle: {
    color: '#f8f2ea',
    fontSize: 18,
    fontWeight: '800',
  },
  input: {
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: '#102030',
    color: '#f8f2ea',
  },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  userTitle: {
    color: '#f8f2ea',
    fontWeight: '800',
  },
  userMeta: {
    color: '#9eb0be',
  },
  userAction: {
    color: '#ffd6c2',
    fontWeight: '800',
  },
  friendRow: {
    gap: 10,
  },
  friendPill: {
    width: 144,
    padding: 14,
    borderRadius: 18,
    backgroundColor: '#132534',
  },
  friendTitle: {
    color: '#f8f2ea',
    fontWeight: '800',
  },
  friendMeta: {
    color: '#9eb0be',
    marginTop: 4,
  },
  selectorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  selectorPill: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: '#132534',
  },
  selectorPillActive: {
    backgroundColor: '#ef8354',
  },
  selectorLabel: {
    color: '#f8f2ea',
    fontWeight: '700',
  },
  primaryButton: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 18,
    paddingVertical: 14,
    backgroundColor: '#ef8354',
  },
  primaryButtonLabel: {
    color: '#08131d',
    fontWeight: '900',
  },
  loadingWrap: {
    paddingVertical: 24,
    alignItems: 'center',
  },
  emptyText: {
    color: '#9eb0be',
    lineHeight: 20,
  },
  threadCard: {
    gap: 6,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  threadTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  threadTitle: {
    flex: 1,
    color: '#f8f2ea',
    fontWeight: '800',
  },
  unreadBadge: {
    minWidth: 24,
    textAlign: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    overflow: 'hidden',
    backgroundColor: '#ef8354',
    color: '#08131d',
    fontWeight: '900',
  },
  threadMeta: {
    color: '#9eb0be',
  },
});
