'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import type {
  CreateGarageVehicleRequest,
  MediaAssetUploadResponse,
  VehicleCatalogBrand,
  VehicleCatalogModel,
  VehicleCatalogPackage,
  VehiclePackageSpec,
} from '@carloi-v4/types';
import { FuelType, MediaAssetPurpose, MediaType, TransmissionType, VehicleType } from '@carloi-v4/types';
import { AppShell } from './app-shell';
import { useAuth } from './auth-provider';
import { fuelTypeLabels, transmissionLabels } from '../lib/listings-ui';
import { webListingsApi } from '../lib/listings-api';
import { webMediaApi } from '../lib/media-api';

type VehicleCategory = 'AUTOMOBILE' | 'MOTORCYCLE' | 'COMMERCIAL';
type WizardStep = 1 | 2 | 3 | 4 | 5 | 6 | 7;

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
  { key: 'AUTOMOBILE', title: 'Otomobil', copy: 'Sedan, hatchback, SUV ve binek araclar.' },
  { key: 'MOTORCYCLE', title: 'Motosiklet', copy: 'Motosiklet ve iki tekerli araclar.' },
  { key: 'COMMERCIAL', title: 'Ticari', copy: 'Panelvan, pickup ve ticari odakli araclar.' },
];

function deriveVehicleType(category: VehicleCategory, spec: VehiclePackageSpec | null): VehicleType {
  const bodyType = spec?.bodyType?.toLocaleLowerCase('tr-TR') ?? '';

  if (category === 'MOTORCYCLE') return VehicleType.MOTORCYCLE;
  if (bodyType.includes('suv')) return VehicleType.SUV;
  if (bodyType.includes('hatch')) return VehicleType.HATCHBACK;
  if (bodyType.includes('coupe')) return VehicleType.COUPE;
  if (bodyType.includes('pick')) return VehicleType.PICKUP;
  if (bodyType.includes('van') || bodyType.includes('panel')) return VehicleType.VAN;
  if (category === 'COMMERCIAL') return VehicleType.VAN;
  return VehicleType.SEDAN;
}

