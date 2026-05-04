'use client';

import Link from 'next/link';
import { SharedContentType } from '@carloi-v4/types';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import type { VehicleShowcaseDetailResponse } from '@carloi-v4/types';
import { AppShell } from './app-shell';
import { ShareContentSheet } from './share-content-sheet';
import { useAuth } from './auth-provider';
import { WebMediaView } from './web-media-view';
import { buildDemoMessageFixtures, demoExploreVehicleById } from '../lib/demo-content';
import { webExploreApi } from '../lib/explore-api';
import { vehicleEquipmentCategoryLabels } from '../lib/listings-ui';
import { webMessagesApi } from '../lib/messages-api';

function sharedCardMatchesTarget(card: unknown, targetId: string): boolean {
  return Boolean(card && typeof card === 'object' && 'targetId' in card && card.targetId === targetId);
}

export function VehicleShowcaseDetailClient({ vehicleId }: { vehicleId: string }) {
  const router = useRouter();
  const { session, isReady } = useAuth();
  const [vehicle, setVehicle] = useState<VehicleShowcaseDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [shareOpen, setShareOpen] = useState(false);
  const demoMessages = useMemo(
    () =>
      buildDemoMessageFixtures(
        session
          ? {
              id: session.user.id,
              username: session.user.username,
              firstName: session.user.firstName,
              lastName: session.user.lastName,
            }
          : null,
      ),
    [session],
  );

  useEffect(() => {
    if (!session?.accessToken) {
      return;
    }

    setLoading(true);
    setErrorMessage(null);

    if (vehicleId.startsWith('demo-vehicle-')) {
      setVehicle(demoExploreVehicleById[vehicleId] ?? null);
      setLoading(false);
      return;
    }

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

    if (vehicle.id.startsWith('demo-vehicle-')) {
      const demoThread =
        demoMessages.threads.find((thread) =>
          thread.participants.some((participant) => participant.id === vehicle.owner.id),
        ) ??
        Object.values(demoMessages.threadDetails).find((thread) =>
          thread.messages.some((message) => sharedCardMatchesTarget(message.systemCard, vehicle.id)),
        );

      if (demoThread) {
        router.push(`/messages?thread=${demoThread.id}`);
        return;
      }
    }

    try {
      const response = await webMessagesApi.createDirectThread(session.accessToken, {
        targetUserId: vehicle.owner.id,
      });
      router.push(`/messages?thread=${response.thread.id}`);
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

        {notice ? <div className="auth-message success">{notice}</div> : null}
        {errorMessage ? <div className="auth-message error">{errorMessage}</div> : null}
        {!isReady ? <div className="detail-card">Oturum hazirlaniyor...</div> : null}
        {loading ? <div className="detail-card">Arac detayi yukleniyor...</div> : null}

        {vehicle ? (
          <section className="vehicle-detail-panel">
            <div className="vehicle-gallery-strip">
              {(vehicle.media.length ? vehicle.media : [{ id: 'fallback', url: vehicle.firstMediaUrl ?? '', mediaType: 'IMAGE', sortOrder: 0 }]).map((mediaItem) => (
                <div className="vehicle-gallery-item" key={mediaItem.id}>
                  {mediaItem.url ? (
                    <WebMediaView
                      alt={`${vehicle.brand} ${vehicle.model}`}
                      autoPlay={mediaItem.mediaType === 'VIDEO'}
                      className="vehicle-gallery-media"
                      controls={mediaItem.mediaType === 'VIDEO'}
                      loop={mediaItem.mediaType === 'VIDEO'}
                      mediaType={mediaItem.mediaType === 'VIDEO' ? 'VIDEO' : 'IMAGE'}
                      muted={mediaItem.mediaType === 'VIDEO'}
                      uri={mediaItem.url}
                    />
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
                <button className="secondary-link subtle-button" type="button" onClick={() => setShareOpen(true)}>
                  Paylas
                </button>
              </div>
            </div>
          </section>
        ) : null}
        {vehicle ? (
          <ShareContentSheet
            accessToken={session?.accessToken ?? null}
            contentId={vehicle.id}
            contentType={SharedContentType.VEHICLE}
            currentUserId={session?.user.id ?? null}
            onClose={() => setShareOpen(false)}
            onShared={(count) => setNotice(`${count} kisiye gonderildi.`)}
            visible={shareOpen}
          />
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

