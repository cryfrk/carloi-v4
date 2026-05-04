'use client';

import type {
  MessageParticipantSummary,
  MessageThreadSummary,
  SharedContentType,
} from '@carloi-v4/types';
import { useEffect, useMemo, useState } from 'react';
import { webMessagesApi } from '../lib/messages-api';
import { buildWebSharedContentUrl } from '../lib/share-content';

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
      webMessagesApi.getFriends(accessToken),
      webMessagesApi.getThreads(accessToken),
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

    const timeout = window.setTimeout(() => {
      void webMessagesApi
        .searchUsers(accessToken, searchQuery.trim())
        .then((response) => setSearchResults(response.items))
        .catch(() => setSearchResults([]));
    }, 220);

    return () => window.clearTimeout(timeout);
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
    const url = buildWebSharedContentUrl(contentType, contentId);

    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
        setNotice('Baglanti kopyalandi.');
        return;
      }

      const textArea = document.createElement('textarea');
      textArea.value = url;
      textArea.style.position = 'fixed';
      textArea.style.opacity = '0';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setNotice('Baglanti kopyalandi.');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Baglanti kopyalanamadi.');
    }
  }

  async function handleShare() {
    if (!accessToken || selectedIds.length === 0) {
      return;
    }

    setSending(true);
    setErrorMessage(null);

    try {
      const response = await webMessagesApi.shareContent(accessToken, {
        targetUserIds: selectedIds,
        contentType,
        contentId,
      });
      setNotice(`${response.sharedCount} kisiye gonderildi.`);
      onShared?.(response.sharedCount);
      window.setTimeout(() => onClose(), 300);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Paylasim tamamlanamadi.');
    } finally {
      setSending(false);
    }
  }

  if (!visible) {
    return null;
  }

  return (
    <div className="share-sheet-overlay" role="dialog" aria-modal="true">
      <button aria-label="Kapat" className="share-sheet-backdrop button-reset" onClick={onClose} type="button" />
      <section className="share-sheet-panel">
        <div className="share-sheet-handle" />
        <div className="share-sheet-head">
          <h3>Gonder</h3>
          <button className="share-sheet-close button-reset" onClick={onClose} type="button">Kapat</button>
        </div>
        <input className="share-sheet-search" onChange={(event) => setSearchQuery(event.target.value)} placeholder="Kullanici ara" value={searchQuery} />
        {notice ? <div className="settings-inline success">{notice}</div> : null}
        {errorMessage ? <div className="settings-inline error">{errorMessage}</div> : null}
        {loading ? <p className="card-copy">Paylasim listesi yukleniyor...</p> : null}

        <div className="share-sheet-body">
          {sections.map((section) => {
            if (section.hidden || section.items.length === 0) {
              return null;
            }

            return (
              <div className="share-sheet-section" key={section.key}>
                <small>{section.title}</small>
                <div className="share-sheet-users">
                  {section.items.map((user) => {
                    const selected = selectedIds.includes(user.id);
                    return (
                      <button
                        className={`share-sheet-user${selected ? ' active' : ''}`}
                        key={`${section.key}-${user.id}`}
                        onClick={() => toggleSelection(user.id)}
                        type="button"
                      >
                        <span className="session-avatar">{user.username.slice(0, 1).toUpperCase()}</span>
                        <span className="share-sheet-user-copy">
                          <strong>@{user.username}</strong>
                          <span>{user.fullName}</span>
                        </span>
                        <span className="share-sheet-check">{selected ? 'Secildi' : 'Sec'}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {!loading && sections.every((section) => section.hidden || section.items.length === 0) ? (
            <p className="card-copy">Paylasacak kisi bulunamadi. Arama ile bir kullanici secmeyi deneyin.</p>
          ) : null}
        </div>

        <div className="share-sheet-footer">
          <button className="secondary-link subtle-button" onClick={() => void handleCopyUrl()} type="button">URL kopyala</button>
          <button className="primary-link button-reset" disabled={selectedCount === 0 || sending} onClick={() => void handleShare()} type="button">
            {sending ? 'Gonderiliyor...' : `Gonder${selectedCount > 0 ? ` (${selectedCount})` : ''}`}
          </button>
        </div>
      </section>
    </div>
  );
}
