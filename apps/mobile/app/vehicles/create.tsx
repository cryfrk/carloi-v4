import type {
  CreateGarageVehicleRequest,
  VehicleCatalogBrand,
  VehicleCatalogModel,
  VehicleCatalogPackage,
  VehiclePackageSpec,
} from '@carloi-v4/types';
import {
  FuelType,
  MediaAssetPurpose,
  MediaType,
  TransmissionType,
  VehicleType,
} from '@carloi-v4/types';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
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
import { MobileShell } from '../../components/mobile-shell';
import { useAuth } from '../../context/auth-context';
import { mobileTheme } from '../../lib/design-system';
import { fuelTypeLabels, transmissionLabels } from '../../lib/listings-ui';
import { mobileListingsApi } from '../../lib/listings-api';
import { mobileMediaApi, type ReactNativeUploadFile } from '../../lib/media-api';
import { pickMediaFiles } from '../../lib/upload-picker';

type VehicleCategory = 'AUTOMOBILE' | 'MOTORCYCLE' | 'COMMERCIAL';
type WizardStep = 1 | 2 | 3 | 4 | 5 | 6 | 7;

type UploadItem = {
  id: string;
  url: string;
  mimeType: string;
};

const STEPS: Array<{ step: WizardStep; label: string }> = [
  { step: 1, label: 'Vasita' },
  { step: 2, label: 'Marka' },
  { step: 3, label: 'Model' },
  { step: 4, label: 'Motor' },
  { step: 5, label: 'Detay' },
  { step: 6, label: 'Medya' },
  { step: 7, label: 'Yayin' },
];

const CATEGORY_OPTIONS: Array<{ key: VehicleCategory; title: string; copy: string }> = [
  { key: 'AUTOMOBILE', title: 'Otomobil', copy: 'Sedan, hatchback, SUV ve benzeri binek araclar.' },
  { key: 'MOTORCYCLE', title: 'Motosiklet', copy: 'Motosiklet ve benzeri iki tekerli araclar.' },
  { key: 'COMMERCIAL', title: 'Ticari', copy: 'Panelvan, pickup ve ticari kullanim odakli araclar.' },
];

function deriveVehicleType(category: VehicleCategory, spec: VehiclePackageSpec | null): VehicleType {
  const bodyType = spec?.bodyType?.toLocaleLowerCase('tr-TR') ?? '';

  if (category === 'MOTORCYCLE') {
    return VehicleType.MOTORCYCLE;
  }

  if (bodyType.includes('suv')) {
    return VehicleType.SUV;
  }

  if (bodyType.includes('hatch')) {
    return VehicleType.HATCHBACK;
  }

  if (bodyType.includes('coupe')) {
    return VehicleType.COUPE;
  }

  if (bodyType.includes('pick')) {
    return VehicleType.PICKUP;
  }

  if (bodyType.includes('van') || bodyType.includes('panel')) {
    return VehicleType.VAN;
  }

  if (category === 'COMMERCIAL') {
    return VehicleType.VAN;
  }

  return VehicleType.SEDAN;
}

