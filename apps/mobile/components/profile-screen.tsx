import type {
  ProfileDetailResponse,
  ProfileListingItem,
  ProfilePostGridItem,
  ProfileVehicleItem,
} from '@carloi-v4/types';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  Linking,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useAuth } from '../context/auth-context';
import { mobileMessagesApi } from '../lib/messages-api';
import { mobileProfileApi } from '../lib/profile-api';
import { mobileSocialApi } from '../lib/social-api';
import { MobileShell } from './mobile-shell';

type TabKey = 'posts' | 'listings' | 'vehicles';

export function MobileProfileScreen({ identifier }: { identifier?: string }) {
  const router = useRouter();
  const { session } = useAuth();
  const [profile, setProfile] = useState<ProfileDetailResponse | null>(null);
  const [posts, setPosts] = useState<ProfilePostGridItem[]>([]);
  const [listings, setListings] = useState<ProfileListingItem[]>([]);
  const [vehicles, setVehicles] = useState<ProfileVehicleItem[]>([]);
  const [activeTab, setActiveTab] = useState<TabKey>('posts');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [selectedVehicle, setSelectedVehicle] = useState<ProfileVehicleItem | null>(null);
  const [loading, setLoading] = useState(true);

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

  return (
    <MobileShell
      title={profile?.isOwnProfile ? 'Profilin' : `@${profile?.username ?? identifier ?? 'profil'}`}
      subtitle="Kimligini, ilanlarini, araclarini ve sosyal baglantilarini tek bir yerde yonet."
    >
      <ScrollView contentContainerStyle={styles.content}>
        {errorMessage ? <Text style={styles.error}>{errorMessage}</Text> : null}
        <View style={styles.heroCard}>
          <View style={styles.heroTop}>
            <View style={styles.avatarCircle}>
              <Text style={styles.avatarText}>
                {(profile?.firstName?.[0] ?? session?.user.firstName?.[0] ?? '?').toUpperCase()}
              </Text>
            </View>
            <View style={styles.statsRow}>
              <StatPill label="Gonderi" value={tabCounts.posts} />
              <StatPill label="Ilan" value={tabCounts.listings} />
              <StatPill label="Arac" value={tabCounts.vehicles} />
            </View>
          </View>

          <Text style={styles.nameText}>{profile ? `${profile.firstName} ${profile.lastName}` : 'Profil yukleniyor...'}</Text>
          <View style={styles.handleRow}>
            <Text style={styles.usernameText}>@{profile?.username ?? session?.user.username ?? '-'}</Text>
            {profile?.blueVerified ? <Badge label="Blue" /> : null}
            {profile?.goldVerified ? <Badge label="Gold" tone="gold" /> : null}
          </View>
          {profile?.bio ? <Text style={styles.bioText}>{profile.bio}</Text> : null}
          {profile?.locationText ? <Text style={styles.metaText}>{profile.locationText}</Text> : null}
          {profile?.websiteUrl ? (
            <Pressable onPress={() => void Linking.openURL(profile.websiteUrl!)}>
              <Text style={styles.linkText}>{profile.websiteUrl}</Text>
            </Pressable>
          ) : null}
          <Text style={styles.metaText}>
            {profile?.followerCount ?? 0} takipci � {profile?.followingCount ?? 0} takip edilen
          </Text>
          {profile?.mutualFollowers.length ? (
            <Text style={styles.metaText}>
              Ortak baglanti: {profile.mutualFollowers.map((item) => `@${item.username}`).join(', ')}
            </Text>
          ) : null}

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
                  <Text style={styles.primaryButtonLabel}>
                    {profile?.isFollowing ? 'Takip ediliyor' : 'Takip et'}
                  </Text>
                </Pressable>
                <Pressable style={styles.secondaryButton} onPress={() => void handleMessageStart()}>
                  <Text style={styles.secondaryButtonLabel}>Mesaj</Text>
                </Pressable>
              </>
            )}
          </View>

          {!profile?.canViewContent && !profile?.isOwnProfile ? (
            <View style={styles.privateNotice}>
              <Text style={styles.privateNoticeTitle}>Bu hesap gizli</Text>
              <Text style={styles.privateNoticeCopy}>Takip etmeden gonderi, ilan ve arac detaylari gosterilmez.</Text>
            </View>
          ) : null}
        </View>

        <View style={styles.tabsRow}>
          <TabButton label="Gonderiler" active={activeTab === 'posts'} onPress={() => setActiveTab('posts')} />
          <TabButton label="Ilanlar" active={activeTab === 'listings'} onPress={() => setActiveTab('listings')} />
          <TabButton label="Araclar" active={activeTab === 'vehicles'} onPress={() => setActiveTab('vehicles')} />
        </View>

        {loading ? <Text style={styles.metaText}>Profil verileri yukleniyor...</Text> : null}
        {!loading && activeTab === 'posts' ? (
          <View style={styles.grid}>
            {posts.map((post) => (
              <Pressable key={post.id} style={styles.gridCard} onPress={() => router.push(`/posts/${post.id}`)}>
                <Text style={styles.gridUrl} numberOfLines={3}>{post.thumbnailUrl ?? 'Medya yok'}</Text>
                <Text style={styles.gridMeta}>{post.likeCount} begeni � {post.commentCount} yorum</Text>
              </Pressable>
            ))}
            {!posts.length ? <EmptyState text="Bu sekmede gosterilecek gonderi yok." /> : null}
          </View>
        ) : null}

        {!loading && activeTab === 'listings' ? (
          <View style={styles.stack}>
            {listings.map((listing) => (
              <Pressable key={listing.listingId} style={styles.card} onPress={() => router.push(`/listings/${listing.listingId}`)}>
                <Text style={styles.cardTitle}>{listing.title}</Text>
                <Text style={styles.metaText}>{[listing.brand, listing.model, listing.package].filter(Boolean).join(' � ')}</Text>
                <Text style={styles.metaText}>{listing.city}{listing.district ? ` / ${listing.district}` : ''}</Text>
                <Text style={styles.priceText}>{listing.price.toLocaleString('tr-TR')} {listing.sellerType}</Text>
              </Pressable>
            ))}
            {!listings.length ? <EmptyState text="Bu sekmede gosterilecek ilan yok." /> : null}
          </View>
        ) : null}

        {!loading && activeTab === 'vehicles' ? (
          <View style={styles.stack}>
            {vehicles.map((vehicle) => (
              <Pressable key={vehicle.id} style={styles.card} onPress={() => setSelectedVehicle(vehicle)}>
                <Text style={styles.cardTitle}>{vehicle.brand} {vehicle.model}</Text>
                <Text style={styles.metaText}>{vehicle.package ?? 'Paket bilgisi yok'}</Text>
                <Text style={styles.metaText}>{vehicle.year} � {vehicle.km.toLocaleString('tr-TR')} km � {vehicle.plateNumberMasked}</Text>
              </Pressable>
            ))}
            {!vehicles.length ? <EmptyState text="Bu sekmede gosterilecek arac yok." /> : null}
          </View>
        ) : null}
      </ScrollView>

      <Modal visible={Boolean(selectedVehicle)} animationType="slide" transparent onRequestClose={() => setSelectedVehicle(null)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.cardTitle}>{selectedVehicle?.brand} {selectedVehicle?.model}</Text>
            <Text style={styles.metaText}>{selectedVehicle?.package ?? 'Paket bilgisi yok'}</Text>
            <Text style={styles.metaText}>{selectedVehicle?.year} � {selectedVehicle?.km.toLocaleString('tr-TR')} km</Text>
            <Text style={styles.metaText}>{selectedVehicle?.fuelType} � {selectedVehicle?.transmissionType}</Text>
            <Text style={styles.metaText}>Plaka: {selectedVehicle?.plateNumberMasked}</Text>
            {selectedVehicle?.latestObdReport ? (
              <Text style={styles.metaText}>Carloi Expertiz skoru: {selectedVehicle.latestObdReport.overallScore ?? '-'} / 100</Text>
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

function StatPill({ label, value }: { label: string; value: number }) {
  return (
    <View style={styles.statPill}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function Badge({ label, tone = 'blue' }: { label: string; tone?: 'blue' | 'gold' }) {
  return (
    <View style={[styles.badge, tone === 'gold' ? styles.badgeGold : null]}>
      <Text style={styles.badgeText}>{label}</Text>
    </View>
  );
}

function TabButton({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable style={[styles.tabButton, active ? styles.tabButtonActive : null]} onPress={onPress}>
      <Text style={[styles.tabButtonLabel, active ? styles.tabButtonLabelActive : null]}>{label}</Text>
    </Pressable>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <View style={styles.emptyState}>
      <Text style={styles.metaText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: 14,
    paddingBottom: 18,
  },
  heroCard: {
    gap: 10,
    padding: 20,
    borderRadius: 28,
    backgroundColor: '#0d1d2a',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  heroTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  avatarCircle: {
    width: 78,
    height: 78,
    borderRadius: 39,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ef8354',
  },
  avatarText: {
    color: '#08131d',
    fontSize: 28,
    fontWeight: '900',
  },
  statsRow: {
    flex: 1,
    flexDirection: 'row',
    gap: 10,
  },
  statPill: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 18,
    backgroundColor: '#102030',
    alignItems: 'center',
    gap: 2,
  },
  statValue: {
    color: '#f8f2ea',
    fontWeight: '900',
    fontSize: 18,
  },
  statLabel: {
    color: '#8fa4b5',
    fontSize: 11,
    fontWeight: '700',
  },
  nameText: {
    color: '#f8f2ea',
    fontSize: 24,
    fontWeight: '900',
  },
  handleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  usernameText: {
    color: '#ffd6c2',
    fontWeight: '800',
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: 'rgba(92,180,255,0.16)',
  },
  badgeGold: {
    backgroundColor: 'rgba(255,210,122,0.18)',
  },
  badgeText: {
    color: '#f8f2ea',
    fontSize: 11,
    fontWeight: '800',
  },
  bioText: {
    color: '#dce7ef',
    lineHeight: 21,
  },
  metaText: {
    color: '#9fb0be',
    lineHeight: 20,
  },
  linkText: {
    color: '#8fd7ff',
    textDecorationLine: 'underline',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  primaryButton: {
    flex: 1,
    alignItems: 'center',
    borderRadius: 18,
    paddingVertical: 13,
    backgroundColor: '#ef8354',
  },
  primaryButtonLabel: {
    color: '#08131d',
    fontWeight: '900',
  },
  secondaryButton: {
    flex: 1,
    alignItems: 'center',
    borderRadius: 18,
    paddingVertical: 13,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    backgroundColor: '#102030',
  },
  secondaryButtonLabel: {
    color: '#f8f2ea',
    fontWeight: '800',
  },
  privateNotice: {
    marginTop: 4,
    gap: 6,
    borderRadius: 18,
    padding: 14,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  privateNoticeTitle: {
    color: '#f8f2ea',
    fontWeight: '800',
  },
  privateNoticeCopy: {
    color: '#9fb0be',
    lineHeight: 20,
  },
  tabsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    borderRadius: 18,
    paddingVertical: 12,
    backgroundColor: '#102030',
  },
  tabButtonActive: {
    backgroundColor: '#ef8354',
  },
  tabButtonLabel: {
    color: '#9fb0be',
    fontWeight: '800',
  },
  tabButtonLabelActive: {
    color: '#08131d',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  gridCard: {
    width: '31%',
    minHeight: 120,
    borderRadius: 20,
    padding: 12,
    backgroundColor: '#102030',
    justifyContent: 'space-between',
  },
  gridUrl: {
    color: '#f8f2ea',
    fontSize: 11,
    lineHeight: 16,
  },
  gridMeta: {
    color: '#8fa4b5',
    fontSize: 10,
  },
  stack: {
    gap: 10,
  },
  card: {
    gap: 6,
    padding: 16,
    borderRadius: 22,
    backgroundColor: '#102030',
  },
  cardTitle: {
    color: '#f8f2ea',
    fontSize: 17,
    fontWeight: '800',
  },
  priceText: {
    color: '#ffd6c2',
    fontWeight: '800',
  },
  emptyState: {
    padding: 22,
    borderRadius: 22,
    backgroundColor: '#102030',
  },
  error: {
    color: '#ffb4b4',
  },
  modalBackdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  modalCard: {
    gap: 10,
    padding: 22,
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    backgroundColor: '#0d1d2a',
  },
});
