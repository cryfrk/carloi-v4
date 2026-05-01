'use client';

import type {
  CreateGarageVehicleRequest,
  MediaAssetUploadResponse,
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
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { AppShell } from './app-shell';
import { useAuth } from './auth-provider';
import {
  fuelTypeLabels,
  transmissionLabels,
  vehicleEquipmentCategoryLabels,
} from '../lib/listings-ui';
import { webListingsApi } from '../lib/listings-api';
import { webMediaApi } from '../lib/media-api';

type WizardStep = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;

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

  if (category === VehicleCatalogType.MOTORCYCLE) return VehicleType.MOTORCYCLE;
  if (bodyType.includes('suv')) return VehicleType.SUV;
  if (bodyType.includes('hatch')) return VehicleType.HATCHBACK;
  if (bodyType.includes('coupe')) return VehicleType.COUPE;
  if (bodyType.includes('pick')) return VehicleType.PICKUP;
  if (bodyType.includes('van') || bodyType.includes('panel')) return VehicleType.VAN;
  if (category === VehicleCatalogType.COMMERCIAL) return VehicleType.VAN;
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

export function VehicleWizardClient() {
  const { session, isReady } = useAuth();
  const [step, setStep] = useState<WizardStep>(1);
  const [catalogTypes, setCatalogTypes] = useState<VehicleCatalogTypeItem[]>(DEFAULT_CATALOG_TYPES);
  const [category, setCategory] = useState<VehicleCatalogType | null>(null);
  const [brands, setBrands] = useState<VehicleCatalogBrand[]>([]);
  const [models, setModels] = useState<VehicleCatalogModel[]>([]);
  const [packages, setPackages] = useState<VehicleCatalogPackage[]>([]);
  const [specsResponse, setSpecsResponse] = useState<VehicleCatalogSpecsResponse | null>(null);
  const [equipmentResponse, setEquipmentResponse] = useState<VehicleCatalogEquipmentResponse | null>(null);
  const [selectedBrandId, setSelectedBrandId] = useState('');
  const [selectedModelId, setSelectedModelId] = useState('');
  const [selectedPackageId, setSelectedPackageId] = useState('');
  const [useManualModel, setUseManualModel] = useState(false);
  const [manualModelText, setManualModelText] = useState('');
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [selectedSpecId, setSelectedSpecId] = useState<string | null>(null);
  const [brandSearch, setBrandSearch] = useState('');
  const [modelSearch, setModelSearch] = useState('');
  const [packageSearch, setPackageSearch] = useState('');
  const [uploads, setUploads] = useState<MediaAssetUploadResponse[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [loadingCatalog, setLoadingCatalog] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [extraEquipment, setExtraEquipment] = useState<
    Array<{ category: VehicleEquipmentCategory | null; name: string; note: string }>
  >([]);
  const [extraEquipmentName, setExtraEquipmentName] = useState('');
  const [extraEquipmentNote, setExtraEquipmentNote] = useState('');
  const [extraEquipmentCategory, setExtraEquipmentCategory] = useState<VehicleEquipmentCategory>(
    VehicleEquipmentCategory.OTHER,
  );
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

  useEffect(() => {
    if (!session?.accessToken) {
      return;
    }

    setLoadingCatalog(true);
    void webListingsApi
      .getCatalogTypes()
      .then((items) => {
        if (items.length > 0) {
          setCatalogTypes(items);
        }
      })
      .catch((error) => {
        setErrorMessage(error instanceof Error ? error.message : 'Arac kutuphanesi yuklenemedi.');
      })
      .finally(() => setLoadingCatalog(false));
  }, [session?.accessToken]);

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

    void webListingsApi.getBrands(category).then(setBrands).catch(() => setBrands([]));
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

    void webListingsApi.getModels(selectedBrandId, category).then(setModels).catch(() => setModels([]));
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

    void webListingsApi.getPackages(selectedModelId).then(setPackages).catch(() => setPackages([]));
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

    void webListingsApi
      .getPackageSpecs(selectedPackageId)
      .then((response) => {
        setSpecsResponse(response);
      })
      .catch(() => setSpecsResponse(null));
  }, [selectedPackageId]);

  useEffect(() => {
    setEquipmentResponse(null);

    if (!selectedPackageId) {
      return;
    }

    void webListingsApi
      .getPackageEquipment(selectedPackageId)
      .then((response) => {
        setEquipmentResponse(response);
      })
      .catch(() => setEquipmentResponse(null));
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

    const firstYear = yearOptions[0];
    if (!selectedYear && firstYear !== undefined) {
      setSelectedYear(firstYear);
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

  async function handleUpload(event: React.ChangeEvent<HTMLInputElement>) {
    if (!session?.accessToken) {
      return;
    }

    const files = event.target.files;
    if (!files?.length) return;

    setUploading(true);
    try {
      const uploaded = await webMediaApi.uploadFiles(
        session.accessToken,
        files,
        MediaAssetPurpose.GARAGE_VEHICLE_MEDIA,
      );
      setUploads((current) => [...current, ...uploaded].slice(0, 12));
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Medyalar yuklenemedi.');
    } finally {
      setUploading(false);
      event.target.value = '';
    }
  }

  async function handleSubmit() {
    if (
      !session?.accessToken ||
      !selectedBrand ||
      !category ||
      !selectedYear
    ) {
      return;
    }

    setSubmitting(true);
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

      const response = await webListingsApi.createGarageVehicle(session.accessToken, payload);
      window.location.href = `/vehicles/${response.vehicle.id}`;
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Arac kaydedilemedi.');
    } finally {
      setSubmitting(false);
    }
  }

  if (!isReady) {
    return (
      <AppShell>
        <section className="detail-card gate-card">
          <h3 className="card-title">Arac wizard hazirlaniyor</h3>
        </section>
      </AppShell>
    );
  }

  if (!session) {
    return (
      <AppShell>
        <section className="detail-card gate-card">
          <Link className="primary-link" href="/login">
            Giris yap
          </Link>
        </section>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <section className="vehicle-wizard-shell">
        <div className="detail-nav-row">
          <Link className="secondary-link" href="/profile?tab=vehicles">
            Profile don
          </Link>
          <Link className="secondary-link" href="/listings/create">
            Ilan olustur
          </Link>
        </div>

        <div className="vehicle-wizard-progress">
          <strong>Adim {step} / 9</strong>
          <span>Marka, model ve paket akisini parca parca tamamlayarak araci profiline ekle.</span>
        </div>

        {errorMessage ? <div className="auth-message error">{errorMessage}</div> : null}
        {loadingCatalog ? <div className="detail-card">Arac kutuphanesi yukleniyor...</div> : null}

        {!loadingCatalog ? (
          <section className="vehicle-wizard-panel">
            <div className="vehicle-step-row">
              {STEPS.map((item) => (
                <span key={item.step} className={`vehicle-step-chip ${item.step === step ? 'active' : ''}`}>
                  {item.label}
                </span>
              ))}
            </div>

            <div className="vehicle-wizard-card">
              {step === 1 ? (
                <div className="vehicle-option-grid">
                  {catalogTypes.map((option) => {
                    const value = option.key ?? option.type ?? VehicleCatalogType.CAR;
                    return (
                      <button
                        key={value}
                        className={`vehicle-option-card button-reset ${category === value ? 'active' : ''}`}
                        type="button"
                        onClick={() => setCategory(value)}
                      >
                        <strong>{option.label}</strong>
                        <span>{option.description}</span>
                      </button>
                    );
                  })}
                </div>
              ) : null}

              {step === 2 ? (
                <div className="vehicle-stack">
                  <label className="input-label">
                    Marka ara
                    <input
                      className="text-input"
                      value={brandSearch}
                      onChange={(event) => setBrandSearch(event.target.value)}
                    />
                  </label>
                  <div className="vehicle-brand-grid">
                    {filteredBrands.map((brand) => (
                      <button
                        key={brand.id}
                        className={`vehicle-brand-card button-reset ${selectedBrandId === brand.id ? 'active' : ''}`}
                        type="button"
                        onClick={() => setSelectedBrandId(brand.id)}
                      >
                        <div className="vehicle-brand-mark">
                          {brand.logoUrl ? (
                            <img alt={brand.name} src={brand.logoUrl} />
                          ) : (
                            <span>{brand.name.slice(0, 2).toUpperCase()}</span>
                          )}
                        </div>
                        <strong>{brand.name}</strong>
                      </button>
                    ))}
                  </div>
                  {filteredBrands.length === 0 ? (
                    <p className="empty-upload-state">Bu tipe ait marka bulunamadi.</p>
                  ) : null}
                </div>
              ) : null}

              {step === 3 ? (
                <div className="vehicle-stack">
                  {selectedBrand ? <small className="vehicle-context-label">{selectedBrand.name} secili</small> : null}
                  <label className="input-label">
                    Model ara
                    <input
                      className="text-input"
                      value={modelSearch}
                      onChange={(event) => setModelSearch(event.target.value)}
                    />
                  </label>
                  <div className="vehicle-stack">
                    {filteredModels.map((model) => (
                      <button
                        key={model.id}
                        className={`vehicle-option-card button-reset ${selectedModelId === model.id ? 'active' : ''}`}
                        type="button"
                        onClick={() => {
                          setUseManualModel(false);
                          setManualModelText('');
                          setSelectedModelId(model.id);
                        }}
                      >
                        <strong>{model.name}</strong>
                        <span>{model.bodyType ?? 'Govde tipi katalogdan doldurulacak'}</span>
                      </button>
                    ))}
                    <button
                      className={`vehicle-option-card button-reset ${useManualModel ? 'active' : ''}`}
                      type="button"
                      onClick={() => {
                        setUseManualModel(true);
                        setSelectedModelId('');
                        setSelectedPackageId('manual:custom');
                      }}
                    >
                      <strong>Modelimi bulamadim</strong>
                      <span>Listede yoksa modeli yazarak manuel devam edebilirsin.</span>
                    </button>
                  </div>
                  {useManualModel ? (
                    <label className="input-label">
                      Model adini yaz
                      <input
                        className="text-input"
                        value={manualModelText}
                        onChange={(event) => setManualModelText(event.target.value)}
                      />
                    </label>
                  ) : null}
                  {filteredModels.length === 0 ? (
                    <p className="empty-upload-state">
                      Aramana uygun model bulunamadi. Manuel secenekle devam edebilirsin.
                    </p>
                  ) : null}
                </div>
              ) : null}

              {step === 4 ? (
                <div className="vehicle-stack">
                  {!useManualModel ? (
                    <>
                      <label className="input-label">
                        Paket ara
                        <input
                          className="text-input"
                          value={packageSearch}
                          onChange={(event) => setPackageSearch(event.target.value)}
                        />
                      </label>
                      <div className="vehicle-chip-grid">
                        {filteredPackages.map((item) => (
                          <button
                            key={item.id}
                            className={`vehicle-chip button-reset ${selectedPackageId === item.id ? 'active' : ''}`}
                            type="button"
                            onClick={() => setSelectedPackageId(item.id)}
                          >
                            <strong>{item.name}</strong>
                            <small>
                              {item.yearStart && item.yearEnd
                                ? `${item.yearStart}-${item.yearEnd}`
                                : 'Yil secimi var'}
                            </small>
                          </button>
                        ))}
                        <button
                          className={`vehicle-chip button-reset ${isSyntheticPackage && !useManualModel ? 'active' : ''}`}
                          type="button"
                          onClick={() => setSelectedPackageId(`manual:${selectedModelId}`)}
                        >
                          <strong>Paketimi bilmiyorum</strong>
                          <small>Yil secerek devam et</small>
                        </button>
                      </div>
                    </>
                  ) : (
                    <div className="vehicle-summary-card">
                      <strong>Paket belirtilmedi</strong>
                      <span>Manuel model seciminde yil bilgisiyle devam ediyoruz.</span>
                    </div>
                  )}
                  {(selectedPackageId || useManualModel) ? (
                    <div className="vehicle-stack">
                      <small className="vehicle-context-label">Yil sec</small>
                      <div className="vehicle-chip-grid compact">
                        {yearOptions.map((year) => (
                          <button
                            key={year}
                            className={`vehicle-chip button-reset ${selectedYear === year ? 'active' : ''}`}
                            type="button"
                            onClick={() => setSelectedYear(year)}
                          >
                            {year}
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : null}
                  {filteredPackages.length === 0 && !useManualModel ? (
                    <p className="empty-upload-state">Bu modele ait paket bulunamadi.</p>
                  ) : null}
                </div>
              ) : null}

              {step === 5 ? (
                <div className="vehicle-stack">
                  <div className="vehicle-summary-card">
                    <strong>
                      {selectedBrand?.name} {selectedModel?.name ?? manualModelText.trim()}
                      {selectedPackage && !isSyntheticPackage ? ` / ${selectedPackage.name}` : ''}
                    </strong>
                    <span>
                      {selectedSpec?.bodyType ??
                        visibleSpecs[0]?.bodyType ??
                        selectedModel?.bodyType ??
                        'Govde tipi belirtilmedi'}{' '}
                      /{' '}
                      {buildEngineSummary(selectedSpec ?? visibleSpecs[0] ?? null)}
                    </span>
                  </div>
                  <small className="vehicle-context-label">Motor sec</small>
                  <div className="vehicle-stack">
                    {visibleSpecs.length === 0 ? (
                      <p className="empty-upload-state">
                        Bu arac icin detayli motor secenegi henuz katalogda yok. Elle devam edebilirsin.
                      </p>
                    ) : null}
                    {visibleSpecs.map((spec) => (
                      <button
                        key={spec.id}
                        className={`vehicle-option-card button-reset ${selectedSpecId === spec.id ? 'active' : ''}`}
                        type="button"
                        onClick={() => {
                          setSelectedSpecId(spec.id);
                          setForm((current) => ({
                            ...current,
                            fuelType: spec.fuelType ?? current.fuelType,
                            transmissionType: spec.transmissionType ?? current.transmissionType,
                          }));
                        }}
                      >
                        <strong>{buildEngineSummary(spec)}</strong>
                        <span>{buildSpecMeta(spec)}</span>
                      </button>
                    ))}
                    {showManualSpecOption ? (
                      <button
                        className={`vehicle-option-card button-reset ${selectedSpecId === MANUAL_SPEC_ID ? 'active' : ''}`}
                        type="button"
                        onClick={() => setSelectedSpecId(MANUAL_SPEC_ID)}
                      >
                        <strong>Bilmiyorum / Elle girecegim</strong>
                        <span>Motoru bilmiyorsan devam et, yakit ve vitesi elle sec.</span>
                      </button>
                    ) : null}
                  </div>
                  <small className="vehicle-context-label">Yakit</small>
                  <div className="vehicle-chip-grid">
                    {Object.values(FuelType).map((fuelType) => (
                      <button
                        key={fuelType}
                        className={`vehicle-chip button-reset ${form.fuelType === fuelType ? 'active' : ''}`}
                        type="button"
                        onClick={() => patchForm('fuelType', fuelType)}
                      >
                        {fuelTypeLabels[fuelType]}
                      </button>
                    ))}
                  </div>
                  <small className="vehicle-context-label">Vites</small>
                  <div className="vehicle-chip-grid">
                    {Object.values(TransmissionType).map((transmissionType) => (
                      <button
                        key={transmissionType}
                        className={`vehicle-chip button-reset ${
                          form.transmissionType === transmissionType ? 'active' : ''
                        }`}
                        type="button"
                        onClick={() => patchForm('transmissionType', transmissionType)}
                      >
                        {transmissionLabels[transmissionType]}
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}

              {step === 6 ? (
                <div className="vehicle-stack">
                  <h3 className="card-title">Standart paket donanimi</h3>
                  <p className="empty-upload-state">
                    Secilen paketle gelen standart donanimlar bilgi amacli olarak gosteriliyor.
                  </p>
                  {equipmentGroups.length > 0 ? (
                    equipmentGroups.map((group) => (
                      <div key={group.category} className="vehicle-summary-card">
                        <strong>{vehicleEquipmentCategoryLabels[group.category]}</strong>
                        <div className="vehicle-chip-grid">
                          {group.items.map((item) => (
                            <span key={item.id} className="vehicle-chip">
                              {item.name}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="vehicle-summary-card">
                      <strong>Temel donanim gosteriliyor</strong>
                      <span>Paket donanimi katalogda detaylanmadigi icin minimum guvenli setle devam ediyoruz.</span>
                    </div>
                  )}
                </div>
              ) : null}

              {step === 7 ? (
                <div className="vehicle-stack">
                  <h3 className="card-title">Ilave donanimlar</h3>
                  <p className="empty-upload-state">
                    Aracta sonradan eklenen veya pakete dahil olmayan donanimlari burada belirtebilirsin.
                  </p>
                  <small className="vehicle-context-label">Kategori sec</small>
                  <div className="vehicle-chip-grid">
                    {EXTRA_EQUIPMENT_CATEGORIES.map((categoryOption) => (
                      <button
                        key={categoryOption}
                        className={`vehicle-chip button-reset ${extraEquipmentCategory === categoryOption ? 'active' : ''}`}
                        type="button"
                        onClick={() => setExtraEquipmentCategory(categoryOption)}
                      >
                        {vehicleEquipmentCategoryLabels[categoryOption]}
                      </button>
                    ))}
                  </div>
                  <small className="vehicle-context-label">Hizli oneriler</small>
                  <div className="vehicle-chip-grid">
                    {EXTRA_EQUIPMENT_SUGGESTIONS.map((suggestion) => (
                      <button
                        key={suggestion}
                        className="vehicle-chip button-reset"
                        type="button"
                        onClick={() => addExtraEquipment(suggestion)}
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                  <label className="input-label">
                    Ilave donanim adi
                    <input
                      className="text-input"
                      value={extraEquipmentName}
                      onChange={(event) => setExtraEquipmentName(event.target.value)}
                    />
                  </label>
                  <label className="input-label">
                    Not (opsiyonel)
                    <textarea
                      className="text-input text-area-input"
                      rows={3}
                      value={extraEquipmentNote}
                      onChange={(event) => setExtraEquipmentNote(event.target.value)}
                    />
                  </label>
                  <button
                    className="secondary-link button-reset"
                    disabled={!extraEquipmentName.trim()}
                    type="button"
                    onClick={() => addExtraEquipment(extraEquipmentName)}
                  >
                    Donanimi ekle
                  </button>
                  {extraEquipment.length ? (
                    <div className="vehicle-stack">
                      {extraEquipment.map((item) => (
                        <button
                          key={`${item.category ?? 'OTHER'}-${item.name}`}
                          className="vehicle-toggle-row button-reset"
                          type="button"
                          onClick={() => removeExtraEquipment(item.name, item.category)}
                        >
                          <div>
                            <strong>{item.name}</strong>
                            <span>
                              {(item.category ? vehicleEquipmentCategoryLabels[item.category] : 'Diger') +
                                (item.note ? ` · ${item.note}` : '')}
                            </span>
                          </div>
                          <small>Sil</small>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <p className="empty-upload-state">
                      Ilave donanim eklemek zorunlu degil; istersen bos devam edebilirsin.
                    </p>
                  )}
                </div>
              ) : null}

              {step === 8 ? (
                <div className="filters-grid">
                  <label className="input-label">
                    KM
                    <input
                      className="text-input"
                      inputMode="numeric"
                      value={form.km}
                      onChange={(event) => patchForm('km', event.target.value.replace(/[^0-9]/g, ''))}
                    />
                  </label>
                  <label className="input-label">
                    Renk
                    <input
                      className="text-input"
                      value={form.color}
                      onChange={(event) => patchForm('color', event.target.value)}
                    />
                  </label>
                  <label className="input-label">
                    Plaka (opsiyonel)
                    <input
                      className="text-input"
                      value={form.plateNumber}
                      onChange={(event) => patchForm('plateNumber', event.target.value)}
                    />
                  </label>
                  <label className="input-label full-span">
                    Donanim notlari
                    <textarea
                      className="text-input text-area-input"
                      rows={4}
                      maxLength={600}
                      value={form.equipmentNotes}
                      onChange={(event) => patchForm('equipmentNotes', event.target.value)}
                    />
                  </label>
                  <label className="input-label full-span">
                    Aciklama
                    <textarea
                      className="text-input text-area-input"
                      rows={5}
                      maxLength={600}
                      value={form.description}
                      onChange={(event) => patchForm('description', event.target.value)}
                    />
                  </label>
                </div>
              ) : null}

              {step === 9 ? (
                <div className="vehicle-stack">
                  <label className="upload-dropzone">
                    <input
                      accept="image/jpeg,image/png,image/webp,video/mp4"
                      className="upload-input-hidden"
                      multiple
                      type="file"
                      onChange={(event) => void handleUpload(event)}
                    />
                    <span className="upload-dropzone-title">
                      {uploading ? 'Medyalar yukleniyor...' : 'Foto veya video sec'}
                    </span>
                    <span className="upload-dropzone-copy">
                      Profilde ve kesfette kullanilacak medyalari buradan ekle.
                    </span>
                  </label>
                  {uploads.length ? (
                    <div className="upload-preview-row">
                      {uploads.map((item) => (
                        <button
                          key={item.id}
                          className="upload-preview-tile button-reset"
                          type="button"
                          onClick={() =>
                            setUploads((current) => current.filter((entry) => entry.id !== item.id))
                          }
                        >
                          <img alt="Arac medya" className="upload-preview-image" src={item.url} />
                        </button>
                      ))}
                    </div>
                  ) : null}
                  <ToggleRow
                    active={form.isPublic}
                    title="Profilde goster"
                    copy="Arac profilindeki Araclar sekmesinde gorunsun."
                    onToggle={() => patchForm('isPublic', !form.isPublic)}
                  />
                  <ToggleRow
                    active={form.showInExplore}
                    title="Kesfette goster"
                    copy="Arac reels benzeri explore akisinda gorunebilir."
                    onToggle={() => patchForm('showInExplore', !form.showInExplore)}
                  />
                  <ToggleRow
                    active={form.openToOffers}
                    title="Teklife acik"
                    copy="Aciksa profil ve explore icinde teklif odakli aksiyonlar belirir."
                    onToggle={() => patchForm('openToOffers', !form.openToOffers)}
                  />
                </div>
              ) : null}
            </div>

            <div className="vehicle-wizard-actions">
              <button
                className="secondary-link button-reset"
                disabled={step === 1}
                type="button"
                onClick={() => setStep((current) => Math.max(1, current - 1) as WizardStep)}
              >
                Geri
              </button>
              {step < 9 ? (
                <button
                  className="primary-link button-reset"
                  disabled={!canContinue(step)}
                  type="button"
                  onClick={() => setStep((current) => Math.min(9, current + 1) as WizardStep)}
                >
                  Ileri
                </button>
              ) : (
                <button
                  className="primary-link button-reset"
                  disabled={submitting}
                  type="button"
                  onClick={() => void handleSubmit()}
                >
                  {submitting ? 'Kaydediliyor...' : 'Araci kaydet'}
                </button>
              )}
            </div>
          </section>
        ) : null}
      </section>
    </AppShell>
  );
}

function ToggleRow({
  active,
  title,
  copy,
  onToggle,
}: {
  active: boolean;
  title: string;
  copy: string;
  onToggle: () => void;
}) {
  return (
    <button className={`vehicle-toggle-row button-reset ${active ? 'active' : ''}`} type="button" onClick={onToggle}>
      <div>
        <strong>{title}</strong>
        <span>{copy}</span>
      </div>
      <small>{active ? 'Acik' : 'Kapali'}</small>
    </button>
  );
}



