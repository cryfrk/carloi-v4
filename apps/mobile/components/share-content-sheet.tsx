import { Ionicons } from '@expo/vector-icons';
import {
  SharedContentType,
  type MessageParticipantSummary,
  type MessageThreadSummary,
} from '@carloi-v4/types';
import { useEffect, useMemo, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { mobileTheme } from '../lib/design-system';
import { mobileMessagesApi } from '../lib/messages-api';
import { buildMobileSharedContentUrl } from '../lib/share-content';

function createCounterpartMap(threads: MessageThreadSummary[], currentUserId: string | null) {
  const map = new Map<string, MessageParticipantSummary>();

  for (const thread of threads) {
    const counterpart = thread.participants.find((participant) => participant.id !== currentUserId) ?? thread.participants[0];
    if (counterpart && !map.has(counterpart.id)) {
      map.set(counterpart.id, counterpart);
    }
  }

  return [...map.values()];
}

export function ShareContentSheet({
  accessToken,
  contentId,
  contentType,
  currentUserId,
  onClose,
  onShared,
  visible,
}: {
  accessToken: string | null;
  contentId: string;
  contentType: SharedContentType;
  currentUserId: string | null;
  onClose: () => void;
  onShared?: (count: number) => void;
  visible: boolean;
}) {
  const [threads, setThreads] = useState<MessageThreadSummary[]>([]);
  const [friends, setFriends] = useState<MessageParticipantSummary[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<MessageParticipantSummary[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!visible || !accessToken) {
      return;
    }

    setLoading(true);
    setErrorMessage(null);
    setNotice(null);

    void Promise.all([
      mobileMessagesApi.getFriends(accessToken),
      mobileMessagesApi.getThreads(accessToken),
    ])
      .then(([friendsResponse, threadsResponse]) => {
        setFriends(friendsResponse.items);
        setThreads(threadsResponse.items);
      })
      .catch((error) => {
        setErrorMessage(error instanceof Error ? error.message : 'Paylasim listesi yuklenemedi.');
      })
      .finally(() => setLoading(false));
  }, [accessToken, visible]);

  useEffect(() => {
    if (!visible) {
      setSearchQuery('');
      setSearchResults([]);
      setSelectedIds([]);
      setNotice(null);
      setErrorMessage(null);
    }
  }, [visible]);

  useEffect(() => {
    if (!visible || !accessToken || searchQuery.trim().length < 2) {
      setSearchResults([]);
      return;
    }

    const timeout = setTimeout(() => {
      void mobileMessagesApi
        .searchUsers(accessToken, searchQuery.trim())
        .then((response) => setSearchResults(response.items))
        .catch(() => setSearchResults([]));
    }, 220);

    return () => clearTimeout(timeout);
  }, [accessToken, searchQuery, visible]);

  const recentUsers = useMemo(() => createCounterpartMap(threads, currentUserId), [currentUserId, threads]);
  const interactionUsers = useMemo(() => recentUsers.slice(0, 8), [recentUsers]);
  const selectedCount = selectedIds.length;

  const sections = useMemo(
    () => [
      { key: 'following', title: 'Takip edilenler', items: friends.slice(0, 12) },
      { key: 'recent', title: 'Son mesajlasilanlar', items: recentUsers.slice(0, 12) },
      { key: 'interactions', title: 'En cok etkilesim kurulanlar', items: interactionUsers },
      { key: 'search', title: 'Arama sonuclari', items: searchResults, hidden: searchQuery.trim().length < 2 },
    ],
    [friends, interactionUsers, recentUsers, searchQuery, searchResults],
  );

  function toggleSelection(userId: string) {
    setSelectedIds((current) =>
      current.includes(userId) ? current.filter((item) => item !== userId) : [...current, userId],
    );
  }

  async function handleCopyUrl() {
    const url = buildMobileSharedContentUrl(contentType, contentId);

    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
        setNotice('Baglanti kopyalandi.');
        return;
      }

      await Share.share({ message: url });
      setNotice('Baglanti paylasima hazirlandi.');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Baglanti hazirlanamadi.');
    }
  }

  async function handleShare() {
    if (!accessToken || selectedIds.length === 0) {
      return;
    }

    setSending(true);
    setErrorMessage(null);

    try {
      const response = await mobileMessagesApi.shareContent(accessToken, {
        targetUserIds: selectedIds,
        contentType,
        contentId,
      });
      setNotice(`${response.sharedCount} kisiye gonderildi.`);
      onShared?.(response.sharedCount);
      setTimeout(() => {
        onClose();
      }, 300);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Paylasim tamamlanamadi.');
    } finally {
      setSending(false);
    }
  }

  return (
    <Modal animationType="fade" onRequestClose={onClose} transparent visible={visible}>
      <View style={styles.overlay}>
        <Pressable style={StyleSheet.absoluteFillObject} onPress={onClose} />
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <View style={styles.headerRow}>
            <Text style={styles.title}>Gonder</Text>
            <Pressable onPress={onClose} style={styles.closeButton}>
              <Ionicons color="#111111" name="close" size={18} />
            </Pressable>
          </View>
          <TextInput
            onChangeText={setSearchQuery}
            placeholder="Kullanici ara"
            placeholderTextColor="#9aa3af"
            style={styles.searchInput}
            value={searchQuery}
          />

          {notice ? <Text style={styles.notice}>{notice}</Text> : null}
          {errorMessage ? <Text style={styles.error}>{errorMessage}</Text> : null}
          {loading ? <Text style={styles.helper}>Paylasim listesi yukleniyor...</Text> : null}

          <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
            {sections.map((section) => {
              if (section.hidden || section.items.length === 0) {
                return null;
              }

              return (
                <View key={section.key} style={styles.section}>
                  <Text style={styles.sectionTitle}>{section.title}</Text>
                  {section.items.map((user) => {
                    const selected = selectedIds.includes(user.id);
                    return (
                      <Pressable
                        key={`${section.key}-${user.id}`}
                        onPress={() => toggleSelection(user.id)}
                        style={[styles.userRow, selected ? styles.userRowSelected : null]}
                      >
                        <View style={styles.avatar}>
                          <Text style={styles.avatarLabel}>{user.username.slice(0, 1).toUpperCase()}</Text>
                        </View>
                        <View style={styles.userCopy}>
                          <Text style={styles.userName}>@{user.username}</Text>
                          <Text style={styles.userMeta}>{user.fullName}</Text>
                        </View>
                        <View style={[styles.checkmark, selected ? styles.checkmarkActive : null]}>
                          {selected ? <Ionicons color="#ffffff" name="checkmark" size={14} /> : null}
                        </View>
                      </Pressable>
                    );
                  })}
                </View>
              );
            })}

            {!loading && sections.every((section) => section.hidden || section.items.length === 0) ? (
              <Text style={styles.helper}>Paylasacak kisi bulunamadi. Arama ile bir kullanici secmeyi deneyin.</Text>
            ) : null}
          </ScrollView>

          <View style={styles.footer}>
            <Pressable onPress={() => void handleCopyUrl()} style={styles.copyButton}>
              <Text style={styles.copyButtonLabel}>URL kopyala</Text>
            </Pressable>
            <Pressable
              disabled={selectedCount === 0 || sending}
              onPress={() => void handleShare()}
              style={[styles.sendButton, selectedCount === 0 || sending ? styles.sendButtonDisabled : null]}
            >
              <Text style={styles.sendButtonLabel}>{sending ? 'Gonderiliyor...' : `Gonder${selectedCount > 0 ? ` (${selectedCount})` : ''}`}</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(15, 23, 42, 0.26)',
  },
  sheet: {
    maxHeight: '78%',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 18,
    paddingTop: 10,
    paddingBottom: 18,
    backgroundColor: '#ffffff',
  },
  handle: {
    alignSelf: 'center',
    width: 42,
    height: 4,
    borderRadius: 999,
    marginBottom: 12,
    backgroundColor: '#d6dbe3',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  title: {
    color: '#111111',
    fontSize: 17,
    fontWeight: '700',
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f3f4f6',
  },
  searchInput: {
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    color: '#111111',
  },
  notice: {
    color: '#2563eb',
    marginTop: 10,
  },
  error: {
    color: '#dc2626',
    marginTop: 10,
  },
  helper: {
    color: '#6b7280',
    lineHeight: 20,
    marginTop: 12,
  },
  content: {
    gap: 16,
    paddingTop: 16,
    paddingBottom: 12,
  },
  section: {
    gap: 10,
  },
  sectionTitle: {
    color: '#6b7280',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    paddingHorizontal: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#eef2f6',
  },
  userRowSelected: {
    backgroundColor: '#f8fafc',
    borderRadius: 16,
    borderBottomColor: 'transparent',
  },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#111111',
  },
  avatarLabel: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '800',
  },
  userCopy: {
    flex: 1,
    gap: 2,
  },
  userName: {
    color: '#111111',
    fontWeight: '700',
  },
  userMeta: {
    color: '#6b7280',
    fontSize: 12,
  },
  checkmark: {
    width: 22,
    height: 22,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#d1d5db',
  },
  checkmarkActive: {
    alignItems: 'center',
    justifyContent: 'center',
    borderColor: '#111111',
    backgroundColor: '#111111',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#eef2f6',
  },
  copyButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 46,
    borderRadius: 16,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  copyButtonLabel: {
    color: '#111111',
    fontWeight: '700',
  },
  sendButton: {
    flex: 1.15,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 46,
    borderRadius: 16,
    backgroundColor: '#111111',
  },
  sendButtonDisabled: {
    opacity: 0.45,
  },
  sendButtonLabel: {
    color: '#ffffff',
    fontWeight: '800',
  },
});
