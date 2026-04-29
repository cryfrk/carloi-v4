'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import type { CreateGarageVehicleRequest, GarageVehicleDetailResponse } from '@carloi-v4/types';
import { FuelType, TransmissionType, VehicleType } from '@carloi-v4/types';
import { AppShell } from './app-shell';
import { ExpertiseReportSection } from './expertise-report-section';
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

type EditFormState = Pick<
  CreateGarageVehicleRequest,
  'vehicleType' | 'year' | 'color' | 'fuelType' | 'transmissionType' | 'km' | 'isPublic' | 'media'
>;

const emptyEditForm: EditFormState = {
  vehicleType: VehicleType.SEDAN,
  year: new Date().getFullYear(),
  color: '',
  fuelType: FuelType.GASOLINE,
  transmissionType: TransmissionType.MANUAL,
  km: 0,
  isPublic: false,
  media: [{ url: '' }],
};

export function GarageDetailClient({ vehicleId }: { vehicleId: string }) {
  const router = useRouter();
  const { session, isReady } = useAuth();
  const [vehicle, setVehicle] = useState<GarageVehicleDetailResponse | null>(null);
  const [editForm, setEditForm] = useState<EditFormState>(emptyEditForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const loadVehicle = useCallback(async () => {
    if (!session?.accessToken) {
      return;
    }

    setLoading(true);
    setErrorMessage(null);

    try {
      const response = await webListingsApi.getGarageVehicleDetail(session.accessToken, vehicleId);
      setVehicle(response);
      setEditForm({
        vehicleType: response.vehicleType,
        year: response.year,
        color: response.color ?? '',
        fuelType: response.fuelType,
        transmissionType: response.transmissionType,
        km: response.km,
        isPublic: response.isPublic,
        media: response.media.length > 0 ? response.media.map((item) => ({ url: item.url })) : [{ url: '' }],
      });
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Arac detayi getirilemedi.');
    } finally {
      setLoading(false);
    }
  }, [session?.accessToken, vehicleId]);

  useEffect(() => {
    void loadVehicle();
  }, [loadVehicle]);

  function patchForm<K extends keyof EditFormState>(key: K, value: EditFormState[K]) {
    setEditForm((current) => ({
      ...current,
      [key]: value,
    }));
  }

  function patchMedia(index: number, value: string) {
    setEditForm((current) => ({
      ...current,
      media: (current.media ?? []).map((item, currentIndex) =>
        currentIndex === index ? { ...item, url: value } : item,
      ),
    }));
  }

  async function handleSave() {
    if (!session?.accessToken) {
      return;
    }

    setSaving(true);
    setErrorMessage(null);

    try {
      await webListingsApi.updateGarageVehicle(session.accessToken, vehicleId, {
        vehicleType: editForm.vehicleType,
        year: Number(editForm.year),
        color: editForm.color,
        fuelType: editForm.fuelType,
        transmissionType: editForm.transmissionType,
        km: Number(editForm.km),
        isPublic: editForm.isPublic,
        media: (editForm.media ?? []).filter((item) => item.url.trim()),
      });

      setNotice('Arac bilgileri guncellendi.');
      await loadVehicle();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Arac guncellenemedi.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!session?.accessToken) {
      return;
    }

    setDeleting(true);
    setErrorMessage(null);

    try {
      await webListingsApi.deleteGarageVehicle(session.accessToken, vehicleId);
      router.push('/garage');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Arac silinemedi.');
    } finally {
      setDeleting(false);
    }
  }

  if (!isReady) {
    return (
      <AppShell>
        <section className="detail-card gate-card">
          <h3 className="card-title">Garaj detayi hazirlaniyor</h3>
        </section>
      </AppShell>
    );
  }

  if (!session) {
    return (
      <AppShell>
        <section className="detail-card gate-card">
          <div className="card-label">Auth required</div>
          <h3 className="card-title">Garaj detayini gormek icin giris yapin</h3>
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
      <div className="detail-nav-row">
        <Link className="secondary-link" href="/garage">
          Garaja don
        </Link>
        <Link className="secondary-link" href="/listings/create">
          Ilan ver
        </Link>
      </div>

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
          <h3 className="card-title">Arac detayi yukleniyor</h3>
        </section>
      ) : null}

      {vehicle ? (
        <div className="garage-layout">
          <section className="garage-main-column garage-detail-stack">
            <article className="detail-card listing-gallery-card">
              <div className="listing-detail-gallery">
                {(vehicle.media.length > 0 ? vehicle.media : [{ id: 'fallback', url: '', mediaType: 'IMAGE', sortOrder: 0 }]).map((mediaItem) => (
                  <div className="listing-detail-frame" key={mediaItem.id}>
                    {mediaItem.url ? <img alt={vehicle.brand} src={mediaItem.url} /> : <div className="listing-card-fallback">GARAGE</div>}
                  </div>
                ))}
              </div>
            </article>

            <article className="detail-card listing-detail-copy">
              <div className="card-label">Garaj Detayi</div>
              <h1 className="listing-detail-title">
                {vehicle.brand} {vehicle.model}
              </h1>
              <p className="card-copy">
                {vehicle.package ? `${vehicle.package} / ` : ''}
                {vehicle.year} / {vehicle.plateNumberMasked} / {vehicle.km.toLocaleString('tr-TR')} km
              </p>
              <div className="listing-info-grid">
                <div className="listing-info-row">
                  <span>Yakit</span>
                  <strong>{fuelTypeLabels[vehicle.fuelType]}</strong>
                </div>
                <div className="listing-info-row">
                  <span>Vites</span>
                  <strong>{transmissionLabels[vehicle.transmissionType]}</strong>
                </div>
                <div className="listing-info-row">
                  <span>Tur</span>
                  <strong>{vehicleTypeLabels[vehicle.vehicleType]}</strong>
                </div>
                <div className="listing-info-row">
                  <span>Gorunurluk</span>
                  <strong>{vehicle.isPublic ? 'Public' : 'Private'}</strong>
                </div>
              </div>
            </article>

            {vehicle.spec ? (
              <article className="detail-card listing-info-card">
                <div className="card-label">Katalog Teknik Bilgileri</div>
                <div className="listing-info-grid">
                  <div className="listing-info-row">
                    <span>Kasa tipi</span>
                    <strong>{vehicle.spec.bodyType ?? '-'}</strong>
                  </div>
                  <div className="listing-info-row">
                    <span>Motor gucu</span>
                    <strong>{vehicle.spec.enginePowerHp ? `${vehicle.spec.enginePowerHp} hp` : '-'}</strong>
                  </div>
                  <div className="listing-info-row">
                    <span>Motor hacmi</span>
                    <strong>{vehicle.spec.engineVolumeCc ? `${vehicle.spec.engineVolumeCc} cc` : '-'}</strong>
                  </div>
                  <div className="listing-info-row">
                    <span>Cekis</span>
                    <strong>{vehicle.spec.tractionType ?? '-'}</strong>
                  </div>
                </div>
                <p className="card-copy">{vehicle.spec.equipmentSummary ?? 'Donanim ozeti bekleniyor.'}</p>
                <p className="card-copy">{vehicle.spec.multimediaSummary ?? 'Multimedya ozeti bekleniyor.'}</p>
                <p className="card-copy">{vehicle.spec.interiorSummary ?? 'Ic mekan ozeti bekleniyor.'}</p>
                <p className="card-copy">{vehicle.spec.exteriorSummary ?? 'Dis mekan ozeti bekleniyor.'}</p>
              </article>
            ) : null}

            <ExpertiseReportSection
              report={vehicle.latestObdReport}
              vehicleLabel={`${vehicle.brand} ${vehicle.model}${vehicle.package ? ` / ${vehicle.package}` : ''}`}
            />
          </section>

          <aside className="detail-card garage-side-panel">
            <div className="card-label">Web Durumu</div>
            <h3 className="card-title">OBD baglantisi mobil uygulamada yapilir</h3>
            <p className="card-copy">
              Bu ekranda raporu okuyabilir ve arac kaydini guncelleyebilirsiniz. Mock cihaz tarama, baglanti ve 10 dakikalik test akisi mobil uygulamada calisir.
            </p>

            <div className="choice-row garage-choice-wrap">
              {Object.values(VehicleType).map((vehicleType) => (
                <button
                  className={`choice-toggle ${editForm.vehicleType === vehicleType ? 'active' : ''}`}
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
                Yil
                <input className="text-input" inputMode="numeric" value={editForm.year} onChange={(event) => patchForm('year', Number(event.target.value))} />
              </label>
              <label className="input-label">
                Renk
                <input className="text-input" value={editForm.color ?? ''} onChange={(event) => patchForm('color', event.target.value)} />
              </label>
              <label className="input-label">
                KM
                <input className="text-input" inputMode="numeric" value={editForm.km} onChange={(event) => patchForm('km', Number(event.target.value))} />
              </label>
              <label className="input-label">
                Yakit
                <select className="text-input" value={editForm.fuelType} onChange={(event) => patchForm('fuelType', event.target.value as FuelType)}>
                  {Object.values(FuelType).map((fuelType) => (
                    <option key={fuelType} value={fuelType}>
                      {fuelTypeLabels[fuelType]}
                    </option>
                  ))}
                </select>
              </label>
              <label className="input-label">
                Vites
                <select className="text-input" value={editForm.transmissionType} onChange={(event) => patchForm('transmissionType', event.target.value as TransmissionType)}>
                  {Object.values(TransmissionType).map((transmissionType) => (
                    <option key={transmissionType} value={transmissionType}>
                      {transmissionLabels[transmissionType]}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <label className="inline-check">
              <input checked={Boolean(editForm.isPublic)} type="checkbox" onChange={(event) => patchForm('isPublic', event.target.checked)} />
              Profilde public garage olarak goster
            </label>

            <div className="media-entry-stack">
              <div className="media-entry-head">
                <span>Medya URL</span>
                <button className="secondary-link subtle-button" onClick={() => patchForm('media', [...(editForm.media ?? []), { url: '' }])}>
                  Medya ekle
                </button>
              </div>
              {(editForm.media ?? []).map((mediaItem, index) => (
                <div className="media-entry-card" key={`${index}-${mediaItem.url}`}>
                  <label className="input-label">
                    Medya URL {index + 1}
                    <input className="text-input" value={mediaItem.url} onChange={(event) => patchMedia(index, event.target.value)} />
                  </label>
                </div>
              ))}
            </div>

            <div className="garage-actions">
              <button className="primary-link wide-button" onClick={() => void handleSave()}>
                {saving ? 'Kaydediliyor...' : 'Araci guncelle'}
              </button>
              <button className="danger-link" onClick={() => void handleDelete()}>
                {deleting ? 'Siliniyor...' : 'Araci sil'}
              </button>
            </div>
          </aside>
        </div>
      ) : null}
    </AppShell>
  );
}