export default function VehicleCreateScreen() {
  const router = useRouter();
  const { session } = useAuth();
  const [step, setStep] = useState<WizardStep>(1);
  const [category, setCategory] = useState<VehicleCategory>('AUTOMOBILE');
  const [brands, setBrands] = useState<VehicleCatalogBrand[]>([]);
  const [models, setModels] = useState<VehicleCatalogModel[]>([]);
  const [packages, setPackages] = useState<VehicleCatalogPackage[]>([]);
  const [selectedBrandId, setSelectedBrandId] = useState('');
  const [selectedModelId, setSelectedModelId] = useState('');
  const [selectedPackageId, setSelectedPackageId] = useState('');
  const [selectedSpec, setSelectedSpec] = useState<VehiclePackageSpec | null>(null);
  const [uploads, setUploads] = useState<UploadItem[]>([]);
  const [uploading, setUploading] = useState(false);
  const [loadingCatalog, setLoadingCatalog] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [form, setForm] = useState({
    year: new Date().getFullYear(),
    plateNumber: '',
    color: '',
    km: 0,
    fuelType: FuelType.GASOLINE,
    transmissionType: TransmissionType.AUTOMATIC,
    equipmentNotes: '',
    description: '',
    isPublic: true,
    showInExplore: false,
    openToOffers: false,
  });

  const accessToken = session?.accessToken;

  useEffect(() => {
    if (!accessToken) {
      return;
    }

    setLoadingCatalog(true);
    void mobileListingsApi
      .getBrands()
      .then(setBrands)
      .catch((error) => {
        setErrorMessage(error instanceof Error ? error.message : 'Arac katalogu yuklenemedi.');
      })
      .finally(() => setLoadingCatalog(false));
  }, [accessToken]);

  useEffect(() => {
    if (!selectedBrandId) {
      setModels([]);
      return;
    }

    void mobileListingsApi.getModels(selectedBrandId).then(setModels).catch(() => setModels([]));
  }, [selectedBrandId]);

  useEffect(() => {
    if (!selectedModelId) {
      setPackages([]);
      return;
    }

    void mobileListingsApi.getPackages(selectedModelId).then(setPackages).catch(() => setPackages([]));
  }, [selectedModelId]);

  useEffect(() => {
    if (!selectedPackageId) {
      setSelectedSpec(null);
      return;
    }

    void mobileListingsApi
      .getPackageSpec(selectedPackageId)
      .then((spec) => {
        setSelectedSpec(spec);
        setForm((current) => ({
          ...current,
          fuelType: spec.fuelType ?? current.fuelType,
          transmissionType: spec.transmissionType ?? current.transmissionType,
        }));
      })
      .catch(() => setSelectedSpec(null));
  }, [selectedPackageId]);

  const selectedBrand = brands.find((item) => item.id === selectedBrandId) ?? null;
  const selectedModel = models.find((item) => item.id === selectedModelId) ?? null;
  const selectedPackage = packages.find((item) => item.id === selectedPackageId) ?? null;

  function patchForm<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function canContinue(currentStep: WizardStep) {
    switch (currentStep) {
      case 1:
        return Boolean(category);
      case 2:
        return Boolean(selectedBrandId);
      case 3:
        return Boolean(selectedModelId && selectedPackageId && form.year);
      case 4:
        return Boolean(form.fuelType && form.transmissionType);
      case 5:
        return Boolean(form.km >= 0 && form.color.trim().length > 0);
      case 6:
        return uploads.length > 0;
      case 7:
        return true;
      default:
        return false;
    }
  }

  async function handleMediaPick() {
    if (!accessToken) {
      return;
    }

    setUploading(true);
    setErrorMessage(null);

    try {
      const files = await pickMediaFiles({ allowsMultipleSelection: true });
      if (!files.length) {
        return;
      }

      const uploaded = await mobileMediaApi.uploadFiles(accessToken, files, MediaAssetPurpose.GARAGE_VEHICLE_MEDIA);
      setUploads((current) => [
        ...current,
        ...uploaded.map((item) => ({
          id: item.id,
          url: item.url,
          mimeType: item.mimeType,
        })),
      ].slice(0, 12));
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Medyalar yuklenemedi.');
    } finally {
      setUploading(false);
    }
  }

  async function handleSubmit() {
    if (!accessToken || !selectedBrand || !selectedModel || !selectedPackage) {
      return;
    }

    if (!form.plateNumber.trim()) {
      setErrorMessage('Plaka bilgisi zorunludur.');
      return;
    }

    setSubmitting(true);
    setErrorMessage(null);

    try {
      const payload: CreateGarageVehicleRequest = {
        vehicleType: deriveVehicleType(category, selectedSpec),
        vehiclePackageId: selectedPackage.id,
        brandId: selectedBrand.id,
        modelId: selectedModel.id,
        brandText: selectedBrand.name,
        modelText: selectedModel.name,
        packageText: selectedPackage.name,
        year: Number(form.year),
        plateNumber: form.plateNumber,
        color: form.color,
        fuelType: form.fuelType,
        transmissionType: form.transmissionType,
        km: Number(form.km),
        description: form.description,
        equipmentNotes: form.equipmentNotes,
        isPublic: form.isPublic,
        showInExplore: form.showInExplore,
        openToOffers: form.openToOffers,
        media: uploads.map((item) => ({
          url: item.url,
          mediaAssetId: item.id,
          mediaType: item.mimeType.startsWith('video/') ? MediaType.VIDEO : MediaType.IMAGE,
        })),
      };

      const response = await mobileListingsApi.createGarageVehicle(accessToken, payload);
      router.replace(`/vehicles/${response.vehicle.id}`);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Arac kaydedilemedi.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <MobileShell title="Arac ekle" subtitle="Tek sayfa karmasasi yerine, adim adim temiz bir arac olusturma akisi.">
      {errorMessage ? <Text style={styles.error}>{errorMessage}</Text> : null}
      {loadingCatalog ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator color={mobileTheme.colors.textStrong} />
          <Text style={styles.loadingText}>Arac kutuphanesi hazirlaniyor...</Text>
        </View>
      ) : (
        <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.stepRow}>
            {STEPS.map((item) => (
              <View key={item.step} style={[styles.stepChip, step === item.step ? styles.stepChipActive : null]}>
                <Text style={[styles.stepChipLabel, step === item.step ? styles.stepChipLabelActive : null]}>{item.step}. {item.label}</Text>
              </View>
            ))}
          </ScrollView>

          <View style={styles.panel}>
            {step === 1 ? (
              <View style={styles.stack}>
                <Text style={styles.panelTitle}>Vasita tipini sec</Text>
                {CATEGORY_OPTIONS.map((option) => (
                  <Pressable
                    key={option.key}
                    style={[styles.optionCard, category === option.key ? styles.optionCardActive : null]}
                    onPress={() => setCategory(option.key)}
                  >
                    <Text style={styles.optionTitle}>{option.title}</Text>
                    <Text style={styles.optionCopy}>{option.copy}</Text>
                  </Pressable>
                ))}
              </View>
            ) : null}

            {step === 2 ? (
              <View style={styles.stack}>
                <Text style={styles.panelTitle}>Marka sec</Text>
                <View style={styles.selectorGrid}>
                  {brands.map((brand) => (
                    <Pressable
                      key={brand.id}
                      style={[styles.selectorChip, selectedBrandId === brand.id ? styles.selectorChipActive : null]}
                      onPress={() => {
                        setSelectedBrandId(brand.id);
                        setSelectedModelId('');
                        setSelectedPackageId('');
                      }}
                    >
                      <Text style={styles.selectorChipLabel}>{brand.name}</Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            ) : null}

            {step === 3 ? (
              <View style={styles.stack}>
                <Text style={styles.panelTitle}>Model, paket ve yil</Text>
                <View style={styles.selectorGrid}>
                  {models.map((model) => (
                    <Pressable
                      key={model.id}
                      style={[styles.selectorChip, selectedModelId === model.id ? styles.selectorChipActive : null]}
                      onPress={() => {
                        setSelectedModelId(model.id);
                        setSelectedPackageId('');
                      }}
                    >
                      <Text style={styles.selectorChipLabel}>{model.name}</Text>
                    </Pressable>
                  ))}
                </View>
                <View style={styles.selectorGrid}>
                  {packages.map((item) => (
                    <Pressable
                      key={item.id}
                      style={[styles.selectorChip, selectedPackageId === item.id ? styles.selectorChipActive : null]}
                      onPress={() => setSelectedPackageId(item.id)}
                    >
                      <Text style={styles.selectorChipLabel}>{item.name}</Text>
                    </Pressable>
                  ))}
                </View>
                <TextInput
                  style={styles.input}
                  value={String(form.year)}
                  keyboardType="numeric"
                  onChangeText={(value) => patchForm('year', Number(value))}
                  placeholder="Yil"
                  placeholderTextColor="#6b7280"
                />
              </View>
            ) : null}

            {step === 4 ? (
              <View style={styles.stack}>
                <Text style={styles.panelTitle}>Motor, yakit ve vites</Text>
                <View style={styles.summaryCard}>
                  <Text style={styles.summaryTitle}>{selectedBrand?.name} {selectedModel?.name}</Text>
                  <Text style={styles.summaryCopy}>
                    {selectedSpec?.bodyType ?? 'Govde tipi bekleniyor'} · {selectedSpec?.engineVolumeCc ? `${selectedSpec.engineVolumeCc} cc` : 'Motor hacmi yok'} · {selectedSpec?.enginePowerHp ? `${selectedSpec.enginePowerHp} hp` : 'Guc bilgisi yok'}
                  </Text>
                </View>
                <View style={styles.selectorGrid}>
                  {Object.values(FuelType).map((fuelType) => (
                    <Pressable
                      key={fuelType}
                      style={[styles.selectorChip, form.fuelType === fuelType ? styles.selectorChipActive : null]}
                      onPress={() => patchForm('fuelType', fuelType)}
                    >
                      <Text style={styles.selectorChipLabel}>{fuelTypeLabels[fuelType]}</Text>
                    </Pressable>
                  ))}
                </View>
                <View style={styles.selectorGrid}>
                  {Object.values(TransmissionType).map((transmissionType) => (
                    <Pressable
                      key={transmissionType}
                      style={[styles.selectorChip, form.transmissionType === transmissionType ? styles.selectorChipActive : null]}
                      onPress={() => patchForm('transmissionType', transmissionType)}
                    >
                      <Text style={styles.selectorChipLabel}>{transmissionLabels[transmissionType]}</Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            ) : null}

            {step === 5 ? (
              <View style={styles.stack}>
                <Text style={styles.panelTitle}>Arac detaylari</Text>
                <TextInput
                  style={styles.input}
                  value={form.plateNumber}
                  onChangeText={(value) => patchForm('plateNumber', value)}
                  placeholder="Plaka"
                  placeholderTextColor="#6b7280"
                />
                <TextInput
                  style={styles.input}
                  value={String(form.km)}
                  keyboardType="numeric"
                  onChangeText={(value) => patchForm('km', Number(value))}
                  placeholder="KM"
                  placeholderTextColor="#6b7280"
                />
                <TextInput
                  style={styles.input}
                  value={form.color}
                  onChangeText={(value) => patchForm('color', value)}
                  placeholder="Renk"
                  placeholderTextColor="#6b7280"
                />
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={form.equipmentNotes}
                  onChangeText={(value) => patchForm('equipmentNotes', value)}
                  placeholder="Donanim notlari"
                  placeholderTextColor="#6b7280"
                  multiline
                />
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={form.description}
                  onChangeText={(value) => patchForm('description', value)}
                  placeholder="Arac aciklamasi"
                  placeholderTextColor="#6b7280"
                  maxLength={600}
                  multiline
                />
              </View>
            ) : null}

            {step === 6 ? (
              <View style={styles.stack}>
                <Text style={styles.panelTitle}>Medya yukle</Text>
                <Pressable style={styles.uploadCard} onPress={() => void handleMediaPick()}>
                  <Text style={styles.uploadTitle}>{uploading ? 'Medyalar yukleniyor...' : 'Galeri sec'}</Text>
                  <Text style={styles.uploadCopy}>Aracini profilde ve kesfette temsil edecek gorselleri ekle.</Text>
                </Pressable>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.previewRow}>
                  {uploads.map((item) => (
                    <Pressable
                      key={item.id}
                      style={styles.previewTile}
                      onPress={() => setUploads((current) => current.filter((entry) => entry.id !== item.id))}
                    >
                      <Image source={{ uri: item.url }} style={styles.previewImage} />
                    </Pressable>
                  ))}
                </ScrollView>
              </View>
            ) : null}

            {step === 7 ? (
              <View style={styles.stack}>
                <Text style={styles.panelTitle}>Yayin tercihleri</Text>
                <ToggleCard
                  active={form.isPublic}
                  copy="Arac profilindeki Araclar sekmesinde gorunsun."
                  title="Profilde goster"
                  onPress={() => patchForm('isPublic', !form.isPublic)}
                />
                <ToggleCard
                  active={form.showInExplore}
                  copy="Bu arac kesfet akisinda reels benzeri dikey akista yer alabilir."
                  title="Kesfette goster"
                  onPress={() => patchForm('showInExplore', !form.showInExplore)}
                />
                <ToggleCard
                  active={form.openToOffers}
                  copy="Diger kullanicilar mesaj alanindan teklif odakli iletisime gecebilir."
                  title="Teklife acik"
                  onPress={() => patchForm('openToOffers', !form.openToOffers)}
                />
              </View>
            ) : null}
          </View>

          <View style={styles.footerRow}>
            <Pressable
              style={[styles.secondaryButton, step === 1 ? styles.disabledButton : null]}
              disabled={step === 1}
              onPress={() => setStep((current) => Math.max(1, current - 1) as WizardStep)}
            >
              <Text style={styles.secondaryButtonLabel}>Geri</Text>
            </Pressable>
            {step < 7 ? (
              <Pressable
                style={[styles.primaryButton, !canContinue(step) ? styles.disabledButton : null]}
                disabled={!canContinue(step)}
                onPress={() => setStep((current) => Math.min(7, current + 1) as WizardStep)}
              >
                <Text style={styles.primaryButtonLabel}>Ileri</Text>
              </Pressable>
            ) : (
              <Pressable style={styles.primaryButton} disabled={submitting} onPress={() => void handleSubmit()}>
                <Text style={styles.primaryButtonLabel}>{submitting ? 'Kaydediliyor...' : 'Araci kaydet'}</Text>
              </Pressable>
            )}
          </View>
        </ScrollView>
      )}
    </MobileShell>
  );
}

function ToggleCard({
  active,
  title,
  copy,
  onPress,
}: {
  active: boolean;
  title: string;
  copy: string;
  onPress: () => void;
}) {
  return (
    <Pressable style={[styles.toggleCard, active ? styles.toggleCardActive : null]} onPress={onPress}>
      <View style={styles.toggleCopy}>
        <Text style={styles.toggleTitle}>{title}</Text>
        <Text style={styles.toggleMeta}>{copy}</Text>
      </View>
      <Text style={styles.toggleBadge}>{active ? 'Acik' : 'Kapali'}</Text>
    </Pressable>
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
  loadingWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  loadingText: {
    color: mobileTheme.colors.textMuted,
  },
  stepRow: {
    gap: 8,
  },
  stepChip: {
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 999,
    backgroundColor: '#f3f4f6',
  },
  stepChipActive: {
    backgroundColor: '#111111',
  },
  stepChipLabel: {
    color: '#6b7280',
    fontSize: 12,
    fontWeight: '700',
  },
  stepChipLabelActive: {
    color: '#ffffff',
  },
  panel: {
    gap: 16,
    padding: 18,
    borderRadius: 22,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#edf1f4',
  },
  panelTitle: {
    color: mobileTheme.colors.textStrong,
    fontSize: 20,
    fontWeight: '700',
  },
  stack: {
    gap: 12,
  },
  optionCard: {
    gap: 6,
    padding: 16,
    borderRadius: 18,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#edf1f4',
  },
  optionCardActive: {
    borderColor: '#111111',
    backgroundColor: '#f3f4f6',
  },
  optionTitle: {
    color: mobileTheme.colors.textStrong,
    fontSize: 16,
    fontWeight: '700',
  },
  optionCopy: {
    color: mobileTheme.colors.textMuted,
    lineHeight: 20,
  },
  selectorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  selectorChip: {
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderRadius: 14,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#edf1f4',
  },
  selectorChipActive: {
    borderColor: '#111111',
    backgroundColor: '#f3f4f6',
  },
  selectorChipLabel: {
    color: mobileTheme.colors.textStrong,
    fontWeight: '700',
  },
  input: {
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 13,
    color: mobileTheme.colors.textStrong,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#edf1f4',
  },
  textArea: {
    minHeight: 110,
    textAlignVertical: 'top',
  },
  summaryCard: {
    gap: 4,
    padding: 14,
    borderRadius: 18,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#edf1f4',
  },
  summaryTitle: {
    color: mobileTheme.colors.textStrong,
    fontWeight: '700',
  },
  summaryCopy: {
    color: mobileTheme.colors.textMuted,
    lineHeight: 20,
  },
  uploadCard: {
    gap: 6,
    padding: 18,
    borderRadius: 18,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#edf1f4',
  },
  uploadTitle: {
    color: mobileTheme.colors.textStrong,
    fontSize: 16,
    fontWeight: '700',
  },
  uploadCopy: {
    color: mobileTheme.colors.textMuted,
    lineHeight: 20,
  },
  previewRow: {
    gap: 10,
  },
  previewTile: {
    width: 112,
    height: 112,
    borderRadius: 18,
    overflow: 'hidden',
    backgroundColor: '#edf1f4',
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  toggleCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    borderRadius: 18,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#edf1f4',
  },
  toggleCardActive: {
    borderColor: '#111111',
    backgroundColor: '#f3f4f6',
  },
  toggleCopy: {
    flex: 1,
    gap: 4,
  },
  toggleTitle: {
    color: mobileTheme.colors.textStrong,
    fontWeight: '700',
  },
  toggleMeta: {
    color: mobileTheme.colors.textMuted,
    lineHeight: 19,
  },
  toggleBadge: {
    color: mobileTheme.colors.textStrong,
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  footerRow: {
    flexDirection: 'row',
    gap: 10,
  },
  secondaryButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
    borderRadius: 16,
    backgroundColor: '#f3f4f6',
  },
  secondaryButtonLabel: {
    color: mobileTheme.colors.textStrong,
    fontWeight: '700',
  },
  primaryButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
    borderRadius: 16,
    backgroundColor: '#111111',
  },
  primaryButtonLabel: {
    color: '#ffffff',
    fontWeight: '800',
  },
  disabledButton: {
    opacity: 0.45,
  },
  error: {
    color: '#dc2626',
    textAlign: 'center',
    paddingBottom: 12,
  },
});

