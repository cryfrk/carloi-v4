import {
  AttachmentType,
  type LoiAiAttachmentInput,
  type LoiAiCard,
  type LoiAiConversationDetail,
  type LoiAiConversationSummary,
} from '@carloi-v4/types';
import { Redirect, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { MobileShell } from '../components/mobile-shell';
import { useAuth } from '../context/auth-context';
import { mobileLoiAiApi } from '../lib/loi-ai-api';

const ATTACHMENT_SEQUENCE: AttachmentType[] = [
  AttachmentType.IMAGE,
  AttachmentType.FILE,
  AttachmentType.VIDEO,
];

function formatTime(value: string) {
  return new Date(value).toLocaleTimeString('tr-TR', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function createMockAttachment(type: AttachmentType, index: number): LoiAiAttachmentInput {
  if (type === AttachmentType.AUDIO) {
    return {
      type,
      name: `sesli-not-${index + 1}.m4a`,
      transcript: 'Sesli not eklendi. Icerik daha sonra detaylandirilacak.',
    };
  }

  return {
    type,
    name: `ek-${index + 1}`,
    url: `https://example.com/mock-${type.toLowerCase()}-${index + 1}`,
  };
}

export default function LoiAiScreen() {
  const router = useRouter();
  const { session } = useAuth();
  const [conversations, setConversations] = useState<LoiAiConversationSummary[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [activeConversation, setActiveConversation] = useState<LoiAiConversationDetail | null>(null);
  const [input, setInput] = useState('');
  const [attachments, setAttachments] = useState<LoiAiAttachmentInput[]>([]);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const accessToken = session?.accessToken ?? null;
  const activeSummary = useMemo(
    () => conversations.find((item) => item.id === activeConversationId) ?? null,
    [activeConversationId, conversations],
  );

  useEffect(() => {
    if (!accessToken) {
      return;
    }

    setLoading(true);
    void mobileLoiAiApi
      .getConversations(accessToken)
      .then((items) => {
        setConversations(items);
        setActiveConversationId((current) => current ?? items[0]?.id ?? null);
      })
      .catch((error) => {
        setErrorMessage(error instanceof Error ? error.message : 'Sohbetler yuklenemedi.');
      })
      .finally(() => setLoading(false));
  }, [accessToken]);

  useEffect(() => {
    if (!accessToken || !activeConversationId) {
      setActiveConversation(null);
      return;
    }

    void mobileLoiAiApi
      .getConversation(accessToken, activeConversationId)
      .then(setActiveConversation)
      .catch((error) => {
        setErrorMessage(error instanceof Error ? error.message : 'Sohbet acilamadi.');
      });
  }, [accessToken, activeConversationId]);

  if (!accessToken) {
    return <Redirect href="/login" />;
  }

  async function refreshConversations(nextActiveId?: string | null) {
    if (!accessToken) {
      return;
    }

    const items = await mobileLoiAiApi.getConversations(accessToken);
    setConversations(items);
    if (nextActiveId !== undefined) {
      setActiveConversationId(nextActiveId);
    } else if (!items.some((item) => item.id === activeConversationId)) {
      setActiveConversationId(items[0]?.id ?? null);
    }
  }

  async function ensureConversation() {
    if (!accessToken) {
      throw new Error('Oturum bulunamadi.');
    }

    if (activeConversationId) {
      return activeConversationId;
    }

    const conversation = await mobileLoiAiApi.createConversation(accessToken, {});
    setActiveConversationId(conversation.id);
    await refreshConversations(conversation.id);
    return conversation.id;
  }

  async function handleNewConversation() {
    if (!accessToken) {
      return;
    }

    try {
      const conversation = await mobileLoiAiApi.createConversation(accessToken, {});
      setActiveConversation(conversation);
      setActiveConversationId(conversation.id);
      setHistoryOpen(false);
      setInput('');
      setAttachments([]);
      await refreshConversations(conversation.id);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Yeni sohbet olusturulamadi.');
    }
  }

  async function handleDeleteConversation(conversationId: string) {
    if (!accessToken) {
      return;
    }

    try {
      await mobileLoiAiApi.deleteConversation(accessToken, conversationId);
      const nextActive = activeConversationId === conversationId ? null : activeConversationId;
      if (activeConversationId === conversationId) {
        setActiveConversation(null);
      }
      await refreshConversations(nextActive);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Sohbet silinemedi.');
    }
  }

  async function handleClearHistory() {
    if (!accessToken) {
      return;
    }

    try {
      await Promise.all(conversations.map((conversation) => mobileLoiAiApi.deleteConversation(accessToken, conversation.id)));
      setConversations([]);
      setActiveConversationId(null);
      setActiveConversation(null);
      setHistoryOpen(false);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Gecmis temizlenemedi.');
    }
  }

  async function handleSend() {
    if (!accessToken) {
      return;
    }

    const content = input.trim() || (attachments.length > 0 ? 'Ek gonderildi.' : '');
    if (!content) {
      return;
    }

    setSending(true);
    setErrorMessage(null);

    try {
      const conversationId = await ensureConversation();
      const response = await mobileLoiAiApi.sendMessage(accessToken, conversationId, {
        content,
        attachments: attachments.length > 0 ? attachments : undefined,
      });

      setInput('');
      setAttachments([]);
      setActiveConversation((current) => {
        if (!current || current.id !== response.conversationId) {
          return {
            id: response.conversationId,
            title: response.title,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            messages: [response.userMessage, response.assistantMessage],
          };
        }

        return {
          ...current,
          title: response.title,
          updatedAt: new Date().toISOString(),
          messages: [...current.messages, response.userMessage, response.assistantMessage],
        };
      });
      await refreshConversations(response.conversationId);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Mesaj gonderilemedi.');
    } finally {
      setSending(false);
    }
  }

  function pushAttachment(type: AttachmentType) {
    setAttachments((current) => [...current, createMockAttachment(type, current.length)]);
  }

  function openCard(card: LoiAiCard) {
    router.push(card.appRoute as never);
  }

  return (
    <MobileShell
      title="Loi AI"
      subtitle="Arac uzmanı, ilan bulucu ve uygulama ici arama asistani"
      actionLabel="Gecmis"
      onActionPress={() => setHistoryOpen((current) => !current)}
    >
      <View style={styles.container}>
        {historyOpen ? (
          <View style={styles.historyPanel}>
            <View style={styles.historyActions}>
              <Pressable style={styles.secondaryButton} onPress={() => void handleNewConversation()}>
                <Text style={styles.secondaryButtonLabel}>Yeni sohbet</Text>
              </Pressable>
              <Pressable style={styles.secondaryButton} onPress={() => void handleClearHistory()}>
                <Text style={styles.secondaryButtonLabel}>Temizle</Text>
              </Pressable>
            </View>
            <ScrollView style={styles.historyList}>
              {conversations.map((conversation) => (
                <View key={conversation.id} style={[styles.historyItem, conversation.id === activeConversationId ? styles.historyItemActive : null]}>
                  <Pressable style={styles.historyMain} onPress={() => { setActiveConversationId(conversation.id); setHistoryOpen(false); }}>
                    <Text style={styles.historyTitle}>{conversation.title}</Text>
                    <Text style={styles.historyPreview}>{conversation.lastMessagePreview ?? 'Henuz mesaj yok'}</Text>
                  </Pressable>
                  <Pressable onPress={() => void handleDeleteConversation(conversation.id)}>
                    <Text style={styles.deleteText}>Sil</Text>
                  </Pressable>
                </View>
              ))}
            </ScrollView>
          </View>
        ) : null}

        {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}
        {loading && !activeConversation ? <Text style={styles.emptyCopy}>Sohbet yukleniyor...</Text> : null}
        {!loading && !activeConversation ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>Loi AI hazir</Text>
            <Text style={styles.emptyCopy}>"800 bin TL civari Egea bul" veya "Golf kronik arizalari" ile baslayabiliriz.</Text>
          </View>
        ) : null}

        <ScrollView style={styles.stream} contentContainerStyle={styles.streamContent}>
          {activeConversation?.messages.map((message) => (
            <View key={message.id} style={styles.messageBlock}>
              <Text style={styles.messageMeta}>
                {message.role === 'USER' ? 'Siz' : 'Loi AI'} · {formatTime(message.createdAt)}
              </Text>
              <View style={message.role === 'USER' ? styles.userBubble : styles.assistantCopyWrap}>
                <Text style={message.role === 'USER' ? styles.userBubbleText : styles.assistantCopy}>
                  {message.content}
                </Text>
              </View>
              {message.cards.length > 0 ? (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.cardRow}>
                  {message.cards.map((card) => (
                    <Pressable key={`${message.id}-${card.entityId}-${card.type}`} style={styles.card} onPress={() => openCard(card)}>
                      <Text style={styles.cardKicker}>{card.type.replace('_', ' ')}</Text>
                      <Text style={styles.cardTitle}>{card.title}</Text>
                      {card.subtitle ? <Text style={styles.cardSubtitle}>{card.subtitle}</Text> : null}
                      {card.description ? <Text style={styles.cardDescription}>{card.description}</Text> : null}
                      {card.price ? <Text style={styles.cardPrice}>{card.price.toLocaleString('tr-TR')} {card.currency ?? 'TRY'}</Text> : null}
                    </Pressable>
                  ))}
                </ScrollView>
              ) : null}
            </View>
          ))}
        </ScrollView>

        <View style={styles.attachmentRow}>
          {attachments.map((attachment, index) => (
            <Pressable key={`${attachment.type}-${index}`} style={styles.attachmentChip} onPress={() => setAttachments((current) => current.filter((_, itemIndex) => itemIndex !== index))}>
              <Text style={styles.attachmentChipText}>{attachment.type} x</Text>
            </Pressable>
          ))}
        </View>

        <View style={styles.composer}>
          <Pressable style={styles.secondaryButton} onPress={() => pushAttachment(ATTACHMENT_SEQUENCE[attachments.length % ATTACHMENT_SEQUENCE.length] ?? AttachmentType.IMAGE)}>
            <Text style={styles.secondaryButtonLabel}>Dosya</Text>
          </Pressable>
          <TextInput
            style={styles.input}
            multiline
            maxLength={4000}
            placeholder="Ilan ara, arac sorusu sor..."
            placeholderTextColor="#6d8396"
            value={input}
            onChangeText={setInput}
          />
          <Pressable style={styles.secondaryButton} onPress={() => pushAttachment(AttachmentType.AUDIO)}>
            <Text style={styles.secondaryButtonLabel}>Ses</Text>
          </Pressable>
          <Pressable style={styles.primaryButton} onPress={() => void handleSend()}>
            <Text style={styles.primaryButtonLabel}>{sending ? '...' : 'Gonder'}</Text>
          </Pressable>
        </View>
        {activeSummary ? <Text style={styles.footerHint}>Aktif sohbet: {activeSummary.title}</Text> : null}
      </View>
    </MobileShell>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, gap: 12 },
  historyPanel: {
    borderRadius: 22,
    padding: 14,
    backgroundColor: 'rgba(13,29,41,0.95)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  historyActions: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  historyList: { maxHeight: 220 },
  historyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    borderRadius: 18,
    padding: 12,
    backgroundColor: 'rgba(255,255,255,0.04)',
    marginBottom: 8,
  },
  historyItemActive: { borderWidth: 1, borderColor: 'rgba(239,131,84,0.4)' },
  historyMain: { flex: 1, gap: 6 },
  historyTitle: { color: '#f7efe7', fontWeight: '800' },
  historyPreview: { color: '#90a4b6', fontSize: 12 },
  deleteText: { color: '#f3b39d', fontWeight: '700' },
  errorText: {
    borderRadius: 18,
    padding: 12,
    color: '#ffd5d5',
    backgroundColor: 'rgba(216,82,82,0.18)',
  },
  emptyState: {
    borderRadius: 24,
    padding: 18,
    backgroundColor: 'rgba(255,255,255,0.05)',
    gap: 8,
  },
  emptyTitle: { color: '#f7efe7', fontSize: 18, fontWeight: '800' },
  emptyCopy: { color: '#9bb0c0', lineHeight: 20 },
  stream: { flex: 1 },
  streamContent: { gap: 16, paddingBottom: 16 },
  messageBlock: { gap: 8 },
  messageMeta: { color: '#8ea4b6', fontSize: 12 },
  userBubble: {
    alignSelf: 'flex-end',
    maxWidth: '88%',
    borderRadius: 20,
    padding: 14,
    backgroundColor: '#ef8354',
  },
  userBubbleText: { color: '#08131d', lineHeight: 20, fontWeight: '600' },
  assistantCopyWrap: { paddingHorizontal: 4 },
  assistantCopy: { color: '#eef4f8', lineHeight: 22 },
  cardRow: { marginTop: 4 },
  card: {
    width: 240,
    marginRight: 10,
    borderRadius: 22,
    padding: 14,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    gap: 6,
  },
  cardKicker: { color: '#f2b6a1', fontSize: 11, fontWeight: '800' },
  cardTitle: { color: '#f7efe7', fontWeight: '800', fontSize: 16 },
  cardSubtitle: { color: '#d5dee6' },
  cardDescription: { color: '#90a4b6', lineHeight: 18 },
  cardPrice: { color: '#8fd694', fontWeight: '800' },
  attachmentRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  attachmentChip: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  attachmentChipText: { color: '#f0e4d7', fontSize: 12 },
  composer: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  input: {
    flex: 1,
    minHeight: 48,
    maxHeight: 132,
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: 'rgba(255,255,255,0.06)',
    color: '#f7efe7',
    textAlignVertical: 'top',
  },
  secondaryButton: {
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: 'rgba(255,255,255,0.07)',
  },
  secondaryButtonLabel: { color: '#f7efe7', fontWeight: '700', fontSize: 12 },
  primaryButton: {
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: '#ef8354',
  },
  primaryButtonLabel: { color: '#08131d', fontWeight: '800' },
  footerHint: { color: '#7f96a8', fontSize: 12 },
});
