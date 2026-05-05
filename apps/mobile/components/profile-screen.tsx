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
import { buildDemoMessageFixtures, buildDemoProfileFixtures } from '../lib/demo-content';
import { mobileDemoContentEnabled } from '../lib/demo-runtime';
import { mobileMessagesApi } from '../lib/messages-api';
import { mobileProfileApi } from '../lib/profile-api';
import { mobileSocialApi } from '../lib/social-api';
import { MobileShell } from './mobile-shell';
import { MobileMediaView } from './mobile-media-view';

type TabKey = 'posts' | 'listings' | 'vehicles';
type ConnectionsTab = 'followers' | 'following' | null;

export function MobileProfileScreen({
  identifier,
  initialTab,
}: {
  identifier?: string;
  initialTab?: TabKey;
}) {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const { session } = useAuth();
  const defaultTab = initialTab ?? (identifier ? 'posts' : 'vehicles');
  const [profile, setProfile] = useState<ProfileDetailResponse | null>(null);
  const [posts, setPosts] = useState<ProfilePostGridItem[]>([]);
  const [listings, setListings] = useState<ProfileListingItem[]>([]);
  const [vehicles, setVehicles] = useState<ProfileVehicleItem[]>([]);
  const [activeTab, setActiveTab] = useState<TabKey>(defaultTab);
  const [connectionsOpen, setConnectionsOpen] = useState<ConnectionsTab>(null);
  const [connectionsLoading, setConnectionsLoading] = useState(false);
  const [connections, setConnections] = useState<{
    followers: Array<{ id: string; username: string; fullName: string; avatarUrl: string | null; isPrivate: boolean }>;
    following: Array<{ id: string; username: string; fullName: string; avatarUrl: string | null; isPrivate: boolean }>;
  }>({ followers: [], following: [] });
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

  const tileSize = useMemo(() => Math.floor((width - 4) / 3), [width]);
  const profileKey = identifier ?? 'me';
  const showDemoProfile =
    mobileDemoContentEnabled &&
    !loading &&
    (!profile || (posts.length === 0 && listings.length === 0 && vehicles.length === 0));
  const displayProfile = showDemoProfile ? demoProfile.profile : profile;
  const displayPosts = showDemoProfile ? demoProfile.posts : posts;
  const displayListings = showDemoProfile ? demoProfile.listings : listings;
  const displayVehicles = showDemoProfile ? demoProfile.vehicles : vehicles;

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

  async function handleFollowToggle() {
    if (!session?.accessToken || !displayProfile || displayProfile.isOwnProfile) {
      return;
    }

    if (mobileDemoContentEnabled && (showDemoProfile || displayProfile.id.startsWith('demo-owner-'))) {
      setErrorMessage('Bu demo profil Carloi akisinin nasil gorunecegini gostermek icin hazirlandi.');
      return;
    }

    try {
      if (displayProfile.isFollowing) {
        await mobileSocialApi.unfollowUser(session.accessToken, displayProfile.id);
      } else {
        await mobileSocialApi.followUser(session.accessToken, displayProfile.id);
      }

      const refreshed = await mobileProfileApi.getProfile(session.accessToken, identifier ?? displayProfile.username);
      setProfile(refreshed);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Takip islemi tamamlanamadi.');
    }
  }

  async function handleMessageStart() {
    if (!session?.accessToken || !displayProfile || displayProfile.isOwnProfile) {
      return;
    }

    if (mobileDemoContentEnabled && (showDemoProfile || displayProfile.id.startsWith('demo-owner-'))) {
      const demoThread = demoMessages.threads.find((thread) =>
        thread.participants.some((participant) => participant.id === displayProfile.id),
      );
      if (demoThread) {
        router.push(`/messages/${demoThread.id}`);
        return;
      }
    }

    try {
      const response = await mobileMessagesApi.createDirectThread(session.accessToken, {
        targetUserId: displayProfile.id,
      });
      router.push(`/messages/${response.thread.id}`);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Sohbet baslatilamadi.');
    }
  }

  const profileUsername = displayProfile?.username ?? session?.user.username ?? '-';
  const displayInitial = (displayProfile?.firstName?.[0] ?? session?.user.firstName?.[0] ?? '?').toUpperCase();
  const canViewContent = displayProfile?.canViewContent ?? true;
  const isOwnProfile = displayProfile?.isOwnProfile ?? !identifier;

  async function openConnectionsSheet(type: Exclude<ConnectionsTab, null>) {
    if (!session?.accessToken || !displayProfile) {
      return;
    }

    setConnectionsOpen(type);

    if (connections[type].length > 0) {
      return;
    }

    try {
      setConnectionsLoading(true);
      const response =
        type === 'followers'
          ? await mobileProfileApi.getProfileFollowers(session.accessToken, displayProfile.username)
          : await mobileProfileApi.getProfileFollowing(session.accessToken, displayProfile.username);

      setConnections((current) => ({
        ...current,
        [type]: response.items,
      }));
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Kullanici listesi getirilemedi.');
    } finally {
      setConnectionsLoading(false);
    }
  }

  return (
    <MobileShell
      title={isOwnProfile ? 'Profil' : `@${profileUsername}`}
      subtitle="Gonderiler, ilanlar ve araclar tek profil akisi icinde yasiyor."
    >
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        {errorMessage ? <Text style={styles.error}>{errorMessage}</Text> : null}

        <View style={styles.topSection}>
          <Pressable style={styles.avatarShell} onPress={() => (isOwnProfile ? router.push('/settings') : undefined)}>
            {displayProfile?.avatarUrl ? (
              <Image source={{ uri: displayProfile.avatarUrl }} style={styles.avatarImage} />
            ) : (
              <Text style={styles.avatarText}>{displayInitial}</Text>
            )}
          </Pressable>

          <Text style={styles.username}>@{profileUsername}</Text>
          {displayProfile ? <Text style={styles.nameText}>{displayProfile.firstName} {displayProfile.lastName}</Text> : null}

          <View style={styles.statsRow}>
            <StatItem label="posts" value={displayProfile?.postCount ?? displayPosts.length} />
            <Text style={styles.statsDivider}>|</Text>
            <StatItem label="listings" value={displayProfile?.listingCount ?? displayListings.length} />
            <Text style={styles.statsDivider}>|</Text>
            <StatItem label="vehicles" value={displayProfile?.vehicleCount ?? displayVehicles.length} />
          </View>

          <View style={styles.metaStack}>
            {displayProfile?.bio ? <Text style={styles.bioText}>{displayProfile.bio}</Text> : null}
            {displayProfile?.websiteUrl ? (
              <Pressable onPress={() => void Linking.openURL(displayProfile.websiteUrl!)}>
                <Text style={styles.linkText}>{displayProfile.websiteUrl}</Text>
              </Pressable>
            ) : null}
            {displayProfile?.locationText ? <Text style={styles.metaText}>{displayProfile.locationText}</Text> : null}
            <View style={styles.connectionRow}>
              <Pressable onPress={() => void openConnectionsSheet('followers')}>
                <Text style={styles.metaText}>{displayProfile?.followerCount ?? 0} takipci</Text>
              </Pressable>
              <Text style={styles.metaSeparator}>·</Text>
              <Pressable onPress={() => void openConnectionsSheet('following')}>
                <Text style={styles.metaText}>{displayProfile?.followingCount ?? 0} takip edilen</Text>
              </Pressable>
            </View>
          </View>

          <View style={styles.actionRow}>
            {isOwnProfile ? (
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
                  <Text style={styles.primaryButtonLabel}>{displayProfile?.isFollowing ? 'Takiptesin' : 'Takip et'}</Text>
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

        {isOwnProfile && activeTab === 'vehicles' ? (
          <View style={styles.inlineToolbar}>
            <Text style={styles.inlineToolbarTitle}>Arac koleksiyonun</Text>
            <Pressable style={styles.inlineAction} onPress={() => router.push('/vehicles/create')}>
              <Text style={styles.inlineActionLabel}>+ Arac ekle</Text>
            </Pressable>
          </View>
        ) : null}

        {!canViewContent && !isOwnProfile ? (
          <View style={styles.privateNotice}>
            <Text style={styles.privateTitle}>Bu hesap gizli</Text>
            <Text style={styles.privateCopy}>Takip etmeden gonderi, ilan ve araclar gorunmez.</Text>
          </View>
        ) : null}

        {loading ? <Text style={styles.helperText}>Profil yukleniyor...</Text> : null}

        {!loading && activeTab === 'posts' ? (
          <View style={styles.gridWrap}>
            {displayPosts.map((post) => (
              <Pressable
                key={post.id}
                style={[styles.squareTile, { width: tileSize, height: tileSize }]}
                onPress={() => router.push(`/posts/${post.id}`)}
              >
                {post.thumbnailUrl ? (
                  <MobileMediaView mediaType={post.mediaType} style={styles.tileImage} uri={post.thumbnailUrl} />
                ) : (
                  <View style={styles.tileFallback}>
                    <Text style={styles.tileFallbackLabel}>POST</Text>
                  </View>
                )}
              </Pressable>
            ))}
            {!displayPosts.length ? <EmptyState text="Bu sekmede gosterilecek gonderi yok." /> : null}
          </View>
        ) : null}

        {!loading && activeTab === 'listings' ? (
          <View style={styles.gridWrap}>
            {displayListings.map((listing) => (
              <Pressable
                key={listing.listingId}
                style={[styles.squareTile, { width: tileSize, height: tileSize }]}
                onPress={() => router.push(`/listings/${listing.listingId}`)}
              >
                {listing.firstMediaUrl ? (
                  <MobileMediaView mediaType={'IMAGE'} style={styles.tileImage} uri={listing.firstMediaUrl} />
                ) : (
                  <View style={styles.tileFallback}>
                    <Text style={styles.tileFallbackLabel}>ILAN</Text>
                  </View>
                )}
                <View style={styles.tileCaption}>
                  <Text numberOfLines={1} style={styles.tileTitle}>{listing.brand} {listing.model}</Text>
                  <Text numberOfLines={1} style={styles.tileMeta}>{listing.price.toLocaleString('tr-TR')} TL</Text>
                </View>
              </Pressable>
            ))}
            {!displayListings.length ? <EmptyState text="Bu sekmede gosterilecek ilan yok." /> : null}
          </View>
        ) : null}

        {!loading && activeTab === 'vehicles' ? (
          <View style={styles.gridWrap}>
            {isOwnProfile ? (
              <Pressable
                style={[styles.squareTile, styles.addTile, { width: tileSize, height: tileSize }]}
                onPress={() => router.push('/vehicles/create')}
              >
                <Text style={styles.addTilePlus}>+</Text>
                <Text style={styles.addTileLabel}>Arac ekle</Text>
              </Pressable>
            ) : null}
            {displayVehicles.map((vehicle) => (
              <Pressable
                key={vehicle.id}
                style={[styles.squareTile, { width: tileSize, height: tileSize }]}
                onPress={() => router.push(`/vehicles/${vehicle.id}`)}
              >
                {vehicle.firstMediaUrl ? (
                  <MobileMediaView mediaType={vehicle.media[0]?.mediaType ?? 'IMAGE'} style={styles.tileImage} uri={vehicle.firstMediaUrl} />
                ) : (
                  <View style={styles.tileFallback}>
                    <Text style={styles.tileFallbackLabel}>ARAC</Text>
                  </View>
                )}
                <View style={styles.tileCaption}>
                  <Text numberOfLines={1} style={styles.tileTitle}>{vehicle.brand} {vehicle.model}</Text>
                  <Text numberOfLines={1} style={styles.tileMeta}>{vehicle.package ?? vehicle.plateNumberMasked}</Text>
                </View>
                <View style={styles.tileBadgeRail}>
                  {vehicle.showInExplore ? <View style={styles.tileBadge}><Text style={styles.tileBadgeLabel}>Kesfet</Text></View> : null}
                  {vehicle.openToOffers ? <View style={styles.tileBadge}><Text style={styles.tileBadgeLabel}>Teklife acik</Text></View> : null}
                </View>
              </Pressable>
            ))}
            {!displayVehicles.length ? <EmptyState text="Bu sekmede gosterilecek arac yok." /> : null}
          </View>
        ) : null}
      </ScrollView>
      <Modal
        animationType="slide"
        onRequestClose={() => setConnectionsOpen(null)}
        transparent
        visible={Boolean(connectionsOpen)}
      >
        <View style={styles.connectionsBackdrop}>
          <Pressable style={StyleSheet.absoluteFillObject} onPress={() => setConnectionsOpen(null)} />
          <View style={styles.connectionsSheet}>
            <View style={styles.connectionsHandle} />
            <Text style={styles.connectionsTitle}>
              {connectionsOpen === 'followers' ? 'Takipciler' : 'Takip edilenler'}
            </Text>
            {connectionsLoading ? <Text style={styles.helperText}>Liste yukleniyor...</Text> : null}
            <ScrollView contentContainerStyle={styles.connectionsList}>
              {(connectionsOpen ? connections[connectionsOpen] : []).map((item) => (
                <Pressable
                  key={item.id}
                  onPress={() => {
                    setConnectionsOpen(null);
                    router.push(`/profile/${item.username}` as never);
                  }}
                  style={styles.connectionItem}
                >
                  <View style={styles.connectionAvatar}>
                    {item.avatarUrl ? (
                      <Image source={{ uri: item.avatarUrl }} style={styles.connectionAvatarImage} />
                    ) : (
                      <Text style={styles.connectionAvatarLabel}>{item.username.slice(0, 1).toUpperCase()}</Text>
                    )}
                  </View>
                  <View style={styles.connectionCopy}>
                    <Text style={styles.connectionUsername}>@{item.username}</Text>
                    <Text style={styles.connectionFullName}>{item.fullName}{item.isPrivate ? ' · Gizli' : ''}</Text>
                  </View>
                </Pressable>
              ))}
              {!connectionsLoading && connectionsOpen && connections[connectionsOpen].length === 0 ? (
                <Text style={styles.helperText}>Bu listede gosterilecek kullanici yok.</Text>
              ) : null}
            </ScrollView>
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
    width: 92,
    height: 92,
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
  connectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metaSeparator: {
    color: '#9aa3af',
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
  inlineToolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  inlineToolbarTitle: {
    color: '#111111',
    fontSize: 15,
    fontWeight: '700',
  },
  inlineAction: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: '#111111',
  },
  inlineActionLabel: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '800',
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
  gridWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 2,
    paddingTop: 2,
  },
  squareTile: {
    backgroundColor: '#eef1f4',
    overflow: 'hidden',
    position: 'relative',
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
  tileCaption: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    gap: 2,
    paddingHorizontal: 8,
    paddingVertical: 8,
    backgroundColor: 'rgba(17,17,17,0.38)',
  },
  tileTitle: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '700',
  },
  tileMeta: {
    color: 'rgba(255,255,255,0.84)',
    fontSize: 10,
  },
  tileBadgeRail: {
    position: 'absolute',
    top: 8,
    left: 8,
    gap: 6,
  },
  tileBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: 'rgba(17,17,17,0.56)',
  },
  tileBadgeLabel: {
    color: '#ffffff',
    fontSize: 9,
    fontWeight: '700',
  },
  addTile: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#f5f7fa',
  },
  addTilePlus: {
    color: '#111111',
    fontSize: 28,
    fontWeight: '500',
  },
  addTileLabel: {
    color: '#6b7280',
    fontSize: 12,
    fontWeight: '700',
  },
  emptyState: {
    width: '100%',
    paddingVertical: 32,
  },
  connectionsBackdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(17,17,17,0.2)',
  },
  connectionsSheet: {
    gap: 12,
    paddingHorizontal: 18,
    paddingTop: 12,
    paddingBottom: 24,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    backgroundColor: '#ffffff',
  },
  connectionsHandle: {
    alignSelf: 'center',
    width: 42,
    height: 4,
    borderRadius: 999,
    backgroundColor: '#d7dbe0',
  },
  connectionsTitle: {
    color: '#111111',
    fontSize: 18,
    fontWeight: '800',
  },
  connectionsList: {
    gap: 10,
    paddingBottom: 12,
  },
  connectionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 8,
  },
  connectionAvatar: {
    width: 42,
    height: 42,
    borderRadius: 999,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#111111',
  },
  connectionAvatarImage: {
    width: '100%',
    height: '100%',
  },
  connectionAvatarLabel: {
    color: '#ffffff',
    fontWeight: '800',
  },
  connectionCopy: {
    flex: 1,
    gap: 3,
  },
  connectionUsername: {
    color: '#111111',
    fontWeight: '700',
  },
  connectionFullName: {
    color: '#6b7280',
    fontSize: 12,
  },
  error: {
    color: '#dc2626',
    textAlign: 'center',
    paddingHorizontal: 18,
    paddingBottom: 10,
  },
});


