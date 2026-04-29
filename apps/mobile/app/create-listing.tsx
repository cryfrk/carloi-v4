import { Redirect, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import type {
  CreateGarageVehicleRequest,
  CreateListingRequest,
  GarageVehicleOption,
  ListingDamagePartInput,
  VehicleCatalogBrand,
  VehicleCatalogModel,
  VehicleCatalogPackage,
} from '@carloi-v4/types';
import {
  DamageStatus,
  FuelType,
  MediaAssetPurpose,
  MediaType,
  SellerType,
  TransmissionType,
  UserType,
  VEHICLE_DAMAGE_PARTS,
  VehicleType,
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
import { VehicleDamageMap } from '../components/vehicle-damage-map';
import { useAuth } from '../context/auth-context';
import { mobileListingsApi } from '../lib/listings-api';
import { mobileMediaApi, type ReactNativeUploadFile } from '../lib/media-api';
import { pickMediaFiles } from '../lib/upload-picker';
import { fuelTypeLabels, sellerTypeLabels, transmissionLabels } from '../lib/listings-ui';

function createEmptyDamageParts(): ListingDamagePartInput[] {
  return VEHICLE_DAMAGE_PARTS.map((partName) => ({
    partName,
    damageStatus: DamageStatus.NONE,
  }));
}

export default function CreateListingScreen() {
  const router = useRouter();
  const { session } = useAuth();
  const [garageVehicles, setGarageVehicles] = useState<GarageVehicleOption[]>([]);
  const [brands, setBrands] = useState<VehicleCatalogBrand[]>([]);
  const [models, setModels] = useState<VehicleCatalogModel[]>([]);
  const [packages, setPackages] = useState<VehicleCatalogPackage[]>([]);
  const [garageBrandId, setGarageBrandId] = useState('');
  const [garageModelId, setGarageModelId] = useState('');
  const [garagePackageId, setGaragePackageId] = useState('');
  const [garageForm, setGarageForm] = useState<CreateGarageVehicleRequest>({
    vehicleType: VehicleType.SEDAN,
    brandText: '',
    modelText: '',
    packageText: '',
    year: new Date().getFullYear(),
    plateNumber: '',
    color: '',
    fuelType: FuelType.GASOLINE,
    transmissionType: TransmissionType.MANUAL,
    km: 0,
    isPublic: false,
  });
  const [form, setForm] = useState<CreateListingRequest>({
    garageVehicleId: '',
    title: '',
    description: '',
    price: 0,
    currency: 'TRY',
    city: '',
    district: '',
    sellerType: SellerType.OWNER,
    tradeAvailable: false,
    media: [{ url: '' }, { url: '' }, { url: '' }],
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
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [creatingGarageVehicle, setCreatingGarageVehicle] = useState(false);
  const [garageMediaUploads, setGarageMediaUploads] = useState<Array<{ id: string; url: string; mimeType: string }>>([]);
  const [listingMediaUploads, setListingMediaUploads] = useState<Array<{ id: string; url: string; mimeType: string }>>([]);
  const [garageMediaUploading, setGarageMediaUploading] = useState(false);
  const [listingMediaUploading, setListingMediaUploading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const accessToken = session?.accessToken;
  const selectedGarageVehicle =
    garageVehicles.find((item) => item.id === form.garageVehicleId) ?? null;

  useEffect(() => {
    if (!accessToken) {
      return;
    }

    setLoading(true);

    void Promise.all([
      mobileListingsApi.getGarageVehicles(accessToken),
      mobileListingsApi.getBrands(),
    ])
      .then(([garageResponse, brandResponse]) => {
        setGarageVehicles(garageResponse.items);
        setBrands(brandResponse);
        setForm((current) => ({
          ...current,
          garageVehicleId: current.garageVehicleId || garageResponse.items[0]?.id || '',
          sellerType:
            session?.user.userType === UserType.COMMERCIAL ? current.sellerType : SellerType.OWNER,
          licenseInfo: {
            ...current.licenseInfo,
            ownerFirstName: current.licenseInfo.ownerFirstName || session?.user.firstName || '',
            ownerLastName: current.licenseInfo.ownerLastName || session?.user.lastName || '',
          },
          contactPhone: current.contactPhone || session?.user.phone || '',
        }));
      })
      .catch((error) => {
        setErrorMessage(error instanceof Error ? error.message : 'Veriler yuklenemedi.');
      })
      .finally(() => setLoading(false));
  }, [
    accessToken,
    session?.user.firstName,
    session?.user.lastName,
    session?.user.phone,
    session?.user.userType,
  ]);

  useEffect(() => {
    if (!garageBrandId) {
      setModels([]);
      setPackages([]);
      return;
    }

    void mobileListingsApi
      .getModels(garageBrandId)
      .then(setModels)
      .catch(() => setModels([]));
  }, [garageBrandId]);

  useEffect(() => {
    if (!garageModelId) {
      setPackages([]);
      return;
    }

    void mobileListingsApi
      .getPackages(garageModelId)
      .then(setPackages)
      .catch(() => setPackages([]));
  }, [garageModelId]);

  if (!accessToken) {
    return <Redirect href="/login" />;
  }

  const token: string = accessToken;

  function patchForm<K extends keyof CreateListingRequest>(key: K, value: CreateListingRequest[K]) {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));
  }

  function patchGarageForm<K extends keyof CreateGarageVehicleRequest>(
    key: K,
    value: CreateGarageVehicleRequest[K],
  ) {
    setGarageForm((current) => ({
      ...current,
      [key]: value,
    }));
  }

  function inferMediaType(mimeType: string) {
    return mimeType.startsWith('video/') ? MediaType.VIDEO : MediaType.IMAGE;
  }

  async function uploadMediaFiles(
    files: ReactNativeUploadFile[],
    purpose: MediaAssetPurpose,
    onComplete: (uploads: Array<{ id: string; url: string; mimeType: string }>) => void,
  ) {
    const uploads = await mobileMediaApi.uploadFiles(token, files, purpose);
    onComplete(
      uploads.map((item) => ({
        id: item.id,
        url: item.url,
        mimeType: item.mimeType,
      })),
    );
  }

  async function handleGarageMediaPick() {
    setGarageMediaUploading(true);
    setErrorMessage(null);

    try {
      const files = await pickMediaFiles({ allowsMultipleSelection: true });
      if (!files.length) {
        return;
      }

      await uploadMediaFiles(files, MediaAssetPurpose.GARAGE_VEHICLE_MEDIA, (uploads) => {
        setGarageMediaUploads((current) => [...current, ...uploads].slice(0, 10));
      });
      setNotice('Garaj medyasi yuklendi.');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Garaj medyasi yuklenemedi.');
    } finally {
      setGarageMediaUploading(false);
    }
  }

  async function handleListingMediaPick() {
    setListingMediaUploading(true);
    setErrorMessage(null);

    try {
      const files = await pickMediaFiles({ allowsMultipleSelection: true });
      if (!files.length) {
        return;
      }

      await uploadMediaFiles(files, MediaAssetPurpose.LISTING_MEDIA, (uploads) => {
        setListingMediaUploads((current) => [...current, ...uploads].slice(0, 20));
      });
      setNotice('Ilan medyasi yuklendi.');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Ilan medyasi yuklenemedi.');
    } finally {
      setListingMediaUploading(false);
    }
  }

  async function handleCreateGarageVehicle() {
    const brand = brands.find((item) => item.id === garageBrandId);
    const model = models.find((item) => item.id === garageModelId);
    const selectedPackage = packages.find((item) => item.id === garagePackageId);

    if (!brand || !model || !selectedPackage) {
      setErrorMessage('Marka, model ve paket secimi zorunludur.');
      return;
    }

    setCreatingGarageVehicle(true);
    setErrorMessage(null);

    try {
      const response = await mobileListingsApi.createGarageVehicle(token, {
        ...garageForm,
        vehiclePackageId: selectedPackage.id,
        brandText: brand.name,
        modelText: model.name,
        packageText: selectedPackage.name,
        media: garageMediaUploads.map((item) => ({
          url: item.url,
          mediaAssetId: item.id,
          mediaType: inferMediaType(item.mimeType),
        })),
      });

      const garageResponse = await mobileListingsApi.getGarageVehicles(token);
      setGarageVehicles(garageResponse.items);
      setForm((current) => ({
        ...current,
        garageVehicleId: response.vehicle.id,
        obdExpertiseReportId: undefined,
      }));
      setGarageMediaUploads([]);
      setNotice('Garaj araci eklendi ve secildi.');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Garaj araci olusturulamadi.');
    } finally {
      setCreatingGarageVehicle(false);
    }
  }

  async function handleSubmit() {
    const media = listingMediaUploads.map((item) => ({
      url: item.url,
      mediaAssetId: item.id,
      mediaType: inferMediaType(item.mimeType),
    }));

    if (media.length < 3) {
      setErrorMessage('En az 3 ilan medyasi yuklemelisiniz.');
      return;
    }

    if (!form.garageVehicleId) {
      setErrorMessage('Ilan icin bir garaj araci secin.');
      return;
    }

    if (form.obdExpertiseReportId && !selectedGarageVehicle?.latestObdReportId) {
      setErrorMessage('Once garajdan Carloi expertiz olusturmalisiniz.');
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
    <MobileShell
      title="Ilan ver"
      subtitle="Garaj aracinizi secin, ruhsat bilgilerini ekleyin ve medyalari gercek upload hattiyla yayina alin."
    >
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
            <Text style={styles.loadingText}>Garaj ve katalog verileri getiriliyor...</Text>
          </View>
        ) : (
          <>
            <View style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>Garaj secimi</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.choiceRow}>
                {garageVehicles.map((vehicle) => (
                  <Pressable
                    key={vehicle.id}
                    onPress={() =>
                      setForm((current) => ({
                        ...current,
                        garageVehicleId: vehicle.id,
                        obdExpertiseReportId: undefined,
                      }))
                    }
                    style={[
                      styles.choiceChip,
                      form.garageVehicleId === vehicle.id ? styles.choiceChipActive : null,
                    ]}
                  >
                    <Text style={styles.choiceChipLabel}>
                      {vehicle.brand} {vehicle.model}
                    </Text>
                    <Text style={styles.choiceChipMeta}>{vehicle.plateMasked}</Text>
                  </Pressable>
                ))}
              </ScrollView>

              <Pressable
                onPress={() => {
                  if (!selectedGarageVehicle?.latestObdReportId) {
                    setNotice('Bu arac icin expertiz yok. Once Garajim ekranindan mock OBD testi baslatin.');
                    patchForm('obdExpertiseReportId', undefined);
                    return;
                  }

                  patchForm(
                    'obdExpertiseReportId',
                    form.obdExpertiseReportId ? undefined : selectedGarageVehicle.latestObdReportId,
                  );
                }}
                style={[
                  styles.toggleCard,
                  form.obdExpertiseReportId ? styles.toggleCardActive : null,
                ]}
              >
                <View style={styles.toggleCopy}>
                  <Text style={styles.toggleTitle}>Carloi Expertiz ekle</Text>
                  <Text style={styles.toggleMeta}>
                    {selectedGarageVehicle?.latestObdReportId
                      ? `Rapor skoru: ${selectedGarageVehicle.latestObdReportScore ?? '-'}`
                      : 'Bu arac icin henuz expertiz raporu yok'}
                  </Text>
                </View>
                <Text style={styles.toggleBadge}>
                  {form.obdExpertiseReportId ? 'Acik' : 'Kapali'}
                </Text>
              </Pressable>
            </View>

            <View style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>Hizli garaj kaydi</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.choiceRow}>
                {brands.map((brand) => (
                  <Pressable
                    key={brand.id}
                    onPress={() => {
                      setGarageBrandId(brand.id);
                      setGarageModelId('');
                      setGaragePackageId('');
                    }}
                    style={[
                      styles.choiceChip,
                      garageBrandId === brand.id ? styles.choiceChipActive : null,
                    ]}
                  >
                    <Text style={styles.choiceChipLabel}>{brand.name}</Text>
                  </Pressable>
                ))}
              </ScrollView>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.choiceRow}>
                {models.map((model) => (
                  <Pressable
                    key={model.id}
                    onPress={() => {
                      setGarageModelId(model.id);
                      setGaragePackageId('');
                    }}
                    style={[
                      styles.choiceChip,
                      garageModelId === model.id ? styles.choiceChipActive : null,
                    ]}
                  >
                    <Text style={styles.choiceChipLabel}>{model.name}</Text>
                  </Pressable>
                ))}
              </ScrollView>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.choiceRow}>
                {packages.map((item) => (
                  <Pressable
                    key={item.id}
                    onPress={() => setGaragePackageId(item.id)}
                    style={[
                      styles.choiceChip,
                      garagePackageId === item.id ? styles.choiceChipActive : null,
                    ]}
                  >
                    <Text style={styles.choiceChipLabel}>{item.name}</Text>
                  </Pressable>
                ))}
              </ScrollView>
              <TextInput
                style={styles.input}
                value={String(garageForm.year)}
                onChangeText={(value) => patchGarageForm('year', Number(value))}
                keyboardType="numeric"
                placeholder="Yil"
                placeholderTextColor="#6d8090"
              />
              <TextInput
                style={styles.input}
                value={garageForm.plateNumber}
                onChangeText={(value) => patchGarageForm('plateNumber', value)}
                placeholder="Plaka"
                placeholderTextColor="#6d8090"
              />
              <TextInput
                style={styles.input}
                value={garageForm.color ?? ''}
                onChangeText={(value) => patchGarageForm('color', value)}
                placeholder="Renk"
                placeholderTextColor="#6d8090"
              />
              <TextInput
                style={styles.input}
                value={String(garageForm.km)}
                onChangeText={(value) => patchGarageForm('km', Number(value))}
                keyboardType="numeric"
                placeholder="KM"
                placeholderTextColor="#6d8090"
              />
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.choiceRow}>
                {Object.values(FuelType).map((fuelType) => (
                  <Pressable
                    key={fuelType}
                    onPress={() => patchGarageForm('fuelType', fuelType)}
                    style={[
                      styles.choiceChip,
                      garageForm.fuelType === fuelType ? styles.choiceChipActive : null,
                    ]}
                  >
                    <Text style={styles.choiceChipLabel}>{fuelTypeLabels[fuelType]}</Text>
                  </Pressable>
                ))}
              </ScrollView>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.choiceRow}>
                {Object.values(TransmissionType).map((transmissionType) => (
                  <Pressable
                    key={transmissionType}
                    onPress={() => patchGarageForm('transmissionType', transmissionType)}
                    style={[
                      styles.choiceChip,
                      garageForm.transmissionType === transmissionType
                        ? styles.choiceChipActive
                        : null,
                    ]}
                  >
                    <Text style={styles.choiceChipLabel}>{transmissionLabels[transmissionType]}</Text>
                  </Pressable>
                ))}
              </ScrollView>
              <View style={styles.mediaUploadCard}>
                <View style={styles.sectionRow}>
                  <Text style={styles.mediaUploadTitle}>Garaj araci fotograflari</Text>
                  <Pressable onPress={() => void handleGarageMediaPick()} style={styles.secondaryPill}>
                    <Text style={styles.secondaryPillLabel}>
                      {garageMediaUploading ? 'Yukleniyor...' : 'Galeriden sec'}
                    </Text>
                  </Pressable>
                </View>
                {!garageMediaUploads.length ? (
                  <Text style={styles.mediaUploadHint}>Araciniz icin isterseniz foto ekleyin. Ilanda da kullanilabilir.</Text>
                ) : (
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.uploadPreviewRow}>
                    {garageMediaUploads.map((item) => (
                      <Pressable
                        key={item.id}
                        onPress={() => setGarageMediaUploads((current) => current.filter((entry) => entry.id !== item.id))}
                        style={styles.uploadPreviewCard}
                      >
                        <Image source={{ uri: item.url }} style={styles.uploadPreviewImage} />
                        <Text style={styles.uploadPreviewMeta}>Sil</Text>
                      </Pressable>
                    ))}
                  </ScrollView>
                )}
              </View>
              <Pressable onPress={() => void handleCreateGarageVehicle()} style={styles.secondaryButton}>
                <Text style={styles.secondaryButtonLabel}>
                  {creatingGarageVehicle ? 'Garaja ekleniyor...' : 'Araci garaja ekle'}
                </Text>
              </Pressable>
            </View>

            <View style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>Ilan bilgileri</Text>
              <TextInput
                style={styles.input}
                value={form.title}
                onChangeText={(value) => patchForm('title', value)}
                placeholder="Baslik"
                placeholderTextColor="#6d8090"
              />
              <TextInput
                style={[styles.input, styles.textArea]}
                value={form.description}
                onChangeText={(value) => patchForm('description', value)}
                placeholder="Aciklama"
                placeholderTextColor="#6d8090"
                multiline
                maxLength={600}
              />
              <TextInput
                style={styles.input}
                value={form.price ? String(form.price) : ''}
                onChangeText={(value) => patchForm('price', Number(value))}
                keyboardType="numeric"
                placeholder="Fiyat"
                placeholderTextColor="#6d8090"
              />
              <TextInput
                style={styles.input}
                value={form.city}
                onChangeText={(value) => patchForm('city', value)}
                placeholder="Sehir"
                placeholderTextColor="#6d8090"
              />
              <TextInput
                style={styles.input}
                value={form.district ?? ''}
                onChangeText={(value) => patchForm('district', value)}
                placeholder="Ilce"
                placeholderTextColor="#6d8090"
              />
              {session.user.userType === UserType.COMMERCIAL ? (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.choiceRow}>
                  {Object.values(SellerType).map((sellerType) => (
                    <Pressable
                      key={sellerType}
                      onPress={() => patchForm('sellerType', sellerType)}
                      style={[
                        styles.choiceChip,
                        form.sellerType === sellerType ? styles.choiceChipActive : null,
                      ]}
                    >
                      <Text style={styles.choiceChipLabel}>{sellerTypeLabels[sellerType]}</Text>
                    </Pressable>
                  ))}
                </ScrollView>
              ) : null}
              <TextInput
                style={styles.input}
                value={form.contactPhone ?? ''}
                onChangeText={(value) => patchForm('contactPhone', value)}
                placeholder="Iletisim telefonu"
                placeholderTextColor="#6d8090"
              />
              <TextInput
                style={styles.input}
                value={form.licenseInfo.plateNumber}
                onChangeText={(value) =>
                  setForm((current) => ({
                    ...current,
                    licenseInfo: {
                      ...current.licenseInfo,
                      plateNumber: value,
                    },
                  }))
                }
                placeholder="Ruhsat plakasi"
                placeholderTextColor="#6d8090"
              />
              <TextInput
                style={styles.input}
                value={form.licenseInfo.ownerFirstName}
                onChangeText={(value) =>
                  setForm((current) => ({
                    ...current,
                    licenseInfo: {
                      ...current.licenseInfo,
                      ownerFirstName: value,
                    },
                  }))
                }
                placeholder="Ruhsat sahibi ad"
                placeholderTextColor="#6d8090"
              />
              <TextInput
                style={styles.input}
                value={form.licenseInfo.ownerLastName}
                onChangeText={(value) =>
                  setForm((current) => ({
                    ...current,
                    licenseInfo: {
                      ...current.licenseInfo,
                      ownerLastName: value,
                    },
                  }))
                }
                placeholder="Ruhsat sahibi soyad"
                placeholderTextColor="#6d8090"
              />
              <TextInput
                style={styles.input}
                value={form.licenseInfo.ownerTcIdentityNo ?? ''}
                onChangeText={(value) =>
                  setForm((current) => ({
                    ...current,
                    licenseInfo: {
                      ...current.licenseInfo,
                      ownerTcIdentityNo: value,
                    },
                  }))
                }
                placeholder="Ruhsat sahibi TC"
                placeholderTextColor="#6d8090"
              />

              <View style={styles.toggleRow}>
                <Pressable
                  onPress={() => patchForm('tradeAvailable', !form.tradeAvailable)}
                  style={[styles.toggleChip, form.tradeAvailable ? styles.choiceChipActive : null]}
                >
                  <Text style={styles.choiceChipLabel}>Takas {form.tradeAvailable ? 'Acik' : 'Kapali'}</Text>
                </Pressable>
                <Pressable
                  onPress={() => patchForm('showPhone', !form.showPhone)}
                  style={[styles.toggleChip, form.showPhone ? styles.choiceChipActive : null]}
                >
                  <Text style={styles.choiceChipLabel}>Telefon {form.showPhone ? 'Acik' : 'Kapali'}</Text>
                </Pressable>
              </View>
            </View>

            <View style={styles.sectionCard}>
              <View style={styles.sectionRow}>
                <Text style={styles.sectionTitle}>Ilan medyasi</Text>
                <Pressable onPress={() => void handleListingMediaPick()} style={styles.secondaryPill}>
                  <Text style={styles.secondaryPillLabel}>
                    {listingMediaUploading ? 'Yukleniyor...' : 'Galeri sec'}
                  </Text>
                </Pressable>
              </View>
              {!listingMediaUploads.length ? (
                <Text style={styles.mediaUploadHint}>En az 3 medya zorunlu. Gorsel veya video secip yukleyin.</Text>
              ) : (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.uploadPreviewRow}>
                  {listingMediaUploads.map((item) => (
                    <Pressable
                      key={item.id}
                      onPress={() => setListingMediaUploads((current) => current.filter((entry) => entry.id !== item.id))}
                      style={styles.uploadPreviewCard}
                    >
                      {inferMediaType(item.mimeType) === MediaType.IMAGE ? (
                        <Image source={{ uri: item.url }} style={styles.uploadPreviewImage} />
                      ) : (
                        <View style={[styles.uploadPreviewImage, styles.uploadPreviewVideo]}>
                          <Text style={styles.uploadPreviewMeta}>VIDEO</Text>
                        </View>
                      )}
                      <Text style={styles.uploadPreviewMeta}>Sil</Text>
                    </Pressable>
                  ))}
                </ScrollView>
              )}
            </View>

            <View style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>Boya / Degisen</Text>
              <VehicleDamageMap
                editable
                value={form.damageParts ?? createEmptyDamageParts()}
                onChange={(nextValue) => patchForm('damageParts', nextValue)}
              />
            </View>

            <Pressable onPress={() => void handleSubmit()} style={styles.primaryButton}>
              <Text style={styles.primaryButtonLabel}>
                {submitting ? 'Ilan hazirlaniyor...' : 'Ilani paylas'}
              </Text>
            </Pressable>
          </>
        )}
      </ScrollView>
    </MobileShell>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
  },
  content: {
    gap: 14,
    paddingBottom: 18,
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
  sectionCard: {
    gap: 12,
    padding: 18,
    borderRadius: 24,
    backgroundColor: '#0d1d2a',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  sectionTitle: {
    color: '#f8f2ea',
    fontSize: 18,
    fontWeight: '800',
  },
  sectionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
    alignItems: 'center',
  },
  input: {
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 13,
    color: '#f8f2ea',
    backgroundColor: '#08131d',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
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
    borderRadius: 16,
    backgroundColor: '#142636',
  },
  choiceChipActive: {
    backgroundColor: 'rgba(239,131,84,0.2)',
  },
  choiceChipLabel: {
    color: '#f8f2ea',
    fontWeight: '700',
  },
  choiceChipMeta: {
    color: '#9cb0be',
    marginTop: 3,
  },
  mediaUploadCard: {
    gap: 10,
    padding: 14,
    borderRadius: 20,
    backgroundColor: '#102030',
  },
  mediaUploadTitle: {
    color: '#f8f2ea',
    fontWeight: '700',
  },
  mediaUploadHint: {
    color: '#9cb0be',
    lineHeight: 20,
  },
  uploadPreviewRow: {
    gap: 10,
  },
  uploadPreviewCard: {
    width: 110,
    gap: 8,
  },
  uploadPreviewImage: {
    width: 110,
    height: 110,
    borderRadius: 18,
    backgroundColor: '#08131d',
  },
  uploadPreviewVideo: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  uploadPreviewMeta: {
    color: '#d7e2e8',
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
  },
  toggleRow: {
    flexDirection: 'row',
    gap: 10,
    flexWrap: 'wrap',
  },
  toggleChip: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 16,
    backgroundColor: '#142636',
  },
  toggleCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 20,
    backgroundColor: '#102030',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  toggleCardActive: {
    borderColor: 'rgba(239,131,84,0.28)',
    backgroundColor: 'rgba(239,131,84,0.14)',
  },
  toggleCopy: {
    flex: 1,
    gap: 4,
  },
  toggleTitle: {
    color: '#f8f2ea',
    fontSize: 15,
    fontWeight: '800',
  },
  toggleMeta: {
    color: '#9cb0be',
    lineHeight: 19,
  },
  toggleBadge: {
    color: '#ffd6c2',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  secondaryButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 18,
    backgroundColor: '#142636',
  },
  secondaryButtonLabel: {
    color: '#ffd6c2',
    fontWeight: '800',
  },
  secondaryPill: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 16,
    backgroundColor: '#142636',
  },
  secondaryPillLabel: {
    color: '#ffd6c2',
    fontWeight: '800',
  },
  primaryButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 20,
    backgroundColor: '#ef8354',
  },
  primaryButtonLabel: {
    color: '#08131d',
    fontWeight: '800',
  },
});
