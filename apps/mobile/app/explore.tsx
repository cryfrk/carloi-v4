import { Ionicons } from '@expo/vector-icons';
import type { ExploreVehicleItem } from '@carloi-v4/types';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { MobileShell } from '../components/mobile-shell';
import { MobileMediaView } from '../components/mobile-media-view';
import { useAuth } from '../context/auth-context';
import { demoExploreVehicles } from '../lib/demo-content';
import { mobileDemoContentEnabled } from '../lib/demo-runtime';
import { mobileTheme } from '../lib/design-system';
import { mobileExploreApi } from '../lib/explore-api';
import { mobileMessagesApi } from '../lib/messages-api';

export default function ExploreScreen() {
  const router = useRouter();
  const { height } = useWindowDimensions();
  const { session } = useAuth();
  const [items, setItems] = useState<ExploreVehicleItem[]>([]);
  const [likedMap, setLikedMap] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const reelHeight = useMemo(() => Math.max(height - 144, 480), [height]);
  const displayItems = mobileDemoContentEnabled && !loading && items.length === 0 ? demoExploreVehicles : items;
  const showRealEmptyState = !loading && !mobileDemoContentEnabled && items.length === 0;

  useEffect(() => {
    if (!session?.accessToken) {
      return;
    }

    setLoading(true);
    setErrorMessage(null);

    void mobileExploreApi
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

    if (ownerId.startsWith('demo-')) {
      setNotice('Bu ornek arac kesfet akisini gostermek icin burada. Gercek teklif ve mesaj icin kendi araclarini veya ilanlari kullanabilirsin.');
      return;
    }

    try {
      const response = await mobileMessagesApi.createDirectThread(session.accessToken, {
        targetUserId: ownerId,
      });
      router.push(`/messages/${response.thread.id}`);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Mesaj alani acilamadi.');
    }
  }

  return (
    <MobileShell title="Kesfet" subtitle="Arac videolari ve fotograflari tam ekran sosyal akis icinde akar.">
      {notice ? <Text style={styles.notice}>{notice}</Text> : null}
      {errorMessage ? <Text style={styles.error}>{errorMessage}</Text> : null}
      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator color={mobileTheme.colors.textStrong} />
          <Text style={styles.loadingText}>Kesif akisi yukleniyor...</Text>
        </View>
      ) : null}
      {showRealEmptyState ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>Kesfet henuz bos</Text>
          <Text style={styles.emptyCopy}>
            Kesfete acik araclar paylasildiginda burada gorunecek. Profilinden arac ekleyip kesfete acabilirsin.
          </Text>
          <Pressable style={styles.primaryCta} onPress={() => router.push('/profile?tab=vehicles' as never)}>
            <Text style={styles.primaryCtaLabel}>Araclarini yonet</Text>
          </Pressable>
        </View>
      ) : null}
      {!loading && displayItems.length > 0 ? (
        <FlatList
          data={displayItems}
          decelerationRate="fast"
          getItemLayout={(_, index) => ({
            length: reelHeight,
            offset: reelHeight * index,
            index,
          })}
          keyExtractor={(item) => item.id}
          pagingEnabled
          renderItem={({ item }) => {
            const liked = Boolean(likedMap[item.id]);
            const media = item.media[0];

            return (
              <View style={[styles.reelCard, { height: reelHeight }]}>
                <Pressable style={styles.mediaFrame} onPress={() => router.push(`/vehicles/${item.id}`)}>
                  {media?.url ? (
                    <MobileMediaView
                      autoPlay={media.mediaType === 'VIDEO'}
                      loop={media.mediaType === 'VIDEO'}
                      mediaType={media.mediaType}
                      muted={media.mediaType === 'VIDEO'}
                      style={styles.mediaImage}
                      uri={media.url}
                    />
                  ) : (
                    <View style={styles.mediaFallback}>
                      <Text style={styles.mediaFallbackLabel}>{item.brand} {item.model}</Text>
                    </View>
                  )}
                  <View style={styles.mediaOverlay}>
                    <View style={styles.overlayCopy}>
                      <Text style={styles.ownerLine}>@{item.owner.username}</Text>
                      <Text style={styles.vehicleLine}>{[item.brand, item.model, item.package].filter(Boolean).join(' · ')}</Text>
                      <Text style={styles.metaLine}>{item.year} · {item.km.toLocaleString('tr-TR')} km · {item.city ?? 'Konum paylasilmadi'}</Text>
                      {item.description ? <Text style={styles.description} numberOfLines={3}>{item.description}</Text> : null}
                    </View>
                    <View style={styles.actionRail}>
                      <ActionButton
                        icon={liked ? 'heart' : 'heart-outline'}
                        label={liked ? 'Begendin' : 'Begen'}
                        onPress={() => setLikedMap((current) => ({ ...current, [item.id]: !current[item.id] }))}
                      />
                      <ActionButton
                        icon="chatbubble-outline"
                        label="Detay"
                        onPress={() => {
                          router.push(`/vehicles/${item.id}`);
                        }}
                      />
                      <ActionButton
                        icon="paper-plane-outline"
                        label="Mesaj"
                        onPress={() => void handleMessage(item.owner.id)}
                      />
                      {item.openToOffers ? (
                        <ActionButton
                          icon="flash-outline"
                          label="Teklif"
                          onPress={() => void handleMessage(item.owner.id)}
                        />
                      ) : null}
                    </View>
                  </View>
                </Pressable>
              </View>
            );
          }}
          showsVerticalScrollIndicator={false}
          snapToAlignment="start"
          snapToInterval={reelHeight}
        />
      ) : null}
    </MobileShell>
  );
}

