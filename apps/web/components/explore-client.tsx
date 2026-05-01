'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { ExploreVehicleItem } from '@carloi-v4/types';
import { AppShell } from './app-shell';
import { useAuth } from './auth-provider';
import { HeartIcon, MessageIcon, ShareIcon } from './app-icons';
import { webExploreApi } from '../lib/explore-api';
import { webMessagesApi } from '../lib/messages-api';

export function ExploreClient() {
  const { session, isReady } = useAuth();
  const [items, setItems] = useState<ExploreVehicleItem[]>([]);
  const [likedMap, setLikedMap] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!session?.accessToken) {
      return;
    }

    setLoading(true);
    setErrorMessage(null);

    void webExploreApi
      .getFeed(session.accessToken)
      .then((response) => setItems(response.items))
      .catch((error) => {
        setErrorMessage(error instanceof Error ? error.message : 'Kesif akisi yuklenemedi.');
      })
      .finally(() => setLoading(false));
  }, [session?.accessToken]);

  async function handleMessage(ownerId: string) {
    if (!session?.accessToken) {
      return;
    }

    try {
      const response = await webMessagesApi.createDirectThread(session.accessToken, {
        targetUserId: ownerId,
      });
      window.location.href = `/messages?thread=${response.thread.id}`;
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Mesaj alani acilamadi.');
    }
  }

  return (
    <AppShell>
      <section className="explore-shell">
        <header className="explore-head">
          <div>
            <span className="settings-kicker">Explore</span>
            <h1>Arac reels akisi</h1>
            <p>Kesfete acik araclar tam ekran hissinde, sosyal akis mantigiyla siralaniyor.</p>
          </div>
        </header>

        {errorMessage ? <div className="auth-message error">{errorMessage}</div> : null}
        {!isReady ? <div className="detail-card">Oturum hazirlaniyor...</div> : null}
        {loading ? <div className="detail-card">Kesif akisi yukleniyor...</div> : null}
        {!loading && !items.length ? (
          <div className="detail-card empty-explore-card">
            <h3 className="card-title">Kesfet henuz bos</h3>
            <p className="card-copy">Kullanicilar araclarini kesfete acmaya basladiginda burada akacak.</p>
          </div>
        ) : null}

        {!loading && items.length ? (
          <section className="explore-feed">
            {items.map((item) => {
              const liked = Boolean(likedMap[item.id]);
              const media = item.media[0];

              return (
                <article className="explore-reel" key={item.id}>
                  <div className="explore-media">
                    <Link className="explore-media-link" href={`/vehicles/${item.id}`}>
                      {media?.url ? (
                        <img alt={`${item.brand} ${item.model}`} loading="lazy" src={media.url} />
                      ) : (
                        <div className="profile-tile-fallback">ARAC</div>
                      )}
                    </Link>
                    <div className="explore-overlay">
                      <div className="explore-copy">
                        <strong>@{item.owner.username}</strong>
                        <h2>{[item.brand, item.model, item.package].filter(Boolean).join(' · ')}</h2>
                        <p>{item.year} · {item.km.toLocaleString('tr-TR')} km · {item.city ?? 'Konum paylasilmadi'}</p>
                        {item.description ? <span>{item.description}</span> : null}
                      </div>
                      <div className="explore-actions">
                        <button className="explore-action button-reset" type="button" onClick={() => setLikedMap((current) => ({ ...current, [item.id]: !current[item.id] }))}>
                          <HeartIcon className="dock-icon active" filled={liked} />
                          <small>{liked ? 'Begendin' : 'Begen'}</small>
                        </button>
                        <Link className="explore-action" href={`/vehicles/${item.id}`}>
                          <MessageIcon className="dock-icon active" filled />
                          <small>Detay</small>
                        </Link>
                        <button className="explore-action button-reset" type="button" onClick={() => void handleMessage(item.owner.id)}>
                          <ShareIcon className="dock-icon active" />
                          <small>Mesaj</small>
                        </button>
                        {item.openToOffers ? (
                          <button className="explore-action button-reset" type="button" onClick={() => void handleMessage(item.owner.id)}>
                            <span className="explore-offer-badge">$</span>
                            <small>Teklif</small>
                          </button>
                        ) : null}
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
          </section>
        ) : null}
      </section>
    </AppShell>
  );
}

