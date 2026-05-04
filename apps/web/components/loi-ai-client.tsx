'use client';

import {
  AttachmentType,
  type LoiAiAttachmentInput,
  type LoiAiCard,
  type LoiAiConversationDetail,
  type LoiAiConversationSummary,
  type PublicProfileResponse,
} from '@carloi-v4/types';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AppShell } from './app-shell';
import { useAuth } from './auth-provider';
import { demoLoiAiWelcomeConversation, loiAiSuggestedPrompts } from '../lib/demo-content';
import { webLoiAiApi } from '../lib/loi-ai-api';

const ATTACHMENT_SEQUENCE: AttachmentType[] = [
  AttachmentType.IMAGE,
  AttachmentType.FILE,
  AttachmentType.VIDEO,
];

function formatTime(value: string) {
  return new Date(value).toLocaleString('tr-TR', {
    day: '2-digit',
    month: '2-digit',
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
    name: `ek-${index + 1}.${type === AttachmentType.IMAGE ? 'jpg' : type === AttachmentType.VIDEO ? 'mp4' : 'pdf'}`,
    url: `https://example.com/mock-${type.toLowerCase()}-${index + 1}`,
  };
}

export function LoiAiClient() {
  const router = useRouter();
  const { session, isReady } = useAuth();
  const [conversations, setConversations] = useState<LoiAiConversationSummary[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [activeConversation, setActiveConversation] = useState<LoiAiConversationDetail | null>(null);
  const [input, setInput] = useState('');
  const [attachments, setAttachments] = useState<LoiAiAttachmentInput[]>([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const accessToken = session?.accessToken ?? null;
  const activeConversationSummary = useMemo(
    () => conversations.find((item) => item.id === activeConversationId) ?? null,
    [activeConversationId, conversations],
  );
  const displayConversation = activeConversation ?? demoLoiAiWelcomeConversation;

  useEffect(() => {
    if (!accessToken) {
      return;
    }

    setLoading(true);
    setErrorMessage(null);

    void webLoiAiApi
      .getConversations(accessToken)
      .then((items) => {
        setConversations(items);
        setActiveConversationId((current) => current ?? items[0]?.id ?? null);
      })
      .catch((error) => {
        setErrorMessage(error instanceof Error ? error.message : 'Sohbet gecmisi yuklenemedi.');
      })
      .finally(() => setLoading(false));
  }, [accessToken]);

  useEffect(() => {
    if (!accessToken || !activeConversationId) {
      setActiveConversation(null);
      return;
    }

    setLoading(true);
    void webLoiAiApi
      .getConversation(accessToken, activeConversationId)
      .then(setActiveConversation)
      .catch((error) => {
        setErrorMessage(error instanceof Error ? error.message : 'Sohbet acilamadi.');
      })
      .finally(() => setLoading(false));
  }, [accessToken, activeConversationId]);

  async function refreshConversations(nextActiveId?: string | null) {
    if (!accessToken) {
      return;
    }

    const items = await webLoiAiApi.getConversations(accessToken);
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

    const conversation = await webLoiAiApi.createConversation(accessToken, {});
    setActiveConversationId(conversation.id);
    await refreshConversations(conversation.id);
    return conversation.id;
  }

  async function handleNewConversation() {
    if (!accessToken) {
      return;
    }

    try {
      const conversation = await webLoiAiApi.createConversation(accessToken, {});
      setActiveConversation(conversation);
      setActiveConversationId(conversation.id);
      setAttachments([]);
      setInput('');
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
      await webLoiAiApi.deleteConversation(accessToken, conversationId);
      const nextActive = activeConversationId === conversationId ? null : activeConversationId;
      setActiveConversation(activeConversationId === conversationId ? null : activeConversation);
      await refreshConversations(nextActive);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Sohbet silinemedi.');
    }
  }

  async function handleClearHistory() {
    if (!accessToken || conversations.length === 0) {
      return;
    }

    try {
      await Promise.all(conversations.map((conversation) => webLoiAiApi.deleteConversation(accessToken, conversation.id)));
      setConversations([]);
      setActiveConversationId(null);
      setActiveConversation(null);
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
      const response = await webLoiAiApi.sendMessage(accessToken, conversationId, {
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
    router.push(card.appRoute);
  }

  function applyPrompt(prompt: string) {
    setInput(prompt);
  }

  return (
    <AppShell>
      <section className="ai-layout">
        <aside className="ai-sidebar" data-open={historyOpen}>
          <div className="ai-sidebar-head">
            <div>
              <p className="brand-kicker">Loi AI</p>
              <h2 className="ai-sidebar-title">Konusma gecmisi</h2>
            </div>
            <button className="secondary-cta" type="button" onClick={() => setHistoryOpen((current) => !current)}>
              {historyOpen ? 'Daralt' : 'Ac'}
            </button>
          </div>
          <div className="ai-sidebar-actions">
            <button className="primary-cta" type="button" onClick={() => void handleNewConversation()}>
              Yeni sohbet
            </button>
            <button className="secondary-cta" type="button" onClick={() => void handleClearHistory()}>
              Gecmisi temizle
            </button>
          </div>
          <div className="ai-history-list">
            {conversations.map((conversation) => (
              <article key={conversation.id} className="ai-history-item" data-active={conversation.id === activeConversationId}>
                <button type="button" className="ai-history-trigger" onClick={() => setActiveConversationId(conversation.id)}>
                  <strong>{conversation.title}</strong>
                  <span>{conversation.lastMessagePreview ?? 'Henuz mesaj yok'}</span>
                  <small>{conversation.lastMessageAt ? formatTime(conversation.lastMessageAt) : 'Simdi'}</small>
                </button>
                <button type="button" className="ai-history-delete" onClick={() => void handleDeleteConversation(conversation.id)}>
                  Sil
                </button>
              </article>
            ))}
          </div>
        </aside>

        <div className="ai-chat-panel detail-card">
          <header className="ai-chat-header">
            <div>
              <p className="brand-kicker">Arac Uzmani Asistan</p>
              <h2>{activeConversationSummary?.title ?? 'Loi AI ile yeni sohbet'}</h2>
              <p>
                Ilan bulma, karsilastirma, hazir mesaj ve teknik arac tavsiyesi tek yerde.
              </p>
            </div>
            {!session && isReady ? <a className="session-link" href="/login">Giris yap</a> : null}
          </header>

          {errorMessage ? <div className="auth-message error">{errorMessage}</div> : null}

          <div className="ai-message-stream">
            {loading && !activeConversation ? <div className="ai-empty">Loi AI oturumu yukleniyor...</div> : null}
            {!loading && !activeConversation ? (
              <div className="ai-empty">
                <h3>Hazirim</h3>
                <p>Bir fiyat hedefi, ilan no, marka-model veya teknik soru ile baslayabiliriz.</p>
                <div className="ai-suggestion-row">
                  {loiAiSuggestedPrompts.map((prompt) => (
                    <button key={prompt} type="button" className="ai-chip button-reset" onClick={() => applyPrompt(prompt)}>
                      {prompt}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}
            {displayConversation.messages.map((message) => (
              <article key={message.id} className={`ai-message ai-message-${message.role.toLowerCase()}`}>
                <div className="ai-message-meta">
                  <strong>{message.role === 'USER' ? 'Siz' : 'Loi AI'}</strong>
                  <span>{formatTime(message.createdAt)}</span>
                </div>
                <div className={message.role === 'USER' ? 'ai-bubble' : 'ai-copy'}>
                  <p>{message.content}</p>
                </div>
                {message.attachments.length > 0 ? (
                  <div className="ai-chip-row">
                    {message.attachments.map((attachment, index) => (
                      <span key={`${message.id}-attachment-${index}`} className="ai-chip">
                        {attachment.type} {attachment.name ?? attachment.transcript ?? ''}
                      </span>
                    ))}
                  </div>
                ) : null}
                {message.cards.length > 0 ? (
                  <div className="ai-card-grid">
                    {message.cards.map((card) => (
                      <button key={`${message.id}-${card.entityId}-${card.type}`} type="button" className="ai-card" onClick={() => openCard(card)}>
                        <div className="ai-card-copy">
                          <span className="brand-kicker">{card.type.replace('_', ' ')}</span>
                          <h3>{card.title}</h3>
                          {card.subtitle ? <p>{card.subtitle}</p> : null}
                          {card.description ? <p>{card.description}</p> : null}
                        </div>
                        <div className="ai-card-meta">
                          {card.price ? <strong>{card.price.toLocaleString('tr-TR')} {card.currency ?? 'TRY'}</strong> : null}
                          {card.badges?.length ? <span>{card.badges.join(' · ')}</span> : null}
                        </div>
                      </button>
                    ))}
                  </div>
                ) : null}
              </article>
            ))}
          </div>

          <footer className="ai-composer">
            <div className="ai-chip-row">
              {attachments.map((attachment, index) => (
                <button key={`${attachment.type}-${index}`} type="button" className="ai-chip" onClick={() => setAttachments((current) => current.filter((_, itemIndex) => itemIndex !== index))}>
                  {attachment.type} {attachment.name ?? 'ek'} x
                </button>
              ))}
            </div>
            <div className="ai-composer-row">
              <button type="button" className="secondary-cta" onClick={() => pushAttachment(ATTACHMENT_SEQUENCE[attachments.length % ATTACHMENT_SEQUENCE.length] ?? AttachmentType.IMAGE)}>
                Dosya ekle
              </button>
              <textarea
                className="ai-textarea"
                rows={2}
                value={input}
                onChange={(event) => setInput(event.target.value)}
                placeholder="Ilan ara, arac sorusu sor veya saticiya mesaj iste..."
              />
              <button type="button" className="secondary-cta" onClick={() => pushAttachment(AttachmentType.AUDIO)}>
                Sesli not
              </button>
              <button type="button" className="primary-cta" onClick={() => void handleSend()} disabled={sending || !session}>
                {sending ? 'Gonderiliyor' : 'Gonder'}
              </button>
            </div>
          </footer>
        </div>
      </section>
    </AppShell>
  );
}

export function PublicProfileClient({ userId }: { userId: string }) {
  const { session } = useAuth();
  const [profile, setProfile] = useState<PublicProfileResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!session?.accessToken) {
      return;
    }

    void webLoiAiApi
      .getPublicProfile(session.accessToken, userId)
      .then(setProfile)
      .catch((error) => {
        setErrorMessage(error instanceof Error ? error.message : 'Profil yuklenemedi.');
      });
  }, [session?.accessToken, userId]);

  return (
    <AppShell>
      <section className="detail-card ai-detail-shell">
        {errorMessage ? <div className="auth-message error">{errorMessage}</div> : null}
        {profile ? (
          <div className="profile-hero">
            <div>
              <p className="brand-kicker">Profil</p>
              <h2>@{profile.username}</h2>
              <p>{profile.fullName}</p>
              <p>{profile.bio ?? profile.locationText ?? 'Acik profil'}</p>
            </div>
            <div className="profile-badges">
              {profile.blueVerified ? <span className="ai-chip">Blue</span> : null}
              {profile.goldVerified ? <span className="ai-chip">Gold</span> : null}
            </div>
          </div>
        ) : (
          <div className="ai-empty">Profil yukleniyor...</div>
        )}

        {profile?.publicGarage.length ? (
          <div className="ai-card-grid">
            {profile.publicGarage.map((vehicle) => (
              <article key={vehicle.id} className="ai-card">
                <div className="ai-card-copy">
                  <span className="brand-kicker">Public Garage</span>
                  <h3>{vehicle.brand} {vehicle.model}</h3>
                  <p>{vehicle.package ?? 'Paket bilgisi yok'}</p>
                </div>
                <div className="ai-card-meta">
                  <strong>{vehicle.year}</strong>
                  <span>{vehicle.km.toLocaleString('tr-TR')} km</span>
                </div>
              </article>
            ))}
          </div>
        ) : null}
      </section>
    </AppShell>
  );
}
