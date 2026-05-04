import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import type {
  CreateListingRequest,
  GarageVehicleOption,
  ListingDamagePartInput,
} from '@carloi-v4/types';
import {
  DamageStatus,
  MediaAssetPurpose,
  MediaType,
  SellerType,
  UserType,
  VEHICLE_DAMAGE_PARTS,
} from '@carloi-v4/types';
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { MobileShell } from '../components/mobile-shell';
import { MobileMediaView } from '../components/mobile-media-view';
import { VehicleDamageMap } from '../components/vehicle-damage-map';
import { useAuth } from '../context/auth-context';
import { mobileTheme } from '../lib/design-system';
import { sellerTypeLabels } from '../lib/listings-ui';
import { mobileListingsApi } from '../lib/listings-api';
import { mobileMediaApi } from '../lib/media-api';
import { pickMediaFiles } from '../lib/upload-picker';

function createEmptyDamageParts(): ListingDamagePartInput[] {
  return VEHICLE_DAMAGE_PARTS.map((partName) => ({
    partName,
    damageStatus: DamageStatus.NONE,
  }));
}

export default function CreateListingScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ vehicleId?: string }>();
  const { session } = useAuth();
  const [garageVehicles, setGarageVehicles] = useState<GarageVehicleOption[]>([]);
  const [listingUploads, setListingUploads] = useState<Array<{ id: string; url: string; mimeType: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [form, setForm] = useState<CreateListingRequest>({
    garageVehicleId: params.vehicleId ?? '',
    title: '',
    description: '',
    price: 0,
    currency: 'TRY',
    city: '',
    district: '',
    sellerType: SellerType.OWNER,
    tradeAvailable: false,
    media: [],
    damageParts: createEmptyDamageParts(),
    licenseInfo: {
      plateNumber: '',
      ownerFirstName: session?.user.firstName ?? '',
      ownerLastName: session?.user.lastName ?? '',
      ownerTcIdentityNo: '',
    },
    contactPhone: session?.user.phone ?? '',
    showPhone: false,
  });

  const accessToken = session?.accessToken;

  useEffect(() => {
    if (!accessToken) {
      return;
    }

    setLoading(true);
    setErrorMessage(null);

    void mobileListingsApi
      .getGarageVehicles(accessToken)
      .then((response) => {
        setGarageVehicles(response.items);
        setForm((current) => ({
          ...current,
          garageVehicleId:
            current.garageVehicleId && response.items.some((item) => item.id === current.garageVehicleId)
              ? current.garageVehicleId
              : params.vehicleId && response.items.some((item) => item.id === params.vehicleId)
                ? params.vehicleId
                : response.items[0]?.id ?? '',
          sellerType: session?.user.userType === UserType.COMMERCIAL ? current.sellerType : SellerType.OWNER,
          licenseInfo: {
            ...current.licenseInfo,
            ownerFirstName: current.licenseInfo.ownerFirstName || session?.user.firstName || '',
            ownerLastName: current.licenseInfo.ownerLastName || session?.user.lastName || '',
          },
          contactPhone: current.contactPhone || session?.user.phone || '',
        }));
      })
      .catch((error) => {
        setErrorMessage(error instanceof Error ? error.message : 'Arac koleksiyonu yuklenemedi.');
      })
      .finally(() => setLoading(false));
  }, [accessToken, params.vehicleId, session?.user.firstName, session?.user.lastName, session?.user.phone, session?.user.userType]);

  if (!accessToken) {
    return <Redirect href="/login" />;
  }

  const token = accessToken;

  const selectedVehicle = garageVehicles.find((item) => item.id === form.garageVehicleId) ?? null;

  function patchForm<K extends keyof CreateListingRequest>(key: K, value: CreateListingRequest[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function inferMediaType(mimeType: string) {
    return mimeType.startsWith('video/') ? MediaType.VIDEO : MediaType.IMAGE;
  }

  async function handleListingMediaPick() {
    setUploading(true);
    setErrorMessage(null);

    try {
      const files = await pickMediaFiles({ allowsMultipleSelection: true });
      if (!files.length) {
        return;
      }

      const uploads = await mobileMediaApi.uploadFiles(token, files, MediaAssetPurpose.LISTING_MEDIA);
      setListingUploads((current) => [
        ...current,
        ...uploads.map((item) => ({ id: item.id, url: item.url, mimeType: item.mimeType })),
      ].slice(0, 20));
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Ilan medyasi yuklenemedi.');
    } finally {
      setUploading(false);
    }
  }

  async function handleSubmit() {
    const media = listingUploads.map((item) => ({
      url: item.url,
      mediaAssetId: item.id,
      mediaType: inferMediaType(item.mimeType),
    }));

    if (!form.garageVehicleId) {
      setErrorMessage('Ilan icin once bir arac secin.');
      return;
    }

    if (media.length < 3) {
      setErrorMessage('En az 3 ilan medyasi yuklemelisiniz.');
      return;
    }

    setSubmitting(true);
    setErrorMessage(null);

    try {
      const response = await mobileListingsApi.createListing(token, {
        ...form,
        price: Number(form.price),
        media,
        damageParts: form.damageParts,
      });

      router.replace(`/listings/${response.listingId}`);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Ilan olusturulamadi.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <MobileShell title="Ilan ver" subtitle="Aracini once profile ekle, sonra sade bir akisla ilana tasiyip yayina al.">
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        {errorMessage ? (
          <View style={[styles.banner, styles.errorBanner]}>
            <Text style={styles.bannerText}>{errorMessage}</Text>
          </View>
        ) : null}

        {loading ? (
          <View style={styles.loadingCard}>
            <ActivityIndicator color={mobileTheme.colors.textStrong} />
            <Text style={styles.loadingText}>Araclariniz yukleniyor...</Text>
          </View>
        ) : null}

        {!loading && !garageVehicles.length ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>Once bir arac ekleyin</Text>
            <Text style={styles.emptyCopy}>Ilan olusturma akisi artik profilinizdeki arac koleksiyonundan baslar.</Text>
            <Pressable style={styles.primaryButton} onPress={() => router.push('/vehicles/create')}>
              <Text style={styles.primaryButtonLabel}>Arac ekleme wizardini ac</Text>
            </Pressable>
          </View>
        ) : null}

        {!loading && garageVehicles.length ? (
          <>
            <View style={styles.sectionCard}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Arac secimi</Text>
                <Pressable onPress={() => router.push('/vehicles/create')}>
                  <Text style={styles.inlineLink}>+ Arac ekle</Text>
                </Pressable>
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.choiceRow}>
                {garageVehicles.map((vehicle) => (
                  <Pressable
                    key={vehicle.id}
                    onPress={() => patchForm('garageVehicleId', vehicle.id)}
                    style={[styles.vehicleTile, form.garageVehicleId === vehicle.id ? styles.vehicleTileActive : null]}
                  >
                    {vehicle.firstMediaUrl ? (
                      <MobileMediaView mediaType={MediaType.IMAGE} style={styles.vehicleTileImage} uri={vehicle.firstMediaUrl} />
                    ) : (
                      <View style={styles.vehicleTileFallback}><Text style={styles.vehicleTileFallbackLabel}>ARAC</Text></View>
                    )}
                    <Text numberOfLines={1} style={styles.vehicleTileTitle}>{vehicle.brand} {vehicle.model}</Text>
                    <Text numberOfLines={1} style={styles.vehicleTileMeta}>{vehicle.package ?? vehicle.plateMasked}</Text>
                  </Pressable>
                ))}
              </ScrollView>
            </View>

            <View style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>Ilan bilgileri</Text>
              {selectedVehicle ? (
                <Text style={styles.selectedVehicleCopy}>{selectedVehicle.brand} {selectedVehicle.model} · {selectedVehicle.year}</Text>
              ) : null}
              <TextInput style={styles.input} value={form.title} onChangeText={(value) => patchForm('title', value)} placeholder="Baslik" placeholderTextColor="#6d8090" />
              <TextInput style={[styles.input, styles.textArea]} value={form.description} onChangeText={(value) => patchForm('description', value)} placeholder="Aciklama" placeholderTextColor="#6d8090" multiline maxLength={600} />
              <TextInput style={styles.input} value={form.price ? String(form.price) : ''} onChangeText={(value) => patchForm('price', Number(value))} keyboardType="numeric" placeholder="Fiyat" placeholderTextColor="#6d8090" />
              <TextInput style={styles.input} value={form.city} onChangeText={(value) => patchForm('city', value)} placeholder="Sehir" placeholderTextColor="#6d8090" />
              <TextInput style={styles.input} value={form.district ?? ''} onChangeText={(value) => patchForm('district', value)} placeholder="Ilce" placeholderTextColor="#6d8090" />
              {session.user.userType === UserType.COMMERCIAL ? (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.choiceRow}>
                  {Object.values(SellerType).map((sellerType) => (
                    <Pressable
                      key={sellerType}
                      onPress={() => patchForm('sellerType', sellerType)}
                      style={[styles.choiceChip, form.sellerType === sellerType ? styles.choiceChipActive : null]}
                    >
                      <Text style={styles.choiceChipLabel}>{sellerTypeLabels[sellerType]}</Text>
                    </Pressable>
                  ))}
                </ScrollView>
              ) : null}
              <TextInput style={styles.input} value={form.contactPhone ?? ''} onChangeText={(value) => patchForm('contactPhone', value)} placeholder="Iletisim telefonu" placeholderTextColor="#6d8090" />
              <TextInput style={styles.input} value={form.licenseInfo.plateNumber} onChangeText={(value) => setForm((current) => ({ ...current, licenseInfo: { ...current.licenseInfo, plateNumber: value } }))} placeholder="Ruhsat plakasi" placeholderTextColor="#6d8090" />
              <TextInput style={styles.input} value={form.licenseInfo.ownerFirstName} onChangeText={(value) => setForm((current) => ({ ...current, licenseInfo: { ...current.licenseInfo, ownerFirstName: value } }))} placeholder="Ruhsat sahibi ad" placeholderTextColor="#6d8090" />
              <TextInput style={styles.input} value={form.licenseInfo.ownerLastName} onChangeText={(value) => setForm((current) => ({ ...current, licenseInfo: { ...current.licenseInfo, ownerLastName: value } }))} placeholder="Ruhsat sahibi soyad" placeholderTextColor="#6d8090" />
              <TextInput style={styles.input} value={form.licenseInfo.ownerTcIdentityNo ?? ''} onChangeText={(value) => setForm((current) => ({ ...current, licenseInfo: { ...current.licenseInfo, ownerTcIdentityNo: value } }))} placeholder="Ruhsat sahibi TC" placeholderTextColor="#6d8090" />
              <View style={styles.toggleRow}>
                <Pressable onPress={() => patchForm('tradeAvailable', !form.tradeAvailable)} style={[styles.toggleChip, form.tradeAvailable ? styles.choiceChipActive : null]}>
                  <Text style={styles.choiceChipLabel}>Takas {form.tradeAvailable ? 'Acik' : 'Kapali'}</Text>
                </Pressable>
                <Pressable onPress={() => patchForm('showPhone', !form.showPhone)} style={[styles.toggleChip, form.showPhone ? styles.choiceChipActive : null]}>
                  <Text style={styles.choiceChipLabel}>Telefon {form.showPhone ? 'Acik' : 'Kapali'}</Text>
                </Pressable>
              </View>
            </View>

            <View style={styles.sectionCard}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Ilan medyasi</Text>
                <Pressable onPress={() => void handleListingMediaPick()}>
                  <Text style={styles.inlineLink}>{uploading ? 'Yukleniyor...' : 'Galeri sec'}</Text>
                </Pressable>
              </View>
              {!listingUploads.length ? <Text style={styles.helperCopy}>En az 3 gorsel veya video yukleyin.</Text> : null}
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.previewRow}>
                {listingUploads.map((item) => (
                  <Pressable key={item.id} onPress={() => setListingUploads((current) => current.filter((entry) => entry.id !== item.id))} style={styles.previewCard}>
                    <MobileMediaView autoPlay={item.mimeType.startsWith('video/')} loop={item.mimeType.startsWith('video/')} mediaType={inferMediaType(item.mimeType)} muted style={styles.previewImage} uri={item.url} />
                  </Pressable>
                ))}
              </ScrollView>
            </View>

            <View style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>Boya / Degisen</Text>
              <VehicleDamageMap editable value={form.damageParts ?? createEmptyDamageParts()} onChange={(nextValue) => patchForm('damageParts', nextValue)} />
            </View>

            <Pressable onPress={() => void handleSubmit()} style={styles.primaryButton}>
              <Text style={styles.primaryButtonLabel}>{submitting ? 'Ilan hazirlaniyor...' : 'Ilani paylas'}</Text>
            </Pressable>
          </>
        ) : null}
      </ScrollView>
    </MobileShell>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
  },
  content: {
    gap: 16,
    paddingBottom: 24,
  },
  banner: {
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
  },
  errorBanner: {
    borderColor: '#fecaca',
    backgroundColor: '#fff5f5',
  },
  bannerText: {
    color: mobileTheme.colors.textStrong,
    lineHeight: 20,
  },
  loadingCard: {
    paddingVertical: 32,
    alignItems: 'center',
    gap: 10,
    borderRadius: 22,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: mobileTheme.colors.border,
  },
  loadingText: {
    color: mobileTheme.colors.textMuted,
  },
  emptyCard: {
    gap: 10,
    padding: 22,
    borderRadius: 22,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: mobileTheme.colors.border,
  },
  emptyTitle: {
    color: mobileTheme.colors.textStrong,
    fontSize: 20,
    fontWeight: '700',
  },
  emptyCopy: {
    color: mobileTheme.colors.textMuted,
    lineHeight: 22,
  },
  sectionCard: {
    gap: 12,
    padding: 18,
    borderRadius: 22,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: mobileTheme.colors.border,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  sectionTitle: {
    color: mobileTheme.colors.textStrong,
    fontSize: 18,
    fontWeight: '700',
  },
  selectedVehicleCopy: {
    color: mobileTheme.colors.textMuted,
  },
  inlineLink: {
    color: mobileTheme.colors.textStrong,
    fontSize: 13,
    fontWeight: '700',
  },
  vehicleTile: {
    width: 140,
    gap: 8,
  },
  vehicleTileActive: {
    opacity: 1,
  },
  vehicleTileImage: {
    width: 140,
    height: 140,
    borderRadius: 18,
  },
  vehicleTileFallback: {
    width: 140,
    height: 140,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#eef1f4',
  },
  vehicleTileFallbackLabel: {
    color: '#9aa3af',
    fontWeight: '700',
  },
  vehicleTileTitle: {
    color: mobileTheme.colors.textStrong,
    fontWeight: '700',
  },
  vehicleTileMeta: {
    color: mobileTheme.colors.textMuted,
    fontSize: 12,
  },
  input: {
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 13,
    color: mobileTheme.colors.textStrong,
    backgroundColor: mobileTheme.colors.surfaceMuted,
    borderWidth: 1,
    borderColor: mobileTheme.colors.border,
  },
  textArea: {
    minHeight: 130,
    textAlignVertical: 'top',
  },
  choiceRow: {
    gap: 10,
  },
  choiceChip: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 14,
    backgroundColor: mobileTheme.colors.surfaceMuted,
    borderWidth: 1,
    borderColor: mobileTheme.colors.border,
  },
  choiceChipActive: {
    backgroundColor: '#eef2f6',
    borderColor: '#cfd8e3',
  },
  choiceChipLabel: {
    color: mobileTheme.colors.textStrong,
    fontWeight: '700',
  },
  toggleRow: {
    flexDirection: 'row',
    gap: 10,
    flexWrap: 'wrap',
  },
  toggleChip: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 14,
    backgroundColor: mobileTheme.colors.surfaceMuted,
    borderWidth: 1,
    borderColor: mobileTheme.colors.border,
  },
  helperCopy: {
    color: mobileTheme.colors.textMuted,
    lineHeight: 20,
  },
  previewRow: {
    gap: 10,
  },
  previewCard: {
    width: 108,
    height: 108,
    borderRadius: 18,
    overflow: 'hidden',
    backgroundColor: '#eef1f4',
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  primaryButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 18,
    backgroundColor: mobileTheme.colors.textStrong,
  },
  primaryButtonLabel: {
    color: '#ffffff',
    fontWeight: '800',
  },
});


