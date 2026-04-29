'use client';

import {
  MediaAssetPurpose,
  MessageType,
  type MessageParticipantSummary,
  type MessageThreadDetail,
  type MessageThreadSummary,
} from '@carloi-v4/types';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { AppShell } from './app-shell';
import { useAuth } from './auth-provider';
import { webMediaApi } from '../lib/media-api';
import { webMessagesApi } from '../lib/messages-api';

function formatTime(value: string) {
  return new Date(value).toLocaleString('tr-TR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function MessagesClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { session, isReady } = useAuth();
  const [threads, setThreads] = useState<MessageThreadSummary[]>([]);
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [activeThread, setActiveThread] = useState<MessageThreadDetail | null>(null);
  const [friends, setFriends] = useState<MessageParticipantSummary[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<MessageParticipantSummary[]>([]);
  const [composer, setComposer] = useState('');
  const [attachments, setAttachments] = useState<Array<{ id: string; url: string; mimeType: string }>>([]);
  const [attachmentType, setAttachmentType] = useState<MessageType>(MessageType.IMAGE);
  const [groupOpen, setGroupOpen] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [selectedParticipants, setSelectedParticipants] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const attachmentInputRef = useRef<HTMLInputElement | null>(null);

  const accessToken = session?.accessToken ?? null;
  const currentUserId = session?.user.id ?? null;
  const threadFromQuery = searchParams.get('thread');

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
    setErrorMessage(null);

    void Promise.all([webMessagesApi.getThreads(accessToken), webMessagesApi.getFriends(accessToken)])
      .then(([threadResponse, friendResponse]) => {
        setThreads(threadResponse.items);
        setFriends(friendResponse.items);
        setActiveThreadId((current) => current ?? threadFromQuery ?? threadResponse.items[0]?.id ?? null);
      })
      .catch((error) => {
        setErrorMessage(error instanceof Error ? error.message : 'Mesajlar yuklenemedi.');
      })
      .finally(() => setLoading(false));
  }, [accessToken, threadFromQuery]);

  useEffect(() => {
    if (!accessToken || !activeThreadId) {
      setActiveThread(null);
      return;
    }

    void webMessagesApi
      .getThread(accessToken, activeThreadId)
      .then((thread) => {
        setActiveThread(thread);
        void webMessagesApi.markSeen(accessToken, activeThreadId).then(() => refreshThreads(activeThreadId));
      })
      .catch((error) => {
        setErrorMessage(error instanceof Error ? error.message : 'Sohbet acilamadi.');
      });
  }, [accessToken, activeThreadId]);

  useEffect(() => {
    if (!accessToken || searchQuery.trim().length < 2) {
      setSearchResults([]);
      return;
    }

    const timeout = window.setTimeout(() => {
      void webMessagesApi
        .searchUsers(accessToken, searchQuery.trim())
        .then((response) => setSearchResults(response.items))
        .catch(() => setSearchResults([]));
    }, 250);

    return () => window.clearTimeout(timeout);
  }, [accessToken, searchQuery]);

  async function refreshThreads(nextActiveId?: string | null) {
    if (!accessToken) {
      return;
    }

    const response = await webMessagesApi.getThreads(accessToken);
    setThreads(response.items);
    if (nextActiveId !== undefined) {
      setActiveThreadId(nextActiveId);
    }
  }

  async function refreshActiveThread(threadId: string) {
    if (!accessToken) {
      return;
    }

    const thread = await webMessagesApi.getThread(accessToken, threadId);
    setActiveThread(thread);
    await refreshThreads(threadId);
  }

  async function openDirect(userId: string) {
    if (!accessToken) {
      return;
    }

    try {
      const response = await webMessagesApi.createDirectThread(accessToken, {
        targetUserId: userId,
      });
      setSearchQuery('');
      setSearchResults([]);
      setGroupOpen(false);
      await refreshActiveThread(response.thread.id);
      router.replace(`/messages?thread=${response.thread.id}`);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Direct sohbet acilamadi.');
    }
  }

  async function createGroup() {
    if (!accessToken || !groupName.trim()) {
      return;
    }

    try {
      const response = await webMessagesApi.createGroupThread(accessToken, {
        groupName: groupName.trim(),
        participantIds: selectedParticipants,
      });
      setGroupOpen(false);
      setGroupName('');
      setSelectedParticipants([]);
      await refreshActiveThread(response.thread.id);
      router.replace(`/messages?thread=${response.thread.id}`);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Grup olusturulamadi.');
    }
  }

  async function sendMessage() {
    if (!accessToken || !activeThread) {
      return;
    }

    const body = composer.trim();
    const hasAttachments = attachments.length > 0;
    if (!body && !hasAttachments) {
      return;
    }

    setSending(true);
    setErrorMessage(null);

    try {
      await webMessagesApi.sendMessage(accessToken, activeThread.id, {
        body: body || undefined,
        messageType: hasAttachments ? attachmentType : MessageType.TEXT,
        attachmentUrls: hasAttachments ? attachments.map((item) => item.url) : undefined,
        attachmentAssetIds: hasAttachments ? attachments.map((item) => item.id) : undefined,
      });
      setComposer('');
      setAttachments([]);
      setAttachmentType(MessageType.IMAGE);
      await refreshActiveThread(activeThread.id);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Mesaj gonderilemedi.');
    } finally {
      setSending(false);
    }
  }

  async function handleDealAgree() {
    if (!accessToken || !activeThread?.dealAgreement) {
      return;
    }

    try {
      const response = await webMessagesApi.agreeToDeal(accessToken, activeThread.id);
      setNotice('Anlasma durumunuz guncellendi.');
      setActiveThread(response.thread);
      await refreshThreads(response.thread.id);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Anlasma guncellenemedi.');
    }
  }

  async function handleShareLicense() {
    if (!accessToken || !activeThread?.dealAgreement) {
      return;
    }

    try {
      const response = await webMessagesApi.shareLicense(accessToken, activeThread.id);
      setNotice('Ruhsat karti karsi tarafa paylasildi.');
      setActiveThread(response.thread);
      await refreshThreads(response.thread.id);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Ruhsat paylasimi tamamlanamadi.');
    }
  }

  async function handleRequestInsurance() {
    if (!accessToken || !activeThread?.dealAgreement) {
      return;
    }

    try {
      const response = await webMessagesApi.requestInsurance(accessToken, activeThread.id);
      setNotice('Sigorta talebi Carloi ekibine iletildi.');
      setActiveThread(response.thread);
      await refreshThreads(response.thread.id);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Sigorta talebi baslatilamadi.');
    }
  }

  function openAttachmentPicker(type: MessageType) {
    setAttachmentType(type);
    attachmentInputRef.current?.click();
  }

  async function handleAttachmentSelection(event: React.ChangeEvent<HTMLInputElement>) {
    if (!accessToken) {
      return;
    }

    const files = event.target.files;

    if (!files?.length) {
      return;
    }

    try {
      const uploads = await webMediaApi.uploadFiles(
        accessToken,
        files,
        MediaAssetPurpose.MESSAGE_ATTACHMENT,
      );
      const resolvedType =
        attachmentType === MessageType.IMAGE && uploads[0]?.mimeType.startsWith('video/')
          ? MessageType.VIDEO
          : attachmentType;
      setAttachmentType(resolvedType);
      setAttachments((current) =>
        [...current, ...uploads.map((item) => ({ id: item.id, url: item.url, mimeType: item.mimeType }))].slice(0, 10),
      );
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Mesaj eki yuklenemedi.');
    } finally {
      event.target.value = '';
    }
  }

  function toggleParticipant(userId: string) {
    setSelectedParticipants((current) =>
      current.includes(userId) ? current.filter((item) => item !== userId) : [...current, userId],
    );
  }

  if (!isReady) {
    return (
      <AppShell>
        <section className="detail-card gate-card">
          <h3 className="card-title">Mesajlar hazirlaniyor</h3>
          <p className="card-copy">Oturum ve thread listesi yukleniyor.</p>
        </section>
      </AppShell>
    );
  }

  if (!session) {
    return (
      <AppShell>
        <section className="detail-card gate-card">
          <div className="card-label">Auth required</div>
          <h3 className="card-title">Mesajlasma icin giris yapin</h3>
          <p className="card-copy">DM, grup ve ilan pazarlik akislarini acmak icin hesabinizla devam edin.</p>
        </section>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <section className="messages-layout">
        <aside className="messages-sidebar detail-card">
          <div className="messages-sidebar-head">
            <div>
              <p className="brand-kicker">Conversation Layer</p>
              <h2>Messages</h2>
            </div>
            <button className="secondary-cta" type="button" onClick={() => setGroupOpen((current) => !current)}>
              Grup kur
            </button>
          </div>

          <label className="messages-search">
            <span>Ara veya direct baslat</span>
            <input value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder="username, ad veya soyad" />
          </label>

          {searchQuery.trim().length >= 2 ? (
            <div className="messages-result-stack">
              {searchResults.map((user) => (
                <button key={user.id} type="button" className="messages-user-card" onClick={() => void openDirect(user.id)}>
                  <div>
                    <strong>@{user.username}</strong>
                    <span>{user.fullName}{user.isPrivate ? ' · Gizli hesap' : ''}</span>
                  </div>
                  <small>Direct</small>
                </button>
              ))}
            </div>
          ) : null}

          <div className="messages-friends-strip">
            {friends.map((friend) => (
              <button key={friend.id} type="button" className="messages-friend-pill" onClick={() => void openDirect(friend.id)}>
                <strong>@{friend.username}</strong>
                <span>{friend.isMutualFollow ? 'Karsilikli' : 'Takip'}</span>
              </button>
            ))}
          </div>

          {groupOpen ? (
            <div className="messages-group-builder">
              <input value={groupName} onChange={(event) => setGroupName(event.target.value)} placeholder="Grup adi" />
              <div className="messages-selector-grid">
                {selectableParticipants.map((user) => (
                  <button
                    key={user.id}
                    type="button"
                    className="messages-select-pill"
                    data-active={selectedParticipants.includes(user.id)}
                    onClick={() => toggleParticipant(user.id)}
                  >
                    @{user.username}
                  </button>
                ))}
              </div>
              <button className="primary-cta" type="button" onClick={() => void createGroup()}>
                Grubu olustur
              </button>
            </div>
          ) : null}

          <div className="messages-thread-list">
            {threads.map((thread) => {
              const counterpart = thread.participants.find((participant) => participant.id !== currentUserId) ?? thread.participants[0];
              return (
                <button
                  key={thread.id}
                  type="button"
                  className="messages-thread-card"
                  data-active={thread.id === activeThreadId}
                  onClick={() => {
                    setActiveThreadId(thread.id);
                    router.replace(`/messages?thread=${thread.id}`);
                  }}
                >
                  <div className="messages-thread-top">
                    <strong>
                      {thread.groupName ?? (thread.type === 'LISTING_DEAL' ? thread.listing?.title : `@${counterpart?.username ?? 'direct'}`)}
                    </strong>
                    {thread.unreadCount > 0 ? <span className="messages-unread-badge">{thread.unreadCount}</span> : null}
                  </div>
                  <span>{thread.lastMessage?.bodyPreview ?? 'Henuz mesaj yok'}</span>
                  <small>{thread.lastMessage ? formatTime(thread.lastMessage.createdAt) : formatTime(thread.createdAt)}</small>
                </button>
              );
            })}
          </div>
        </aside>

        <div className="messages-panel detail-card">
          <input
            ref={attachmentInputRef}
            className="upload-input-hidden"
            type="file"
            multiple
            accept="image/jpeg,image/png,image/webp,video/mp4,audio/mpeg,audio/mp4,application/pdf"
            onChange={(event) => void handleAttachmentSelection(event)}
          />
          {notice ? <div className="auth-message success">{notice}</div> : null}
          {errorMessage ? <div className="auth-message error">{errorMessage}</div> : null}

          {loading && !activeThread ? <div className="ai-empty">Thread listesi getiriliyor...</div> : null}
          {!loading && !activeThread ? (
            <div className="ai-empty">
              <h3>Sohbet secin</h3>
              <p>Direct baslatin, grup kurun veya ilan detayi icinden deal thread acin.</p>
            </div>
          ) : null}

          {activeThread ? (
            <>
              <header className="messages-thread-header">
                <div>
                  <p className="brand-kicker">{activeThread.type.replace('_', ' ')}</p>
                  <h2>{activeThread.groupName ?? activeThread.listing?.title ?? 'Sohbet'}</h2>
                  <p>
                    {activeThread.participants
                      .filter((participant) => participant.id !== currentUserId)
                      .map((participant) => `@${participant.username}`)
                      .join(' · ')}
                  </p>
                </div>
              </header>

              {activeThread.listing ? (
                <section className="messages-listing-hero">
                  <div>
                    <span className="brand-kicker">Ilan</span>
                    <h3>{activeThread.listing.title}</h3>
                    <p>
                      {activeThread.listing.listingNo} · {activeThread.listing.city}
                      {activeThread.listing.district ? ` / ${activeThread.listing.district}` : ''}
                    </p>
                  </div>
                  <strong>
                    {activeThread.listing.price.toLocaleString('tr-TR')} {activeThread.listing.currency}
                  </strong>
                </section>
              ) : null}

              {activeThread.dealAgreement ? (
                <section className="messages-deal-toolbar">
                  <div className="messages-deal-status">
                    <span data-active={Boolean(activeThread.dealAgreement.buyerAgreedAt)}>Alici onayi</span>
                    <span data-active={Boolean(activeThread.dealAgreement.sellerAgreedAt)}>Satici onayi</span>
                    <span data-active={Boolean(activeThread.dealAgreement.licenseSharedAt)}>Ruhsat paylasimi</span>
                    <span data-active={Boolean(activeThread.dealAgreement.insuranceRequestId)}>Sigorta talebi</span>
                  </div>
                  <div className="messages-deal-actions">
                    <button className="secondary-cta" type="button" onClick={() => void handleDealAgree()}>
                      Anlastik
                    </button>
                    {activeThread.dealAgreement.currentUserRole === 'SELLER' && activeThread.dealAgreement.canShareLicenseInfo ? (
                      <button className="secondary-cta" type="button" onClick={() => void handleShareLicense()}>
                        Ruhsati paylas
                      </button>
                    ) : null}
                    {activeThread.dealAgreement.currentUserRole === 'BUYER' && activeThread.dealAgreement.licenseSharedAt ? (
                      <button className="primary-cta" type="button" onClick={() => void handleRequestInsurance()}>
                        Sigorta teklifi al
                      </button>
                    ) : null}
                    {activeThread.dealAgreement.insuranceRequestId ? (
                      <button
                        className="secondary-cta"
                        type="button"
                        onClick={() => router.push(`/insurance/${activeThread.dealAgreement?.insuranceRequestId}`)}
                      >
                        Sigorta detayini ac
                      </button>
                    ) : null}
                  </div>
                </section>
              ) : null}

              <div className="messages-stream">
                {activeThread.messages.map((message) => {
                  const systemCard = message.systemCard;

                  return (
                  <article key={message.id} className={`messages-bubble-row ${message.isMine ? 'mine' : 'other'} ${message.messageType === 'SYSTEM_CARD' ? 'system' : ''}`}>
                    <div className="messages-bubble-meta">
                      <strong>{message.messageType === 'SYSTEM_CARD' ? 'Sistem' : message.senderUsername}</strong>
                      <span>{formatTime(message.createdAt)}</span>
                    </div>
                    {message.body ? <div className="messages-bubble">{message.body}</div> : null}
                    {message.attachments.length > 0 ? (
                      <div className="ai-chip-row">
                        {message.attachments.map((attachment) => (
                          <span key={attachment.id} className="ai-chip">
                            {attachment.attachmentType} {attachment.url.split('/').at(-1)}
                          </span>
                        ))}
                      </div>
                    ) : null}
                    {systemCard ? (
                      <div className="messages-system-card">
                        <span className="brand-kicker">{systemCard.type}</span>
                        {systemCard.type === 'LICENSE_INFO_CARD' ? (
                          <>
                            <h4>{systemCard.vehicleInfo}</h4>
                            <p>Ruhsat sahibi: {systemCard.licenseOwnerName}</p>
                            <p>TC: {systemCard.maskedTcNo ?? '-'}</p>
                            <p>Plaka: {systemCard.maskedPlate ?? '-'}</p>
                            {activeThread.dealAgreement?.currentUserRole === 'BUYER' && !activeThread.dealAgreement.insuranceRequestId ? (
                              <button className="primary-cta" type="button" onClick={() => void handleRequestInsurance()}>
                                {systemCard.buttonLabel}
                              </button>
                            ) : null}
                          </>
                        ) : null}
                        {systemCard.type === 'INSURANCE_OFFER_CARD' ? (
                          <>
                            <h4>
                              {systemCard.amount.toLocaleString('tr-TR')} {systemCard.currency}
                            </h4>
                            <p>Sigorta teklifiniz incelemeye hazir.</p>
                            <button
                              className="primary-cta"
                              type="button"
                              onClick={() => router.push(`/insurance/${systemCard.requestId}`)}
                            >
                              {systemCard.buttonLabel}
                            </button>
                          </>
                        ) : null}
                        {systemCard.type === 'PAYMENT_STATUS_CARD' ? (
                          <>
                            <h4>Odeme durumu: {systemCard.status}</h4>
                            {systemCard.requestId ? (
                              <button
                                className="primary-cta"
                                type="button"
                                onClick={() => router.push(`/insurance/${systemCard.requestId}`)}
                              >
                                {systemCard.buttonLabel}
                              </button>
                            ) : null}
                          </>
                        ) : null}
                        {systemCard.type === 'POLICY_DOCUMENT_CARD' ? (
                          <>
                            <h4>Belge merkezi hazir</h4>
                            <p>Police ve fatura dokumanlari talep detayinda acildi.</p>
                            <button
                              className="primary-cta"
                              type="button"
                              onClick={() => router.push(`/insurance/${systemCard.requestId}`)}
                            >
                              {systemCard.buttonLabel}
                            </button>
                          </>
                        ) : null}
                      </div>
                    ) : null}
                    {message.isMine ? <small className="messages-seen-copy">{message.seenAt ? 'Goruldu' : 'Gonderildi'}</small> : null}
                  </article>
                )})}
              </div>

              <footer className="messages-composer">
                <div className="ai-chip-row">
                  {attachments.map((attachment, index) => (
                    <button key={`${attachment.id}-${index}`} type="button" className="ai-chip" onClick={() => setAttachments((current) => current.filter((_, itemIndex) => itemIndex !== index))}>
                      {(attachment.mimeType.split('/')[0]?.toUpperCase() ?? 'DOSYA')} x
                    </button>
                  ))}
                </div>
                <textarea
                  value={composer}
                  onChange={(event) => setComposer(event.target.value)}
                  placeholder="Mesaj yazin"
                  rows={3}
                />
                <div className="messages-composer-actions">
                  <div className="messages-compose-tools">
                    <button type="button" className="secondary-cta" onClick={() => openAttachmentPicker(MessageType.IMAGE)}>
                      Medya ekle
                    </button>
                    <button type="button" className="secondary-cta" onClick={() => openAttachmentPicker(MessageType.FILE)}>
                      Dosya ekle
                    </button>
                    <button type="button" className="secondary-cta" onClick={() => openAttachmentPicker(MessageType.AUDIO)}>
                      Sesli not
                    </button>
                  </div>
                  <button className="primary-cta" type="button" onClick={() => void sendMessage()} disabled={sending}>
                    {sending ? 'Gonderiliyor...' : 'Gonder'}
                  </button>
                </div>
              </footer>
            </>
          ) : null}
        </div>
      </section>
    </AppShell>
  );
}
