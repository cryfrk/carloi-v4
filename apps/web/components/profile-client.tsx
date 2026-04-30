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

type TabKey = 'posts' | 'listings' | 'vehicles';

export function ProfileClient({ identifier }: { identifier?: string }) {
  const router = useRouter();
  const { session, isReady } = useAuth();
  const [profile, setProfile] = useState<ProfileDetailResponse | null>(null);
  const [posts, setPosts] = useState<ProfilePostGridItem[]>([]);
  const [listings, setListings] = useState<ProfileListingItem[]>([]);
  const [vehicles, setVehicles] = useState<ProfileVehicleItem[]>([]);
  const [activeTab, setActiveTab] = useState<TabKey>('posts');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedVehicle, setSelectedVehicle] = useState<ProfileVehicleItem | null>(null);

  useEffect(() => {
    if (!session?.accessToken) {
      return;
    }

    setLoading(true);

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
      })
      .finally(() => setLoading(false));
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

  const profileUsername = profile?.username ?? session?.user.username ?? '-';
  const profileInitial = (profile?.firstName?.[0] ?? session?.user.firstName?.[0] ?? '?').toUpperCase();
  const canViewContent = profile?.canViewContent ?? true;

  return (
    <AppShell>
      <section className="profile-ig-shell">
        {errorMessage ? <div className="auth-message error">{errorMessage}</div> : null}
        {!isReady ? <div className="detail-card">Oturum hazirlaniyor...</div> : null}
        {session ? (
          <>
            <section className="profile-ig-top">
              <div className="profile-ig-avatar-wrap">
                {profile?.avatarUrl ? (
                  <img alt={profileUsername} className="profile-ig-avatar" src={profile.avatarUrl} />
                ) : (
                  <div className="profile-ig-avatar fallback">{profileInitial}</div>
                )}
              </div>

              <h1 className="profile-ig-username">@{profileUsername}</h1>
              {profile ? <p className="profile-ig-name">{profile.firstName} {profile.lastName}</p> : null}

              <div className="profile-ig-stats">
                <StatChip label="posts" value={profile?.postCount ?? posts.length} />
                <StatChip label="listings" value={profile?.listingCount ?? listings.length} />
                <StatChip label="vehicles" value={profile?.vehicleCount ?? vehicles.length} />
              </div>

              <div className="profile-ig-meta">
                {profile?.bio ? <p>{profile.bio}</p> : null}
                {profile?.websiteUrl ? (
                  <a className="inline-link" href={profile.websiteUrl} rel="noreferrer" target="_blank">
                    {profile.websiteUrl}
                  </a>
                ) : null}
                {profile?.locationText ? <p>{profile.locationText}</p> : null}
                <p>{profile?.followerCount ?? 0} takipci · {profile?.followingCount ?? 0} takip edilen</p>
              </div>

              <div className="profile-ig-actions">
                {profile?.isOwnProfile ? (
                  <>
                    <Link className="secondary-link" href="/settings">Profili duzenle</Link>
                    <Link className="secondary-link" href="/settings">Ayarlar</Link>
                  </>
                ) : (
                  <>
                    <button className="primary-link button-reset" type="button" onClick={() => void handleFollowToggle()}>
                      {profile?.isFollowing ? 'Takiptesin' : 'Takip et'}
                    </button>
                    <button className="secondary-link button-reset" type="button" onClick={() => void handleMessageStart()}>
                      Mesaj
                    </button>
                  </>
                )}
              </div>
            </section>

            <nav className="profile-ig-tabs" aria-label="Profile tabs">
              <button className={`profile-ig-tab ${activeTab === 'posts' ? 'active' : ''}`} type="button" onClick={() => setActiveTab('posts')}>Gonderiler</button>
              <button className={`profile-ig-tab ${activeTab === 'listings' ? 'active' : ''}`} type="button" onClick={() => setActiveTab('listings')}>Ilanlar</button>
              <button className={`profile-ig-tab ${activeTab === 'vehicles' ? 'active' : ''}`} type="button" onClick={() => setActiveTab('vehicles')}>Araclar</button>
            </nav>

            {!canViewContent && !profile?.isOwnProfile ? (
              <div className="profile-ig-private">
                <strong>Bu hesap gizli</strong>
                <p>Takip etmeden gonderi, ilan ve araclar gorunmez.</p>
              </div>
            ) : null}

            {loading ? <div className="profile-ig-helper">Profil yukleniyor...</div> : null}

            {!loading && activeTab === 'posts' ? (
              <section className="profile-post-grid">
                {posts.map((post) => (
                  <Link key={post.id} className="profile-post-tile" href={`/posts/${post.id}`}>
                    {post.thumbnailUrl ? (
                      <img alt="Post" loading="lazy" src={post.thumbnailUrl} />
                    ) : (
                      <div className="profile-tile-fallback">POST</div>
                    )}
                  </Link>
                ))}
                {!posts.length ? <div className="profile-ig-helper">Bu sekmede gosterilecek gonderi yok.</div> : null}
              </section>
            ) : null}

            {!loading && activeTab === 'listings' ? (
              <section className="profile-visual-grid">
                {listings.map((listing) => (
                  <Link key={listing.listingId} className="profile-visual-tile" href={`/listings/${listing.listingId}`}>
                    <div className="profile-visual-media">
                      {listing.firstMediaUrl ? (
                        <img alt={listing.title} loading="lazy" src={listing.firstMediaUrl} />
                      ) : (
                        <div className="profile-tile-fallback">ILAN</div>
                      )}
                    </div>
                    <strong>{listing.title}</strong>
                    <span>{[listing.brand, listing.model, listing.package].filter(Boolean).join(' · ')}</span>
                  </Link>
                ))}
                {!listings.length ? <div className="profile-ig-helper">Bu sekmede gosterilecek ilan yok.</div> : null}
              </section>
            ) : null}

            {!loading && activeTab === 'vehicles' ? (
              <section className="profile-visual-grid">
                {vehicles.map((vehicle) => (
                  <button key={vehicle.id} className="profile-visual-tile button-reset" type="button" onClick={() => setSelectedVehicle(vehicle)}>
                    <div className="profile-visual-media">
                      {vehicle.firstMediaUrl ? (
                        <img alt={`${vehicle.brand} ${vehicle.model}`} loading="lazy" src={vehicle.firstMediaUrl} />
                      ) : (
                        <div className="profile-tile-fallback">ARAC</div>
                      )}
                    </div>
                    <strong>{vehicle.brand} {vehicle.model}</strong>
                    <span>{vehicle.package ?? vehicle.plateNumberMasked}</span>
                  </button>
                ))}
                {!vehicles.length ? <div className="profile-ig-helper">Bu sekmede gosterilecek arac yok.</div> : null}
              </section>
            ) : null}
          </>
        ) : (
          <div className="detail-card">Bu alani gormek icin giris yapin.</div>
        )}

        {selectedVehicle ? (
          <div className="profile-vehicle-overlay" role="dialog">
            <div className="profile-vehicle-modal">
              <div className="profile-vehicle-modal-head">
                <strong>{selectedVehicle.brand} {selectedVehicle.model}</strong>
                <button className="secondary-link button-reset" type="button" onClick={() => setSelectedVehicle(null)}>Kapat</button>
              </div>
              <p>{selectedVehicle.package ?? 'Paket bilgisi yok'}</p>
              <p>{selectedVehicle.year} · {selectedVehicle.km.toLocaleString('tr-TR')} km</p>
              <p>{selectedVehicle.fuelType} · {selectedVehicle.transmissionType}</p>
              <p>Plaka: {selectedVehicle.plateNumberMasked}</p>
              {selectedVehicle.latestObdReport ? <p>Expertiz skoru: {selectedVehicle.latestObdReport.overallScore ?? '-'} / 100</p> : null}
            </div>
          </div>
        ) : null}
      </section>
    </AppShell>
  );
}

function StatChip({ label, value }: { label: string; value: number }) {
  return (
    <div className="profile-ig-stat">
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  );
}
