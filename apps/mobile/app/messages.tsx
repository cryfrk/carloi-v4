import { Redirect, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import type { MessageParticipantSummary, MessageThreadSummary } from '@carloi-v4/types';
import {
  ActivityIndicator,
  FlatList,
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

function Avatar({ username }: { username: string }) {
  return (
    <View style={styles.avatar}>
      <Text style={styles.avatarLabel}>{username.slice(0, 1).toUpperCase()}</Text>
    </View>
  );
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
  const currentUserId = session?.user.id ?? null;
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

  if (!accessToken || !currentUserId) {
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

  function threadTitle(thread: MessageThreadSummary) {
    const counterpart = thread.participants.find((participant) => participant.id !== currentUserId) ?? thread.participants[0];
    return thread.groupName ?? thread.listing?.title ?? `@${counterpart?.username ?? 'direct'}`;
  }

  function threadSubtitle(thread: MessageThreadSummary) {
    return thread.lastMessage?.bodyPreview ?? 'Henuz mesaj yok';
  }

  return (
    <MobileShell
      title="Mesajlar"
      subtitle="Sohbetler, direct mesajlar ve ilan gorusmeleri tek bir akista."
      actionLabel="Grup kur"
      onActionPress={() => setGroupOpen((current) => !current)}
    >
      <View style={styles.layout}>
        {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}

        <View style={styles.searchShell}>
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Kullanici ara"
            placeholderTextColor="#9aa3af"
            style={styles.searchInput}
          />
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.friendRow}>
          {friends.length > 0 ? (
            friends.map((friend) => (
              <Pressable key={friend.id} style={styles.friendItem} onPress={() => void openDirect(friend.id)}>
                <Avatar username={friend.username} />
                <Text numberOfLines={1} style={styles.friendName}>@{friend.username}</Text>
                <Text style={styles.friendMeta}>{friend.isMutualFollow ? 'Karsilikli' : 'Takip'}</Text>
              </Pressable>
            ))
          ) : (
            <View style={styles.friendOnboarding}>
              <Text style={styles.friendOnboardingTitle}>Ilan sahipleriyle konusmaya basla</Text>
              <Text style={styles.friendOnboardingCopy}>Bir araci begendiginde Mesaj butonuyla direct sohbet hemen burada acilir.</Text>
              <Pressable style={styles.friendOnboardingButton} onPress={() => router.push('/listings')}>
                <Text style={styles.friendOnboardingButtonLabel}>Ilanlara git</Text>
              </Pressable>
            </View>
          )}
        </ScrollView>

        {searchResults.length > 0 ? (
          <View style={styles.searchResults}>
            {searchResults.map((user) => (
              <Pressable key={user.id} style={styles.searchResultRow} onPress={() => void openDirect(user.id)}>
                <View style={styles.rowLeft}>
                  <Avatar username={user.username} />
                  <View style={styles.rowCopy}>
                    <Text style={styles.rowTitle}>@{user.username}</Text>
                    <Text numberOfLines={1} style={styles.rowSubtitle}>{user.fullName}{user.isPrivate ? ' · Gizli hesap' : ''}</Text>
                  </View>
                </View>
                <Text style={styles.resultAction}>Mesaj</Text>
              </Pressable>
            ))}
          </View>
        ) : null}

        {groupOpen ? (
          <View style={styles.groupBuilder}>
            <TextInput
              value={groupName}
              onChangeText={setGroupName}
              placeholder="Grup adi"
              placeholderTextColor="#9aa3af"
              style={styles.searchInput}
            />
            <View style={styles.selectorGrid}>
              {selectableParticipants.map((user) => (
                <Pressable
                  key={user.id}
                  style={[styles.selectorPill, selectedParticipants.includes(user.id) ? styles.selectorPillActive : null]}
                  onPress={() => toggleParticipant(user.id)}
                >
                  <Text style={[styles.selectorLabel, selectedParticipants.includes(user.id) ? styles.selectorLabelActive : null]}>@{user.username}</Text>
                </Pressable>
              ))}
            </View>
            <Pressable style={styles.primaryButton} onPress={() => void createGroup()}>
              <Text style={styles.primaryButtonLabel}>Grubu olustur</Text>
            </Pressable>
          </View>
        ) : null}

        {loading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator color="#111111" />
            <Text style={styles.helperText}>Sohbetler yukleniyor...</Text>
          </View>
        ) : threads.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>Henuz sohbet yok</Text>
            <Text style={styles.helperText}>Ilan sahipleriyle konusmaya basla veya arama alanindan bir kullanici sec.</Text>
            <Pressable style={styles.friendOnboardingButton} onPress={() => router.push('/listings')}>
              <Text style={styles.friendOnboardingButtonLabel}>Ilan akisini ac</Text>
            </Pressable>
          </View>
        ) : (
          <FlatList
            data={threads}
            keyExtractor={(item) => item.id}
            renderItem={({ item: thread }) => {
              const counterpart = thread.participants.find((participant) => participant.id !== currentUserId) ?? thread.participants[0];
              return (
                <Pressable style={styles.threadRow} onPress={() => router.push(`/messages/${thread.id}`)}>
                  <View style={styles.rowLeft}>
                    <Avatar username={counterpart?.username ?? 'D'} />
                    <View style={styles.rowCopy}>
                      <Text numberOfLines={1} style={styles.rowTitle}>{threadTitle(thread)}</Text>
                      <Text numberOfLines={1} style={styles.rowSubtitle}>{threadSubtitle(thread)}</Text>
                    </View>
                  </View>
                  <View style={styles.rowRight}>
                    <Text style={styles.timeLabel}>{formatTime(thread.lastMessage ? thread.lastMessage.createdAt : thread.createdAt)}</Text>
                    {thread.unreadCount > 0 ? <Text style={styles.unreadBadge}>{thread.unreadCount}</Text> : null}
                  </View>
                </Pressable>
              );
            }}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>
    </MobileShell>
  );
}

const styles = StyleSheet.create({
  layout: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  errorText: {
    color: '#dc2626',
    paddingHorizontal: 16,
    paddingBottom: 10,
  },
  searchShell: {
    paddingHorizontal: 14,
    paddingTop: 4,
    paddingBottom: 10,
  },
  searchInput: {
    minHeight: 44,
    borderRadius: 22,
    paddingHorizontal: 16,
    backgroundColor: '#f3f4f6',
    color: '#111111',
  },
  friendRow: {
    gap: 14,
    paddingHorizontal: 14,
    paddingBottom: 12,
  },
  friendItem: {
    width: 72,
    alignItems: 'center',
    gap: 6,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#111111',
  },
  avatarLabel: {
    color: '#ffffff',
    fontSize: 22,
    fontWeight: '800',
  },
  friendName: {
    color: '#111111',
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
  },
  friendMeta: {
    color: '#6b7280',
    fontSize: 11,
  },
  friendOnboarding: {
    width: 240,
    paddingVertical: 8,
    gap: 8,
  },
  friendOnboardingTitle: {
    color: '#111111',
    fontSize: 14,
    fontWeight: '700',
  },
  friendOnboardingCopy: {
    color: '#6b7280',
    fontSize: 12,
    lineHeight: 18,
  },
  friendOnboardingButton: {
    alignSelf: 'flex-start',
    minHeight: 38,
    paddingHorizontal: 14,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#111111',
  },
  friendOnboardingButtonLabel: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  searchResults: {
    paddingHorizontal: 14,
    paddingBottom: 6,
  },
  searchResultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#eceff3',
  },
  rowLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  rowCopy: {
    flex: 1,
    gap: 3,
  },
  rowTitle: {
    color: '#111111',
    fontSize: 15,
    fontWeight: '700',
  },
  rowSubtitle: {
    color: '#6b7280',
    fontSize: 13,
  },
  resultAction: {
    color: '#111111',
    fontSize: 13,
    fontWeight: '700',
  },
  groupBuilder: {
    gap: 12,
    paddingHorizontal: 14,
    paddingBottom: 12,
  },
  selectorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  selectorPill: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: '#f3f4f6',
  },
  selectorPillActive: {
    backgroundColor: '#111111',
  },
  selectorLabel: {
    color: '#111111',
    fontSize: 12,
    fontWeight: '700',
  },
  selectorLabelActive: {
    color: '#ffffff',
  },
  primaryButton: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
    borderRadius: 14,
    backgroundColor: '#111111',
  },
  primaryButtonLabel: {
    color: '#ffffff',
    fontWeight: '700',
  },
  loadingWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  helperText: {
    color: '#6b7280',
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingHorizontal: 24,
  },
  emptyTitle: {
    color: '#111111',
    fontSize: 18,
    fontWeight: '700',
  },
  listContent: {
    paddingHorizontal: 14,
    paddingBottom: 20,
  },
  threadRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#eceff3',
  },
  rowRight: {
    alignItems: 'flex-end',
    gap: 6,
  },
  timeLabel: {
    color: '#9aa3af',
    fontSize: 11,
  },
  unreadBadge: {
    minWidth: 20,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 999,
    overflow: 'hidden',
    backgroundColor: '#111111',
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '700',
    textAlign: 'center',
  },
});
