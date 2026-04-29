'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { AppShell } from './app-shell';
import { useAuth } from './auth-provider';
import { webProfileApi } from '../lib/profile-api';
import type { SavedItemsResponse } from '@carloi-v4/types';

export function SavedItemsClient() {
  const { session } = useAuth();
  const [saved, setSaved] = useState<SavedItemsResponse | null>(null);
  const [activeTab, setActiveTab] = useState<'posts' | 'listings'>('posts');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!session?.accessToken) {
      return;
    }

    void webProfileApi
      .getSavedItems(session.accessToken)
      .then(setSaved)
      .catch((error) => {
        setErrorMessage(error instanceof Error ? error.message : 'Kaydedilenler yuklenemedi.');
      });
  }, [session?.accessToken]);

  return (
    <AppShell>
      <section className="settings-stack">
        <article className="settings-card settings-hero">
          <div>
            <div className="settings-kicker">Saved</div>
            <h2>Kaydedilenler</h2>
            <p>Sonra donmek istedigin gonderi ve ilanlar tek yerde.</p>
          </div>
        </article>
        {errorMessage ? <div className="auth-message error">{errorMessage}</div> : null}
        <div className="profile-tab-row">
          <button className={`pill-toggle ${activeTab === 'posts' ? 'active' : ''}`} type="button" onClick={() => setActiveTab('posts')}>Gonderiler</button>
          <button className={`pill-toggle ${activeTab === 'listings' ? 'active' : ''}`} type="button" onClick={() => setActiveTab('listings')}>Ilanlar</button>
        </div>
        <section className="settings-stack">
          {activeTab === 'posts'
            ? saved?.savedPosts.map((item) => (
                <Link key={item.post.id} className="settings-card" href={`/posts/${item.post.id}`}>
                  <div className="settings-kicker">@{item.post.owner.username}</div>
                  <h3>{item.post.caption ?? 'Kaydedilen gonderi'}</h3>
                  <p>{new Date(item.savedAt).toLocaleString('tr-TR')}</p>
                </Link>
              ))
            : saved?.savedListings.map((item) => (
                <Link key={item.listing.listingId} className="settings-card" href={`/listings/${item.listing.listingId}`}>
                  <div className="settings-kicker">{item.listing.listingNo}</div>
                  <h3>{item.listing.title}</h3>
                  <p>{[item.listing.brand, item.listing.model, item.listing.package].filter(Boolean).join(' · ')}</p>
                  <strong>{item.listing.price.toLocaleString('tr-TR')} TL</strong>
                </Link>
              ))}
          {activeTab === 'posts' && !saved?.savedPosts.length ? <article className="settings-card"><p>Kaydedilen gonderi yok.</p></article> : null}
          {activeTab === 'listings' && !saved?.savedListings.length ? <article className="settings-card"><p>Kaydedilen ilan yok.</p></article> : null}
        </section>
      </section>
    </AppShell>
  );
}
