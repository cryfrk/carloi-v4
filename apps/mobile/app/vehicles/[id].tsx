import { Ionicons } from '@expo/vector-icons';
import { SharedContentType, type VehicleShowcaseDetailResponse } from '@carloi-v4/types';
import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { MobileShell } from '../../components/mobile-shell';
import { ShareContentSheet } from '../../components/share-content-sheet';
import { MobileMediaView } from '../../components/mobile-media-view';
import { useAuth } from '../../context/auth-context';
import { buildDemoMessageFixtures, demoExploreVehicleById } from '../../lib/demo-content';
import { mobileDemoContentEnabled } from '../../lib/demo-runtime';
import { mobileTheme } from '../../lib/design-system';
import { mobileExploreApi } from '../../lib/explore-api';
import { vehicleEquipmentCategoryLabels } from '../../lib/listings-ui';
import { mobileMessagesApi } from '../../lib/messages-api';

function sharedCardMatchesTarget(card: unknown, targetId: string): boolean {
  return Boolean(card && typeof card === 'object' && 'targetId' in card && card.targetId === targetId);
}

export default function VehicleDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  const { session } = useAuth();
  const [vehicle, setVehicle] = useState<VehicleShowcaseDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [shareOpen, setShareOpen] = useState(false);
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
    if (!session?.accessToken || !id) {
      return;
    }

    setLoading(true);
    setErrorMessage(null);

    if (mobileDemoContentEnabled && id.startsWith('demo-vehicle-')) {
      setVehicle(demoExploreVehicleById[id] ?? null);
      setLoading(false);
      return;
    }

    void mobileExploreApi
      .getVehicleShowcase(session.accessToken, id)
      .then(setVehicle)
      .catch((error) => {
        setErrorMessage(error instanceof Error ? error.message : 'Arac detayi yuklenemedi.');
      })
      .finally(() => setLoading(false));
  }, [id, session?.accessToken]);

  const token = session?.accessToken;

  if (!token || !session) {
    return <Redirect href="/login" />;
  }

  if (!id) {
    return <Redirect href="/profile?tab=vehicles" />;
  }

  const accessToken = token;
  const isOwnVehicle = vehicle ? vehicle.owner.id === session.user.id : false;

  async function openMessage() {
    if (!vehicle) {
      return;
    }

    if (mobileDemoContentEnabled && vehicle.id.startsWith('demo-vehicle-')) {
      const demoThread =
        demoMessages.threads.find((thread) =>
          thread.participants.some((participant) => participant.id === vehicle.owner.id),
        ) ??
        Object.values(demoMessages.threadDetails).find((thread) =>
          thread.messages.some((message) => sharedCardMatchesTarget(message.systemCard, vehicle.id)),
        );

      if (demoThread) {
        router.push(`/messages/${demoThread.id}`);
        return;
      }
    }

    try {
      const response = await mobileMessagesApi.createDirectThread(accessToken, {
        targetUserId: vehicle.owner.id,
      });
      router.push(`/messages/${response.thread.id}`);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Mesaj alani acilamadi.');
    }
  }

  return (
    <MobileShell title="Arac detayi" subtitle="Profil icindeki arac koleksiyonunda daha temiz bir detay deneyimi.">
      {notice ? <Text style={styles.notice}>{notice}</Text> : null}
      {errorMessage ? <Text style={styles.error}>{errorMessage}</Text> : null}
      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator color={mobileTheme.colors.textStrong} />
          <Text style={styles.loadingText}>Arac detayi yukleniyor...</Text>
        </View>
      ) : null}
      {vehicle ? (
        <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
          <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false} style={styles.gallery}>
            {(vehicle.media.length ? vehicle.media : [{ id: 'fallback', url: vehicle.firstMediaUrl ?? '', mediaType: 'IMAGE', sortOrder: 0 }]).map((mediaItem) => (
              <View key={mediaItem.id} style={styles.galleryItem}>
                {mediaItem.url ? (
                  <MobileMediaView
                    autoPlay={mediaItem.mediaType === 'VIDEO'}
                    loop={mediaItem.mediaType === 'VIDEO'}
                    mediaType={mediaItem.mediaType === 'VIDEO' ? 'VIDEO' : 'IMAGE'}
                    muted={mediaItem.mediaType === 'VIDEO'}
                    nativeControls={mediaItem.mediaType === 'VIDEO'}
                    style={styles.galleryImage}
                    uri={mediaItem.url}
                  />
                ) : (
                  <View style={styles.galleryFallback}>
                    <Text style={styles.galleryFallbackLabel}>{vehicle.brand} {vehicle.model}</Text>
                  </View>
                )}
              </View>
            ))}
          </ScrollView>

          <View style={styles.ownerRow}>
            <View style={styles.ownerAvatar}>
              <Text style={styles.ownerAvatarLabel}>{vehicle.owner.username.slice(0, 1).toUpperCase()}</Text>
            </View>
            <View style={styles.ownerCopy}>
              <Text style={styles.ownerUsername}>@{vehicle.owner.username}</Text>
              <Text style={styles.ownerMeta}>{vehicle.owner.fullName} · {vehicle.city ?? 'Konum gizli'}</Text>
            </View>
          </View>

          <View style={styles.titleBlock}>
            <Text style={styles.title}>{vehicle.brand} {vehicle.model}</Text>
            <Text style={styles.subtitle}>{[vehicle.package, String(vehicle.year)].filter(Boolean).join(' · ')}</Text>
          </View>

          {vehicle.description ? <Text style={styles.description}>{vehicle.description}</Text> : null}
          {vehicle.equipmentNotes ? <Text style={styles.equipment}>{vehicle.equipmentNotes}</Text> : null}

          <View style={styles.specGrid}>
            <SpecItem label="Yakit" value={vehicle.fuelType} />
            <SpecItem label="Vites" value={vehicle.transmissionType} />
            <SpecItem label="KM" value={`${vehicle.km.toLocaleString('tr-TR')} km`} />
            <SpecItem label="Kasa" value={vehicle.bodyType ?? 'Belirtilmedi'} />
            <SpecItem label="Motor" value={vehicle.engineVolume ? `${(vehicle.engineVolume / 1000).toFixed(1)}L` : 'Belirtilmedi'} />
            <SpecItem label="Guc" value={vehicle.enginePower ? `${vehicle.enginePower} hp` : 'Belirtilmedi'} />
          </View>

          <View style={styles.badgeRow}>
            {vehicle.openToOffers ? <Badge label="Teklife acik" /> : null}
            {vehicle.showInExplore ? <Badge label="Kesfette gorunuyor" /> : null}
            {vehicle.city ? <Badge label={vehicle.city} /> : null}
          </View>

          {vehicle.standardEquipment.length > 0 ? (
            <View style={styles.sectionBlock}>
              <Text style={styles.sectionTitle}>Standart Paket Donanimi</Text>
              {vehicle.standardEquipment.map((group) => (
                <View key={group.category} style={styles.sectionGroup}>
                  <Text style={styles.sectionGroupTitle}>
                    {vehicleEquipmentCategoryLabels[group.category]}
                  </Text>
                  <View style={styles.badgeRow}>
                    {group.items.map((item) => (
                      <Badge key={item.id} label={item.name} />
                    ))}
                  </View>
                </View>
              ))}
            </View>
          ) : null}

          {vehicle.extraEquipment.length > 0 ? (
            <View style={styles.sectionBlock}>
              <Text style={styles.sectionTitle}>Ilave Donanimlar</Text>
              <View style={styles.stackGap}>
                {vehicle.extraEquipment.map((item) => (
                  <View key={item.id} style={styles.summaryCard}>
                    <Text style={styles.summaryTitle}>{item.name}</Text>
                    <Text style={styles.summaryMeta}>
                      {(item.category ? vehicleEquipmentCategoryLabels[item.category] : 'Diger') +
                        (item.note ? ` · ${item.note}` : '')}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          ) : null}

          <View style={styles.actionRow}>
            {isOwnVehicle ? (
              <Pressable style={styles.primaryButton} onPress={() => router.push(`/create-listing?vehicleId=${vehicle.id}`)}>
                <Text style={styles.primaryButtonLabel}>Ilana cikar</Text>
              </Pressable>
            ) : (
              <Pressable style={styles.primaryButton} onPress={() => void openMessage()}>
                <Ionicons color="#ffffff" name="paper-plane-outline" size={16} />
                <Text style={styles.primaryButtonLabel}>{vehicle.openToOffers ? 'Teklif ver' : 'Mesaj gonder'}</Text>
              </Pressable>
            )}
            <Pressable style={styles.secondaryButton} onPress={() => setShareOpen(true)}>
              <Text style={styles.secondaryButtonLabel}>Paylas</Text>
            </Pressable>
          </View>
        </ScrollView>
      ) : null}
      {vehicle ? (
        <ShareContentSheet
          accessToken={accessToken}
          contentId={vehicle.id}
          contentType={SharedContentType.VEHICLE}
          currentUserId={session.user.id}
          onClose={() => setShareOpen(false)}
          onShared={(count) => setNotice(`${count} kisiye gonderildi.`)}
          visible={shareOpen}
        />
      ) : null}
    </MobileShell>
  );
}

