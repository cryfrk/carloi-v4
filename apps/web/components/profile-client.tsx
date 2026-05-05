'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import type {
  ProfileDetailResponse,
  ProfileListingItem,
  ProfilePostGridItem,
  ProfileVehicleItem,
} from '@carloi-v4/types';
import { useAuth } from './auth-provider';
import { AppShell } from './app-shell';
import { buildDemoMessageFixtures, buildDemoProfileFixtures } from '../lib/demo-content';
import { webDemoContentEnabled } from '../lib/demo-runtime';
import { webMessagesApi } from '../lib/messages-api';
import { resolveWebMediaUrl } from '../lib/media-url';
import { webProfileApi } from '../lib/profile-api';
import { webSocialApi } from '../lib/social-api';
import { WebMediaView } from './web-media-view';

type TabKey = 'posts' | 'listings' | 'vehicles';

export function ProfileClient({
  identifier,
  initialTab,
}: {
  identifier?: string;
  initialTab?: TabKey;
}) {
  const router = useRouter();
  const { session, isReady } = useAuth();
  const defaultTab = initialTab ?? (identifier ? 'posts' : 'vehicles');
  const [profile, setProfile] = useState<ProfileDetailResponse | null>(null);
  const [posts, setPosts] = useState<ProfilePostGridItem[]>([]);
  const [listings, setListings] = useState<ProfileListingItem[]>([]);
  const [vehicles, setVehicles] = useState<ProfileVehicleItem[]>([]);
  const [activeTab, setActiveTab] = useState<TabKey>(defaultTab);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const demoProfile = useMemo(
    () =>
      buildDemoProfileFixtures({
        currentUser: session
          ? {
              id: session.user.id,
              username: session.user.username,
              firstName: session.user.firstName,
              lastName: session.user.lastName,
            }
          : null,
        identifier: identifier ?? null,
        isOwnProfile: !identifier,
      }),
    [identifier, session],
  );
  const demoMessages = useMemo(
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

  useEffect(() => {
    setActiveTab(defaultTab);
  }, [defaultTab]);

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

  const showDemoProfile =
    webDemoContentEnabled &&
    !loading &&
    (!profile || (posts.length === 0 && listings.length === 0 && vehicles.length === 0));
  const displayProfile = showDemoProfile ? demoProfile.profile : profile;
  const displayPosts = showDemoProfile ? demoProfile.posts : posts;
  const displayListings = showDemoProfile ? demoProfile.listings : listings;
  const displayVehicles = showDemoProfile ? demoProfile.vehicles : vehicles;

  async function handleFollowToggle() {
    if (!session?.accessToken || !displayProfile || displayProfile.isOwnProfile) {
      return;
    }

    if (webDemoContentEnabled && (showDemoProfile || displayProfile.id.startsWith('demo-owner-'))) {
      setErrorMessage('Bu demo profil Carloi akisinin nasil gorunecegini gostermek icin hazirlandi.');
      return;
    }

    try {
      if (displayProfile.isFollowing) {
        await webSocialApi.unfollowUser(session.accessToken, displayProfile.id);
      } else {
        await webSocialApi.followUser(session.accessToken, displayProfile.id);
      }

      const refreshed = await webProfileApi.getProfile(session.accessToken, identifier ?? displayProfile.username);
      setProfile(refreshed);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Takip islemi tamamlanamadi.');
    }
  }

  async function handleMessageStart() {
    if (!session?.accessToken || !displayProfile || displayProfile.isOwnProfile) {
      return;
    }

    if (webDemoContentEnabled && (showDemoProfile || displayProfile.id.startsWith('demo-owner-'))) {
      const demoThread = demoMessages.threads.find((thread) =>
        thread.participants.some((participant) => participant.id === displayProfile.id),
      );
      if (demoThread) {
        router.push(`/messages?thread=${demoThread.id}`);
        return;
      }
    }

    try {
      const response = await webMessagesApi.createDirectThread(session.accessToken, {
        targetUserId: displayProfile.id,
      });
      router.push(`/messages?thread=${response.thread.id}`);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Sohbet baslatilamadi.');
    }
  }

  const profileUsername = displayProfile?.username ?? session?.user.username ?? '-';
  const profileInitial = (displayProfile?.firstName?.[0] ?? session?.user.firstName?.[0] ?? '?').toUpperCase();
  const canViewContent = displayProfile?.canViewContent ?? true;
  const isOwnProfile = displayProfile?.isOwnProfile ?? !identifier;

  return (
    <AppShell>
      <section className="profile-ig-shell vehicle-profile-shell">
        {errorMessage ? <div className="auth-message error">{errorMessage}</div> : null}
        {!isReady ? <div className="detail-card">Oturum hazirlaniyor...</div> : null}
        {session ? (
          <>
            <section className="profile-ig-top vehicle-profile-top">
              <div className="profile-ig-avatar-wrap">
                {resolveWebMediaUrl(displayProfile?.avatarUrl) ? (
                  <img
                    alt={profileUsername}
                    className="profile-ig-avatar"
                    src={resolveWebMediaUrl(displayProfile?.avatarUrl) ?? undefined}
                  />
                ) : (
                  <div className="profile-ig-avatar fallback">{profileInitial}</div>
                )}
              </div>

              <h1 className="profile-ig-username">@{profileUsername}</h1>
              {displayProfile ? <p className="profile-ig-name">{displayProfile.firstName} {displayProfile.lastName}</p> : null}

              <div className="profile-ig-stats compact-stats">
                <StatChip label="posts" value={displayProfile?.postCount ?? displayPosts.length} />
                <StatChip label="listings" value={displayProfile?.listingCount ?? displayListings.length} />
                <StatChip label="vehicles" value={displayProfile?.vehicleCount ?? displayVehicles.length} />
              </div>

              <div className="profile-ig-meta">
                {displayProfile?.bio ? <p>{displayProfile.bio}</p> : null}
                {displayProfile?.websiteUrl ? (
                  <a className="inline-link" href={displayProfile.websiteUrl} rel="noreferrer" target="_blank">
                    {displayProfile.websiteUrl}
                  </a>
                ) : null}
                {displayProfile?.locationText ? <p>{displayProfile.locationText}</p> : null}
                <p>{displayProfile?.followerCount ?? 0} takipci · {displayProfile?.followingCount ?? 0} takip edilen</p>
              </div>

              <div className="profile-ig-actions compact-actions">
                {isOwnProfile ? (
                  <>
                    <Link className="secondary-link" href="/settings">Profili duzenle</Link>
                    <Link className="secondary-link" href="/settings">Ayarlar</Link>
                  </>
                ) : (
                  <>
                    <button className="primary-link button-reset" type="button" onClick={() => void handleFollowToggle()}>
                      {displayProfile?.isFollowing ? 'Takiptesin' : 'Takip et'}
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

            {isOwnProfile && activeTab === 'vehicles' ? (
              <div className="profile-inline-toolbar">
                <strong>Arac koleksiyonun</strong>
                <Link className="secondary-link" href="/vehicles/create">+ Arac ekle</Link>
              </div>
            ) : null}

            {!canViewContent && !isOwnProfile ? (
              <div className="profile-ig-private">
                <strong>Bu hesap gizli</strong>
                <p>Takip etmeden gonderi, ilan ve araclar gorunmez.</p>
              </div>
            ) : null}

            {loading ? <div className="profile-ig-helper">Profil yukleniyor...</div> : null}

            {!loading && activeTab === 'posts' ? (
              <section className="profile-post-grid">
                {displayPosts.map((post) => (
                  <Link key={post.id} className="profile-post-tile" href={`/posts/${post.id}`}>
                    {post.thumbnailUrl ? (
                      <WebMediaView
                        alt="Post"
                        className="profile-post-media"
                        mediaType={post.mediaType}
                        uri={post.thumbnailUrl}
                      />
                    ) : (
                      <div className="profile-tile-fallback">POST</div>
                    )}
                  </Link>
                ))}
                {!displayPosts.length ? <div className="profile-ig-helper">Bu sekmede gosterilecek gonderi yok.</div> : null}
              </section>
            ) : null}

            {!loading && activeTab === 'listings' ? (
              <section className="profile-post-grid vehicle-grid">
                {displayListings.map((listing) => (
                  <Link key={listing.listingId} className="profile-post-tile" href={`/listings/${listing.listingId}`}>
                    {listing.firstMediaUrl ? (
                      <WebMediaView
                        alt={listing.title}
                        className="profile-post-media"
                        mediaType="IMAGE"
                        uri={listing.firstMediaUrl}
                      />
                    ) : (
                      <div className="profile-tile-fallback">ILAN</div>
                    )}
                    <span className="tile-overlay-copy">
                      <strong>{listing.brand} {listing.model}</strong>
                      <small>{listing.price.toLocaleString('tr-TR')} TL</small>
                    </span>
                  </Link>
                ))}
                {!displayListings.length ? <div className="profile-ig-helper">Bu sekmede gosterilecek ilan yok.</div> : null}
              </section>
            ) : null}

            {!loading && activeTab === 'vehicles' ? (
              <section className="profile-post-grid vehicle-grid">
                {isOwnProfile ? (
                  <Link className="profile-post-tile profile-add-tile" href="/vehicles/create">
                    <span className="profile-add-plus">+</span>
                    <strong>Arac ekle</strong>
                  </Link>
                ) : null}
                {displayVehicles.map((vehicle) => (
                  <Link key={vehicle.id} className="profile-post-tile" href={`/vehicles/${vehicle.id}`}>
                    {vehicle.firstMediaUrl ? (
                      <WebMediaView
                        alt={`${vehicle.brand} ${vehicle.model}`}
                        className="profile-post-media"
                        mediaType={vehicle.media[0]?.mediaType ?? 'IMAGE'}
                        uri={vehicle.firstMediaUrl}
                      />
                    ) : (
                      <div className="profile-tile-fallback">ARAC</div>
                    )}
                    <span className="tile-top-badges">
                      {vehicle.showInExplore ? <small>Kesfet</small> : null}
                      {vehicle.openToOffers ? <small>Teklife acik</small> : null}
                    </span>
                    <span className="tile-overlay-copy">
                      <strong>{vehicle.brand} {vehicle.model}</strong>
                      <small>{vehicle.package ?? vehicle.plateNumberMasked}</small>
                    </span>
                  </Link>
                ))}
                {!displayVehicles.length ? <div className="profile-ig-helper">Bu sekmede gosterilecek arac yok.</div> : null}
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

function StatChip({ label, value }: { label: string; value: number }) {
  return (
    <div className="profile-ig-stat">
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  );
}

