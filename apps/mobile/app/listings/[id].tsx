import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import type { ListingDetailResponse } from '@carloi-v4/types';
import {
  ActivityIndicator,
  Image,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { ExpertiseReportCard } from '../../components/expertise-report-card';
import { MobileShell } from '../../components/mobile-shell';
import { VehicleDamageMap } from '../../components/vehicle-damage-map';
import { useAuth } from '../../context/auth-context';
import { mobileListingsApi } from '../../lib/listings-api';
import { mobileMessagesApi } from '../../lib/messages-api';
import { formatKm, formatPrice, fuelTypeLabels, sellerTypeLabels, transmissionLabels } from '../../lib/listings-ui';

export default function ListingDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { session } = useAuth();
  const [listing, setListing] = useState<ListingDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);

  const accessToken = session?.accessToken;

  useEffect(() => {
    if (!accessToken || !id) {
      return;
    }

    setLoading(true);
    setErrorMessage(null);

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
      subtitle="Galeriyi, teknik bilgileri, expertiz raporunu ve iletisim aksiyonlarini ayni akista gor."
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
            <View style={styles.loadingCard}>
              <ActivityIndicator color="#ef8354" />
              <Text style={styles.loadingText}>Ilan detayi getiriliyor...</Text>
            </View>
          ) : null}

          {!loading && !listing ? (
            <View style={styles.loadingCard}>
              <Text style={styles.loadingText}>Ilan bulunamadi.</Text>
            </View>
          ) : null}

          {listing ? (
            <>
              <ScrollView
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.gallery}
              >
                {listing.media.map((mediaItem) => (
                  <View key={mediaItem.id} style={styles.galleryFrame}>
                    {mediaItem.mediaType === 'IMAGE' ? (
                      <Image source={{ uri: mediaItem.url }} style={styles.galleryImage} resizeMode="cover" />
                    ) : (
                      <View style={styles.videoTile}>
                        <Text style={styles.videoBadge}>VIDEO</Text>
                        <Text style={styles.videoUrl}>{mediaItem.url}</Text>
                      </View>
                    )}
                  </View>
                ))}
              </ScrollView>

              <View style={styles.sectionCard}>
                <Text style={styles.priceLabel}>{formatPrice(listing.price, listing.currency)}</Text>
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
                    <Text style={styles.expandLabel}>{expanded ? 'Kapat' : 'Devamini oku'}</Text>
                  </Pressable>
                ) : null}
              </View>

              <View style={styles.sectionCard}>
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

              <View style={styles.sectionCard}>
                <Text style={styles.sectionTitle}>Boya / Degisen</Text>
                <VehicleDamageMap value={listing.damageParts} />
              </View>

              <View style={styles.sectionCard}>
                <Text style={styles.sectionTitle}>Donanim ozeti</Text>
                <Text style={styles.cardCopy}>{listing.equipmentSummary ?? 'Donanim bilgisi bekleniyor.'}</Text>
                <Text style={styles.sectionTitle}>Multimedya</Text>
                <Text style={styles.cardCopy}>{listing.multimediaSummary ?? 'Multimedya bilgisi bekleniyor.'}</Text>
                <Text style={styles.sectionTitle}>Ic mekan</Text>
                <Text style={styles.cardCopy}>{listing.interiorSummary ?? 'Ic mekan bilgisi bekleniyor.'}</Text>
                <Text style={styles.sectionTitle}>Dis mekan</Text>
                <Text style={styles.cardCopy}>{listing.exteriorSummary ?? 'Dis mekan bilgisi bekleniyor.'}</Text>
              </View>

              <ExpertiseReportCard
                report={listing.expertiseReport}
                vehicleLabel={`${listing.vehicle.brand ?? '-'} ${listing.vehicle.model ?? '-'}${listing.vehicle.package ? ` / ${listing.vehicle.package}` : ''}`}
              />
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
            <Pressable
              onPress={() => void startListingConversation()}
              style={styles.actionSecondary}
            >
              <Text style={styles.actionSecondaryLabel}>Mesaj</Text>
            </Pressable>
            <Pressable onPress={() => void toggleSave()} style={styles.actionSecondary}>
              <Text style={styles.actionSecondaryLabel}>{listing.isSaved ? 'Kayitli' : 'Kaydet'}</Text>
            </Pressable>
          </View>
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
    gap: 14,
    paddingBottom: 10,
  },
  banner: {
    borderRadius: 18,
    padding: 14,
  },
  noticeBanner: {
    backgroundColor: 'rgba(255,255,255,0.07)',
  },
  errorBanner: {
    backgroundColor: 'rgba(216,82,82,0.2)',
  },
  bannerText: {
    color: '#f8f2ea',
    lineHeight: 20,
  },
  loadingCard: {
    paddingVertical: 28,
    alignItems: 'center',
    gap: 10,
    borderRadius: 24,
    backgroundColor: '#0e1f2d',
  },
  loadingText: {
    color: '#d1dce5',
  },
  gallery: {
    gap: 10,
  },
  galleryFrame: {
    width: 320,
    aspectRatio: 1,
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: '#08131d',
  },
  galleryImage: {
    width: '100%',
    height: '100%',
  },
  videoTile: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
    padding: 18,
    backgroundColor: '#122334',
  },
  videoBadge: {
    color: '#ffd6c2',
    fontWeight: '800',
    letterSpacing: 1.4,
  },
  videoUrl: {
    color: '#d6e0e8',
    textAlign: 'center',
  },
  sectionCard: {
    gap: 10,
    padding: 18,
    borderRadius: 24,
    backgroundColor: '#0d1d2a',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  priceLabel: {
    color: '#ffd6c2',
    fontSize: 14,
    fontWeight: '800',
  },
  title: {
    color: '#f8f2ea',
    fontSize: 24,
    fontWeight: '800',
    lineHeight: 30,
  },
  ownerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ef8354',
  },
  avatarLabel: {
    color: '#08131d',
    fontWeight: '800',
    fontSize: 18,
  },
  ownerCopy: {
    gap: 4,
  },
  ownerName: {
    color: '#f8f2ea',
    fontWeight: '800',
  },
  ownerMeta: {
    color: '#9cb0be',
  },
  description: {
    color: '#d7e0e8',
    lineHeight: 22,
  },
  expandLabel: {
    color: '#ffd6c2',
    fontWeight: '800',
  },
  sectionTitle: {
    color: '#f8f2ea',
    fontSize: 16,
    fontWeight: '800',
  },
  infoGrid: {
    gap: 10,
  },
  infoRow: {
    padding: 12,
    borderRadius: 18,
    backgroundColor: '#102030',
    gap: 4,
  },
  infoLabel: {
    color: '#8fa4b4',
    fontSize: 12,
  },
  infoValue: {
    color: '#f8f2ea',
    fontWeight: '700',
  },
  cardCopy: {
    color: '#d6e0e8',
    lineHeight: 21,
  },
  actionBar: {
    flexDirection: 'row',
    gap: 10,
    paddingTop: 12,
  },
  actionPrimary: {
    flex: 1.2,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 20,
    backgroundColor: '#ef8354',
  },
  actionPrimaryLabel: {
    color: '#08131d',
    fontWeight: '800',
  },
  actionSecondary: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 20,
    backgroundColor: '#142636',
  },
  actionSecondaryLabel: {
    color: '#ffd6c2',
    fontWeight: '800',
  },
});