function SpecItem({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.specCard}>
      <Text style={styles.specLabel}>{label}</Text>
      <Text style={styles.specValue}>{value}</Text>
    </View>
  );
}

function Badge({ label }: { label: string }) {
  return (
    <View style={styles.badge}>
      <Text style={styles.badgeLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
  },
  content: {
    paddingBottom: 24,
  },
  loadingWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  loadingText: {
    color: mobileTheme.colors.textMuted,
  },
  gallery: {
    marginHorizontal: -mobileTheme.spacing.md,
  },
  galleryItem: {
    width: 360,
    aspectRatio: 1,
    backgroundColor: '#eef1f4',
  },
  galleryImage: {
    width: '100%',
    height: '100%',
  },
  galleryFallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#111827',
  },
  galleryFallbackLabel: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: '700',
  },
  ownerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingTop: 18,
  },
  ownerAvatar: {
    width: 42,
    height: 42,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#111111',
  },
  ownerAvatarLabel: {
    color: '#ffffff',
    fontWeight: '800',
  },
  ownerCopy: {
    gap: 2,
  },
  ownerUsername: {
    color: mobileTheme.colors.textStrong,
    fontWeight: '700',
  },
  ownerMeta: {
    color: mobileTheme.colors.textMuted,
    fontSize: 12,
  },
  titleBlock: {
    gap: 4,
    paddingTop: 18,
  },
  title: {
    color: mobileTheme.colors.textStrong,
    fontSize: 24,
    fontWeight: '700',
  },
  subtitle: {
    color: mobileTheme.colors.textMuted,
    lineHeight: 20,
  },
  description: {
    color: mobileTheme.colors.textStrong,
    lineHeight: 22,
    paddingTop: 14,
  },
  equipment: {
    color: mobileTheme.colors.textMuted,
    lineHeight: 21,
    paddingTop: 10,
  },
  specGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    paddingTop: 18,
  },
  specCard: {
    width: '47%',
    gap: 4,
    padding: 14,
    borderRadius: 18,
    backgroundColor: '#f7f8fa',
    borderWidth: 1,
    borderColor: '#edf1f4',
  },
  specLabel: {
    color: mobileTheme.colors.textMuted,
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  specValue: {
    color: mobileTheme.colors.textStrong,
    fontWeight: '700',
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingTop: 16,
  },
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: '#f1f5f9',
  },
  badgeLabel: {
    color: mobileTheme.colors.textStrong,
    fontSize: 12,
    fontWeight: '700',
  },
  sectionBlock: {
    gap: 12,
    paddingTop: 18,
  },
  sectionTitle: {
    color: mobileTheme.colors.textStrong,
    fontSize: 16,
    fontWeight: '700',
  },
  sectionGroup: {
    gap: 8,
  },
  sectionGroupTitle: {
    color: mobileTheme.colors.textMuted,
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  stackGap: {
    gap: 10,
  },
  summaryCard: {
    gap: 4,
    padding: 14,
    borderRadius: 18,
    backgroundColor: '#f7f8fa',
    borderWidth: 1,
    borderColor: '#edf1f4',
  },
  summaryTitle: {
    color: mobileTheme.colors.textStrong,
    fontWeight: '700',
  },
  summaryMeta: {
    color: mobileTheme.colors.textMuted,
    lineHeight: 20,
  },
  actionRow: {
    gap: 10,
    paddingTop: 20,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    minHeight: 48,
    borderRadius: 16,
    backgroundColor: mobileTheme.colors.textStrong,
  },
  primaryButtonLabel: {
    color: '#ffffff',
    fontWeight: '800',
  },
  secondaryButton: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 46,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    backgroundColor: '#ffffff',
  },
  secondaryButtonLabel: {
    color: mobileTheme.colors.textStrong,
    fontWeight: '700',
  },
  notice: {
    color: '#2563eb',
    textAlign: 'center',
    paddingBottom: 12,
  },
  error: {
    color: '#dc2626',
    textAlign: 'center',
    paddingBottom: 12,
  },
});


