'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
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
import { AppShell } from './app-shell';
import { useAuth } from './auth-provider';
import { webListingsApi } from '../lib/listings-api';
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

export function GarageHomeClient() {
  const { session, isReady } = useAuth();
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

  useEffect(() => {
    if (!session?.accessToken) {
      return;
    }

    setLoading(true);
    setErrorMessage(null);

    void Promise.all([
      webListingsApi.getGarageVehicles(session.accessToken),
      webListingsApi.getBrands(),
    ])
      .then(([garageResponse, brandResponse]) => {
        setVehicles(garageResponse.items);
        setBrands(brandResponse);
      })
      .catch((error) => {
        setErrorMessage(error instanceof Error ? error.message : 'Garaj verileri yuklenemedi.');
      })
      .finally(() => setLoading(false));
  }, [session?.accessToken]);

  useEffect(() => {
    if (!brandId) {
      setModels([]);
      setPackages([]);
      return;
    }

    void webListingsApi
      .getModels(brandId)
      .then(setModels)
      .catch(() => setModels([]));
  }, [brandId]);

  useEffect(() => {
    if (!modelId) {
      setPackages([]);
      return;
    }

    void webListingsApi
      .getPackages(modelId)
      .then(setPackages)
      .catch(() => setPackages([]));
  }, [modelId]);

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

  async function handleCreateVehicle() {
    if (!session?.accessToken) {
      return;
    }

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
      await webListingsApi.createGarageVehicle(session.accessToken, {
        ...form,
        vehiclePackageId: selectedPackage.id,
        brandText: brand.name,
        modelText: model.name,
        packageText: selectedPackage.name,
        media: (form.media ?? []).filter((item) => item.url.trim()),
      });

      const garageResponse = await webListingsApi.getGarageVehicles(session.accessToken);
      setVehicles(garageResponse.items);
      setNotice('Arac garaja eklendi. OBD expertiz akisi mobil uygulamada devam eder.');
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
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Arac garaja eklenemedi.');
    } finally {
      setSubmitting(false);
    }
  }

  if (!isReady) {
    return (
      <AppShell>
        <section className="detail-card gate-card">
          <h3 className="card-title">Garajim hazirlaniyor</h3>
        </section>
      </AppShell>
    );
  }

  if (!session) {
    return (
      <AppShell>
        <section className="detail-card gate-card">
          <div className="card-label">Auth required</div>
          <h3 className="card-title">Garajinizi gormek icin giris yapin</h3>
          <div className="gate-actions">
            <Link className="primary-link" href="/login">
              Giris yap
            </Link>
          </div>
        </section>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <section className="feed-hero-card garage-hero-card">
        <div>
          <div className="card-label">Ownership Layer</div>
          <h2 className="feed-hero-title">Garajim ve Carloi Expertiz</h2>
          <p className="feed-hero-copy">
            Araclarinizi garaja ekleyin, ilanlara baglayin ve expertiz akisini mobil uygulamadan yonetin.
          </p>
        </div>
        <div className="garage-stat-grid">
          <div className="listing-info-row">
            <span>Toplam arac</span>
            <strong>{vehicles.length}</strong>
          </div>
          <div className="listing-info-row">
            <span>Expertizli arac</span>
            <strong>{vehicles.filter((vehicle) => vehicle.latestObdReportId).length}</strong>
          </div>
        </div>
      </section>

      {notice ? (
        <section className="detail-card notice-card">
          <p className="card-copy">{notice}</p>
        </section>
      ) : null}
      {errorMessage ? (
        <section className="detail-card error-card">
          <p className="card-copy">{errorMessage}</p>
        </section>
      ) : null}

      {loading ? (
        <section className="detail-card gate-card">
          <h3 className="card-title">Garaj verileri yukleniyor</h3>
        </section>
      ) : null}

      {!loading && vehicles.length === 0 ? (
        <section className="detail-card compact-card">
          <h3 className="card-title">Garajiniz bos</h3>
          <p className="card-copy">Ilk aracinizi ekleyin. Mock OBD baglantisi ve test akisi mobil uygulamada acilir.</p>
        </section>
      ) : null}

      <div className="garage-layout">
        <section className="garage-main-column">
          <div className="garage-card-grid">
            {vehicles.map((vehicle) => (
              <article className="detail-card garage-card" key={vehicle.id}>
                <div className="garage-card-media">
                  {vehicle.firstMediaUrl ? <img alt={vehicle.brand} src={vehicle.firstMediaUrl} /> : <span>GARAGE</span>}
                </div>
                <div className="garage-card-body">
                  <div className="garage-card-top">
                    <div>
                      <div className="card-label">{vehicle.isPublic ? 'Public garage' : 'Private garage'}</div>
                      <h3 className="card-title">
                        {vehicle.brand} {vehicle.model}
                      </h3>
                    </div>
                    <span className="toggle-badge">
                      {vehicle.latestObdReportId ? `Expertiz ${vehicle.latestObdReportScore ?? '-'}` : 'Expertiz yok'}
                    </span>
                  </div>
                  <p className="card-copy">
                    {vehicle.package ? `${vehicle.package} / ` : ''}
                    {vehicle.year} / {vehicle.plateNumberMasked}
                  </p>
                  <div className="listing-meta-inline">
                    <span>{vehicle.km.toLocaleString('tr-TR')} km</span>
                    <span>{vehicle.isPublic ? 'Profilde gorunur' : 'Profilde gizli'}</span>
                  </div>
                  <div className="garage-actions">
                    <Link className="secondary-link" href={`/garage/${vehicle.id}`}>
                      Detay
                    </Link>
                    <Link className="secondary-link" href="/listings/create">
                      Ilana cikar
                    </Link>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>

        <aside className="detail-card create-panel garage-side-panel">
          <div className="card-label">Hizli Garaj Kaydi</div>
          <h3 className="card-title">Yeni arac ekle</h3>
          <p className="card-copy">Medya URL alanlari fake olabilir. OBD testi sonrasinda expertiz raporunu ilanlara baglayabilirsiniz.</p>

          <div className="choice-row garage-choice-wrap">
            {Object.values(VehicleType).map((vehicleType) => (
              <button
                className={`choice-toggle ${form.vehicleType === vehicleType ? 'active' : ''}`}
                key={vehicleType}
                type="button"
                onClick={() => patchForm('vehicleType', vehicleType)}
              >
                {vehicleTypeLabels[vehicleType]}
              </button>
            ))}
          </div>

          <div className="filters-grid">
            <label className="input-label">
              Marka
              <select
                className="text-input"
                value={brandId}
                onChange={(event) => {
                  setBrandId(event.target.value);
                  setModelId('');
                  setPackageId('');
                }}
              >
                <option value="">Marka secin</option>
                {brands.map((brand) => (
                  <option key={brand.id} value={brand.id}>
                    {brand.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="input-label">
              Model
              <select
                className="text-input"
                value={modelId}
                onChange={(event) => {
                  setModelId(event.target.value);
                  setPackageId('');
                }}
              >
                <option value="">Model secin</option>
                {models.map((model) => (
                  <option key={model.id} value={model.id}>
                    {model.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="input-label">
              Paket
              <select className="text-input" value={packageId} onChange={(event) => setPackageId(event.target.value)}>
                <option value="">Paket secin</option>
                {packages.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="input-label">
              Yil
              <input className="text-input" inputMode="numeric" value={form.year} onChange={(event) => patchForm('year', Number(event.target.value))} />
            </label>
            <label className="input-label">
              Plaka
              <input className="text-input" value={form.plateNumber} onChange={(event) => patchForm('plateNumber', event.target.value)} />
            </label>
            <label className="input-label">
              Renk
              <input className="text-input" value={form.color ?? ''} onChange={(event) => patchForm('color', event.target.value)} />
            </label>
            <label className="input-label">
              KM
              <input className="text-input" inputMode="numeric" value={form.km} onChange={(event) => patchForm('km', Number(event.target.value))} />
            </label>
            <label className="input-label">
              Yakit
              <select className="text-input" value={form.fuelType} onChange={(event) => patchForm('fuelType', event.target.value as FuelType)}>
                {Object.values(FuelType).map((fuelType) => (
                  <option key={fuelType} value={fuelType}>
                    {fuelTypeLabels[fuelType]}
                  </option>
                ))}
              </select>
            </label>
            <label className="input-label">
              Vites
              <select className="text-input" value={form.transmissionType} onChange={(event) => patchForm('transmissionType', event.target.value as TransmissionType)}>
                {Object.values(TransmissionType).map((transmissionType) => (
                  <option key={transmissionType} value={transmissionType}>
                    {transmissionLabels[transmissionType]}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <label className="inline-check">
            <input checked={Boolean(form.isPublic)} type="checkbox" onChange={(event) => patchForm('isPublic', event.target.checked)} />
            Profilde public garage olarak goster
          </label>

          <div className="media-entry-stack">
            <div className="media-entry-head">
              <span>Medya URL</span>
              <button
                className="secondary-link subtle-button"
                onClick={() =>
                  (form.media?.length ?? 0) < 6 &&
                  patchForm('media', [...(form.media ?? []), { url: '', mediaType: MediaType.IMAGE }])
                }
              >
                Medya ekle
              </button>
            </div>
            {(form.media ?? []).map((mediaItem, index) => (
              <div className="media-entry-card" key={`${index}-${mediaItem.url}`}>
                <label className="input-label">
                  Medya URL {index + 1}
                  <input className="text-input" value={mediaItem.url} onChange={(event) => patchMedia(index, event.target.value)} />
                </label>
              </div>
            ))}
          </div>

          <button className="primary-link wide-button" onClick={() => void handleCreateVehicle()}>
            {submitting ? 'Garaja ekleniyor...' : 'Araci garaja ekle'}
          </button>
          <p className="card-copy">OBD baglantisi web tarafinda kapali. Mock cihaz tarama ve 10 dakikalik test mobil uygulamada calisir.</p>
        </aside>
      </div>
    </AppShell>
  );
}
