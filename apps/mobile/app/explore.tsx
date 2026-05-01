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
import { useAuth } from '../context/auth-context';
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

  const reelHeight = useMemo(() => Math.max(height - 208, 420), [height]);

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
      {errorMessage ? <Text style={styles.error}>{errorMessage}</Text> : null}
      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator color={mobileTheme.colors.textStrong} />
          <Text style={styles.loadingText}>Kesif akisi yukleniyor...</Text>
        </View>
      ) : null}
      {!loading && !items.length ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>Kesfet henuz bos</Text>
          <Text style={styles.emptyCopy}>Kullanicilar araclarini kesfete acmaya basladiginda burada akacak.</Text>
        </View>
      ) : null}
      {!loading && items.length ? (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          pagingEnabled
          renderItem={({ item }) => {
            const liked = Boolean(likedMap[item.id]);
            const media = item.media[0];

            return (
              <View style={[styles.reelCard, { minHeight: reelHeight }]}> 
                <Pressable style={styles.mediaFrame} onPress={() => router.push(`/vehicles/${item.id}`)}>
                  {media?.url ? (
                    <Image source={{ uri: media.url }} style={styles.mediaImage} />
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
                        onPress={() => router.push(`/vehicles/${item.id}`)}
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
  reelCard: {
    paddingBottom: 16,
  },
  mediaFrame: {
    flex: 1,
    borderRadius: 26,
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
    paddingVertical: 20,
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
});

