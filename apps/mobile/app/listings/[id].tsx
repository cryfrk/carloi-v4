import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { SharedContentType, type ListingDetailResponse } from '@carloi-v4/types';
import {
  ActivityIndicator,
  Dimensions,
  Image,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { MobileShell } from '../../components/mobile-shell';
import { MobileMediaView } from '../../components/mobile-media-view';
import { ShareContentSheet } from '../../components/share-content-sheet';
import { VehicleDamageMap } from '../../components/vehicle-damage-map';
import { useAuth } from '../../context/auth-context';
import { buildDemoMessageFixtures, demoListingById } from '../../lib/demo-content';
import { mobileDemoContentEnabled } from '../../lib/demo-runtime';
import { mobileTheme } from '../../lib/design-system';
import { mobileListingsApi } from '../../lib/listings-api';
import { fuelTypeLabels, formatKm, formatPrice, sellerTypeLabels, transmissionLabels } from '../../lib/listings-ui';
import { mobileMessagesApi } from '../../lib/messages-api';

const FULL_BLEED_WIDTH = Dimensions.get('window').width;

function sharedCardMatchesTarget(card: unknown, targetId: string): boolean {
  return Boolean(card && typeof card === 'object' && 'targetId' in card && card.targetId === targetId);
}

export default function ListingDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { session } = useAuth();
  const [listing, setListing] = useState<ListingDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [activeMediaIndex, setActiveMediaIndex] = useState(0);
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

  const accessToken = session?.accessToken;

  useEffect(() => {
    if (!accessToken || !id) {
      return;
    }

    setLoading(true);
    setErrorMessage(null);

    if (mobileDemoContentEnabled && id.startsWith('demo-listing-')) {
      setListing(demoListingById[id] ?? null);
      setLoading(false);
      return;
    }

    void mobileListingsApi
      .getDetail(accessToken, id)
      .then(setListing)
      .catch((error) => {
        setErrorMessage(error instanceof Error ? error.message : 'Ilan detayi alinamadi.');
      })
      .finally(() => setLoading(false));
  }, [accessToken, id]);

  if (!accessToken) {
    return <Redirect href="/login" />;
  }

  const token: string = accessToken;

  async function toggleSave() {
    if (!listing) {
      return;
    }

    try {
      const response = listing.isSaved
        ? await mobileListingsApi.unsaveListing(token, listing.id)
        : await mobileListingsApi.saveListing(token, listing.id);

      setListing((current) => (current ? { ...current, isSaved: response.isSaved } : current));
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Kaydetme islemi tamamlanamadi.');
    }
  }

  async function startListingConversation() {
    if (!listing) {
      return;
    }

    if (mobileDemoContentEnabled && listing.id.startsWith('demo-listing-')) {
      const demoThread =
        Object.values(demoMessages.threadDetails).find((thread) =>
          thread.messages.some((message) => sharedCardMatchesTarget(message.systemCard, listing.id)),
        ) ??
        demoMessages.threads.find((thread) =>
          thread.participants.some((participant) => participant.id === listing.owner.id),
        ) ??
        demoMessages.threads[0];

      if (demoThread) {
        router.push(`/messages/${demoThread.id}` as never);
        return;
      }
    }

    try {
      const response = await mobileMessagesApi.startListingDeal(token, listing.id);
      router.push(`/messages/${response.thread.id}` as never);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Sohbet baslatilamadi.');
    }
  }

  const infoRows = listing
    ? [
        ['Ilan no', listing.listingNo],
        ['Ilan tarihi', new Date(listing.createdAt).toLocaleDateString('tr-TR')],
        ['Kimden', sellerTypeLabels[listing.sellerType]],
        ['Marka', listing.vehicle.brand ?? '-'],
        ['Model', listing.vehicle.model ?? '-'],
        ['Paket', listing.vehicle.package ?? '-'],
        ['Yil', listing.vehicle.year ? String(listing.vehicle.year) : '-'],
        ['Yakit', listing.vehicle.fuelType ? fuelTypeLabels[listing.vehicle.fuelType] : '-'],
        [
          'Vites',
          listing.vehicle.transmissionType
            ? transmissionLabels[listing.vehicle.transmissionType]
            : '-',
        ],
        ['KM', formatKm(listing.vehicle.km)],
        ['Kasa', listing.vehicle.bodyType ?? '-'],
        ['Motor gucu', listing.vehicle.enginePowerHp ? `${listing.vehicle.enginePowerHp} hp` : '-'],
        ['Motor hacmi', listing.vehicle.engineVolumeCc ? `${listing.vehicle.engineVolumeCc} cc` : '-'],
        ['Cekis', listing.vehicle.tractionType ?? '-'],
        ['Renk', listing.vehicle.color ?? '-'],
        ['Plaka', listing.plateMasked ?? '-'],
        ['Takas', listing.tradeAvailable ? 'Evet' : 'Hayir'],
      ]
    : [];

  return (
    <MobileShell
      title="Ilan detayi"
      subtitle="Galeri, aciklama ve teknik bilgiler temiz bir akista bir arada."
    >
      <View style={styles.layout}>
        <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
          {notice ? (
            <View style={[styles.banner, styles.noticeBanner]}>
              <Text style={styles.bannerText}>{notice}</Text>
            </View>
          ) : null}
          {errorMessage ? (
            <View style={[styles.banner, styles.errorBanner]}>
              <Text style={styles.bannerText}>{errorMessage}</Text>
            </View>
          ) : null}

          {loading ? (
            <View style={styles.loadingState}>
              <ActivityIndicator color={mobileTheme.colors.textStrong} />
              <Text style={styles.loadingText}>Ilan detayi getiriliyor...</Text>
            </View>
          ) : null}

          {!loading && !listing ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyTitle}>Ilan bulunamadi</Text>
              <Text style={styles.emptyCopy}>Bu kayit silinmis olabilir veya size acik olmayabilir.</Text>
            </View>
          ) : null}

          {listing ? (
            <>
              <View style={styles.galleryShell}>
                <ScrollView
                  horizontal
                  pagingEnabled
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.gallery}
                  onMomentumScrollEnd={(event) => {
                    const nextIndex = Math.round(
                      event.nativeEvent.contentOffset.x / FULL_BLEED_WIDTH,
                    );
                    setActiveMediaIndex(nextIndex);
                  }}
                >
                  {listing.media.map((mediaItem) => (
                    <View key={mediaItem.id} style={styles.galleryFrame}>
                      <MobileMediaView
                        autoPlay={mediaItem.mediaType === 'VIDEO'}
                        loop={mediaItem.mediaType === 'VIDEO'}
                        mediaType={mediaItem.mediaType}
                        muted={mediaItem.mediaType === 'VIDEO'}
                        nativeControls={mediaItem.mediaType === 'VIDEO'}
                        style={styles.galleryImage}
                        uri={mediaItem.url}
                      />
                    </View>
                  ))}
                </ScrollView>
                {listing.media.length > 1 ? (
                  <View style={styles.paginationRow}>
                    {listing.media.map((mediaItem, index) => (
                      <View
                        key={mediaItem.id}
                        style={[
                          styles.paginationDot,
                          index === activeMediaIndex ? styles.paginationDotActive : null,
                        ]}
                      />
                    ))}
                  </View>
                ) : null}
              </View>

              <View style={styles.section}>
                <View style={styles.priceRow}>
                  <Text style={styles.priceLabel}>{formatPrice(listing.price, listing.currency)}</Text>
                  <Text style={styles.locationLabel}>
                    {listing.city}
                    {listing.district ? ` / ${listing.district}` : ''}
                  </Text>
                </View>
                <Text style={styles.title}>{listing.title}</Text>
                <View style={styles.ownerRow}>
                  <View style={styles.avatar}>
                    <Text style={styles.avatarLabel}>{listing.owner.username.slice(0, 1).toUpperCase()}</Text>
                  </View>
                  <View style={styles.ownerCopy}>
                    <Text style={styles.ownerName}>@{listing.owner.username}</Text>
                    <Text style={styles.ownerMeta}>{listing.owner.fullName}</Text>
                  </View>
                </View>
                <Text numberOfLines={expanded ? undefined : 4} style={styles.description}>
                  {listing.description}
                </Text>
                {listing.description.length > 180 ? (
                  <Pressable onPress={() => setExpanded((current) => !current)}>
                    <Text style={styles.expandLabel}>{expanded ? 'Daha az goster' : 'Devamini oku'}</Text>
                  </Pressable>
                ) : null}
              </View>

              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Bilgi tablosu</Text>
                <View style={styles.infoGrid}>
                  {infoRows.map(([label, value]) => (
                    <View key={label} style={styles.infoRow}>
                      <Text style={styles.infoLabel}>{label}</Text>
                      <Text style={styles.infoValue}>{value}</Text>
                    </View>
                  ))}
                </View>
              </View>

              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Boya / Degisen</Text>
                <VehicleDamageMap value={listing.damageParts} />
              </View>

              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Donanim</Text>
                <Text style={styles.cardCopy}>{listing.equipmentSummary ?? 'Donanim bilgisi bekleniyor.'}</Text>
                <Text style={styles.sectionSubTitle}>Multimedya</Text>
                <Text style={styles.cardCopy}>{listing.multimediaSummary ?? 'Multimedya bilgisi bekleniyor.'}</Text>
                <Text style={styles.sectionSubTitle}>Ic mekan</Text>
                <Text style={styles.cardCopy}>{listing.interiorSummary ?? 'Ic mekan bilgisi bekleniyor.'}</Text>
                <Text style={styles.sectionSubTitle}>Dis mekan</Text>
                <Text style={styles.cardCopy}>{listing.exteriorSummary ?? 'Dis mekan bilgisi bekleniyor.'}</Text>
              </View>
            </>
          ) : null}
        </ScrollView>

        {listing ? (
          <View style={styles.actionBar}>
            <Pressable
              onPress={() => {
                if (listing.contactActions.canCall && listing.contactPhone) {
                  void Linking.openURL(`tel:${listing.contactPhone}`);
                } else {
                  setNotice('Bu ilanda telefon paylasimi acik degil.');
                }
              }}
              style={styles.actionPrimary}
            >
              <Text style={styles.actionPrimaryLabel}>Ara</Text>
            </Pressable>
            <Pressable onPress={() => void startListingConversation()} style={styles.actionSecondary}>
              <Text style={styles.actionSecondaryLabel}>Mesaj</Text>
            </Pressable>
            <Pressable onPress={() => setShareOpen(true)} style={styles.actionSecondary}>
              <Text style={styles.actionSecondaryLabel}>Paylas</Text>
            </Pressable>
            <Pressable onPress={() => void toggleSave()} style={styles.actionSecondary}>
              <Text style={styles.actionSecondaryLabel}>{listing.isSaved ? 'Kayitli' : 'Kaydet'}</Text>
            </Pressable>
          </View>
        ) : null}
        {listing ? (
          <ShareContentSheet
            accessToken={token}
            contentId={listing.id}
            contentType={SharedContentType.LISTING}
            currentUserId={session.user.id}
            onClose={() => setShareOpen(false)}
            onShared={(count) => setNotice(`${count} kisiye gonderildi.`)}
            visible={shareOpen}
          />
        ) : null}
      </View>
    </MobileShell>
  );
}

