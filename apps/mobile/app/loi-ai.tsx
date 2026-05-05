import { Ionicons } from '@expo/vector-icons';
import {
  AttachmentType,
  MediaAssetPurpose,
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
import { demoLoiAiWelcomeConversation, loiAiSuggestedPrompts } from '../lib/demo-content';
import { mobileDemoContentEnabled } from '../lib/demo-runtime';
import { mobileMediaApi } from '../lib/media-api';
import { mobileLoiAiApi } from '../lib/loi-ai-api';
import { pickDocumentFiles, pickMediaFiles } from '../lib/upload-picker';

function formatTime(value: string) {
  return new Date(value).toLocaleTimeString('tr-TR', {
    hour: '2-digit',
    minute: '2-digit',
  });
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
  const displayConversation =
    activeConversation ?? (mobileDemoContentEnabled ? demoLoiAiWelcomeConversation : null);

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

  const token = accessToken;

  async function refreshConversations(nextActiveId?: string | null) {
    if (!accessToken) {
      return;
    }

      const items = await mobileLoiAiApi.getConversations(token);
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

    const conversation = await mobileLoiAiApi.createConversation(token, {});
    setActiveConversationId(conversation.id);
    await refreshConversations(conversation.id);
    return conversation.id;
  }

  async function handleNewConversation() {
    if (!accessToken) {
      return;
    }

    try {
      const conversation = await mobileLoiAiApi.createConversation(token, {});
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
      await mobileLoiAiApi.deleteConversation(token, conversationId);
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
      await Promise.all(conversations.map((conversation) => mobileLoiAiApi.deleteConversation(token, conversation.id)));
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
      const response = await mobileLoiAiApi.sendMessage(token, conversationId, {
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

  async function pickAttachments(type: AttachmentType) {
    try {
      const files =
        type === AttachmentType.IMAGE || type === AttachmentType.VIDEO
          ? await pickMediaFiles({
              allowsMultipleSelection: true,
              videoMaxDuration: 120,
              quality: 0.84,
              maxFileSizeMb: 80,
            })
          : await pickDocumentFiles({
              multiple: true,
              type:
                type === AttachmentType.AUDIO
                  ? ['audio/mpeg', 'audio/mp4', 'audio/x-m4a']
                  : ['application/pdf', 'image/*', 'video/mp4'],
            });

      if (!files.length) {
        return;
      }

      const uploads = await mobileMediaApi.uploadFiles(token, files, MediaAssetPurpose.MESSAGE_ATTACHMENT);
      setAttachments((current) => [
        ...current,
        ...uploads.map((item) => ({
          type:
            item.mimeType.startsWith('image/')
              ? AttachmentType.IMAGE
              : item.mimeType.startsWith('video/')
                ? AttachmentType.VIDEO
                : item.mimeType.startsWith('audio/')
                  ? AttachmentType.AUDIO
                  : AttachmentType.FILE,
          url: item.url,
          name: item.id,
          mimeType: item.mimeType,
        })),
      ]);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Ek dosya yuklenemedi.');
    }
  }

  function openCard(card: LoiAiCard) {
    router.push(card.appRoute as never);
  }

  function applyPrompt(prompt: string) {
    setInput(prompt);
    setHistoryOpen(false);
  }

  return (
    <MobileShell
      title="Loi AI"
      subtitle="Arac uzmanin ve uygulama ici arama asistani"
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

        <ScrollView
          style={styles.stream}
          contentContainerStyle={[styles.streamContent, !activeConversation ? styles.streamContentEmpty : null]}
          showsVerticalScrollIndicator={false}
        >
          {loading && !activeConversation ? <Text style={styles.emptyCopy}>Sohbet yukleniyor...</Text> : null}
          {!loading && !activeConversation ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyTitle}>Loi AI hazir</Text>
              <Text style={styles.emptyCopy}>"800 bin TL civari Egea bul" veya "Golf kronik arizalari" yazarak baslayin.</Text>
              <View style={styles.promptRow}>
                {loiAiSuggestedPrompts.map((prompt) => (
                  <Pressable key={prompt} style={styles.promptChip} onPress={() => applyPrompt(prompt)}>
                    <Text style={styles.promptChipText}>{prompt}</Text>
                  </Pressable>
                ))}
              </View>
            </View>
          ) : null}

          {(displayConversation?.messages ?? []).map((message) => (
            <View key={message.id} style={styles.messageBlock}>
              <Text style={styles.messageMeta}>
                {message.role === 'USER' ? 'Siz' : 'Loi AI'} | {formatTime(message.createdAt)}
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
              <Text style={styles.attachmentChipText}>{attachment.type} · {(attachment.name ?? 'ek').slice(0, 18)} x</Text>
            </Pressable>
          ))}
        </View>

        <View style={styles.composer}>
          <View style={styles.composerTools}>
            <Pressable style={styles.composerIconButton} onPress={() => void pickAttachments(AttachmentType.IMAGE)}>
              <Ionicons color="#6b7280" name="image-outline" size={18} />
            </Pressable>
            <Pressable style={styles.composerIconButton} onPress={() => void pickAttachments(AttachmentType.FILE)}>
              <Ionicons color="#6b7280" name="document-attach-outline" size={18} />
            </Pressable>
            <Pressable style={styles.composerIconButton} onPress={() => void pickAttachments(AttachmentType.VIDEO)}>
              <Ionicons color="#6b7280" name="videocam-outline" size={18} />
            </Pressable>
          </View>
          <TextInput
            style={styles.input}
            multiline
            maxLength={4000}
            placeholder="Ilan ara, arac sorusu sor..."
            placeholderTextColor="#6d8396"
            value={input}
            onChangeText={setInput}
          />
          <Pressable style={styles.composerIconButton} onPress={() => void pickAttachments(AttachmentType.AUDIO)}>
            <Ionicons color="#6b7280" name="mic-outline" size={17} />
          </Pressable>
          <Pressable style={styles.composerSendButton} onPress={() => void handleSend()}>
            {sending ? <Text style={styles.primaryButtonLabel}>...</Text> : <Ionicons color="#ffffff" name="arrow-up" size={16} />}
          </Pressable>
        </View>
        <Text style={styles.footerHint}>
          Aktif sohbet: {activeSummary?.title ?? (displayConversation?.title ?? 'Loi AI ile yeni sohbet')}
        </Text>
      </View>
    </MobileShell>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, gap: 10, backgroundColor: '#ffffff' },
  historyPanel: {
    borderRadius: 18,
    padding: 14,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  historyActions: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  historyList: { maxHeight: 220 },
  historyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    borderRadius: 16,
    padding: 12,
    backgroundColor: '#ffffff',
    marginBottom: 8,
  },
  historyItemActive: { borderWidth: 1, borderColor: '#d0d7e2' },
  historyMain: { flex: 1, gap: 6 },
  historyTitle: { color: '#111111', fontWeight: '700' },
  historyPreview: { color: '#6b7280', fontSize: 12 },
  deleteText: { color: '#9aa3af', fontWeight: '700' },
  errorText: {
    borderRadius: 16,
    padding: 12,
    color: '#b42318',
    backgroundColor: '#fef3f2',
  },
  emptyState: {
    minHeight: 280,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 24,
  },
  emptyTitle: { color: '#111111', fontSize: 18, fontWeight: '700', textAlign: 'center' },
  emptyCopy: { color: '#6b7280', lineHeight: 20, textAlign: 'center' },
  promptRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
    marginTop: 8,
  },
  promptChip: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: '#f3f4f6',
  },
  promptChipText: {
    color: '#111111',
    fontSize: 12,
    fontWeight: '700',
  },
  stream: { flex: 1 },
  streamContent: { gap: 14, paddingBottom: 12 },
  streamContentEmpty: { flexGrow: 1, justifyContent: 'center' },
  messageBlock: { gap: 8 },
  messageMeta: { color: '#98a2b3', fontSize: 11.5 },
  userBubble: {
    alignSelf: 'flex-end',
    maxWidth: '86%',
    borderRadius: 24,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: '#111111',
  },
  userBubbleText: { color: '#ffffff', lineHeight: 20, fontWeight: '600' },
  assistantCopyWrap: { maxWidth: '92%', paddingHorizontal: 2 },
  assistantCopy: { color: '#111111', lineHeight: 21 },
  cardRow: { marginTop: 4 },
  card: {
    width: 240,
    marginRight: 10,
    borderRadius: 18,
    padding: 14,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    gap: 6,
  },
  cardKicker: { color: '#6b7280', fontSize: 11, fontWeight: '800' },
  cardTitle: { color: '#111111', fontWeight: '700', fontSize: 15 },
  cardSubtitle: { color: '#4b5563' },
  cardDescription: { color: '#6b7280', lineHeight: 18 },
  cardPrice: { color: '#15803d', fontWeight: '800' },
  attachmentRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  attachmentChip: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: '#f3f4f6',
  },
  attachmentChipText: { color: '#111111', fontSize: 12 },
  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 6,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 26,
    paddingHorizontal: 6,
    paddingVertical: 6,
    backgroundColor: '#f8fafc',
  },
  composerTools: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  input: {
    flex: 1,
    minHeight: 36,
    maxHeight: 132,
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 8,
    backgroundColor: 'transparent',
    color: '#111111',
    textAlignVertical: 'top',
  },
  secondaryButton: {
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#f3f4f6',
  },
  secondaryButtonLabel: { color: '#111111', fontWeight: '700', fontSize: 12 },
  primaryButton: {
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: '#111111',
  },
  primaryButtonLabel: { color: '#ffffff', fontWeight: '800' },
  composerIconButton: {
    width: 30,
    height: 30,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  composerSendButton: {
    width: 32,
    height: 32,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#111111',
  },
  footerHint: { color: '#98a2b3', fontSize: 11.5 },
});
