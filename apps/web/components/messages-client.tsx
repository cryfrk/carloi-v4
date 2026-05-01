'use client';

import {
  MediaAssetPurpose,
  MessageType,
  type MessageParticipantSummary,
  type MessageThreadDetail,
  type MessageThreadSummary,
} from '@carloi-v4/types';
import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { AppShell } from './app-shell';
import { useAuth } from './auth-provider';
import { webMediaApi } from '../lib/media-api';
import { webMessagesApi } from '../lib/messages-api';

function formatTime(value: string) {
  return new Date(value).toLocaleTimeString('tr-TR', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function Avatar({ username }: { username: string }) {
  return <span className="messages-avatar">{username.slice(0, 1).toUpperCase()}</span>;
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

  const activeCounterpart = useMemo(() => {
    if (!activeThread || !currentUserId) {
      return null;
    }

    return activeThread.participants.find((participant) => participant.id !== currentUserId) ?? activeThread.participants[0] ?? null;
  }, [activeThread, currentUserId]);

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
      const uploads = await webMediaApi.uploadFiles(accessToken, files, MediaAssetPurpose.MESSAGE_ATTACHMENT);
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

  function threadTitle(thread: MessageThreadSummary) {
    const counterpart = thread.participants.find((participant) => participant.id !== currentUserId) ?? thread.participants[0];
    return thread.groupName ?? (thread.type === 'LISTING_DEAL' ? thread.listing?.title : `@${counterpart?.username ?? 'direct'}`);
  }

  function threadPreview(thread: MessageThreadSummary) {
    return thread.lastMessage?.bodyPreview ?? 'Henuz mesaj yok';
  }

  if (!isReady) {
    return (
      <AppShell>
        <section className="messages-ig-layout">
          <div className="profile-ig-helper">Mesajlar hazirlaniyor...</div>
        </section>
      </AppShell>
    );
  }

  if (!session) {
    return (
      <AppShell>
        <section className="messages-ig-layout">
          <div className="detail-card gate-card">
            <div className="card-label">Auth required</div>
            <h3 className="card-title">Mesajlasma icin giris yapin</h3>
            <p className="card-copy">DM, grup ve ilan pazarlik akislarini acmak icin hesabinizla devam edin.</p>
          </div>
        </section>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <input
        ref={attachmentInputRef}
        className="upload-input-hidden"
        type="file"
        multiple
        accept="image/jpeg,image/png,image/webp,video/mp4,audio/mpeg,audio/mp4,application/pdf"
        onChange={(event) => void handleAttachmentSelection(event)}
      />
      <section className="messages-ig-layout">
        <aside className="messages-ig-sidebar">
          <div className="messages-ig-search-wrap">
            <input value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder="Kullanici ara" />
            <button className="secondary-link button-reset" type="button" onClick={() => setGroupOpen((current) => !current)}>
              Grup
            </button>
          </div>

          <div className="messages-ig-friends">
            {friends.length > 0 ? (
              friends.map((friend) => (
                <button key={friend.id} type="button" className="messages-ig-friend" onClick={() => void openDirect(friend.id)}>
                  <Avatar username={friend.username} />
                  <strong>@{friend.username}</strong>
                  <span>{friend.isMutualFollow ? 'Karsilikli' : 'Takip'}</span>
                </button>
              ))
            ) : (
              <div className="messages-onboarding-card">
                <strong>Ilan sahipleriyle konusmaya basla</strong>
                <span>Begendigin bir aracta Mesaj butonuna dokundugunda ilk direct sohbet burada acilir.</span>
                <Link className="primary-link" href="/listings">Ilanlari ac</Link>
              </div>
            )}
          </div>

          {searchResults.length > 0 ? (
            <div className="messages-ig-search-results">
              {searchResults.map((user) => (
                <button key={user.id} type="button" className="messages-ig-list-row" onClick={() => void openDirect(user.id)}>
                  <div className="messages-ig-row-main">
                    <Avatar username={user.username} />
                    <div>
                      <strong>@{user.username}</strong>
                      <span>{user.fullName}{user.isPrivate ? ' · Gizli hesap' : ''}</span>
                    </div>
                  </div>
                  <small>Mesaj</small>
                </button>
              ))}
            </div>
          ) : null}

          {groupOpen ? (
            <div className="messages-ig-group-builder">
              <input value={groupName} onChange={(event) => setGroupName(event.target.value)} placeholder="Grup adi" />
              <div className="messages-ig-selector-grid">
                {selectableParticipants.map((user) => (
                  <button
                    key={user.id}
                    type="button"
                    className="messages-ig-select-pill"
                    data-active={selectedParticipants.includes(user.id)}
                    onClick={() => toggleParticipant(user.id)}
                  >
                    @{user.username}
                  </button>
                ))}
              </div>
              <button className="primary-link button-reset" type="button" onClick={() => void createGroup()}>
                Grubu olustur
              </button>
            </div>
          ) : null}

          <div className="messages-ig-thread-list">
            {threads.length > 0 ? (
              threads.map((thread) => {
                const counterpart = thread.participants.find((participant) => participant.id !== currentUserId) ?? thread.participants[0];
                const active = thread.id === activeThreadId;
                return (
                  <button
                    key={thread.id}
                    type="button"
                    className={`messages-ig-thread-row${active ? ' active' : ''}`}
                    onClick={() => {
                      setActiveThreadId(thread.id);
                      router.replace(`/messages?thread=${thread.id}`);
                    }}
                  >
                    <div className="messages-ig-row-main">
                      <Avatar username={counterpart?.username ?? 'D'} />
                      <div>
                        <strong>{threadTitle(thread)}</strong>
                        <span>{threadPreview(thread)}</span>
                      </div>
                    </div>
                    <div className="messages-ig-row-side">
                      <small>{formatTime(thread.lastMessage ? thread.lastMessage.createdAt : thread.createdAt)}</small>
                      {thread.unreadCount > 0 ? <span className="messages-ig-unread">{thread.unreadCount}</span> : null}
                    </div>
                  </button>
                );
              })
            ) : (
              <div className="messages-onboarding-card compact">
                <strong>Henuz sohbet yok</strong>
                <span>Bir ilan acildiginda veya bir kullanici secildiginde konusmalarin burada listelenir.</span>
              </div>
            )}
          </div>
        </aside>

        <main className="messages-ig-chat">
          {notice ? <div className="auth-message success">{notice}</div> : null}
          {errorMessage ? <div className="auth-message error">{errorMessage}</div> : null}

          {loading && !activeThread ? <div className="profile-ig-helper">Sohbet listesi getiriliyor...</div> : null}
          {!loading && !activeThread ? (
            <div className="messages-empty-chat">
              <strong>Konusmaya hazirsin</strong>
              <span>Ilan sahipleriyle veya takip ettigin kisilerle direct sohbet baslat. İlk mesaj buraya dusecek.</span>
              <div className="gate-actions">
                <Link className="primary-link" href="/listings">Ilanlari gez</Link>
                <button className="secondary-link button-reset" type="button" onClick={() => setGroupOpen(true)}>Grup kur</button>
              </div>
            </div>
          ) : null}

          {activeThread ? (
            <>
              <header className="messages-ig-chat-head">
                <div className="messages-ig-row-main">
                  <Avatar username={activeCounterpart?.username ?? 'D'} />
                  <div>
                    <strong>{activeThread.groupName ?? activeCounterpart?.fullName ?? activeThread.listing?.title ?? 'Sohbet'}</strong>
                    <span>@{activeCounterpart?.username ?? 'direct'}</span>
                  </div>
                </div>
              </header>

              {activeThread.listing ? (
                <section className="messages-ig-inline-card">
                  <strong>{activeThread.listing.title}</strong>
                  <span>{activeThread.listing.listingNo} · {activeThread.listing.city}{activeThread.listing.district ? ` / ${activeThread.listing.district}` : ''}</span>
                </section>
              ) : null}

              {activeThread.dealAgreement ? (
                <section className="messages-ig-deal-bar">
                  <button className="secondary-link button-reset" type="button" onClick={() => void handleDealAgree()}>
                    Anlastik
                  </button>
                  {activeThread.dealAgreement.currentUserRole === 'SELLER' && activeThread.dealAgreement.canShareLicenseInfo ? (
                    <button className="secondary-link button-reset" type="button" onClick={() => void handleShareLicense()}>
                      Ruhsat
                    </button>
                  ) : null}
                  {activeThread.dealAgreement.currentUserRole === 'BUYER' && activeThread.dealAgreement.licenseSharedAt ? (
                    <button className="primary-link button-reset" type="button" onClick={() => void handleRequestInsurance()}>
                      Sigorta
                    </button>
                  ) : null}
                </section>
              ) : null}

              <div className="messages-ig-stream">
                {activeThread.messages.map((message) => {
                  const systemCard = message.systemCard;
                  return (
                    <article key={message.id} className={`messages-ig-message ${message.isMine ? 'mine' : 'other'} ${message.messageType === 'SYSTEM_CARD' ? 'system' : ''}`}>
                      {!message.isMine && message.messageType !== 'SYSTEM_CARD' ? <Avatar username={message.senderUsername} /> : <span className="messages-ig-avatar-spacer" />}
                      <div className={`messages-ig-message-col ${message.isMine ? 'mine' : 'other'}`}>
                        {message.messageType === 'SYSTEM_CARD' ? (
                          <div className="messages-ig-system-card">
                            <small>{systemCard?.type ?? 'SYSTEM_CARD'}</small>
                            {message.body ? <p>{message.body}</p> : null}
                            {systemCard?.type === 'LICENSE_INFO_CARD' ? (
                              <>
                                <p>{systemCard.vehicleInfo}</p>
                                <p>Ruhsat sahibi: {systemCard.licenseOwnerName}</p>
                                <p>TC: {systemCard.maskedTcNo ?? '-'}</p>
                                <p>Plaka: {systemCard.maskedPlate ?? '-'}</p>
                              </>
                            ) : null}
                            {systemCard?.type === 'INSURANCE_OFFER_CARD' ? <p>{systemCard.amount.toLocaleString('tr-TR')} {systemCard.currency}</p> : null}
                            {systemCard?.type === 'PAYMENT_STATUS_CARD' ? <p>Odeme durumu: {systemCard.status}</p> : null}
                            {systemCard?.type === 'POLICY_DOCUMENT_CARD' ? <p>Police ve fatura hazir.</p> : null}
                          </div>
                        ) : (
                          <div className="messages-ig-bubble">
                            {message.body ? <p>{message.body}</p> : null}
                            {message.attachments.length > 0 ? (
                              <div className="messages-ig-chip-row">
                                {message.attachments.map((attachment) => (
                                  <span key={attachment.id} className="messages-ig-chip">{attachment.attachmentType}</span>
                                ))}
                              </div>
                            ) : null}
                          </div>
                        )}
                        <small className="messages-ig-time">{formatTime(message.createdAt)}{message.isMine ? ` · ${message.seenAt ? 'Goruldu' : 'Gonderildi'}` : ''}</small>
                      </div>
                    </article>
                  );
                })}

                {composer.trim().length > 0 ? (
                  <div className="messages-ig-typing">
                    <span className="messages-ig-avatar-spacer" />
                    <div className="messages-ig-typing-bubble">{sending ? 'Gonderiliyor...' : 'Yaziyor...'}</div>
                  </div>
                ) : null}
              </div>

              <footer className="messages-ig-composer">
                {attachments.length > 0 ? (
                  <div className="messages-ig-chip-row pending">
                    {attachments.map((attachment, index) => (
                      <button key={`${attachment.id}-${index}`} type="button" className="messages-ig-chip button-reset" onClick={() => setAttachments((current) => current.filter((_, itemIndex) => itemIndex !== index))}>
                        {(attachment.mimeType.split('/')[0]?.toUpperCase() ?? 'DOSYA')} ×
                      </button>
                    ))}
                  </div>
                ) : null}
                <div className="messages-ig-composer-row">
                  <button type="button" className="messages-ig-tool button-reset" onClick={() => openAttachmentPicker(MessageType.IMAGE)}>+</button>
                  <textarea value={composer} onChange={(event) => setComposer(event.target.value)} placeholder="Mesaj yazin" rows={2} />
                  <button type="button" className="messages-ig-tool button-reset" onClick={() => openAttachmentPicker(MessageType.AUDIO)}>Ses</button>
                  <button className="primary-link button-reset" type="button" onClick={() => void sendMessage()} disabled={sending}>
                    {sending ? '...' : 'Gonder'}
                  </button>
                </div>
              </footer>
            </>
          ) : null}
        </main>
      </section>
    </AppShell>
  );
}
