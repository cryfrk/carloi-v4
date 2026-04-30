import type {
  ProfileDetailResponse,
  ProfileListingItem,
  ProfilePostGridItem,
  ProfileVehicleItem,
} from '@carloi-v4/types';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  Image,
  Linking,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { useAuth } from '../context/auth-context';
import { mobileMessagesApi } from '../lib/messages-api';
import { mobileProfileApi } from '../lib/profile-api';
import { mobileSocialApi } from '../lib/social-api';
import { MobileShell } from './mobile-shell';

type TabKey = 'posts' | 'listings' | 'vehicles';

export function MobileProfileScreen({ identifier }: { identifier?: string }) {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const { session } = useAuth();
  const [profile, setProfile] = useState<ProfileDetailResponse | null>(null);
  const [posts, setPosts] = useState<ProfilePostGridItem[]>([]);
  const [listings, setListings] = useState<ProfileListingItem[]>([]);
  const [vehicles, setVehicles] = useState<ProfileVehicleItem[]>([]);
  const [activeTab, setActiveTab] = useState<TabKey>('posts');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [selectedVehicle, setSelectedVehicle] = useState<ProfileVehicleItem | null>(null);
  const [loading, setLoading] = useState(true);

  const postTileSize = useMemo(() => Math.floor((width - 32) / 3), [width]);
  const visualTileWidth = useMemo(() => Math.floor((width - 42) / 2), [width]);
  const profileKey = identifier ?? 'me';

  useEffect(() => {
    if (!session?.accessToken) {
      return;
    }

    setLoading(true);
    setErrorMessage(null);

    const profilePromise = identifier
      ? mobileProfileApi.getProfile(session.accessToken, identifier)
      : mobileProfileApi.getMyProfile(session.accessToken);
    const tabIdentifier = identifier ?? session.user.username;

    void Promise.all([
      profilePromise,
      mobileProfileApi.getProfilePosts(session.accessToken, tabIdentifier),
      mobileProfileApi.getProfileListings(session.accessToken, tabIdentifier),
      mobileProfileApi.getProfileVehicles(session.accessToken, tabIdentifier),
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
  }, [identifier, profileKey, session?.accessToken, session?.user.username]);

  const tabCounts = useMemo(
    () => ({
      posts: profile?.postCount ?? posts.length,
      listings: profile?.listingCount ?? listings.length,
      vehicles: profile?.vehicleCount ?? vehicles.length,
    }),
    [listings.length, posts.length, profile?.listingCount, profile?.postCount, profile?.vehicleCount, vehicles.length],
  );

  async function handleFollowToggle() {
    if (!session?.accessToken || !profile || profile.isOwnProfile) {
      return;
    }

    try {
      if (profile.isFollowing) {
        await mobileSocialApi.unfollowUser(session.accessToken, profile.id);
      } else {
        await mobileSocialApi.followUser(session.accessToken, profile.id);
      }

      const refreshed = await mobileProfileApi.getProfile(session.accessToken, identifier ?? profile.username);
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
      const response = await mobileMessagesApi.createDirectThread(session.accessToken, {
        targetUserId: profile.id,
      });
      router.push(`/messages/${response.thread.id}`);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Sohbet baslatilamadi.');
    }
  }

  const profileUsername = profile?.username ?? session?.user.username ?? '-';
  const displayInitial = (profile?.firstName?.[0] ?? session?.user.firstName?.[0] ?? '?').toUpperCase();
  const canViewContent = profile?.canViewContent ?? true;

  return (
    <MobileShell
      title={profile?.isOwnProfile ? 'Profil' : `@${profileUsername}`}
      subtitle="Gonderiler, ilanlar ve araclar ayni profil akisi icinde toplanir."
    >
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        {errorMessage ? <Text style={styles.error}>{errorMessage}</Text> : null}

        <View style={styles.topSection}>
          <View style={styles.avatarShell}>
            {profile?.avatarUrl ? (
              <Image source={{ uri: profile.avatarUrl }} style={styles.avatarImage} />
            ) : (
              <Text style={styles.avatarText}>{displayInitial}</Text>
            )}
          </View>

          <Text style={styles.username}>@{profileUsername}</Text>
          {profile ? <Text style={styles.nameText}>{profile.firstName} {profile.lastName}</Text> : null}

          <View style={styles.statsRow}>
            <StatItem label="posts" value={tabCounts.posts} />
            <Text style={styles.statsDivider}>|</Text>
            <StatItem label="listings" value={tabCounts.listings} />
            <Text style={styles.statsDivider}>|</Text>
            <StatItem label="vehicles" value={tabCounts.vehicles} />
          </View>

          <View style={styles.metaStack}>
            {profile?.bio ? <Text style={styles.bioText}>{profile.bio}</Text> : null}
            {profile?.websiteUrl ? (
              <Pressable onPress={() => void Linking.openURL(profile.websiteUrl!)}>
                <Text style={styles.linkText}>{profile.websiteUrl}</Text>
              </Pressable>
            ) : null}
            {profile?.locationText ? <Text style={styles.metaText}>{profile.locationText}</Text> : null}
            <Text style={styles.metaText}>
              {profile?.followerCount ?? 0} takipci · {profile?.followingCount ?? 0} takip edilen
            </Text>
          </View>

          <View style={styles.actionRow}>
            {profile?.isOwnProfile ? (
              <>
                <Pressable style={styles.secondaryButton} onPress={() => router.push('/settings')}>
                  <Text style={styles.secondaryButtonLabel}>Profili duzenle</Text>
                </Pressable>
                <Pressable style={styles.secondaryButton} onPress={() => router.push('/settings')}>
                  <Text style={styles.secondaryButtonLabel}>Ayarlar</Text>
                </Pressable>
              </>
            ) : (
              <>
                <Pressable style={styles.primaryButton} onPress={() => void handleFollowToggle()}>
                  <Text style={styles.primaryButtonLabel}>{profile?.isFollowing ? 'Takiptesin' : 'Takip et'}</Text>
                </Pressable>
                <Pressable style={styles.secondaryButton} onPress={() => void handleMessageStart()}>
                  <Text style={styles.secondaryButtonLabel}>Mesaj</Text>
                </Pressable>
              </>
            )}
          </View>
        </View>

        <View style={styles.tabsRow}>
          <TabButton label="Gonderiler" active={activeTab === 'posts'} onPress={() => setActiveTab('posts')} />
          <TabButton label="Ilanlar" active={activeTab === 'listings'} onPress={() => setActiveTab('listings')} />
          <TabButton label="Araclar" active={activeTab === 'vehicles'} onPress={() => setActiveTab('vehicles')} />
        </View>

        {!canViewContent && !profile?.isOwnProfile ? (
          <View style={styles.privateNotice}>
            <Text style={styles.privateTitle}>Bu hesap gizli</Text>
            <Text style={styles.privateCopy}>Takip etmeden gonderi, ilan ve araclar gorunmez.</Text>
          </View>
        ) : null}

        {loading ? <Text style={styles.helperText}>Profil yukleniyor...</Text> : null}

        {!loading && activeTab === 'posts' ? (
          <View style={styles.postsGrid}>
            {posts.map((post) => (
              <Pressable
                key={post.id}
                style={[styles.postTile, { width: postTileSize, height: postTileSize }]}
                onPress={() => router.push(`/posts/${post.id}`)}
              >
                {post.thumbnailUrl ? (
                  <Image source={{ uri: post.thumbnailUrl }} style={styles.tileImage} />
                ) : (
                  <View style={styles.tileFallback}>
                    <Text style={styles.tileFallbackLabel}>POST</Text>
                  </View>
                )}
              </Pressable>
            ))}
            {!posts.length ? <EmptyState text="Bu sekmede gosterilecek gonderi yok." /> : null}
          </View>
        ) : null}

        {!loading && activeTab === 'listings' ? (
          <View style={styles.visualGrid}>
            {listings.map((listing) => (
              <Pressable
                key={listing.listingId}
                style={[styles.visualTile, { width: visualTileWidth }]}
                onPress={() => router.push(`/listings/${listing.listingId}`)}
              >
                <View style={styles.visualMedia}>
                  {listing.firstMediaUrl ? (
                    <Image source={{ uri: listing.firstMediaUrl }} style={styles.tileImage} />
                  ) : (
                    <View style={styles.tileFallback}>
                      <Text style={styles.tileFallbackLabel}>ILAN</Text>
                    </View>
                  )}
                </View>
                <Text numberOfLines={1} style={styles.visualTitle}>{listing.title}</Text>
                <Text numberOfLines={1} style={styles.visualMeta}>
                  {[listing.brand, listing.model, listing.package].filter(Boolean).join(' · ')}
                </Text>
              </Pressable>
            ))}
            {!listings.length ? <EmptyState text="Bu sekmede gosterilecek ilan yok." /> : null}
          </View>
        ) : null}

        {!loading && activeTab === 'vehicles' ? (
          <View style={styles.visualGrid}>
            {vehicles.map((vehicle) => (
              <Pressable
                key={vehicle.id}
                style={[styles.visualTile, { width: visualTileWidth }]}
                onPress={() => setSelectedVehicle(vehicle)}
              >
                <View style={styles.visualMedia}>
                  {vehicle.firstMediaUrl ? (
                    <Image source={{ uri: vehicle.firstMediaUrl }} style={styles.tileImage} />
                  ) : (
                    <View style={styles.tileFallback}>
                      <Text style={styles.tileFallbackLabel}>ARAC</Text>
                    </View>
                  )}
                </View>
                <Text numberOfLines={1} style={styles.visualTitle}>{vehicle.brand} {vehicle.model}</Text>
                <Text numberOfLines={1} style={styles.visualMeta}>{vehicle.package ?? vehicle.plateNumberMasked}</Text>
              </Pressable>
            ))}
            {!vehicles.length ? <EmptyState text="Bu sekmede gosterilecek arac yok." /> : null}
          </View>
        ) : null}
      </ScrollView>

      <Modal visible={Boolean(selectedVehicle)} animationType="slide" transparent onRequestClose={() => setSelectedVehicle(null)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{selectedVehicle?.brand} {selectedVehicle?.model}</Text>
            <Text style={styles.modalMeta}>{selectedVehicle?.package ?? 'Paket bilgisi yok'}</Text>
            <Text style={styles.modalMeta}>{selectedVehicle?.year} · {selectedVehicle?.km.toLocaleString('tr-TR')} km</Text>
            <Text style={styles.modalMeta}>{selectedVehicle?.fuelType} · {selectedVehicle?.transmissionType}</Text>
            <Text style={styles.modalMeta}>Plaka: {selectedVehicle?.plateNumberMasked}</Text>
            {selectedVehicle?.latestObdReport ? (
              <Text style={styles.modalMeta}>Expertiz skoru: {selectedVehicle.latestObdReport.overallScore ?? '-'} / 100</Text>
            ) : null}
            <Pressable style={styles.primaryButton} onPress={() => setSelectedVehicle(null)}>
              <Text style={styles.primaryButtonLabel}>Kapat</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </MobileShell>
  );
}

function StatItem({ label, value }: { label: string; value: number }) {
  return (
    <View style={styles.statItem}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function TabButton({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable style={styles.tabButton} onPress={onPress}>
      <Text style={[styles.tabLabel, active ? styles.tabLabelActive : null]}>{label}</Text>
      <View style={[styles.tabUnderline, active ? styles.tabUnderlineActive : null]} />
    </Pressable>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <View style={styles.emptyState}>
      <Text style={styles.helperText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  content: {
    paddingBottom: 24,
    backgroundColor: '#ffffff',
  },
  topSection: {
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 18,
    paddingTop: 8,
    paddingBottom: 16,
  },
  avatarShell: {
    width: 88,
    height: 88,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#111111',
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarText: {
    color: '#ffffff',
    fontSize: 30,
    fontWeight: '800',
  },
  username: {
    color: '#111111',
    fontSize: 18,
    fontWeight: '700',
  },
  nameText: {
    color: '#4b5563',
    fontSize: 13,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingTop: 2,
  },
  statsDivider: {
    color: '#c6cbd4',
    fontSize: 12,
    fontWeight: '600',
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  statValue: {
    color: '#111111',
    fontSize: 16,
    fontWeight: '700',
  },
  statLabel: {
    color: '#6b7280',
    fontSize: 12,
  },
  metaStack: {
    alignItems: 'center',
    gap: 4,
    maxWidth: 320,
  },
  bioText: {
    color: '#111111',
    textAlign: 'center',
    lineHeight: 19,
  },
  metaText: {
    color: '#6b7280',
    textAlign: 'center',
  },
  linkText: {
    color: '#2563eb',
    textDecorationLine: 'underline',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 8,
    width: '100%',
    marginTop: 2,
  },
  primaryButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 40,
    borderRadius: 12,
    backgroundColor: '#111111',
  },
  primaryButtonLabel: {
    color: '#ffffff',
    fontWeight: '700',
  },
  secondaryButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 40,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#d1d5db',
    backgroundColor: '#ffffff',
  },
  secondaryButtonLabel: {
    color: '#111111',
    fontWeight: '700',
  },
  tabsRow: {
    flexDirection: 'row',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#eceff3',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#eceff3',
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    gap: 8,
    paddingVertical: 11,
  },
  tabLabel: {
    color: '#6b7280',
    fontSize: 13,
    fontWeight: '600',
  },
  tabLabelActive: {
    color: '#111111',
    fontWeight: '700',
  },
  tabUnderline: {
    width: 28,
    height: 2,
    borderRadius: 999,
    backgroundColor: 'transparent',
  },
  tabUnderlineActive: {
    backgroundColor: '#111111',
  },
  privateNotice: {
    marginHorizontal: 18,
    marginTop: 16,
    borderRadius: 14,
    padding: 16,
    backgroundColor: '#f5f7fa',
  },
  privateTitle: {
    color: '#111111',
    fontWeight: '700',
    marginBottom: 6,
  },
  privateCopy: {
    color: '#6b7280',
    lineHeight: 20,
  },
  helperText: {
    color: '#6b7280',
    textAlign: 'center',
    paddingVertical: 24,
  },
  postsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 2,
    paddingTop: 2,
  },
  postTile: {
    backgroundColor: '#eef1f4',
    overflow: 'hidden',
  },
  tileImage: {
    width: '100%',
    height: '100%',
  },
  tileFallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#eef1f4',
  },
  tileFallbackLabel: {
    color: '#9aa3af',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.1,
  },
  visualGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingHorizontal: 14,
    paddingTop: 14,
  },
  visualTile: {
    gap: 8,
  },
  visualMedia: {
    aspectRatio: 1,
    overflow: 'hidden',
    borderRadius: 12,
    backgroundColor: '#eef1f4',
  },
  visualTitle: {
    color: '#111111',
    fontSize: 13,
    fontWeight: '700',
  },
  visualMeta: {
    color: '#6b7280',
    fontSize: 12,
  },
  emptyState: {
    width: '100%',
    paddingVertical: 32,
  },
  error: {
    color: '#dc2626',
    textAlign: 'center',
    paddingHorizontal: 18,
    paddingBottom: 10,
  },
  modalBackdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(15,23,42,0.2)',
  },
  modalCard: {
    gap: 10,
    padding: 20,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    backgroundColor: '#ffffff',
  },
  modalTitle: {
    color: '#111111',
    fontSize: 20,
    fontWeight: '700',
  },
  modalMeta: {
    color: '#4b5563',
    lineHeight: 20,
  },
});