function ActionButton({
  icon,
  label,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable style={styles.actionButton} onPress={onPress}>
      <Ionicons color="#ffffff" name={icon} size={19} />
      <Text style={styles.actionLabel}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  loadingWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  loadingText: {
    color: mobileTheme.colors.textMuted,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 28,
  },
  emptyTitle: {
    color: mobileTheme.colors.textStrong,
    fontSize: 22,
    fontWeight: '700',
  },
  emptyCopy: {
    color: mobileTheme.colors.textMuted,
    lineHeight: 22,
    textAlign: 'center',
  },
  primaryCta: {
    borderRadius: 999,
    backgroundColor: '#111111',
    paddingHorizontal: 18,
    paddingVertical: 13,
  },
  primaryCtaLabel: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  reelCard: {
    paddingBottom: 0,
  },
  mediaFrame: {
    flex: 1,
    borderRadius: 22,
    overflow: 'hidden',
    backgroundColor: '#0f172a',
  },
  mediaImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  mediaFallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#111827',
  },
  mediaFallbackLabel: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: '700',
  },
  mediaOverlay: {
    ...StyleSheet.absoluteFillObject,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingHorizontal: 18,
    paddingVertical: 18,
    backgroundColor: 'rgba(15,23,42,0.14)',
  },
  overlayCopy: {
    flex: 1,
    gap: 6,
    paddingRight: 16,
  },
  ownerLine: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '800',
  },
  vehicleLine: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '700',
  },
  metaLine: {
    color: 'rgba(255,255,255,0.84)',
    fontSize: 12,
  },
  description: {
    color: '#ffffff',
    lineHeight: 20,
    maxWidth: 260,
  },
  actionRail: {
    gap: 18,
    alignItems: 'center',
  },
  actionButton: {
    alignItems: 'center',
    gap: 6,
  },
  actionLabel: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '700',
  },
  error: {
    color: '#dc2626',
    textAlign: 'center',
    paddingBottom: 12,
  },
  notice: {
    color: mobileTheme.colors.textMuted,
    textAlign: 'center',
    paddingBottom: 10,
  },
});


