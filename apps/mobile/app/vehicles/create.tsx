import type {
  CreateGarageVehicleRequest,
  VehicleCatalogBrand,
  VehicleCatalogEquipmentResponse,
  VehicleCatalogModel,
  VehicleCatalogPackage,
  VehicleCatalogSpecOption,
  VehicleCatalogSpecsResponse,
  VehicleCatalogTypeItem,
  VehiclePackageSpec,
} from '@carloi-v4/types';
import {
  FuelType,
  MediaAssetPurpose,
  MediaType,
  TransmissionType,
  VehicleCatalogType,
  VehicleEquipmentCategory,
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
import { MobileMediaView } from '../../components/mobile-media-view';
import { useAuth } from '../../context/auth-context';
import { mobileTheme } from '../../lib/design-system';
import {
  fuelTypeLabels,
  transmissionLabels,
  vehicleEquipmentCategoryLabels,
} from '../../lib/listings-ui';
import { mobileListingsApi } from '../../lib/listings-api';
import { mobileMediaApi } from '../../lib/media-api';
import { pickMediaFiles } from '../../lib/upload-picker';

type WizardStep = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;

type UploadItem = {
  id: string;
  url: string;
  mimeType: string;
};

const STEPS: Array<{ step: WizardStep; label: string }> = [
  { step: 1, label: 'Vasita' },
  { step: 2, label: 'Marka' },
  { step: 3, label: 'Model' },
  { step: 4, label: 'Paket + Yil' },
  { step: 5, label: 'Motor' },
  { step: 6, label: 'Standart' },
  { step: 7, label: 'Ilave' },
  { step: 8, label: 'Detay' },
  { step: 9, label: 'Medya + Yayin' },
];

const DEFAULT_CATALOG_TYPES: VehicleCatalogTypeItem[] = [
  {
    key: VehicleCatalogType.CAR,
    type: VehicleCatalogType.CAR,
    label: 'Otomobil',
    description: 'Sedan, hatchback, SUV ve binek araclar.',
  },
  {
    key: VehicleCatalogType.MOTORCYCLE,
    type: VehicleCatalogType.MOTORCYCLE,
    label: 'Motosiklet',
    description: 'Iki tekerli motosiklet ve benzeri araclar.',
  },
  {
    key: VehicleCatalogType.COMMERCIAL,
    type: VehicleCatalogType.COMMERCIAL,
    label: 'Hafif Ticari',
    description: 'Panelvan, pickup ve hafif ticari araclar.',
  },
];

const MANUAL_SPEC_ID = 'manual';
const EXTRA_EQUIPMENT_SUGGESTIONS = [
  'Sunroof',
  'Deri koltuk',
  'Seramik kaplama',
  'Buyuk ekran',
  'Ozel jant',
  'Ses sistemi',
  'Cam filmi',
  'Park kamerasi',
  'Koltuk isitma',
] as const;
const EXTRA_EQUIPMENT_CATEGORIES: VehicleEquipmentCategory[] = [
  VehicleEquipmentCategory.SAFETY,
  VehicleEquipmentCategory.COMFORT,
  VehicleEquipmentCategory.MULTIMEDIA,
  VehicleEquipmentCategory.EXTERIOR,
  VehicleEquipmentCategory.INTERIOR,
  VehicleEquipmentCategory.DRIVING_ASSIST,
  VehicleEquipmentCategory.LIGHTING,
  VehicleEquipmentCategory.OTHER,
];

type VehicleSpecLike = VehiclePackageSpec | VehicleCatalogSpecOption;

function deriveVehicleType(
  category: VehicleCatalogType,
  spec: VehicleSpecLike | null,
  fallbackBodyType?: string | null,
): VehicleType {
  const bodyType = (spec?.bodyType ?? fallbackBodyType ?? '').toLocaleLowerCase('tr-TR');

  if (category === VehicleCatalogType.MOTORCYCLE) {
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

  if (category === VehicleCatalogType.COMMERCIAL) {
    return VehicleType.VAN;
  }

  return VehicleType.SEDAN;
}

function buildYearOptions(
  selectedModel: VehicleCatalogModel | null,
  selectedPackage: VehicleCatalogPackage | null,
  specsResponse: VehicleCatalogSpecsResponse | null,
) {
  if (specsResponse?.availableYears?.length) {
    return specsResponse.availableYears;
  }

  if (selectedPackage?.yearStart && selectedPackage?.yearEnd && selectedPackage.yearEnd >= selectedPackage.yearStart) {
    const years: number[] = [];
    for (let year = selectedPackage.yearEnd; year >= selectedPackage.yearStart; year -= 1) {
      years.push(year);
    }
    return years;
  }

  if (selectedModel?.yearStart && selectedModel?.yearEnd && selectedModel.yearEnd >= selectedModel.yearStart) {
    const years: number[] = [];
    for (let year = selectedModel.yearEnd; year >= selectedModel.yearStart; year -= 1) {
      years.push(year);
    }
    return years;
  }

  const years: number[] = [];
  for (let year = new Date().getFullYear(); year >= 1990; year -= 1) {
    years.push(year);
  }
  return years;
}

function matchesYear(spec: VehicleSpecLike, year: number | null) {
  return year === null || spec.year === null || spec.year === year;
}

function buildEngineSummary(spec: VehicleSpecLike | null) {
  if (!spec) {
    return 'Motor secimi yapilmadi';
  }

  if (spec.engineName) {
    return spec.engineName;
  }

  const parts: string[] = [];
  const engineVolume = spec.engineVolume ?? spec.engineVolumeCc ?? null;
  const enginePower = spec.enginePower ?? spec.enginePowerHp ?? null;

  if (engineVolume) {
    parts.push(`${(engineVolume / 1000).toFixed(1)}L`);
  }

  if (enginePower) {
    parts.push(`${enginePower} hp`);
  }

  return parts.length > 0 ? parts.join(' / ') : 'Motor bilgisi belirtilmedi';
}

function buildSpecMeta(spec: VehicleSpecLike | null) {
  if (!spec) {
    return 'Yakit ve vites bilgisi belirtilmedi';
  }

  const parts: string[] = [];

  if (spec.fuelType) {
    parts.push(fuelTypeLabels[spec.fuelType]);
  }

  if (spec.transmissionType) {
    parts.push(transmissionLabels[spec.transmissionType]);
  }

  if (spec.torqueNm) {
    parts.push(`${spec.torqueNm} Nm`);
  }

  if (parts.length > 0) {
    return parts.join(' / ');
  }

  return spec.equipmentSummary ?? 'Katalogdan gelen ozet bilgi';
}

export default function VehicleCreateScreen() {
  const router = useRouter();
  const { session } = useAuth();
  const [step, setStep] = useState<WizardStep>(1);
  const [catalogTypes, setCatalogTypes] = useState<VehicleCatalogTypeItem[]>(DEFAULT_CATALOG_TYPES);
  const [category, setCategory] = useState<VehicleCatalogType | null>(null);
  const [brands, setBrands] = useState<VehicleCatalogBrand[]>([]);
  const [models, setModels] = useState<VehicleCatalogModel[]>([]);
  const [packages, setPackages] = useState<VehicleCatalogPackage[]>([]);
  const [specsResponse, setSpecsResponse] = useState<VehicleCatalogSpecsResponse | null>(null);
  const [equipmentResponse, setEquipmentResponse] = useState<VehicleCatalogEquipmentResponse | null>(null);
  const [brandSearch, setBrandSearch] = useState('');
  const [modelSearch, setModelSearch] = useState('');
  const [packageSearch, setPackageSearch] = useState('');
  const [selectedBrandId, setSelectedBrandId] = useState('');
  const [selectedModelId, setSelectedModelId] = useState('');
  const [selectedPackageId, setSelectedPackageId] = useState('');
  const [useManualModel, setUseManualModel] = useState(false);
  const [manualModelText, setManualModelText] = useState('');
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [selectedSpecId, setSelectedSpecId] = useState<string | null>(null);
  const [uploads, setUploads] = useState<UploadItem[]>([]);
  const [uploading, setUploading] = useState(false);
  const [loadingCatalog, setLoadingCatalog] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [extraEquipment, setExtraEquipment] = useState<
    Array<{ category: VehicleEquipmentCategory | null; name: string; note: string }>
  >([]);
  const [extraEquipmentName, setExtraEquipmentName] = useState('');
  const [extraEquipmentNote, setExtraEquipmentNote] = useState('');
  const [extraEquipmentCategory, setExtraEquipmentCategory] = useState<VehicleEquipmentCategory>(
    VehicleEquipmentCategory.OTHER,
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [form, setForm] = useState({
    plateNumber: '',
    color: '',
    km: '',
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
      .getCatalogTypes()
      .then((items) => {
        if (items.length > 0) {
          setCatalogTypes(items);
        }
      })
      .catch((error) => {
        setErrorMessage(error instanceof Error ? error.message : 'Arac katalogu yuklenemedi.');
      })
      .finally(() => setLoadingCatalog(false));
  }, [accessToken]);

  useEffect(() => {
    setSelectedBrandId('');
    setSelectedModelId('');
    setSelectedPackageId('');
    setUseManualModel(false);
    setManualModelText('');
    setSelectedYear(null);
    setSelectedSpecId(null);
    setBrands([]);
    setModels([]);
    setPackages([]);
    setSpecsResponse(null);
    setEquipmentResponse(null);
    setBrandSearch('');
    setModelSearch('');
    setPackageSearch('');

    if (!category) {
      return;
    }

    void mobileListingsApi
      .getBrands(category)
      .then((items) => {
        setBrands(items);
        setErrorMessage(null);
      })
      .catch((error) => {
        setBrands([]);
        setErrorMessage(error instanceof Error ? error.message : 'Marka listesi yuklenemedi.');
      });
  }, [category]);

  useEffect(() => {
    setSelectedModelId('');
    setSelectedPackageId('');
    setUseManualModel(false);
    setManualModelText('');
    setSelectedYear(null);
    setSelectedSpecId(null);
    setModels([]);
    setPackages([]);
    setSpecsResponse(null);
    setEquipmentResponse(null);
    setModelSearch('');
    setPackageSearch('');

    if (!selectedBrandId || !category) {
      return;
    }

    void mobileListingsApi
      .getModels(selectedBrandId, category)
      .then((items) => {
        setModels(items);
        setErrorMessage(null);
      })
      .catch((error) => {
        setModels([]);
        setErrorMessage(error instanceof Error ? error.message : 'Model listesi yuklenemedi.');
      });
  }, [selectedBrandId, category]);

  useEffect(() => {
    setSelectedPackageId('');
    setSelectedYear(null);
    setSelectedSpecId(null);
    setPackages([]);
    setSpecsResponse(null);
    setEquipmentResponse(null);
    setPackageSearch('');

    if (!selectedModelId) {
      return;
    }

    void mobileListingsApi
      .getPackages(selectedModelId)
      .then((items) => {
        setPackages(items);
        setErrorMessage(null);
      })
      .catch((error) => {
        setPackages([]);
        setErrorMessage(error instanceof Error ? error.message : 'Paket listesi yuklenemedi.');
      });
  }, [selectedModelId]);

  useEffect(() => {
    setSelectedYear(null);
    setSelectedSpecId(null);
    setSpecsResponse(null);

    if (!selectedPackageId) {
      return;
    }

    if (selectedPackageId === 'manual:custom') {
      setSpecsResponse({
        availableYears: [],
        engineOptions: [
          {
            id: 'manual:custom:unknown',
            label: 'Bilmiyorum / Elle girecegim',
            year: null,
            engineName: 'Bilmiyorum / Elle girecegim',
            engineVolume: null,
            enginePower: null,
          },
        ],
        fuelTypes: [FuelType.UNKNOWN],
        transmissionTypes: [TransmissionType.UNKNOWN],
        specs: [
          {
            id: 'manual:custom:unknown',
            year: null,
            bodyType: selectedModel?.bodyType ?? null,
            engineName: 'Bilmiyorum / Elle girecegim',
            engineVolume: null,
            enginePower: null,
            engineVolumeCc: null,
            enginePowerHp: null,
            torqueNm: null,
            fuelType: FuelType.UNKNOWN,
            transmissionType: TransmissionType.UNKNOWN,
            tractionType: null,
            source: null,
            manualReviewNeeded: true,
            isActive: true,
            equipmentSummary: null,
          },
        ],
      });
      return;
    }

    void mobileListingsApi
      .getPackageSpecs(selectedPackageId)
      .then((response) => {
        setSpecsResponse(response);
        setErrorMessage(null);
      })
      .catch((error) => {
        setSpecsResponse(null);
        setErrorMessage(error instanceof Error ? error.message : 'Motor secenekleri yuklenemedi.');
      });
  }, [selectedPackageId]);

  useEffect(() => {
    setEquipmentResponse(null);

    if (!selectedPackageId) {
      return;
    }

    void mobileListingsApi
      .getPackageEquipment(selectedPackageId)
      .then((response) => {
        setEquipmentResponse(response);
        setErrorMessage(null);
      })
      .catch((error) => {
        setEquipmentResponse(null);
        setErrorMessage(error instanceof Error ? error.message : 'Standart donanim bilgisi yuklenemedi.');
      });
  }, [selectedPackageId]);

  const selectedBrand = brands.find((item) => item.id === selectedBrandId) ?? null;
  const selectedModel = models.find((item) => item.id === selectedModelId) ?? null;
  const selectedPackage = packages.find((item) => item.id === selectedPackageId) ?? null;
  const isSyntheticPackage = selectedPackageId.startsWith('manual:');
  const yearOptions = useMemo(
    () => buildYearOptions(selectedModel, selectedPackage, specsResponse),
    [selectedModel, selectedPackage, specsResponse],
  );
  const visibleSpecs = useMemo(
    () => (specsResponse?.specs ?? []).filter((spec) => matchesYear(spec, selectedYear)),
    [specsResponse, selectedYear],
  );
  const showManualSpecOption = useMemo(
    () =>
      !visibleSpecs.some(
        (spec) => spec.manualReviewNeeded && (spec.engineName ?? '').toLocaleLowerCase('tr-TR').includes('bilmiyorum'),
      ),
    [visibleSpecs],
  );
  const selectedSpec = useMemo(() => {
    if (!selectedSpecId || selectedSpecId === MANUAL_SPEC_ID) {
      return null;
    }

    return (
      visibleSpecs.find((spec) => spec.id === selectedSpecId) ??
      specsResponse?.specs.find((spec) => spec.id === selectedSpecId) ??
      null
    );
  }, [selectedSpecId, visibleSpecs, specsResponse]);
  const equipmentGroups = equipmentResponse?.groups ?? [];

  useEffect(() => {
    if (!selectedPackageId && !useManualModel && !selectedModelId) {
      return;
    }

    if (!selectedYear && yearOptions.length > 0) {
      setSelectedYear(yearOptions[0]);
    }
  }, [selectedModelId, selectedPackageId, selectedYear, useManualModel, yearOptions]);

  useEffect(() => {
    if (!selectedPackageId) {
      if (selectedSpecId !== MANUAL_SPEC_ID) {
        setSelectedSpecId(MANUAL_SPEC_ID);
      }
      return;
    }

    if (selectedSpecId === MANUAL_SPEC_ID) {
      return;
    }

    if (visibleSpecs.length === 0) {
      setSelectedSpecId(MANUAL_SPEC_ID);
      return;
    }

    const firstMatchingSpec = visibleSpecs[0];
    if (!firstMatchingSpec) {
      return;
    }

    const stillValid = selectedSpecId ? visibleSpecs.some((spec) => spec.id === selectedSpecId) : false;

    if (!stillValid) {
      setSelectedSpecId(firstMatchingSpec.id);
      setForm((current) => ({
        ...current,
        fuelType: firstMatchingSpec.fuelType ?? current.fuelType,
        transmissionType: firstMatchingSpec.transmissionType ?? current.transmissionType,
      }));
    }
  }, [isSyntheticPackage, selectedPackageId, selectedSpecId, visibleSpecs]);

  const filteredBrands = useMemo(() => {
    const query = brandSearch.trim().toLocaleLowerCase('tr-TR');
    if (!query) {
      return brands;
    }

    return brands.filter((brand) => brand.name.toLocaleLowerCase('tr-TR').includes(query));
  }, [brands, brandSearch]);

  const filteredModels = useMemo(() => {
    const query = modelSearch.trim().toLocaleLowerCase('tr-TR');
    if (!query) {
      return models;
    }

    return models.filter((model) => model.name.toLocaleLowerCase('tr-TR').includes(query));
  }, [models, modelSearch]);

  const filteredPackages = useMemo(() => {
    const query = packageSearch.trim().toLocaleLowerCase('tr-TR');
    if (!query) {
      return packages;
    }

    return packages.filter((item) => item.name.toLocaleLowerCase('tr-TR').includes(query));
  }, [packages, packageSearch]);

  function patchForm<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function addExtraEquipment(
    name: string,
    category: VehicleEquipmentCategory | null = extraEquipmentCategory,
    note = extraEquipmentNote,
  ) {
    const normalizedName = name.trim();
    if (!normalizedName) {
      return;
    }

    setExtraEquipment((current) => {
      const nextKey = `${category ?? 'OTHER'}::${normalizedName.toLocaleLowerCase('tr-TR')}`;
      if (
        current.some(
          (item) =>
            `${item.category ?? 'OTHER'}::${item.name.toLocaleLowerCase('tr-TR')}` === nextKey,
        )
      ) {
        return current;
      }

      return [
        ...current,
        {
          category,
          name: normalizedName,
          note: note.trim(),
        },
      ];
    });

    setExtraEquipmentName('');
    setExtraEquipmentNote('');
  }

  function removeExtraEquipment(name: string, category: VehicleEquipmentCategory | null) {
    setExtraEquipment((current) =>
      current.filter(
        (item) =>
          !(
            item.category === category &&
            item.name.toLocaleLowerCase('tr-TR') === name.toLocaleLowerCase('tr-TR')
          ),
      ),
    );
  }

  function canContinue(currentStep: WizardStep) {
    switch (currentStep) {
      case 1:
        return Boolean(category);
      case 2:
        return Boolean(selectedBrandId);
      case 3:
        return Boolean(selectedModelId || manualModelText.trim().length > 1);
      case 4:
        return Boolean(selectedYear && (selectedPackageId || useManualModel));
      case 5:
        return Boolean(selectedSpecId && form.fuelType && form.transmissionType);
      case 6:
        return true;
      case 7:
        return true;
      case 8:
        return Boolean(form.km.trim().length > 0 && form.color.trim().length > 0);
      case 9:
        return uploads.length > 0;
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

      const uploaded = await mobileMediaApi.uploadFiles(
        accessToken,
        files,
        MediaAssetPurpose.GARAGE_VEHICLE_MEDIA,
      );
      setUploads((current) =>
        [
          ...current,
          ...uploaded.map((item) => ({
            id: item.id,
            url: item.url,
            mimeType: item.mimeType,
          })),
        ].slice(0, 12),
      );
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Medyalar yuklenemedi.');
    } finally {
      setUploading(false);
    }
  }

  async function handleSubmit() {
    if (
      !accessToken ||
      !selectedBrand ||
      !category ||
      !selectedYear
    ) {
      return;
    }

    setSubmitting(true);
    setErrorMessage(null);

    try {
      const payload: CreateGarageVehicleRequest = {
        vehicleType: deriveVehicleType(category, selectedSpec, selectedModel?.bodyType ?? null),
        vehiclePackageId: isSyntheticPackage ? undefined : selectedPackage?.id,
        brandId: selectedBrand.id,
        modelId: selectedModel?.id,
        brandText: selectedBrand.name,
        modelText: selectedModel?.name ?? manualModelText.trim(),
        packageText: isSyntheticPackage ? undefined : selectedPackage?.name,
        year: selectedYear,
        plateNumber: form.plateNumber.trim() || undefined,
        color: form.color.trim(),
        fuelType: form.fuelType,
        transmissionType: form.transmissionType,
        km: Number(form.km.replace(/[^0-9]/g, '')) || 0,
        description: form.description.trim(),
        equipmentNotes: form.equipmentNotes.trim(),
        extraEquipment: extraEquipment.map((item) => ({
          category: item.category ?? undefined,
          name: item.name,
          note: item.note || undefined,
        })),
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
    <MobileShell
      title="Arac ekle"
      subtitle="Marka, model ve paket secerek araci profiline kolayca ekle."
    >
      {errorMessage ? <Text style={styles.error}>{errorMessage}</Text> : null}
      {loadingCatalog ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator color={mobileTheme.colors.textStrong} />
          <Text style={styles.loadingText}>Arac kutuphanesi hazirlaniyor...</Text>
        </View>
      ) : (
        <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
          <View style={styles.progressHeader}>
            <Text style={styles.progressTitle}>Adim {step} / 9</Text>
            <Text style={styles.progressCopy}>
              Her adimda sadece bir karar veriyorsun; akisi olabildigince sade tuttuk.
            </Text>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.stepRow}
          >
            {STEPS.map((item) => (
              <View
                key={item.step}
                style={[styles.stepChip, step === item.step ? styles.stepChipActive : null]}
              >
                <Text
                  style={[
                    styles.stepChipLabel,
                    step === item.step ? styles.stepChipLabelActive : null,
                  ]}
                >
                  {item.label}
                </Text>
              </View>
            ))}
          </ScrollView>

          <View style={styles.panel}>
            {step === 1 ? (
              <View style={styles.stack}>
                <Text style={styles.panelTitle}>Vasita tipini sec</Text>
                {catalogTypes.map((option) => {
                  const value = option.key ?? option.type ?? VehicleCatalogType.CAR;
                  const active = category === value;

                  return (
                    <Pressable
                      key={value}
                      style={[styles.optionCard, active ? styles.optionCardActive : null]}
                      onPress={() => setCategory(value)}
                    >
                      <Text style={styles.optionTitle}>{option.label}</Text>
                      <Text style={styles.optionCopy}>{option.description}</Text>
                    </Pressable>
                  );
                })}
              </View>
            ) : null}

            {step === 2 ? (
              <View style={styles.stack}>
                <Text style={styles.panelTitle}>Marka sec</Text>
                <TextInput
                  value={brandSearch}
                  onChangeText={setBrandSearch}
                  placeholder="Marka ara"
                  placeholderTextColor={mobileTheme.colors.textMuted}
                  style={styles.input}
                />
                <View style={styles.selectorGrid}>
                  {filteredBrands.map((brand) => {
                    const active = selectedBrandId === brand.id;

                    return (
                      <Pressable
                        key={brand.id}
                        style={[styles.brandTile, active ? styles.brandTileActive : null]}
                        onPress={() => setSelectedBrandId(brand.id)}
                      >
                        <View style={styles.brandMonogram}>
                          {brand.logoUrl ? (
                            <Image source={{ uri: brand.logoUrl }} style={styles.brandLogo} />
                          ) : (
                            <Text style={styles.brandMonogramLabel}>
                              {brand.name.slice(0, 2).toUpperCase()}
                            </Text>
                          )}
                        </View>
                        <Text style={styles.brandLabel}>{brand.name}</Text>
                      </Pressable>
                    );
                  })}
                </View>
                {filteredBrands.length === 0 ? (
                  <Text style={styles.helperText}>Bu tipe ait marka bulunamadi.</Text>
                ) : null}
              </View>
            ) : null}

            {step === 3 ? (
              <View style={styles.stack}>
                <Text style={styles.panelTitle}>Model sec</Text>
                {selectedBrand ? <Text style={styles.contextLabel}>{selectedBrand.name} secili</Text> : null}
                <TextInput
                  value={modelSearch}
                  onChangeText={setModelSearch}
                  placeholder="Model ara"
                  placeholderTextColor={mobileTheme.colors.textMuted}
                  style={styles.input}
                />
                <View style={styles.stack}>
                  {filteredModels.map((model) => (
                    <Pressable
                      key={model.id}
                      style={[
                        styles.optionCard,
                        selectedModelId === model.id ? styles.optionCardActive : null,
                      ]}
                      onPress={() => {
                        setUseManualModel(false);
                        setManualModelText('');
                        setSelectedModelId(model.id);
                      }}
                    >
                      <Text style={styles.optionTitle}>{model.name}</Text>
                      <Text style={styles.optionCopy}>
                        {model.bodyType ?? 'Govde tipi katalogdan doldurulacak'}
                      </Text>
                    </Pressable>
                  ))}
                  <Pressable
                    style={[styles.optionCard, useManualModel ? styles.optionCardActive : null]}
                    onPress={() => {
                      setUseManualModel(true);
                      setSelectedModelId('');
                      setSelectedPackageId('manual:custom');
                    }}
                  >
                    <Text style={styles.optionTitle}>Modelimi bulamadim</Text>
                    <Text style={styles.optionCopy}>
                      Listede yoksa modeli yazarak manuel devam edebilirsin.
                    </Text>
                  </Pressable>
                </View>
                {useManualModel ? (
                  <TextInput
                    value={manualModelText}
                    onChangeText={setManualModelText}
                    placeholder="Model adini yaz"
                    placeholderTextColor={mobileTheme.colors.textMuted}
                    style={styles.input}
                  />
                ) : null}
                {filteredModels.length === 0 ? (
                  <Text style={styles.helperText}>
                    Aramana uygun model bulunamadi. Manuel secenekle devam edebilirsin.
                  </Text>
                ) : null}
              </View>
            ) : null}

            {step === 4 ? (
              <View style={styles.stack}>
                <Text style={styles.panelTitle}>Paket ve yil sec</Text>
                {!useManualModel ? (
                  <>
                    <TextInput
                      value={packageSearch}
                      onChangeText={setPackageSearch}
                      placeholder="Paket ara"
                      placeholderTextColor={mobileTheme.colors.textMuted}
                      style={styles.input}
                    />
                    <View style={styles.selectorGrid}>
                      {filteredPackages.map((item) => (
                        <Pressable
                          key={item.id}
                          style={[
                            styles.selectorChip,
                            selectedPackageId === item.id ? styles.selectorChipActive : null,
                          ]}
                          onPress={() => setSelectedPackageId(item.id)}
                        >
                          <Text style={styles.selectorChipLabel}>{item.name}</Text>
                          <Text style={styles.selectorChipMeta}>
                            {item.yearStart && item.yearEnd
                              ? `${item.yearStart}-${item.yearEnd}`
                              : 'Yil secimi var'}
                          </Text>
                        </Pressable>
                      ))}
                      <Pressable
                        style={[
                          styles.selectorChip,
                          isSyntheticPackage && !useManualModel ? styles.selectorChipActive : null,
                        ]}
                        onPress={() => setSelectedPackageId(`manual:${selectedModelId}`)}
                      >
                        <Text style={styles.selectorChipLabel}>Paketimi bilmiyorum</Text>
                        <Text style={styles.selectorChipMeta}>Yil secerek devam et</Text>
                      </Pressable>
                    </View>
                  </>
                ) : (
                  <View style={styles.summaryCard}>
                    <Text style={styles.summaryTitle}>Paket belirtilmedi</Text>
                    <Text style={styles.summaryCopy}>
                      Manuel model seciminde yil bilgisiyle devam ediyoruz.
                    </Text>
                  </View>
                )}
                {(selectedPackageId || useManualModel) ? (
                  <View style={styles.stack}>
                    <Text style={styles.subSectionLabel}>Yil sec</Text>
                    <View style={styles.selectorGrid}>
                      {yearOptions.map((year) => (
                        <Pressable
                          key={year}
                          style={[
                            styles.yearChip,
                            selectedYear === year ? styles.yearChipActive : null,
                          ]}
                          onPress={() => setSelectedYear(year)}
                        >
                          <Text
                            style={[
                              styles.yearChipLabel,
                              selectedYear === year ? styles.yearChipLabelActive : null,
                            ]}
                          >
                            {year}
                          </Text>
                        </Pressable>
                      ))}
                    </View>
                  </View>
                ) : null}
                {filteredPackages.length === 0 && !useManualModel ? (
                  <Text style={styles.helperText}>Bu modele ait paket bulunamadi.</Text>
                ) : null}
              </View>
            ) : null}

            {step === 5 ? (
              <View style={styles.stack}>
                <Text style={styles.panelTitle}>Motor, yakit ve vites</Text>
                <View style={styles.summaryCard}>
                  <Text style={styles.summaryTitle}>
                    {selectedBrand?.name} {selectedModel?.name ?? manualModelText.trim()}
                    {selectedPackage && !isSyntheticPackage ? ` / ${selectedPackage.name}` : ''}
                  </Text>
                  <Text style={styles.summaryCopy}>
                    {selectedSpec?.bodyType ?? visibleSpecs[0]?.bodyType ?? selectedModel?.bodyType ?? 'Govde tipi belirtilmedi'} / 
                    {buildEngineSummary(selectedSpec ?? visibleSpecs[0] ?? null)}
                  </Text>
                </View>
                <Text style={styles.subSectionLabel}>Motor sec</Text>
                <View style={styles.stack}>
                  {visibleSpecs.length === 0 ? (
                    <Text style={styles.helperText}>
                      Bu arac icin detayli motor secenegi henuz katalogda yok. Elle devam edebilirsin.
                    </Text>
                  ) : null}
                  {visibleSpecs.map((spec) => (
                    <Pressable
                      key={spec.id}
                      style={[
                        styles.optionCard,
                        selectedSpecId === spec.id ? styles.optionCardActive : null,
                      ]}
                      onPress={() => {
                        setSelectedSpecId(spec.id);
                        setForm((current) => ({
                          ...current,
                          fuelType: spec.fuelType ?? current.fuelType,
                          transmissionType: spec.transmissionType ?? current.transmissionType,
                        }));
                      }}
                    >
                      <Text style={styles.optionTitle}>{buildEngineSummary(spec)}</Text>
                      <Text style={styles.optionCopy}>
                        {buildSpecMeta(spec)}
                      </Text>
                    </Pressable>
                  ))}
                  {showManualSpecOption ? (
                    <Pressable
                      style={[
                        styles.optionCard,
                        selectedSpecId === MANUAL_SPEC_ID ? styles.optionCardActive : null,
                      ]}
                      onPress={() => setSelectedSpecId(MANUAL_SPEC_ID)}
                    >
                      <Text style={styles.optionTitle}>Bilmiyorum / Elle girecegim</Text>
                      <Text style={styles.optionCopy}>
                        Motoru bilmiyorsan devam et, yakit ve vitesi elle sec.
                      </Text>
                    </Pressable>
                  ) : null}
                </View>
                <Text style={styles.subSectionLabel}>Yakit</Text>
                <View style={styles.selectorGrid}>
                  {Object.values(FuelType).map((fuelType) => (
                    <Pressable
                      key={fuelType}
                      style={[
                        styles.selectorChip,
                        form.fuelType === fuelType ? styles.selectorChipActive : null,
                      ]}
                      onPress={() => patchForm('fuelType', fuelType)}
                    >
                      <Text style={styles.selectorChipLabel}>{fuelTypeLabels[fuelType]}</Text>
                    </Pressable>
                  ))}
                </View>
                <Text style={styles.subSectionLabel}>Vites</Text>
                <View style={styles.selectorGrid}>
                  {Object.values(TransmissionType).map((transmissionType) => (
                    <Pressable
                      key={transmissionType}
                      style={[
                        styles.selectorChip,
                        form.transmissionType === transmissionType
                          ? styles.selectorChipActive
                          : null,
                      ]}
                      onPress={() => patchForm('transmissionType', transmissionType)}
                    >
                      <Text style={styles.selectorChipLabel}>
                        {transmissionLabels[transmissionType]}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            ) : null}

            {step === 6 ? (
              <View style={styles.stack}>
                <Text style={styles.panelTitle}>Standart paket donanimi</Text>
                <Text style={styles.helperText}>
                  Secilen paketle katalogdan gelen standart donanimlari burada goruyorsun.
                </Text>
                {equipmentGroups.length > 0 ? (
                  equipmentGroups.map((group) => (
                    <View key={group.category} style={styles.summaryCard}>
                      <Text style={styles.summaryTitle}>
                        {vehicleEquipmentCategoryLabels[group.category]}
                      </Text>
                      <View style={styles.selectorGrid}>
                        {group.items.map((item) => (
                          <View key={item.id} style={styles.selectorChip}>
                            <Text style={styles.selectorChipLabel}>{item.name}</Text>
                          </View>
                        ))}
                      </View>
                    </View>
                  ))
                ) : (
                  <View style={styles.summaryCard}>
                    <Text style={styles.summaryTitle}>Temel donanim gosteriliyor</Text>
                    <Text style={styles.summaryCopy}>
                      Paket donanimi katalogda detaylanmadigi icin minimum guvenli setle devam ediyoruz.
                    </Text>
                  </View>
                )}
              </View>
            ) : null}

            {step === 7 ? (
              <View style={styles.stack}>
                <Text style={styles.panelTitle}>Ilave donanimlar</Text>
                <Text style={styles.helperText}>
                  Standart pakete ek olarak aracinda olan ozel donanimlari ekleyebilirsin.
                </Text>
                <Text style={styles.subSectionLabel}>Kategori sec</Text>
                <View style={styles.selectorGrid}>
                  {EXTRA_EQUIPMENT_CATEGORIES.map((categoryOption) => (
                    <Pressable
                      key={categoryOption}
                      style={[
                        styles.selectorChip,
                        extraEquipmentCategory === categoryOption ? styles.selectorChipActive : null,
                      ]}
                      onPress={() => setExtraEquipmentCategory(categoryOption)}
                    >
                      <Text style={styles.selectorChipLabel}>
                        {vehicleEquipmentCategoryLabels[categoryOption]}
                      </Text>
                    </Pressable>
                  ))}
                </View>
                <Text style={styles.subSectionLabel}>Hizli oneriler</Text>
                <View style={styles.selectorGrid}>
                  {EXTRA_EQUIPMENT_SUGGESTIONS.map((suggestion) => (
                    <Pressable
                      key={suggestion}
                      style={styles.selectorChip}
                      onPress={() => addExtraEquipment(suggestion)}
                    >
                      <Text style={styles.selectorChipLabel}>{suggestion}</Text>
                    </Pressable>
                  ))}
                </View>
                <TextInput
                  style={styles.input}
                  value={extraEquipmentName}
                  onChangeText={setExtraEquipmentName}
                  placeholder="Ilave donanim adi"
                  placeholderTextColor={mobileTheme.colors.textMuted}
                />
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={extraEquipmentNote}
                  onChangeText={setExtraEquipmentNote}
                  placeholder="Not (opsiyonel)"
                  placeholderTextColor={mobileTheme.colors.textMuted}
                  multiline
                />
                <Pressable
                  style={[styles.stackActionButton, !extraEquipmentName.trim() ? styles.disabledButton : null]}
                  disabled={!extraEquipmentName.trim()}
                  onPress={() => addExtraEquipment(extraEquipmentName)}
                >
                  <Text style={styles.secondaryButtonLabel}>Donanimi ekle</Text>
                </Pressable>
                {extraEquipment.length > 0 ? (
                  <View style={styles.stack}>
                    {extraEquipment.map((item) => (
                      <Pressable
                        key={`${item.category ?? 'OTHER'}-${item.name}`}
                        style={styles.toggleCard}
                        onPress={() => removeExtraEquipment(item.name, item.category)}
                      >
                        <View style={styles.toggleCopy}>
                          <Text style={styles.toggleTitle}>{item.name}</Text>
                          <Text style={styles.toggleMeta}>
                            {(item.category ? vehicleEquipmentCategoryLabels[item.category] : 'Diger') +
                              (item.note ? ` Â· ${item.note}` : '')}
                          </Text>
                        </View>
                        <Text style={styles.toggleBadge}>Sil</Text>
                      </Pressable>
                    ))}
                  </View>
                ) : (
                  <Text style={styles.helperText}>
                    Ilave donanim eklemek zorunlu degil; istersen bos devam edebilirsin.
                  </Text>
                )}
              </View>
            ) : null}

            {step === 8 ? (
              <View style={styles.stack}>
                <Text style={styles.panelTitle}>Arac detaylari</Text>
                <TextInput
                  style={styles.input}
                  value={form.km}
                  onChangeText={(value) => patchForm('km', value.replace(/[^0-9]/g, ''))}
                  keyboardType="numeric"
                  placeholder="KM"
                  placeholderTextColor={mobileTheme.colors.textMuted}
                />
                <TextInput
                  style={styles.input}
                  value={form.color}
                  onChangeText={(value) => patchForm('color', value)}
                  placeholder="Renk"
                  placeholderTextColor={mobileTheme.colors.textMuted}
                />
                <TextInput
                  style={styles.input}
                  value={form.plateNumber}
                  onChangeText={(value) => patchForm('plateNumber', value)}
                  placeholder="Plaka (opsiyonel)"
                  placeholderTextColor={mobileTheme.colors.textMuted}
                />
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={form.equipmentNotes}
                  onChangeText={(value) => patchForm('equipmentNotes', value.slice(0, 600))}
                  placeholder="Donanim notlari"
                  placeholderTextColor={mobileTheme.colors.textMuted}
                  multiline
                />
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={form.description}
                  onChangeText={(value) => patchForm('description', value.slice(0, 600))}
                  placeholder="Aciklama"
                  placeholderTextColor={mobileTheme.colors.textMuted}
                  multiline
                />
              </View>
            ) : null}

            {step === 9 ? (
              <View style={styles.stack}>
                <Text style={styles.panelTitle}>Medya ve gorunurluk</Text>
                <Pressable style={styles.uploadCard} onPress={() => void handleMediaPick()}>
                  <Text style={styles.uploadTitle}>
                    {uploading ? 'Medyalar yukleniyor...' : 'Foto veya video sec'}
                  </Text>
                  <Text style={styles.uploadCopy}>
                    Profilde ve kesfette kullanilacak medyalari buradan ekle.
                  </Text>
                </Pressable>
                {uploads.length > 0 ? (
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.previewRow}
                  >
                    {uploads.map((item) => (
                      <Pressable
                        key={item.id}
                        style={styles.previewTile}
                        onPress={() =>
                          setUploads((current) =>
                            current.filter((entry) => entry.id !== item.id),
                          )
                        }
                      >
                        <MobileMediaView autoPlay={item.mimeType.startsWith('video/')} loop={item.mimeType.startsWith('video/')} mediaType={item.mimeType.startsWith('video/') ? MediaType.VIDEO : MediaType.IMAGE} muted style={styles.previewImage} uri={item.url} />
                      </Pressable>
                    ))}
                  </ScrollView>
                ) : null}
                <ToggleCard
                  active={form.isPublic}
                  title="Profilde goster"
                  copy="Arac profilindeki Araclar sekmesinde gorunsun."
                  onPress={() => patchForm('isPublic', !form.isPublic)}
                />
                <ToggleCard
                  active={form.showInExplore}
                  title="Kesfette goster"
                  copy="Arac reels benzeri explore akisinda gorunebilir."
                  onPress={() => patchForm('showInExplore', !form.showInExplore)}
                />
                <ToggleCard
                  active={form.openToOffers}
                  title="Teklife acik"
                  copy="Aciksa profil ve explore icinde teklif odakli aksiyonlar belirir."
                  onPress={() => patchForm('openToOffers', !form.openToOffers)}
                />
              </View>
            ) : null}
          </View>

          <View style={styles.footerRow}>
            {step > 1 ? (
              <Pressable
                style={styles.secondaryButton}
                onPress={() => setStep((current) => Math.max(1, current - 1) as WizardStep)}
              >
                <Text style={styles.secondaryButtonLabel}>Geri</Text>
              </Pressable>
            ) : null}
            {step < 9 ? (
              <Pressable
                style={[styles.primaryButton, !canContinue(step) ? styles.disabledButton : null]}
                disabled={!canContinue(step)}
                onPress={() => setStep((current) => Math.min(9, current + 1) as WizardStep)}
              >
                <Text style={styles.primaryButtonLabel}>Ileri</Text>
              </Pressable>
            ) : (
              <Pressable
                style={[styles.primaryButton, submitting ? styles.disabledButton : null]}
                disabled={submitting}
                onPress={() => void handleSubmit()}
              >
                <Text style={styles.primaryButtonLabel}>
                  {submitting ? 'Kaydediliyor...' : 'Araci kaydet'}
                </Text>
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
  progressHeader: {
    gap: 4,
  },
  progressTitle: {
    color: mobileTheme.colors.textStrong,
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  progressCopy: {
    color: mobileTheme.colors.textMuted,
    lineHeight: 20,
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
  subSectionLabel: {
    color: mobileTheme.colors.textMuted,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  contextLabel: {
    color: mobileTheme.colors.textMuted,
    fontSize: 13,
    fontWeight: '600',
  },
  stack: {
    gap: 12,
  },
  optionCard: {
    gap: 8,
    minHeight: 96,
    padding: 18,
    borderRadius: 20,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#edf1f4',
    justifyContent: 'center',
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
  brandTile: {
    width: '31%',
    minHeight: 128,
    padding: 14,
    borderRadius: 20,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#edf1f4',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  brandTileActive: {
    borderColor: '#111111',
    backgroundColor: '#f3f4f6',
  },
  brandMonogram: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  brandLogo: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  brandMonogramLabel: {
    color: mobileTheme.colors.textStrong,
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  brandLabel: {
    color: mobileTheme.colors.textStrong,
    fontWeight: '700',
    textAlign: 'center',
  },
  selectorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    justifyContent: 'space-between',
  },
  selectorChip: {
    width: '48%',
    minHeight: 64,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 16,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#edf1f4',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 4,
  },
  selectorChipActive: {
    borderColor: '#111111',
    backgroundColor: '#f3f4f6',
  },
  selectorChipLabel: {
    color: mobileTheme.colors.textStrong,
    fontWeight: '700',
    textAlign: 'center',
    lineHeight: 19,
  },
  selectorChipMeta: {
    color: mobileTheme.colors.textMuted,
    fontSize: 12,
  },
  yearChip: {
    width: '31%',
    minHeight: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#edf1f4',
  },
  yearChipActive: {
    backgroundColor: '#111111',
    borderColor: '#111111',
  },
  yearChipLabel: {
    color: mobileTheme.colors.textStrong,
    fontWeight: '700',
  },
  yearChipLabelActive: {
    color: '#ffffff',
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
  helperText: {
    color: mobileTheme.colors.textMuted,
    lineHeight: 20,
  },
  textArea: {
    minHeight: 110,
    textAlignVertical: 'top',
  },
  summaryCard: {
    gap: 4,
    padding: 16,
    borderRadius: 20,
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
  stackActionButton: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 46,
    borderRadius: 16,
    backgroundColor: '#f3f4f6',
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




