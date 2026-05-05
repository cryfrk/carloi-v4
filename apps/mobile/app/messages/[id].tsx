import { Ionicons } from '@expo/vector-icons';
import {
  AttachmentType,
  MediaAssetPurpose,
  MessageType,
  SharedContentType,
  type MessageThreadDetail,
} from '@carloi-v4/types';
import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { MobileShell } from '../../components/mobile-shell';
import { MobileSharedContentCard } from '../../components/mobile-shared-content-card';
import { useAuth } from '../../context/auth-context';
import { buildDemoMessageFixtures } from '../../lib/demo-content';
import { mobileDemoContentEnabled } from '../../lib/demo-runtime';
import { mobileMediaApi } from '../../lib/media-api';
import { mobileMessagesApi } from '../../lib/messages-api';
import { getMobileSharedContentPath } from '../../lib/share-content';
import { pickDocumentFiles, pickMediaFiles } from '../../lib/upload-picker';

function formatTime(value: string) {
  return new Date(value).toLocaleTimeString('tr-TR', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function MessageThreadScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { session } = useAuth();
  const [thread, setThread] = useState<MessageThreadDetail | null>(null);
  const [composer, setComposer] = useState('');
  const [attachments, setAttachments] = useState<Array<{ id: string; url: string; mimeType: string }>>([]);
  const [attachmentType, setAttachmentType] = useState<MessageType>(MessageType.IMAGE);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const accessToken = session?.accessToken ?? null;
  const currentUserId = session?.user.id ?? null;
  const demoFixtures = useMemo(
    () =>
      buildDemoMessageFixtures(
        session
          ? {
              id: session.user.id,
              username: session.user.username,
              firstName: session.user.firstName,
              lastName: session.user.lastName,
            }
          : null,
      ),
    [session],
  );
  const counterpart = useMemo(() => {
    if (!thread || !currentUserId) {
      return null;
    }

    return thread.participants.find((participant) => participant.id !== currentUserId) ?? thread.participants[0] ?? null;
  }, [currentUserId, thread]);

  useEffect(() => {
    if (!id) {
      return;
    }

    if (mobileDemoContentEnabled && id.startsWith('demo-thread-')) {
      setThread(demoFixtures.threadDetails[id] ?? null);
      setLoading(false);
      return;
    }

    if (!accessToken) {
      return;
    }

    setLoading(true);
    void mobileMessagesApi
      .getThread(accessToken, id)
      .then((response) => {
        setThread(response);
        return mobileMessagesApi.markSeen(accessToken, id);
      })
      .catch((error) => {
        setErrorMessage(error instanceof Error ? error.message : 'Sohbet acilamadi.');
      })
      .finally(() => setLoading(false));
  }, [accessToken, demoFixtures.threadDetails, id]);

  if (!session || !accessToken || !currentUserId) {
    return <Redirect href="/login" />;
  }

  const token: string = accessToken;
  const currentUser = session.user;

  async function refreshThread() {
    if (!id) {
      return;
    }

    if (mobileDemoContentEnabled && id.startsWith('demo-thread-')) {
      return;
    }

    const response = await mobileMessagesApi.getThread(token, id);
    setThread(response);
  }

  async function sendMessage() {
    if (!thread) {
      return;
    }

    const body = composer.trim();
    const hasAttachments = attachments.length > 0;

    if (!body && !hasAttachments) {
      return;
    }

    setSending(true);
    try {
      if (mobileDemoContentEnabled && thread.id.startsWith('demo-thread-')) {
        const nextAttachmentType =
          attachmentType === MessageType.IMAGE
            ? AttachmentType.IMAGE
            : attachmentType === MessageType.VIDEO
              ? AttachmentType.VIDEO
              : attachmentType === MessageType.AUDIO
                ? AttachmentType.AUDIO
                : AttachmentType.FILE;

        setThread((current) =>
          current
            ? {
                ...current,
                updatedAt: new Date().toISOString(),
                unreadCount: 0,
                messages: [
                  ...current.messages,
                  {
                    id: `demo-thread-message-${Date.now()}`,
                    threadId: current.id,
                    senderId: currentUser.id,
                    senderUsername: currentUser.username,
                    senderFullName: `${currentUser.firstName} ${currentUser.lastName}`,
                    isMine: true,
                    body: body || (hasAttachments ? 'Ek paylasildi.' : null),
                    messageType: hasAttachments ? attachmentType : MessageType.TEXT,
                    seenAt: null,
                    createdAt: new Date().toISOString(),
                    attachments: attachments.map((attachment, index) => ({
                      id: `${attachment.id}-${index}`,
                      attachmentType: nextAttachmentType,
                      url: attachment.url,
                      fileName: null,
                      mimeType: attachment.mimeType,
                      sizeBytes: null,
                      sortOrder: index,
                    })),
                    systemCard: null,
                  } satisfies MessageThreadDetail['messages'][number],
                ],
              }
            : current,
        );
        setComposer('');
        setAttachments([]);
        setAttachmentType(MessageType.IMAGE);
        return;
      }

      await mobileMessagesApi.sendMessage(token, thread.id, {
        body: body || undefined,
        messageType: hasAttachments ? attachmentType : MessageType.TEXT,
        attachmentUrls: hasAttachments ? attachments.map((item) => item.url) : undefined,
        attachmentAssetIds: hasAttachments ? attachments.map((item) => item.id) : undefined,
      });
      setComposer('');
      setAttachments([]);
      setAttachmentType(MessageType.IMAGE);
      await refreshThread();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Mesaj gonderilemedi.');
    } finally {
      setSending(false);
    }
  }

  async function handleDealAgree() {
    if (!thread?.dealAgreement) {
      return;
    }

    try {
      const response = await mobileMessagesApi.agreeToDeal(token, thread.id);
      setThread(response.thread);
      setNotice('Anlasma durumunuz guncellendi.');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Anlasma guncellenemedi.');
    }
  }

  async function handleShareLicense() {
    if (!thread?.dealAgreement) {
      return;
    }

    try {
      const response = await mobileMessagesApi.shareLicense(token, thread.id);
      setThread(response.thread);
      setNotice('Ruhsat karti paylasildi.');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Ruhsat paylasimi tamamlanamadi.');
    }
  }

  async function handleRequestInsurance() {
    if (!thread?.dealAgreement) {
      return;
    }

    try {
      const response = await mobileMessagesApi.requestInsurance(token, thread.id);
      setThread(response.thread);
      setNotice('Sigorta talebi iletildi.');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Sigorta talebi baslatilamadi.');
    }
  }

  async function pickAttachments(type: MessageType) {
    try {
      const files =
        type === MessageType.IMAGE || type === MessageType.VIDEO
          ? await pickMediaFiles({ allowsMultipleSelection: true })
          : await pickDocumentFiles({
              multiple: true,
              type:
                type === MessageType.AUDIO
                  ? ['audio/mpeg', 'audio/mp4']
                  : ['application/pdf', 'image/*', 'video/mp4', 'audio/mpeg', 'audio/mp4'],
            });

      if (!files.length) {
        return;
      }

      const uploads = await mobileMediaApi.uploadFiles(token, files, MediaAssetPurpose.MESSAGE_ATTACHMENT);
      const resolvedType =
        type === MessageType.IMAGE && uploads[0]?.mimeType.startsWith('video/')
          ? MessageType.VIDEO
          : type;

      setAttachmentType(resolvedType);
      setAttachments((current) =>
        [...current, ...uploads.map((item) => ({ id: item.id, url: item.url, mimeType: item.mimeType }))].slice(0, 10),
      );
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Ek dosya yuklenemedi.');
    }
  }

  const headerTitle = thread?.groupName ?? thread?.listing?.title ?? counterpart?.fullName ?? `@${counterpart?.username ?? 'thread'}`;
  const headerSubtitle = counterpart ? `@${counterpart.username}` : 'Sohbet';

  function openSharedCard(targetId: string, type: SharedContentType) {
    router.push(getMobileSharedContentPath(type, targetId) as never);
  }

  return (
    <MobileShell title={headerTitle} subtitle={headerSubtitle}>
      <View style={styles.layout}>
        <View style={styles.headerCard}>
          <View style={styles.headerAvatar}>
            <Text style={styles.headerAvatarLabel}>{(counterpart?.username ?? 'D').slice(0, 1).toUpperCase()}</Text>
          </View>
          <View style={styles.headerCopy}>
            <Text style={styles.headerTitle}>{headerTitle}</Text>
            <Text style={styles.headerSubtitle}>{headerSubtitle}</Text>
          </View>
        </View>

        {thread?.dealAgreement ? (
          <View style={styles.dealBar}>
            <Pressable style={styles.dealChip} onPress={() => void handleDealAgree()}>
              <Text style={styles.dealChipLabel}>Anlastik</Text>
            </Pressable>
            {thread.dealAgreement.currentUserRole === 'SELLER' && thread.dealAgreement.canShareLicenseInfo ? (
              <Pressable style={styles.dealChip} onPress={() => void handleShareLicense()}>
                <Text style={styles.dealChipLabel}>Ruhsat</Text>
              </Pressable>
            ) : null}
            {thread.dealAgreement.currentUserRole === 'BUYER' && thread.dealAgreement.licenseSharedAt ? (
              <Pressable style={styles.dealPrimaryChip} onPress={() => void handleRequestInsurance()}>
                <Text style={styles.dealPrimaryChipLabel}>Sigorta</Text>
              </Pressable>
            ) : null}
          </View>
        ) : null}

        {notice ? <Text style={styles.noticeText}>{notice}</Text> : null}
        {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}

        <ScrollView style={styles.stream} contentContainerStyle={styles.streamContent} showsVerticalScrollIndicator={false}>
          {loading || !thread ? (
            <Text style={styles.helperText}>{loading ? 'Sohbet yukleniyor...' : 'Sohbet bulunamadi.'}</Text>
          ) : (
            <>
              {thread.messages.map((message) => {
                const systemCard = message.systemCard;
                const isShareCard =
                  systemCard?.type === 'POST_CARD' ||
                  systemCard?.type === 'LISTING_CARD' ||
                  systemCard?.type === 'VEHICLE_CARD';
                const isPureSystemCard = message.messageType === 'SYSTEM_CARD' && !isShareCard;
                const showAvatar = !message.isMine && !isPureSystemCard;

                return (
                  <View key={message.id} style={[styles.messageRow, message.isMine ? styles.messageRowMine : styles.messageRowOther]}>
                    {showAvatar ? (
                      <View style={styles.inlineAvatar}>
                        <Text style={styles.inlineAvatarLabel}>{message.senderUsername.slice(0, 1).toUpperCase()}</Text>
                      </View>
                    ) : (
                      <View style={styles.inlineAvatarSpacer} />
                    )}
                    <View style={[styles.messageColumn, message.isMine ? styles.messageColumnMine : styles.messageColumnOther]}>
                      {isShareCard && systemCard ? (
                        <MobileSharedContentCard
                          body={message.body}
                          card={systemCard}
                          mine={message.isMine}
                          onPress={() => openSharedCard(systemCard.targetId, systemCard.contentType)}
                        />
                      ) : message.messageType === 'SYSTEM_CARD' ? (
                        <View style={styles.systemCard}>
                          <Text style={styles.systemCardType}>{systemCard?.type ?? 'SYSTEM_CARD'}</Text>
                          {message.body ? <Text style={styles.systemCardText}>{message.body}</Text> : null}
                          {systemCard?.type === 'LICENSE_INFO_CARD' ? (
                            <>
                              <Text style={styles.systemCardText}>{systemCard.vehicleInfo}</Text>
                              <Text style={styles.systemCardMeta}>Ruhsat sahibi: {systemCard.licenseOwnerName}</Text>
                              <Text style={styles.systemCardMeta}>TC: {systemCard.maskedTcNo ?? '-'}</Text>
                              <Text style={styles.systemCardMeta}>Plaka: {systemCard.maskedPlate ?? '-'}</Text>
                            </>
                          ) : null}
                          {systemCard?.type === 'INSURANCE_OFFER_CARD' ? (
                            <Text style={styles.systemCardText}>{systemCard.amount.toLocaleString('tr-TR')} {systemCard.currency}</Text>
                          ) : null}
                          {systemCard?.type === 'PAYMENT_STATUS_CARD' ? (
                            <Text style={styles.systemCardText}>Odeme durumu: {systemCard.status}</Text>
                          ) : null}
                        </View>
                      ) : (
                        <View style={[styles.bubble, message.isMine ? styles.bubbleMine : styles.bubbleOther]}>
                          {message.body ? <Text style={[styles.messageText, message.isMine ? styles.messageTextMine : null]}>{message.body}</Text> : null}
                          {message.attachments.length > 0 ? (
                            <View style={styles.attachmentRow}>
                              {message.attachments.map((attachment) => (
                                <Text key={attachment.id} style={[styles.attachmentChip, message.isMine ? styles.attachmentChipMine : null]}>
                                  {attachment.attachmentType}
                                </Text>
                              ))}
                            </View>
                          ) : null}
                        </View>
                      )}
                      <Text style={styles.timestampText}>
                        {formatTime(message.createdAt)}{message.isMine ? ` | ${message.seenAt ? 'Goruldu' : 'Gonderildi'}` : ''}
                      </Text>
                    </View>
                  </View>
                );
              })}

              {composer.trim().length > 0 ? (
                <View style={styles.messageRow}>
                  <View style={styles.inlineAvatarSpacer} />
                  <View style={styles.typingBubble}>
                    <Text style={styles.typingText}>{sending ? 'Gonderiliyor...' : 'Yaziyor...'}</Text>
                  </View>
                </View>
              ) : null}
            </>
          )}
        </ScrollView>

        <View style={styles.composerShell}>
          {attachments.length > 0 ? (
            <View style={styles.pendingAttachments}>
              {attachments.map((attachment, index) => (
                <Pressable
                  key={`${attachment.id}-${index}`}
                  style={styles.pendingChip}
                  onPress={() => setAttachments((current) => current.filter((_, itemIndex) => itemIndex !== index))}
                >
                  <Text style={styles.pendingChipLabel}>{attachment.mimeType.split('/')[0].toUpperCase()} x</Text>
                </Pressable>
              ))}
            </View>
          ) : null}

          <View style={styles.composerRow}>
            <Pressable style={styles.toolButton} onPress={() => void pickAttachments(MessageType.IMAGE)}>
              <Ionicons color="#6b7280" name="add" size={18} />
            </Pressable>
            <TextInput
              value={composer}
              onChangeText={setComposer}
              placeholder="Mesaj yazin"
              placeholderTextColor="#9aa3af"
              style={styles.input}
              multiline
            />
            <Pressable style={styles.toolButton} onPress={() => void pickAttachments(MessageType.AUDIO)}>
              <Ionicons color="#6b7280" name="mic-outline" size={16} />
            </Pressable>
            <Pressable style={styles.sendButton} onPress={() => void sendMessage()}>
              {sending ? <Text style={styles.sendButtonLabel}>...</Text> : <Ionicons color="#ffffff" name="arrow-up" size={16} />}
            </Pressable>
          </View>
        </View>
      </View>
    </MobileShell>
  );
}

const styles = StyleSheet.create({
  layout: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  headerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingBottom: 8,
  },
  headerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#111111',
  },
  headerAvatarLabel: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '800',
  },
  headerCopy: {
    flex: 1,
    gap: 3,
  },
  headerTitle: {
    color: '#111111',
    fontSize: 15,
    fontWeight: '700',
  },
  headerSubtitle: {
    color: '#6b7280',
    fontSize: 11.5,
  },
  dealBar: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 14,
    paddingBottom: 8,
    flexWrap: 'wrap',
  },
  dealChip: {
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 999,
    backgroundColor: '#f3f4f6',
  },
  dealChipLabel: {
    color: '#111111',
    fontSize: 11.5,
    fontWeight: '700',
  },
  dealPrimaryChip: {
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 999,
    backgroundColor: '#111111',
  },
  dealPrimaryChipLabel: {
    color: '#ffffff',
    fontSize: 11.5,
    fontWeight: '700',
  },
  noticeText: {
    color: '#2563eb',
    paddingHorizontal: 14,
    paddingBottom: 8,
  },
  errorText: {
    color: '#dc2626',
    paddingHorizontal: 14,
    paddingBottom: 8,
  },
  stream: {
    flex: 1,
  },
  streamContent: {
    gap: 8,
    paddingHorizontal: 12,
    paddingBottom: 16,
  },
  helperText: {
    color: '#6b7280',
    textAlign: 'center',
    paddingVertical: 24,
  },
  messageRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 6,
  },
  messageRowMine: {
    justifyContent: 'flex-end',
  },
  messageRowOther: {
    justifyContent: 'flex-start',
  },
  inlineAvatar: {
    width: 24,
    height: 24,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#111111',
  },
  inlineAvatarLabel: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '800',
  },
  inlineAvatarSpacer: {
    width: 24,
  },
  messageColumn: {
    maxWidth: '82%',
    gap: 3,
  },
  messageColumnMine: {
    alignItems: 'flex-end',
  },
  messageColumnOther: {
    alignItems: 'flex-start',
  },
  bubble: {
    borderRadius: 28,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  bubbleMine: {
    backgroundColor: '#111111',
    borderBottomRightRadius: 14,
  },
  bubbleOther: {
    backgroundColor: '#f3f4f6',
    borderBottomLeftRadius: 14,
  },
  messageText: {
    color: '#111111',
    lineHeight: 19,
  },
  messageTextMine: {
    color: '#ffffff',
  },
  attachmentRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 8,
  },
  attachmentChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(17,17,17,0.06)',
    color: '#111111',
    fontSize: 11,
    fontWeight: '700',
  },
  attachmentChipMine: {
    backgroundColor: 'rgba(255,255,255,0.14)',
    color: '#ffffff',
  },
  systemCard: {
    gap: 6,
    borderRadius: 22,
    padding: 13,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  systemCardType: {
    color: '#6b7280',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.1,
  },
  systemCardText: {
    color: '#111111',
    fontWeight: '600',
    lineHeight: 19,
  },
  systemCardMeta: {
    color: '#4b5563',
    lineHeight: 19,
  },
  timestampText: {
    color: '#9aa3af',
    fontSize: 9.5,
  },
  typingBubble: {
    borderRadius: 22,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#f3f4f6',
  },
  typingText: {
    color: '#6b7280',
    fontSize: 11.5,
  },
  composerShell: {
    gap: 8,
    paddingHorizontal: 10,
    paddingTop: 8,
    paddingBottom: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#eceff3',
    backgroundColor: 'rgba(255,255,255,0.98)',
  },
  pendingAttachments: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  pendingChip: {
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: '#f3f4f6',
  },
  pendingChipLabel: {
    color: '#111111',
    fontSize: 11,
    fontWeight: '700',
  },
  composerRow: {
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
  toolButton: {
    width: 30,
    height: 30,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  input: {
    flex: 1,
    minHeight: 34,
    maxHeight: 120,
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 7,
    backgroundColor: 'transparent',
    color: '#111111',
    textAlignVertical: 'top',
  },
  sendButton: {
    width: 32,
    height: 32,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#111111',
  },
  sendButtonLabel: {
    color: '#ffffff',
    fontSize: 11.5,
    fontWeight: '700',
  },
});
