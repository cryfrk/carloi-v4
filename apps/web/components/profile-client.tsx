'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import type {
  ProfileDetailResponse,
  ProfileListingItem,
  ProfilePostGridItem,
  ProfileVehicleItem,
} from '@carloi-v4/types';
import { useAuth } from './auth-provider';
import { AppShell } from './app-shell';
import { webMessagesApi } from '../lib/messages-api';
import { webProfileApi } from '../lib/profile-api';
import { webSocialApi } from '../lib/social-api';

export function ProfileClient({ identifier }: { identifier?: string }) {
  const router = useRouter();
  const { session, isReady } = useAuth();
  const [profile, setProfile] = useState<ProfileDetailResponse | null>(null);
  const [posts, setPosts] = useState<ProfilePostGridItem[]>([]);
  const [listings, setListings] = useState<ProfileListingItem[]>([]);
  const [vehicles, setVehicles] = useState<ProfileVehicleItem[]>([]);
  const [activeTab, setActiveTab] = useState<'posts' | 'listings' | 'vehicles'>('posts');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!session?.accessToken) {
      return;
    }

    const profilePromise = identifier
      ? webProfileApi.getProfile(session.accessToken, identifier)
      : webProfileApi.getMyProfile(session.accessToken);
    const target = identifier ?? session.user.username;

    void Promise.all([
      profilePromise,
      webProfileApi.getProfilePosts(session.accessToken, target),
      webProfileApi.getProfileListings(session.accessToken, target),
      webProfileApi.getProfileVehicles(session.accessToken, target),
    ])
      .then(([profileResponse, postsResponse, listingsResponse, vehiclesResponse]) => {
        setProfile(profileResponse);
        setPosts(postsResponse.items);
        setListings(listingsResponse.items);
        setVehicles(vehiclesResponse.items);
      })
      .catch((error) => {
        setErrorMessage(error instanceof Error ? error.message : 'Profil yuklenemedi.');
      });
  }, [identifier, session?.accessToken, session?.user.username]);

  async function handleFollowToggle() {
    if (!session?.accessToken || !profile || profile.isOwnProfile) {
      return;
    }

    try {
      if (profile.isFollowing) {
        await webSocialApi.unfollowUser(session.accessToken, profile.id);
      } else {
        await webSocialApi.followUser(session.accessToken, profile.id);
      }

      const refreshed = await webProfileApi.getProfile(session.accessToken, identifier ?? profile.username);
      setProfile(refreshed);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Takip islemi tamamlanamadi.');
    }
  }

  async function handleMessageStart() {
    if (!session?.accessToken || !profile || profile.isOwnProfile) {
      return;
    }

    try {
      const response = await webMessagesApi.createDirectThread(session.accessToken, {
        targetUserId: profile.id,
      });
      router.push(`/messages?thread=${response.thread.id}`);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Sohbet baslatilamadi.');
    }
  }

  return (
    <AppShell>
      <section className="profile-layout">
        {errorMessage ? <div className="auth-message error">{errorMessage}</div> : null}
        {!isReady ? <div className="detail-card">Oturum hazirlaniyor...</div> : null}
        {session ? (
          <>
            <article className="profile-hero-card">
              <div className="profile-header-row">
                <div className="profile-avatar-lg">{(profile?.firstName?.[0] ?? session.user.firstName[0] ?? '?').toUpperCase()}</div>
                <div className="profile-intro-block">
                  <div className="card-label">Profile</div>
                  <h2>{profile ? `${profile.firstName} ${profile.lastName}` : 'Profil yukleniyor...'}</h2>
                  <div className="profile-handle-row">
                    <span>@{profile?.username ?? session.user.username}</span>
                    {profile?.blueVerified ? <span className="tiny-pill">Blue</span> : null}
                    {profile?.goldVerified ? <span className="tiny-pill gold">Gold</span> : null}
                  </div>
                  {profile?.bio ? <p className="card-copy">{profile.bio}</p> : null}
                  {profile?.websiteUrl ? (
                    <a className="inline-link" href={profile.websiteUrl} rel="noreferrer" target="_blank">
                      {profile.websiteUrl}
                    </a>
                  ) : null}
                  <p className="card-copy">{profile?.locationText ?? 'Konum bilgisi yok'}</p>
                  <p className="card-copy">
                    {profile?.followerCount ?? 0} takipci · {profile?.followingCount ?? 0} takip edilen
                  </p>
                  {profile?.mutualFollowers.length ? (
                    <p className="card-copy">
                      Ortak baglanti: {profile.mutualFollowers.map((item) => `@${item.username}`).join(', ')}
                    </p>
                  ) : null}
                </div>
              </div>

              <div className="profile-stats-grid">
                <StatCard label="Gonderi" value={profile?.postCount ?? posts.length} />
                <StatCard label="Ilan" value={profile?.listingCount ?? listings.length} />
                <StatCard label="Arac" value={profile?.vehicleCount ?? vehicles.length} />
              </div>

              <div className="profile-action-row">
                {profile?.isOwnProfile ? (
                  <>
                    <Link className="secondary-link" href="/settings">Profili duzenle</Link>
                    <Link className="secondary-link" href="/settings">Ayarlar</Link>
                  </>
                ) : (
                  <>
                    <button className="primary-link button-reset" type="button" onClick={() => void handleFollowToggle()}>
                      {profile?.isFollowing ? 'Takip ediliyor' : 'Takip et'}
                    </button>
                    <button className="secondary-link button-reset" type="button" onClick={() => void handleMessageStart()}>
                      Mesaj
                    </button>
                  </>
                )}
              </div>

              {!profile?.canViewContent && !profile?.isOwnProfile ? (
                <div className="detail-card compact-note">
                  <div className="card-label">Private</div>
                  <p className="card-copy">Bu hesap gizli. Takip etmeden gonderi, ilan ve arac icerikleri acilmaz.</p>
                </div>
              ) : null}
            </article>

            <div className="profile-tab-row">
              <button className={`pill-toggle ${activeTab === 'posts' ? 'active' : ''}`} type="button" onClick={() => setActiveTab('posts')}>Gonderiler</button>
              <button className={`pill-toggle ${activeTab === 'listings' ? 'active' : ''}`} type="button" onClick={() => setActiveTab('listings')}>Ilanlar</button>
              <button className={`pill-toggle ${activeTab === 'vehicles' ? 'active' : ''}`} type="button" onClick={() => setActiveTab('vehicles')}>Araclar</button>
            </div>

            {activeTab === 'posts' ? (
              <section className="profile-grid-section">
                {posts.map((post) => (
                  <Link key={post.id} className="profile-grid-card" href={`/posts/${post.id}`}>
                    <strong>{post.thumbnailUrl ?? 'Medya yok'}</strong>
                    <span>{post.likeCount} begeni · {post.commentCount} yorum</span>
                  </Link>
                ))}
                {!posts.length ? <div className="detail-card">Bu sekmede gosterilecek gonderi yok.</div> : null}
              </section>
            ) : null}

            {activeTab === 'listings' ? (
              <section className="cards-grid profile-cards-grid">
                {listings.map((listing) => (
                  <Link key={listing.listingId} className="bullet-card" href={`/listings/${listing.listingId}`}>
                    <div className="card-label">Listing</div>
                    <h3 className="card-title">{listing.title}</h3>
                    <p className="card-copy">{[listing.brand, listing.model, listing.package].filter(Boolean).join(' · ')}</p>
                    <p className="card-copy">{listing.city}{listing.district ? ` / ${listing.district}` : ''}</p>
                    <strong>{listing.price.toLocaleString('tr-TR')} TL</strong>
                  </Link>
                ))}
                {!listings.length ? <div className="detail-card">Bu sekmede gosterilecek ilan yok.</div> : null}
              </section>
            ) : null}

            {activeTab === 'vehicles' ? (
              <section className="cards-grid profile-cards-grid">
                {vehicles.map((vehicle) => (
                  <article key={vehicle.id} className="bullet-card">
                    <div className="card-label">Garage</div>
                    <h3 className="card-title">{vehicle.brand} {vehicle.model}</h3>
                    <p className="card-copy">{vehicle.package ?? 'Paket bilgisi yok'}</p>
                    <p className="card-copy">{vehicle.year} · {vehicle.km.toLocaleString('tr-TR')} km · {vehicle.plateNumberMasked}</p>
                    {vehicle.latestObdReport ? <strong>Expertiz skoru: {vehicle.latestObdReport.overallScore ?? '-'} / 100</strong> : null}
                  </article>
                ))}
                {!vehicles.length ? <div className="detail-card">Bu sekmede gosterilecek arac yok.</div> : null}
              </section>
            ) : null}
          </>
        ) : (
          <div className="detail-card">Bu alani gormek icin giris yapin.</div>
        )}
      </section>
    </AppShell>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="profile-stat-card">
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  );
}
