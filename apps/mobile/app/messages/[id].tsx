import { MediaAssetPurpose, MessageType, type MessageThreadDetail } from '@carloi-v4/types';
import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { MobileShell } from '../../components/mobile-shell';
import { useAuth } from '../../context/auth-context';
import { mobileMediaApi } from '../../lib/media-api';
import { mobileMessagesApi } from '../../lib/messages-api';
import { pickDocumentFiles, pickMediaFiles } from '../../lib/upload-picker';

function formatTime(value: string) {
  return new Date(value).toLocaleString('tr-TR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function MessageThreadScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
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

  useEffect(() => {
    if (!accessToken || !id) {
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
  }, [accessToken, id]);

  if (!accessToken) {
    return <Redirect href="/login" />;
  }

  const token: string = accessToken;

  async function refreshThread() {
    if (!id) {
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

      const uploads = await mobileMediaApi.uploadFiles(
        token,
        files,
        MediaAssetPurpose.MESSAGE_ATTACHMENT,
      );

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

  return (
    <MobileShell
      title={thread?.groupName ?? thread?.listing?.title ?? 'Thread'}
      subtitle="DM, grup ve ilan pazarlik akisini yonet."
    >
      <View style={styles.layout}>
        <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
          {notice ? (
            <View style={[styles.banner, styles.noticeBanner]}>
              <Text style={styles.bannerText}>{notice}</Text>
            </View>
          ) : null}
          {errorMessage ? (
            <View style={[styles.banner, styles.errorBanner]}>
              <Text style={styles.bannerText}>{errorMessage}</Text>
            </View>
          ) : null}

          {loading || !thread ? (
            <View style={styles.card}>
              <Text style={styles.infoText}>{loading ? 'Sohbet yukleniyor...' : 'Sohbet bulunamadi.'}</Text>
            </View>
          ) : (
            <>
              {thread.listing ? (
                <View style={styles.card}>
                  <Text style={styles.kicker}>Ilan karti</Text>
                  <Text style={styles.title}>{thread.listing.title}</Text>
                  <Text style={styles.meta}>{thread.listing.listingNo} · {thread.listing.city}{thread.listing.district ? ` / ${thread.listing.district}` : ''}</Text>
                  <Text style={styles.price}>{thread.listing.price.toLocaleString('tr-TR')} {thread.listing.currency}</Text>
                </View>
              ) : null}

              {thread.dealAgreement ? (
                <View style={styles.card}>
                  <Text style={styles.kicker}>Deal agreement</Text>
                  <View style={styles.statusRow}>
                    <Text style={[styles.statusChip, thread.dealAgreement.buyerAgreedAt ? styles.statusChipActive : null]}>Alici</Text>
                    <Text style={[styles.statusChip, thread.dealAgreement.sellerAgreedAt ? styles.statusChipActive : null]}>Satici</Text>
                    <Text style={[styles.statusChip, thread.dealAgreement.licenseSharedAt ? styles.statusChipActive : null]}>Ruhsat</Text>
                    <Text style={[styles.statusChip, thread.dealAgreement.insuranceRequestId ? styles.statusChipActive : null]}>Sigorta</Text>
                  </View>
                  <View style={styles.dealActions}>
                    <Pressable style={styles.secondaryButton} onPress={() => void handleDealAgree()}>
                      <Text style={styles.secondaryButtonLabel}>Anlastik</Text>
                    </Pressable>
                    {thread.dealAgreement.currentUserRole === 'SELLER' && thread.dealAgreement.canShareLicenseInfo ? (
                      <Pressable style={styles.secondaryButton} onPress={() => void handleShareLicense()}>
                        <Text style={styles.secondaryButtonLabel}>Ruhsat paylas</Text>
                      </Pressable>
                    ) : null}
                    {thread.dealAgreement.currentUserRole === 'BUYER' && thread.dealAgreement.licenseSharedAt ? (
                      <Pressable style={styles.primaryButton} onPress={() => void handleRequestInsurance()}>
                        <Text style={styles.primaryButtonLabel}>Sigorta teklifi al</Text>
                      </Pressable>
                    ) : null}
                    {thread.dealAgreement.insuranceRequestId ? (
                      <Pressable
                        style={styles.secondaryButton}
                        onPress={() => router.push(`/insurance/${thread.dealAgreement?.insuranceRequestId}`)}
                      >
                        <Text style={styles.secondaryButtonLabel}>Sigorta detayi</Text>
                      </Pressable>
                    ) : null}
                  </View>
                </View>
              ) : null}

              {thread.messages.map((message) => {
                const systemCard = message.systemCard;

                return (
                <View key={message.id} style={[styles.messageWrap, message.isMine ? styles.messageMine : styles.messageOther]}>
                  <Text style={styles.messageMeta}>{message.messageType === 'SYSTEM_CARD' ? 'Sistem' : `@${message.senderUsername}`} · {formatTime(message.createdAt)}</Text>
                  {message.body ? <View style={[styles.messageBubble, message.messageType === 'SYSTEM_CARD' ? styles.systemBubble : null]}><Text style={styles.messageText}>{message.body}</Text></View> : null}
                  {message.attachments.length > 0 ? (
                    <View style={styles.attachmentRow}>
                      {message.attachments.map((attachment) => (
                        <Text key={attachment.id} style={styles.attachmentChip}>{attachment.attachmentType}</Text>
                      ))}
                    </View>
                  ) : null}
                  {systemCard ? (
                    <View style={styles.systemCard}>
                      <Text style={styles.kicker}>{systemCard.type}</Text>
                      {systemCard.type === 'LICENSE_INFO_CARD' ? (
                        <>
                          <Text style={styles.titleSmall}>{systemCard.vehicleInfo}</Text>
                          <Text style={styles.meta}>Ruhsat sahibi: {systemCard.licenseOwnerName}</Text>
                          <Text style={styles.meta}>TC: {systemCard.maskedTcNo ?? '-'}</Text>
                          <Text style={styles.meta}>Plaka: {systemCard.maskedPlate ?? '-'}</Text>
                          {thread.dealAgreement?.currentUserRole === 'BUYER' && !thread.dealAgreement.insuranceRequestId ? (
                            <Pressable style={styles.primaryButton} onPress={() => void handleRequestInsurance()}>
                              <Text style={styles.primaryButtonLabel}>{systemCard.buttonLabel}</Text>
                            </Pressable>
                          ) : null}
                        </>
                      ) : null}
                      {systemCard.type === 'INSURANCE_OFFER_CARD' ? (
                        <>
                          <Text style={styles.titleSmall}>
                            {systemCard.amount.toLocaleString('tr-TR')} {systemCard.currency}
                          </Text>
                          <Pressable
                            style={styles.primaryButton}
                            onPress={() => router.push(`/insurance/${systemCard.requestId}`)}
                          >
                            <Text style={styles.primaryButtonLabel}>{systemCard.buttonLabel}</Text>
                          </Pressable>
                        </>
                      ) : null}
                      {systemCard.type === 'PAYMENT_STATUS_CARD' && systemCard.requestId ? (
                        <>
                          <Text style={styles.titleSmall}>Odeme durumu: {systemCard.status}</Text>
                          <Pressable
                            style={styles.primaryButton}
                            onPress={() => router.push(`/insurance/${systemCard.requestId}`)}
                          >
                            <Text style={styles.primaryButtonLabel}>{systemCard.buttonLabel}</Text>
                          </Pressable>
                        </>
                      ) : null}
                      {systemCard.type === 'POLICY_DOCUMENT_CARD' ? (
                        <Pressable
                          style={styles.primaryButton}
                          onPress={() => router.push(`/insurance/${systemCard.requestId}`)}
                        >
                          <Text style={styles.primaryButtonLabel}>{systemCard.buttonLabel}</Text>
                        </Pressable>
                      ) : null}
                    </View>
                  ) : null}
                  {message.isMine ? <Text style={styles.seenCopy}>{message.seenAt ? 'Goruldu' : 'Gonderildi'}</Text> : null}
                </View>
              )})}
            </>
          )}
        </ScrollView>

        {thread ? (
          <View style={styles.composer}>
            <View style={styles.attachmentRow}>
              {attachments.map((attachment, index) => (
                <Pressable key={`${attachment.id}-${index}`} style={styles.attachmentChipWrap} onPress={() => setAttachments((current) => current.filter((_, itemIndex) => itemIndex !== index))}>
                  <Text style={styles.attachmentChip}>{attachment.mimeType.split('/')[0].toUpperCase()} x</Text>
                </Pressable>
              ))}
            </View>
            <TextInput
              value={composer}
              onChangeText={setComposer}
              placeholder="Mesaj yazin"
              placeholderTextColor="#7f92a1"
              style={styles.input}
              multiline
            />
            <View style={styles.composerActions}>
              <View style={styles.toolRow}>
                <Pressable style={styles.secondaryButton} onPress={() => void pickAttachments(MessageType.IMAGE)}>
                  <Text style={styles.secondaryButtonLabel}>Medya</Text>
                </Pressable>
                <Pressable style={styles.secondaryButton} onPress={() => void pickAttachments(MessageType.FILE)}>
                  <Text style={styles.secondaryButtonLabel}>Dosya</Text>
                </Pressable>
                <Pressable style={styles.secondaryButton} onPress={() => void pickAttachments(MessageType.AUDIO)}>
                  <Text style={styles.secondaryButtonLabel}>Ses</Text>
                </Pressable>
              </View>
              <Pressable style={styles.primaryButton} onPress={() => void sendMessage()}>
                <Text style={styles.primaryButtonLabel}>{sending ? 'Gonderiliyor...' : 'Gonder'}</Text>
              </Pressable>
            </View>
          </View>
        ) : null}
      </View>
    </MobileShell>
  );
}

const styles = StyleSheet.create({
  layout: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  content: {
    gap: 14,
    paddingBottom: 10,
  },
  banner: {
    borderRadius: 18,
    padding: 14,
  },
  noticeBanner: {
    backgroundColor: 'rgba(255,255,255,0.07)',
  },
  errorBanner: {
    backgroundColor: 'rgba(216,82,82,0.2)',
  },
  bannerText: {
    color: '#f8f2ea',
  },
  card: {
    gap: 10,
    padding: 18,
    borderRadius: 24,
    backgroundColor: '#0d1d2a',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  kicker: {
    color: '#ffd6c2',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.2,
  },
  title: {
    color: '#f8f2ea',
    fontSize: 20,
    fontWeight: '800',
  },
  titleSmall: {
    color: '#f8f2ea',
    fontSize: 16,
    fontWeight: '800',
  },
  meta: {
    color: '#9eb0be',
  },
  price: {
    color: '#f8f2ea',
    fontSize: 18,
    fontWeight: '800',
  },
  statusRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  statusChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: '#122334',
    color: '#9eb0be',
    overflow: 'hidden',
  },
  statusChipActive: {
    backgroundColor: '#ef8354',
    color: '#08131d',
  },
  dealActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  messageWrap: {
    gap: 6,
  },
  messageMine: {
    alignItems: 'flex-end',
  },
  messageOther: {
    alignItems: 'flex-start',
  },
  messageMeta: {
    color: '#8da0af',
    fontSize: 12,
  },
  messageBubble: {
    maxWidth: '88%',
    borderRadius: 22,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: '#132534',
  },
  systemBubble: {
    backgroundColor: '#1f3547',
  },
  messageText: {
    color: '#f8f2ea',
    lineHeight: 20,
  },
  attachmentRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  attachmentChipWrap: {
    borderRadius: 999,
    backgroundColor: '#102030',
  },
  attachmentChip: {
    color: '#ffd6c2',
    fontSize: 12,
    fontWeight: '800',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  systemCard: {
    gap: 8,
    maxWidth: '88%',
    borderRadius: 22,
    padding: 16,
    backgroundColor: '#152c3d',
  },
  seenCopy: {
    color: '#8da0af',
    fontSize: 11,
  },
  composer: {
    gap: 10,
    marginTop: 12,
    padding: 14,
    borderRadius: 22,
    backgroundColor: 'rgba(11,24,34,0.96)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  input: {
    minHeight: 56,
    maxHeight: 140,
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: '#102030',
    color: '#f8f2ea',
    textAlignVertical: 'top',
  },
  composerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  toolRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  secondaryButton: {
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: '#132534',
  },
  secondaryButtonLabel: {
    color: '#f8f2ea',
    fontWeight: '800',
  },
  primaryButton: {
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#ef8354',
  },
  primaryButtonLabel: {
    color: '#08131d',
    fontWeight: '900',
  },
  infoText: {
    color: '#d1dce5',
  },
});
