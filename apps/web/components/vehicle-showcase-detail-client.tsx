'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import type { VehicleShowcaseDetailResponse } from '@carloi-v4/types';
import { AppShell } from './app-shell';
import { useAuth } from './auth-provider';
import { webExploreApi } from '../lib/explore-api';
import { vehicleEquipmentCategoryLabels } from '../lib/listings-ui';
import { webMessagesApi } from '../lib/messages-api';

export function VehicleShowcaseDetailClient({ vehicleId }: { vehicleId: string }) {
  const { session, isReady } = useAuth();
  const [vehicle, setVehicle] = useState<VehicleShowcaseDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!session?.accessToken) {
      return;
    }

    setLoading(true);
    setErrorMessage(null);

    void webExploreApi
      .getVehicleShowcase(session.accessToken, vehicleId)
      .then(setVehicle)
      .catch((error) => {
        setErrorMessage(error instanceof Error ? error.message : 'Arac detayi yuklenemedi.');
      })
      .finally(() => setLoading(false));
  }, [session?.accessToken, vehicleId]);

  async function handleMessage() {
    if (!session?.accessToken || !vehicle) {
      return;
    }

    try {
      const response = await webMessagesApi.createDirectThread(session.accessToken, {
        targetUserId: vehicle.owner.id,
      });
      window.location.href = `/messages?thread=${response.thread.id}`;
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Mesaj alani acilamadi.');
    }
  }

  const isOwnVehicle = vehicle ? vehicle.owner.id === session?.user.id : false;

  return (
    <AppShell>
      <section className="vehicle-detail-shell">
        <div className="detail-nav-row">
          <Link className="secondary-link" href="/profile?tab=vehicles">Profile don</Link>
          <Link className="secondary-link" href="/explore">Kesfete don</Link>
        </div>

        {errorMessage ? <div className="auth-message error">{errorMessage}</div> : null}
        {!isReady ? <div className="detail-card">Oturum hazirlaniyor...</div> : null}
        {loading ? <div className="detail-card">Arac detayi yukleniyor...</div> : null}

        {vehicle ? (
          <section className="vehicle-detail-panel">
            <div className="vehicle-gallery-strip">
              {(vehicle.media.length ? vehicle.media : [{ id: 'fallback', url: vehicle.firstMediaUrl ?? '', mediaType: 'IMAGE', sortOrder: 0 }]).map((mediaItem) => (
                <div className="vehicle-gallery-item" key={mediaItem.id}>
                  {mediaItem.url ? (
                    <img alt={`${vehicle.brand} ${vehicle.model}`} loading="lazy" src={mediaItem.url} />
                  ) : (
                    <div className="profile-tile-fallback">ARAC</div>
                  )}
                </div>
              ))}
            </div>

            <div className="vehicle-detail-copy">
              <div className="vehicle-owner-row">
                <span className="session-avatar">{vehicle.owner.username.slice(0, 1).toUpperCase()}</span>
                <div>
                  <strong>@{vehicle.owner.username}</strong>
                  <p>{vehicle.owner.fullName} · {vehicle.city ?? 'Konum gizli'}</p>
                </div>
              </div>

              <div className="vehicle-title-block">
                <h1>{vehicle.brand} {vehicle.model}</h1>
                <p>{[vehicle.package, String(vehicle.year)].filter(Boolean).join(' · ')}</p>
              </div>

              {vehicle.description ? <p className="vehicle-description">{vehicle.description}</p> : null}
              {vehicle.equipmentNotes ? <p className="vehicle-equipment">{vehicle.equipmentNotes}</p> : null}

              <div className="vehicle-spec-grid">
                <SpecCell label="Yakit" value={vehicle.fuelType} />
                <SpecCell label="Vites" value={vehicle.transmissionType} />
                <SpecCell label="KM" value={`${vehicle.km.toLocaleString('tr-TR')} km`} />
                <SpecCell label="Kasa" value={vehicle.bodyType ?? 'Belirtilmedi'} />
                <SpecCell label="Motor" value={vehicle.engineVolume ? `${(vehicle.engineVolume / 1000).toFixed(1)}L` : 'Belirtilmedi'} />
                <SpecCell label="Guc" value={vehicle.enginePower ? `${vehicle.enginePower} hp` : 'Belirtilmedi'} />
              </div>

              <div className="vehicle-badge-row">
                {vehicle.openToOffers ? <span className="vehicle-pill">Teklife acik</span> : null}
                {vehicle.showInExplore ? <span className="vehicle-pill">Kesfette gorunuyor</span> : null}
                {vehicle.city ? <span className="vehicle-pill">{vehicle.city}</span> : null}
              </div>

              {vehicle.standardEquipment.length ? (
                <div className="vehicle-stack">
                  <h3 className="card-title">Standart Paket Donanimi</h3>
                  {vehicle.standardEquipment.map((group) => (
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
                  ))}
                </div>
              ) : null}

              {vehicle.extraEquipment.length ? (
                <div className="vehicle-stack">
                  <h3 className="card-title">Ilave Donanimlar</h3>
                  {vehicle.extraEquipment.map((item) => (
                    <div key={item.id} className="vehicle-summary-card">
                      <strong>{item.name}</strong>
                      <span>
                        {(item.category ? vehicleEquipmentCategoryLabels[item.category] : 'Diger') +
                          (item.note ? ` · ${item.note}` : '')}
                      </span>
                    </div>
                  ))}
                </div>
              ) : null}

              <div className="vehicle-action-row">
                {isOwnVehicle ? (
                  <Link className="primary-link wide-button" href={`/listings/create?vehicleId=${vehicle.id}`}>Ilana cikar</Link>
                ) : (
                  <button className="primary-link wide-button button-reset" type="button" onClick={() => void handleMessage()}>
                    {vehicle.openToOffers ? 'Teklif ver' : 'Mesaj gonder'}
                  </button>
                )}
              </div>
            </div>
          </section>
        ) : null}
      </section>
    </AppShell>
  );
}

function SpecCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="vehicle-spec-card">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