export function VehicleWizardClient() {
  const { session, isReady } = useAuth();
  const [step, setStep] = useState<WizardStep>(1);
  const [category, setCategory] = useState<VehicleCategory>('AUTOMOBILE');
  const [brands, setBrands] = useState<VehicleCatalogBrand[]>([]);
  const [models, setModels] = useState<VehicleCatalogModel[]>([]);
  const [packages, setPackages] = useState<VehicleCatalogPackage[]>([]);
  const [selectedBrandId, setSelectedBrandId] = useState('');
  const [selectedModelId, setSelectedModelId] = useState('');
  const [selectedPackageId, setSelectedPackageId] = useState('');
  const [selectedSpec, setSelectedSpec] = useState<VehiclePackageSpec | null>(null);
  const [uploads, setUploads] = useState<MediaAssetUploadResponse[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [loadingCatalog, setLoadingCatalog] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
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

  useEffect(() => {
    if (!session?.accessToken) {
      return;
    }

    setLoadingCatalog(true);
    void webListingsApi
      .getBrands()
      .then(setBrands)
      .catch((error) => {
        setErrorMessage(error instanceof Error ? error.message : 'Arac kutuphanesi yuklenemedi.');
      })
      .finally(() => setLoadingCatalog(false));
  }, [session?.accessToken]);

  useEffect(() => {
    if (!selectedBrandId) {
      setModels([]);
      return;
    }

    void webListingsApi.getModels(selectedBrandId).then(setModels).catch(() => setModels([]));
  }, [selectedBrandId]);

  useEffect(() => {
    if (!selectedModelId) {
      setPackages([]);
      return;
    }

    void webListingsApi.getPackages(selectedModelId).then(setPackages).catch(() => setPackages([]));
  }, [selectedModelId]);

  useEffect(() => {
    if (!selectedPackageId) {
      setSelectedSpec(null);
      return;
    }

    void webListingsApi
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
        return Boolean(form.km >= 0 && form.color.trim().length > 0 && form.plateNumber.trim().length > 0);
      case 6:
        return uploads.length > 0;
      default:
        return true;
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
      const uploaded = await webMediaApi.uploadFiles(session.accessToken, files, MediaAssetPurpose.GARAGE_VEHICLE_MEDIA);
      setUploads((current) => [...current, ...uploaded].slice(0, 12));
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Medyalar yuklenemedi.');
    } finally {
      setUploading(false);
      event.target.value = '';
    }
  }

  async function handleSubmit() {
    if (!session?.accessToken) return;

    const selectedBrand = brands.find((item) => item.id === selectedBrandId);
    const selectedModel = models.find((item) => item.id === selectedModelId);
    const selectedPackage = packages.find((item) => item.id === selectedPackageId);

    if (!selectedBrand || !selectedModel || !selectedPackage) {
      setErrorMessage('Marka, model ve paket secimi tamamlanmali.');
      return;
    }

    setSubmitting(true);
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

      const response = await webListingsApi.createGarageVehicle(session.accessToken, payload);
      window.location.href = `/vehicles/${response.vehicle.id}`;
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Arac kaydedilemedi.');
    } finally {
      setSubmitting(false);
    }
  }

  if (!isReady) {
    return <AppShell><section className="detail-card gate-card"><h3 className="card-title">Arac wizard hazirlaniyor</h3></section></AppShell>;
  }

  if (!session) {
    return <AppShell><section className="detail-card gate-card"><Link className="primary-link" href="/login">Giris yap</Link></section></AppShell>;
  }

  return (
    <AppShell>
      <section className="vehicle-wizard-shell">
        <div className="detail-nav-row">
          <Link className="secondary-link" href="/profile?tab=vehicles">Profile don</Link>
          <Link className="secondary-link" href="/listings/create">Ilan olustur</Link>
        </div>

        {errorMessage ? <div className="auth-message error">{errorMessage}</div> : null}
        {loadingCatalog ? <div className="detail-card">Arac kutuphanesi yukleniyor...</div> : null}

        {!loadingCatalog ? (
          <section className="vehicle-wizard-panel">
            <div className="vehicle-step-row">
              {STEPS.map((item) => (
                <span key={item.step} className={`vehicle-step-chip ${item.step === step ? 'active' : ''}`}>{item.step}. {item.label}</span>
              ))}
            </div>

            <div className="vehicle-wizard-card">
              {step === 1 ? (
                <div className="vehicle-option-grid">
                  {CATEGORY_OPTIONS.map((option) => (
                    <button key={option.key} className={`vehicle-option-card button-reset ${category === option.key ? 'active' : ''}`} type="button" onClick={() => setCategory(option.key)}>
                      <strong>{option.title}</strong>
                      <span>{option.copy}</span>
                    </button>
                  ))}
                </div>
              ) : null}

              {step === 2 ? (
                <div className="vehicle-chip-grid">
                  {brands.map((brand) => (
                    <button key={brand.id} className={`vehicle-chip button-reset ${selectedBrandId === brand.id ? 'active' : ''}`} type="button" onClick={() => { setSelectedBrandId(brand.id); setSelectedModelId(''); setSelectedPackageId(''); }}>
                      {brand.name}
                    </button>
                  ))}
                </div>
              ) : null}

              {step === 3 ? (
                <div className="vehicle-stack">
                  <div className="vehicle-chip-grid">
                    {models.map((model) => (
                      <button key={model.id} className={`vehicle-chip button-reset ${selectedModelId === model.id ? 'active' : ''}`} type="button" onClick={() => { setSelectedModelId(model.id); setSelectedPackageId(''); }}>
                        {model.name}
                      </button>
                    ))}
                  </div>
                  <div className="vehicle-chip-grid">
                    {packages.map((item) => (
                      <button key={item.id} className={`vehicle-chip button-reset ${selectedPackageId === item.id ? 'active' : ''}`} type="button" onClick={() => setSelectedPackageId(item.id)}>
                        {item.name}
                      </button>
                    ))}
                  </div>
                  <input className="text-input" inputMode="numeric" value={form.year} onChange={(event) => patchForm('year', Number(event.target.value))} />
                </div>
              ) : null}

              {step === 4 ? (
                <div className="vehicle-stack">
                  <div className="vehicle-summary-card">
                    <strong>{selectedSpec?.bodyType ?? 'Govde tipi bekleniyor'}</strong>
                    <span>{selectedSpec?.engineVolumeCc ? `${selectedSpec.engineVolumeCc} cc` : 'Motor hacmi yok'} · {selectedSpec?.enginePowerHp ? `${selectedSpec.enginePowerHp} hp` : 'Guc bilgisi yok'}</span>
                  </div>
                  <div className="vehicle-chip-grid">
                    {Object.values(FuelType).map((fuelType) => (
                      <button key={fuelType} className={`vehicle-chip button-reset ${form.fuelType === fuelType ? 'active' : ''}`} type="button" onClick={() => patchForm('fuelType', fuelType)}>
                        {fuelTypeLabels[fuelType]}
                      </button>
                    ))}
                  </div>
                  <div className="vehicle-chip-grid">
                    {Object.values(TransmissionType).map((transmissionType) => (
                      <button key={transmissionType} className={`vehicle-chip button-reset ${form.transmissionType === transmissionType ? 'active' : ''}`} type="button" onClick={() => patchForm('transmissionType', transmissionType)}>
                        {transmissionLabels[transmissionType]}
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}

              {step === 5 ? (
                <div className="filters-grid">
                  <label className="input-label">Plaka<input className="text-input" value={form.plateNumber} onChange={(event) => patchForm('plateNumber', event.target.value)} /></label>
                  <label className="input-label">KM<input className="text-input" inputMode="numeric" value={form.km} onChange={(event) => patchForm('km', Number(event.target.value))} /></label>
                  <label className="input-label">Renk<input className="text-input" value={form.color} onChange={(event) => patchForm('color', event.target.value)} /></label>
                  <label className="input-label full-span">Donanim notlari<textarea className="text-input text-area-input" rows={4} value={form.equipmentNotes} onChange={(event) => patchForm('equipmentNotes', event.target.value)} /></label>
                  <label className="input-label full-span">Aciklama<textarea className="text-input text-area-input" rows={5} maxLength={600} value={form.description} onChange={(event) => patchForm('description', event.target.value)} /></label>
                </div>
              ) : null}

              {step === 6 ? (
                <div className="vehicle-stack">
                  <label className="upload-dropzone">
                    <input accept="image/jpeg,image/png,image/webp,video/mp4" className="upload-input-hidden" multiple type="file" onChange={(event) => void handleUpload(event)} />
                    <span className="upload-dropzone-title">{uploading ? 'Medyalar yukleniyor...' : 'Galeri sec'}</span>
                    <span className="upload-dropzone-copy">Profil ve kesfet akisi icin en fazla 12 medya secilebilir.</span>
                  </label>
                  {uploads.length ? (
                    <div className="upload-preview-row">
                      {uploads.map((item) => (
                        <button key={item.id} className="upload-preview-tile button-reset" type="button" onClick={() => setUploads((current) => current.filter((entry) => entry.id !== item.id))}>
                          <img alt="Arac medya" className="upload-preview-image" src={item.url} />
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>
              ) : null}

              {step === 7 ? (
                <div className="vehicle-stack">
                  <ToggleRow active={form.isPublic} title="Profilde goster" copy="Arac profilindeki Araclar sekmesinde gorunsun." onToggle={() => patchForm('isPublic', !form.isPublic)} />
                  <ToggleRow active={form.showInExplore} title="Kesfette goster" copy="Bu arac dikey reels akisinda yer alabilir." onToggle={() => patchForm('showInExplore', !form.showInExplore)} />
                  <ToggleRow active={form.openToOffers} title="Teklife acik" copy="Diger kullanicilar arac icin teklif odakli mesaj baslatabilir." onToggle={() => patchForm('openToOffers', !form.openToOffers)} />
                </div>
              ) : null}
            </div>

            <div className="vehicle-wizard-actions">
              <button className="secondary-link button-reset" disabled={step === 1} type="button" onClick={() => setStep((current) => Math.max(1, current - 1) as WizardStep)}>Geri</button>
              {step < 7 ? (
                <button className="primary-link button-reset" disabled={!canContinue(step)} type="button" onClick={() => setStep((current) => Math.min(7, current + 1) as WizardStep)}>Ileri</button>
              ) : (
                <button className="primary-link button-reset" disabled={submitting} type="button" onClick={() => void handleSubmit()}>{submitting ? 'Kaydediliyor...' : 'Araci kaydet'}</button>
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

