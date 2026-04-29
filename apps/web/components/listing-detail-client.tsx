'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import type { ListingDetailResponse } from '@carloi-v4/types';
import { AppShell } from './app-shell';
import { ExpertiseReportSection } from './expertise-report-section';
import { useAuth } from './auth-provider';
import { VehicleDamageMap } from './vehicle-damage-map';
import { formatKm, formatPrice, fuelTypeLabels, sellerTypeLabels, transmissionLabels } from '../lib/listings-ui';
import { webListingsApi } from '../lib/listings-api';
import { webMessagesApi } from '../lib/messages-api';

export function ListingDetailClient({ listingId }: { listingId: string }) {
  const router = useRouter();
  const { session, isReady } = useAuth();
  const [listing, setListing] = useState<ListingDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    if (!session?.accessToken) {
      return;
    }

    setLoading(true);
    setErrorMessage(null);

    void webListingsApi
      .getDetail(session.accessToken, listingId)
      .then((response) => {
        setListing(response);
      })
      .catch((error) => {
        setErrorMessage(error instanceof Error ? error.message : 'Ilan detayi alinamadi.');
      })
      .finally(() => setLoading(false));
  }, [listingId, session?.accessToken]);

  const infoRows = useMemo(() => {
    if (!listing) {
      return [];
    }

    return [
      ['Ilan no', listing.listingNo],
      ['Ilan tarihi', new Date(listing.createdAt).toLocaleDateString('tr-TR')],
      ['Kimden', sellerTypeLabels[listing.sellerType]],
      ['Marka', listing.vehicle.brand ?? '-'],
      ['Model', listing.vehicle.model ?? '-'],
      ['Paket', listing.vehicle.package ?? '-'],
      ['Yil', listing.vehicle.year ? String(listing.vehicle.year) : '-'],
      ['Yakit', listing.vehicle.fuelType ? fuelTypeLabels[listing.vehicle.fuelType] : '-'],
      [
        'Vites',
        listing.vehicle.transmissionType
          ? transmissionLabels[listing.vehicle.transmissionType]
          : '-',
      ],
      ['KM', formatKm(listing.vehicle.km)],
      ['Kasa', listing.vehicle.bodyType ?? '-'],
      ['Motor gucu', listing.vehicle.enginePowerHp ? `${listing.vehicle.enginePowerHp} hp` : '-'],
      [
        'Motor hacmi',
        listing.vehicle.engineVolumeCc ? `${listing.vehicle.engineVolumeCc} cc` : '-',
      ],
      ['Cekis', listing.vehicle.tractionType ?? '-'],
      ['Renk', listing.vehicle.color ?? '-'],
      ['Garanti', listing.vehicle.guarantee ?? '-'],
      ['Plaka', listing.plateMasked ?? '-'],
      ['Takas', listing.tradeAvailable ? 'Evet' : 'Hayir'],
    ] as const;
  }, [listing]);

  async function toggleSave() {
    if (!session?.accessToken || !listing) {
      return;
    }

    try {
      const response = listing.isSaved
        ? await webListingsApi.unsaveListing(session.accessToken, listing.id)
        : await webListingsApi.saveListing(session.accessToken, listing.id);

      setListing((current) => (current ? { ...current, isSaved: response.isSaved } : current));
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Kaydetme islemi tamamlanamadi.');
    }
  }

  async function startListingConversation() {
    if (!session?.accessToken || !listing) {
      return;
    }

    try {
      const response = await webMessagesApi.startListingDeal(session.accessToken, listing.id);
      router.push(`/messages?thread=${response.thread.id}`);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Sohbet baslatilamadi.');
    }
  }

  if (!isReady) {
    return (
      <AppShell>
        <section className="detail-card gate-card">
          <h3 className="card-title">Ilan detayi hazirlaniyor</h3>
          <p className="card-copy">Oturum ve erisim bilgileri yukleniyor.</p>
        </section>
      </AppShell>
    );
  }

  if (!session) {
    return (
      <AppShell>
        <section className="detail-card gate-card">
          <div className="card-label">Auth required</div>
          <h3 className="card-title">Ilan detayini gormek icin giris yapin</h3>
          <p className="card-copy">Giris sonrasinda ilan detayi, kaydetme ve iletisim aksiyonlari acilir.</p>
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
        <Link className="secondary-link" href="/listings">
          Ilanlara don
        </Link>
        <Link className="secondary-link" href="/garage">
          Garajim
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
          <h3 className="card-title">Ilan detayi yukleniyor</h3>
          <p className="card-copy">Galeri, arac bilgileri ve iletisim aksiyonlari getiriliyor.</p>
        </section>
      ) : null}

      {!loading && !listing ? (
        <section className="detail-card gate-card">
          <h3 className="card-title">Ilan bulunamadi</h3>
          <p className="card-copy">Bu kayit silinmis olabilir veya size acik olmayabilir.</p>
        </section>
      ) : null}

      {listing ? (
        <div className="listing-detail-layout">
          <section className="listing-detail-main">
            <article className="detail-card listing-gallery-card">
              <div className="listing-detail-gallery">
                {listing.media.map((mediaItem) => (
                  <div className="listing-detail-frame" key={mediaItem.id}>
                    {mediaItem.mediaType === 'IMAGE' ? (
                      <img alt={listing.title} src={mediaItem.url} />
                    ) : (
                      <div className="video-tile">
                        <span className="video-pill">VIDEO</span>
                        <p>{mediaItem.url}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </article>

            <article className="detail-card listing-detail-copy">
              <div className="card-label">Ilan Detayi</div>
              <h1 className="listing-detail-title">{listing.title}</h1>
              <div className="listing-owner-mini">
                <div className="feed-avatar">{listing.owner.username.slice(0, 1).toUpperCase()}</div>
                <div className="feed-owner-copy">
                  <div className="feed-owner-row">
                    <strong>@{listing.owner.username}</strong>
                    {listing.owner.blueVerified ? <span className="tick-badge blue">Blue</span> : null}
                    {listing.owner.goldVerified ? <span className="tick-badge gold">Gold</span> : null}
                  </div>
                  <span className="feed-owner-meta">{listing.owner.fullName}</span>
                </div>
              </div>
              <p className="listing-detail-description">{listing.description}</p>
            </article>

            <article className="detail-card listing-info-card">
              <div className="card-label">Teknik Bilgiler</div>
              <div className="listing-info-grid">
                {infoRows.map(([label, value]) => (
                  <div className="listing-info-row" key={label}>
                    <span>{label}</span>
                    <strong>{value}</strong>
                  </div>
                ))}
              </div>
            </article>

            <article className="detail-card listing-damage-card">
              <div className="card-label">Boya / Degisen</div>
              <VehicleDamageMap value={listing.damageParts} />
            </article>

            <article className="detail-card listing-summary-grid">
              <div className="listing-summary-card">
                <div className="card-label">Donanim</div>
                <p className="card-copy">{listing.equipmentSummary ?? 'Detay bilgisi yakinda eklenecek.'}</p>
              </div>
              <div className="listing-summary-card">
                <div className="card-label">Multimedya</div>
                <p className="card-copy">{listing.multimediaSummary ?? 'Detay bilgisi yakinda eklenecek.'}</p>
              </div>
              <div className="listing-summary-card">
                <div className="card-label">Ic mekan</div>
                <p className="card-copy">{listing.interiorSummary ?? 'Detay bilgisi yakinda eklenecek.'}</p>
              </div>
              <div className="listing-summary-card">
                <div className="card-label">Dis mekan</div>
                <p className="card-copy">{listing.exteriorSummary ?? 'Detay bilgisi yakinda eklenecek.'}</p>
              </div>
            </article>

            <ExpertiseReportSection
              report={listing.expertiseReport}
              vehicleLabel={`${listing.vehicle.brand ?? '-'} ${listing.vehicle.model ?? '-'}${listing.vehicle.package ? ` / ${listing.vehicle.package}` : ''}`}
            />
          </section>

          <aside className="detail-card listing-action-rail">
            <div className="card-label">Fiyat</div>
            <h2 className="listing-price">{formatPrice(listing.price, listing.currency)}</h2>
            <p className="card-copy">
              {listing.city}
              {listing.district ? ` / ${listing.district}` : ''}
            </p>
            <div className="listing-action-stack">
              <a
                className={`primary-link ${!listing.contactActions.canCall ? 'disabled-link' : ''}`}
                href={listing.contactActions.canCall && listing.contactPhone ? `tel:${listing.contactPhone}` : '#'}
                onClick={(event) => {
                  if (!listing.contactActions.canCall) {
                    event.preventDefault();
                    setNotice('Bu ilan icin telefon paylasimi acik degil.');
                  }
                }}
              >
                Ara
              </a>
              <button
                className="secondary-link subtle-button"
                onClick={() => void startListingConversation()}
              >
                Mesaj
              </button>
              <button className="secondary-link subtle-button" onClick={() => void toggleSave()}>
                {listing.isSaved ? 'Kayitli' : 'Kaydet'}
              </button>
            </div>
          </aside>
        </div>
      ) : null}
    </AppShell>
  );
}
