import { Redirect, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import type {
  CreateGarageVehicleRequest,
  GarageVehicleSummary,
  VehicleCatalogBrand,
  VehicleCatalogModel,
  VehicleCatalogPackage,
} from '@carloi-v4/types';
import {
  FuelType,
  MediaType,
  TransmissionType,
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
import { useAuth } from '../context/auth-context';
import { mobileListingsApi } from '../lib/listings-api';
import { fuelTypeLabels, transmissionLabels } from '../lib/listings-ui';

const vehicleTypeLabels: Record<VehicleType, string> = {
  [VehicleType.SEDAN]: 'Sedan',
  [VehicleType.SUV]: 'SUV',
  [VehicleType.HATCHBACK]: 'Hatchback',
  [VehicleType.COUPE]: 'Coupe',
  [VehicleType.PICKUP]: 'Pickup',
  [VehicleType.VAN]: 'Van',
  [VehicleType.MOTORCYCLE]: 'Motorcycle',
  [VehicleType.OTHER]: 'Other',
};

export default function GarageScreen() {
  const router = useRouter();
  const { session } = useAuth();
  const [vehicles, setVehicles] = useState<GarageVehicleSummary[]>([]);
  const [brands, setBrands] = useState<VehicleCatalogBrand[]>([]);
  const [models, setModels] = useState<VehicleCatalogModel[]>([]);
  const [packages, setPackages] = useState<VehicleCatalogPackage[]>([]);
  const [brandId, setBrandId] = useState('');
  const [modelId, setModelId] = useState('');
  const [packageId, setPackageId] = useState('');
  const [form, setForm] = useState<CreateGarageVehicleRequest>({
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
    isPublic: true,
    media: [{ url: '', mediaType: MediaType.IMAGE }],
  });
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const accessToken = session?.accessToken;

  useEffect(() => {
    if (!accessToken) {
      return;
    }

    setLoading(true);
    setErrorMessage(null);

    void Promise.all([
      mobileListingsApi.getGarageVehicles(token),
      mobileListingsApi.getBrands(),
    ])
      .then(([garageResponse, brandResponse]) => {
        setVehicles(garageResponse.items);
        setBrands(brandResponse);
      })
      .catch((error) => {
        setErrorMessage(error instanceof Error ? error.message : 'Garaj verileri yuklenemedi.');
      })
      .finally(() => setLoading(false));
  }, [accessToken]);

  useEffect(() => {
    if (!brandId) {
      setModels([]);
      setPackages([]);
      return;
    }

    void mobileListingsApi
      .getModels(brandId)
      .then(setModels)
      .catch(() => setModels([]));
  }, [brandId]);

  useEffect(() => {
    if (!modelId) {
      setPackages([]);
      return;
    }

    void mobileListingsApi
      .getPackages(modelId)
      .then(setPackages)
      .catch(() => setPackages([]));
  }, [modelId]);

  if (!accessToken) {
    return <Redirect href="/login" />;
  }

  const token: string = accessToken;

  function patchForm<K extends keyof CreateGarageVehicleRequest>(
    key: K,
    value: CreateGarageVehicleRequest[K],
  ) {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));
  }

  function patchMedia(index: number, value: string) {
    setForm((current) => ({
      ...current,
      media: (current.media ?? []).map((item, currentIndex) =>
        currentIndex === index ? { ...item, url: value } : item,
      ),
    }));
  }

  async function loadGarage() {
    const response = await mobileListingsApi.getGarageVehicles(token);
    setVehicles(response.items);
  }

  async function handleCreateVehicle() {
    const brand = brands.find((item) => item.id === brandId);
    const model = models.find((item) => item.id === modelId);
    const selectedPackage = packages.find((item) => item.id === packageId);

    if (!brand || !model || !selectedPackage) {
      setErrorMessage('Marka, model ve paket secimi zorunludur.');
      return;
    }

    setSubmitting(true);
    setErrorMessage(null);

    try {
      const response = await mobileListingsApi.createGarageVehicle(token, {
        ...form,
        vehiclePackageId: selectedPackage.id,
        brandText: brand.name,
        modelText: model.name,
        packageText: selectedPackage.name,
        media: (form.media ?? []).filter((item) => item.url.trim()),
      });

      await loadGarage();
      setNotice('Arac garaja eklendi. Mock OBD testi icin detay ekranina gecebilirsiniz.');
      setForm({
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
        isPublic: true,
        media: [{ url: '', mediaType: MediaType.IMAGE }],
      });
      setBrandId('');
      setModelId('');
      setPackageId('');
      router.push(`/garage/${response.vehicle.id}`);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Arac garaja eklenemedi.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <MobileShell
      title="Garajim"
      subtitle="Araclarini ekle, durumlarini gor ve Carloi Expertiz raporunu garajdan yonet."
    >
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <View style={styles.heroCard}>
          <View>
            <Text style={styles.heroEyebrow}>Ownership layer</Text>
            <Text style={styles.heroTitle}>Araclarin ve expertiz akisi tek yerde</Text>
            <Text style={styles.heroCopy}>
              Garajdan arac sec, mock OBD baglantisini baslat ve dilediginde ilana expertiz ekle.
            </Text>
          </View>
          <View style={styles.heroStats}>
            <View style={styles.heroStatCard}>
              <Text style={styles.heroStatValue}>{vehicles.length}</Text>
              <Text style={styles.heroStatLabel}>Toplam arac</Text>
            </View>
            <View style={styles.heroStatCard}>
              <Text style={styles.heroStatValue}>
                {vehicles.filter((vehicle) => vehicle.latestObdReportId).length}
              </Text>
              <Text style={styles.heroStatLabel}>Expertizli arac</Text>
            </View>
          </View>
        </View>

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
            <Text style={styles.loadingText}>Garaj verileri getiriliyor...</Text>
          </View>
        ) : null}

        {!loading && vehicles.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>Garajin bos</Text>
            <Text style={styles.emptyCopy}>
              Asagidaki hizli form ile ilk aracinizi ekleyin. Sonra detay sayfasindan mock OBD testi baslatabilirsiniz.
            </Text>
          </View>
        ) : null}

        {vehicles.map((vehicle) => (
          <Pressable
            key={vehicle.id}
            style={styles.vehicleCard}
            onPress={() => router.push(`/garage/${vehicle.id}`)}
          >
            <View style={styles.vehicleMediaWrap}>
              {vehicle.firstMediaUrl ? (
                <Image source={{ uri: vehicle.firstMediaUrl }} style={styles.vehicleMedia} resizeMode="cover" />
              ) : (
                <View style={styles.vehicleFallback}>
                  <Text style={styles.vehicleFallbackLabel}>GARAGE</Text>
                </View>
              )}
            </View>
            <View style={styles.vehicleBody}>
              <View style={styles.vehicleRow}>
                <View style={styles.vehicleCopy}>
                  <Text style={styles.vehicleTitle}>
                    {vehicle.brand} {vehicle.model}
                  </Text>
                  <Text style={styles.vehicleMeta}>
                    {vehicle.package ? `${vehicle.package} / ` : ''}
                    {vehicle.year} / {vehicle.plateNumberMasked}
                  </Text>
                </View>
                <Text style={styles.vehicleBadge}>{vehicle.isPublic ? 'Public' : 'Private'}</Text>
              </View>
              <View style={styles.vehicleRow}>
                <Text style={styles.vehicleMeta}>{vehicle.km.toLocaleString('tr-TR')} km</Text>
                <Text style={styles.vehicleScore}>
                  {vehicle.latestObdReportId
                    ? `Expertiz ${vehicle.latestObdReportScore ?? '-'}`
                    : 'Expertiz yok'}
                </Text>
              </View>
              <View style={styles.cardActions}>
                <Pressable
                  onPress={() => router.push(`/garage/${vehicle.id}`)}
                  style={styles.secondaryButton}
                >
                  <Text style={styles.secondaryButtonLabel}>Detay</Text>
                </Pressable>
                <Pressable onPress={() => router.push('/create-listing')} style={styles.secondaryButton}>
                  <Text style={styles.secondaryButtonLabel}>Ilana cik</Text>
                </Pressable>
              </View>
            </View>
          </Pressable>
        ))}

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Arac ekle</Text>
          <Text style={styles.sectionCopy}>
            Katalog secimi ile hizli garaj kaydi olusturun. Medya URL alanlari simdilik fake olabilir.
          </Text>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.choiceRow}>
            {Object.values(VehicleType).map((vehicleType) => (
              <Pressable
                key={vehicleType}
                onPress={() => patchForm('vehicleType', vehicleType)}
                style={[
                  styles.choiceChip,
                  form.vehicleType === vehicleType ? styles.choiceChipActive : null,
                ]}
              >
                <Text style={styles.choiceChipLabel}>{vehicleTypeLabels[vehicleType]}</Text>
              </Pressable>
            ))}
          </ScrollView>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.choiceRow}>
            {brands.map((brand) => (
              <Pressable
                key={brand.id}
                onPress={() => {
                  setBrandId(brand.id);
                  setModelId('');
                  setPackageId('');
                }}
                style={[styles.choiceChip, brandId === brand.id ? styles.choiceChipActive : null]}
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
                  setModelId(model.id);
                  setPackageId('');
                }}
                style={[styles.choiceChip, modelId === model.id ? styles.choiceChipActive : null]}
              >
                <Text style={styles.choiceChipLabel}>{model.name}</Text>
              </Pressable>
            ))}
          </ScrollView>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.choiceRow}>
            {packages.map((item) => (
              <Pressable
                key={item.id}
                onPress={() => setPackageId(item.id)}
                style={[styles.choiceChip, packageId === item.id ? styles.choiceChipActive : null]}
              >
                <Text style={styles.choiceChipLabel}>{item.name}</Text>
              </Pressable>
            ))}
          </ScrollView>

          <TextInput
            style={styles.input}
            value={String(form.year)}
            onChangeText={(value) => patchForm('year', Number(value))}
            keyboardType="numeric"
            placeholder="Yil"
            placeholderTextColor="#6d8090"
          />
          <TextInput
            style={styles.input}
            value={form.plateNumber}
            onChangeText={(value) => patchForm('plateNumber', value)}
            placeholder="Plaka"
            placeholderTextColor="#6d8090"
          />
          <TextInput
            style={styles.input}
            value={form.color ?? ''}
            onChangeText={(value) => patchForm('color', value)}
            placeholder="Renk"
            placeholderTextColor="#6d8090"
          />
          <TextInput
            style={styles.input}
            value={String(form.km)}
            onChangeText={(value) => patchForm('km', Number(value))}
            keyboardType="numeric"
            placeholder="KM"
            placeholderTextColor="#6d8090"
          />

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.choiceRow}>
            {Object.values(FuelType).map((fuelType) => (
              <Pressable
                key={fuelType}
                onPress={() => patchForm('fuelType', fuelType)}
                style={[
                  styles.choiceChip,
                  form.fuelType === fuelType ? styles.choiceChipActive : null,
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
                onPress={() => patchForm('transmissionType', transmissionType)}
                style={[
                  styles.choiceChip,
                  form.transmissionType === transmissionType ? styles.choiceChipActive : null,
                ]}
              >
                <Text style={styles.choiceChipLabel}>{transmissionLabels[transmissionType]}</Text>
              </Pressable>
            ))}
          </ScrollView>

          <View style={styles.toggleRow}>
            <Pressable
              onPress={() => patchForm('isPublic', !form.isPublic)}
              style={[styles.toggleChip, form.isPublic ? styles.choiceChipActive : null]}
            >
              <Text style={styles.choiceChipLabel}>Public garage {form.isPublic ? 'Acik' : 'Kapali'}</Text>
            </Pressable>
          </View>

          <View style={styles.sectionRow}>
            <Text style={styles.sectionTitle}>Medya URL</Text>
            <Pressable
              onPress={() =>
                (form.media?.length ?? 0) < 6 &&
                patchForm('media', [...(form.media ?? []), { url: '', mediaType: MediaType.IMAGE }])
              }
              style={styles.secondaryPill}
            >
              <Text style={styles.secondaryPillLabel}>Medya ekle</Text>
            </Pressable>
          </View>
          {(form.media ?? []).map((mediaItem, index) => (
            <TextInput
              key={`${index}-${mediaItem.url}`}
              style={styles.input}
              value={mediaItem.url}
              onChangeText={(value) => patchMedia(index, value)}
              placeholder={`Medya URL ${index + 1}`}
              placeholderTextColor="#6d8090"
            />
          ))}

          <Pressable onPress={() => void handleCreateVehicle()} style={styles.primaryButton}>
            <Text style={styles.primaryButtonLabel}>
              {submitting ? 'Garaja ekleniyor...' : 'Araci garaja ekle'}
            </Text>
          </Pressable>
        </View>
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
  heroCard: {
    gap: 16,
    padding: 22,
    borderRadius: 28,
    backgroundColor: '#0d1d2a',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  heroEyebrow: {
    color: '#ffd6c2',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.4,
    textTransform: 'uppercase',
  },
  heroTitle: {
    marginTop: 8,
    color: '#f8f2ea',
    fontSize: 26,
    fontWeight: '800',
    lineHeight: 30,
  },
  heroCopy: {
    marginTop: 8,
    color: '#c7d3dc',
    lineHeight: 21,
  },
  heroStats: {
    flexDirection: 'row',
    gap: 10,
  },
  heroStatCard: {
    flex: 1,
    padding: 14,
    borderRadius: 20,
    backgroundColor: '#102030',
  },
  heroStatValue: {
    color: '#f8f2ea',
    fontSize: 24,
    fontWeight: '900',
  },
  heroStatLabel: {
    color: '#9cb0be',
    marginTop: 4,
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
  emptyCard: {
    gap: 8,
    padding: 20,
    borderRadius: 24,
    backgroundColor: '#102030',
  },
  emptyTitle: {
    color: '#f8f2ea',
    fontSize: 20,
    fontWeight: '800',
  },
  emptyCopy: {
    color: '#afbdc8',
    lineHeight: 20,
  },
  vehicleCard: {
    flexDirection: 'row',
    gap: 14,
    padding: 14,
    borderRadius: 24,
    backgroundColor: '#0d1d2a',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  vehicleMediaWrap: {
    width: 112,
    aspectRatio: 1,
    borderRadius: 22,
    overflow: 'hidden',
    backgroundColor: '#08131d',
  },
  vehicleMedia: {
    width: '100%',
    height: '100%',
  },
  vehicleFallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  vehicleFallbackLabel: {
    color: '#ffd6c2',
    fontWeight: '800',
    letterSpacing: 1.3,
  },
  vehicleBody: {
    flex: 1,
    gap: 12,
  },
  vehicleCopy: {
    flex: 1,
    gap: 5,
  },
  vehicleRow: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  vehicleTitle: {
    color: '#f8f2ea',
    fontSize: 18,
    fontWeight: '800',
  },
  vehicleMeta: {
    color: '#9cb0be',
    lineHeight: 19,
  },
  vehicleBadge: {
    color: '#ffd6c2',
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  vehicleScore: {
    color: '#f8f2ea',
    fontWeight: '700',
  },
  cardActions: {
    flexDirection: 'row',
    gap: 10,
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
  sectionCopy: {
    color: '#9cb0be',
    lineHeight: 20,
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
  secondaryButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
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