const styles = StyleSheet.create({
  layout: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  content: {
    gap: mobileTheme.spacing.md,
    paddingBottom: 12,
  },
  banner: {
    borderRadius: mobileTheme.radius.md,
    padding: 14,
    borderWidth: 1,
  },
  noticeBanner: {
    borderColor: mobileTheme.colors.border,
    backgroundColor: mobileTheme.colors.surface,
  },
  errorBanner: {
    borderColor: '#fecaca',
    backgroundColor: '#fff5f5',
  },
  bannerText: {
    color: mobileTheme.colors.text,
    lineHeight: 20,
  },
  loadingState: {
    paddingVertical: 40,
    alignItems: 'center',
    gap: 10,
    borderRadius: mobileTheme.radius.lg,
    backgroundColor: mobileTheme.colors.surface,
    borderWidth: 1,
    borderColor: mobileTheme.colors.border,
  },
  loadingText: {
    color: mobileTheme.colors.textMuted,
  },
  emptyState: {
    gap: 6,
    paddingVertical: 40,
    paddingHorizontal: 20,
    alignItems: 'center',
    borderRadius: mobileTheme.radius.lg,
    backgroundColor: mobileTheme.colors.surface,
    borderWidth: 1,
    borderColor: mobileTheme.colors.border,
  },
  emptyTitle: {
    color: mobileTheme.colors.textStrong,
    fontSize: 16,
    fontWeight: '700',
  },
  emptyCopy: {
    color: mobileTheme.colors.textMuted,
    textAlign: 'center',
    lineHeight: 20,
  },
  galleryShell: {
    marginHorizontal: -mobileTheme.spacing.md,
    gap: 10,
  },
  gallery: {
    gap: 0,
  },
  galleryFrame: {
    width: FULL_BLEED_WIDTH,
    aspectRatio: 0.92,
    overflow: 'hidden',
    backgroundColor: mobileTheme.colors.surfaceMuted,
  },
  galleryImage: {
    width: '100%',
    height: '100%',
  },
  paginationRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },
  paginationDot: {
    width: 6,
    height: 6,
    borderRadius: 999,
    backgroundColor: '#d0d5dd',
  },
  paginationDotActive: {
    width: 16,
    backgroundColor: mobileTheme.colors.textStrong,
  },
  section: {
    gap: 10,
    paddingHorizontal: 2,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  priceLabel: {
    color: mobileTheme.colors.textStrong,
    fontSize: 22,
    fontWeight: '800',
    lineHeight: 28,
  },
  locationLabel: {
    color: mobileTheme.colors.textMuted,
    fontSize: 12,
  },
  title: {
    color: mobileTheme.colors.textStrong,
    fontSize: 24,
    fontWeight: '700',
    lineHeight: 30,
  },
  ownerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingTop: 4,
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: mobileTheme.colors.surfaceMuted,
    borderWidth: 1,
    borderColor: mobileTheme.colors.border,
  },
  avatarLabel: {
    color: mobileTheme.colors.textStrong,
    fontWeight: '800',
    fontSize: 18,
  },
  ownerCopy: {
    gap: 3,
  },
  ownerName: {
    color: mobileTheme.colors.textStrong,
    fontWeight: '700',
  },
  ownerMeta: {
    color: mobileTheme.colors.textMuted,
    fontSize: 12,
  },
  description: {
    color: mobileTheme.colors.text,
    lineHeight: 22,
  },
  expandLabel: {
    color: mobileTheme.colors.textStrong,
    fontWeight: '700',
  },
  sectionTitle: {
    color: mobileTheme.colors.textStrong,
    fontSize: 17,
    fontWeight: '700',
    marginTop: 2,
  },
  sectionSubTitle: {
    color: mobileTheme.colors.textStrong,
    fontSize: 14,
    fontWeight: '700',
    marginTop: 4,
  },
  infoGrid: {
    borderTopWidth: 1,
    borderTopColor: mobileTheme.colors.border,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: mobileTheme.colors.border,
  },
  infoLabel: {
    color: mobileTheme.colors.textMuted,
    fontSize: 13,
  },
  infoValue: {
    flexShrink: 1,
    color: mobileTheme.colors.textStrong,
    fontWeight: '600',
    textAlign: 'right',
  },
  cardCopy: {
    color: mobileTheme.colors.text,
    lineHeight: 21,
  },
  actionBar: {
    flexDirection: 'row',
    gap: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: mobileTheme.colors.border,
    backgroundColor: mobileTheme.colors.background,
  },
  actionPrimary: {
    flex: 1.15,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: mobileTheme.radius.lg,
    backgroundColor: mobileTheme.colors.textStrong,
  },
  actionPrimaryLabel: {
    color: mobileTheme.colors.white,
    fontWeight: '800',
  },
  actionSecondary: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: mobileTheme.radius.lg,
    backgroundColor: mobileTheme.colors.surface,
    borderWidth: 1,
    borderColor: mobileTheme.colors.border,
  },
  actionSecondaryLabel: {
    color: mobileTheme.colors.textStrong,
    fontWeight: '700',
  },
});



