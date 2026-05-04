'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import type {
  CreateListingRequest,
  GarageVehicleOption,
  ListingDamagePartInput,
} from '@carloi-v4/types';
import {
  DamageStatus,
  MediaAssetPurpose,
  MediaType,
  SellerType,
  UserType,
  VEHICLE_DAMAGE_PARTS,
} from '@carloi-v4/types';
import { AppShell } from './app-shell';
import { useAuth } from './auth-provider';
import { VehicleDamageMap } from './vehicle-damage-map';
import { WebMediaView } from './web-media-view';
import { sellerTypeLabels } from '../lib/listings-ui';
import { webListingsApi } from '../lib/listings-api';
import { webMediaApi } from '../lib/media-api';

function createEmptyDamageParts(): ListingDamagePartInput[] {
  return VEHICLE_DAMAGE_PARTS.map((partName) => ({
    partName,
    damageStatus: DamageStatus.NONE,
  }));
}

export function ListingCreateClient({ initialVehicleId = '' }: { initialVehicleId?: string }) {
  const router = useRouter();
  const { session, isReady } = useAuth();
  const [garageVehicles, setGarageVehicles] = useState<GarageVehicleOption[]>([]);
  const [listingUploads, setListingUploads] = useState<Array<{ id: string; url: string; mimeType: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [form, setForm] = useState<CreateListingRequest>({
    garageVehicleId: initialVehicleId,
    title: '',
    description: '',
    price: 0,
    currency: 'TRY',
    city: '',
    district: '',
    sellerType: SellerType.OWNER,
    tradeAvailable: false,
    media: [],
    damageParts: createEmptyDamageParts(),
    licenseInfo: {
      plateNumber: '',
      ownerFirstName: session?.user.firstName ?? '',
      ownerLastName: session?.user.lastName ?? '',
      ownerTcIdentityNo: '',
    },
    contactPhone: session?.user.phone ?? '',
    showPhone: false,
  });

  useEffect(() => {
    if (!session?.accessToken) {
      return;
    }

    setLoading(true);
    setErrorMessage(null);

    void webListingsApi
      .getGarageVehicles(session.accessToken)
      .then((response) => {
        setGarageVehicles(response.items);
        setForm((current) => ({
          ...current,
          garageVehicleId:
            current.garageVehicleId && response.items.some((item) => item.id === current.garageVehicleId)
              ? current.garageVehicleId
              : initialVehicleId && response.items.some((item) => item.id === initialVehicleId)
                ? initialVehicleId
                : response.items[0]?.id ?? '',
          sellerType: session.user.userType === UserType.COMMERCIAL ? current.sellerType : SellerType.OWNER,
          licenseInfo: {
            ...current.licenseInfo,
            ownerFirstName: current.licenseInfo.ownerFirstName || session.user.firstName,
            ownerLastName: current.licenseInfo.ownerLastName || session.user.lastName,
          },
          contactPhone: current.contactPhone || session.user.phone || '',
        }));
      })
      .catch((error) => {
        setErrorMessage(error instanceof Error ? error.message : 'Arac koleksiyonu yuklenemedi.');
      })
      .finally(() => setLoading(false));
  }, [initialVehicleId, session?.accessToken, session?.user.firstName, session?.user.lastName, session?.user.phone, session?.user.userType]);

  function patchForm<K extends keyof CreateListingRequest>(key: K, value: CreateListingRequest[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function handleListingMediaUpload(event: React.ChangeEvent<HTMLInputElement>) {
    if (!session?.accessToken) return;
    const files = event.target.files;
    if (!files?.length) return;

    setUploading(true);
    try {
      const uploads = await webMediaApi.uploadFiles(session.accessToken, files, MediaAssetPurpose.LISTING_MEDIA);
      setListingUploads((current) => [
        ...current,
        ...uploads.map((item) => ({ id: item.id, url: item.url, mimeType: item.mimeType })),
      ].slice(0, 20));
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Ilan medyasi yuklenemedi.');
    } finally {
      setUploading(false);
      event.target.value = '';
    }
  }

  async function handleSubmit() {
    if (!session?.accessToken) return;

    const media = listingUploads.map((item) => ({
      url: item.url,
      mediaAssetId: item.id,
      mediaType: (item.mimeType.startsWith('video/') ? MediaType.VIDEO : MediaType.IMAGE) as 'IMAGE' | 'VIDEO',
    }));

    if (!form.garageVehicleId) {
      setErrorMessage('Ilan icin once bir arac secin.');
      return;
    }

    if (media.length < 3) {
      setErrorMessage('En az 3 medya yuklemelisiniz.');
      return;
    }

    setSubmitting(true);
    setErrorMessage(null);

    try {
      const response = await webListingsApi.createListing(session.accessToken, {
        ...form,
        price: Number(form.price),
        media,
        damageParts: form.damageParts,
      });
      router.push(`/listings/${response.listingId}`);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Ilan olusturulamadi.');
    } finally {
      setSubmitting(false);
    }
  }

  const selectedGarageVehicle = garageVehicles.find((item) => item.id === form.garageVehicleId) ?? null;

  if (!isReady) {
    return (
      <AppShell>
        <section className="detail-card gate-card"><h3 className="card-title">Ilan olusturma hazirlaniyor</h3></section>
      </AppShell>
    );
  }

  if (!session) {
    return (
      <AppShell>
        <section className="detail-card gate-card"><Link className="primary-link" href="/login">Giris yap</Link></section>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="detail-nav-row">
        <Link className="secondary-link" href="/listings">Ilanlara don</Link>
        <Link className="secondary-link" href="/profile?tab=vehicles">Araclarim</Link>
      </div>

      {errorMessage ? <section className="detail-card error-card"><p className="card-copy">{errorMessage}</p></section> : null}
      {loading ? <section className="detail-card gate-card"><h3 className="card-title">Araclariniz yukleniyor</h3></section> : null}

      {!loading && !garageVehicles.length ? (
        <section className="detail-card gate-card">
          <div className="card-label">Arac koleksiyonu</div>
          <h3 className="card-title">Once bir arac ekleyin</h3>
          <p className="card-copy">Ilan olusturma akisi artik profilinizdeki araclardan basliyor.</p>
          <div className="gate-actions"><Link className="primary-link" href="/vehicles/create">Arac ekleme wizardini ac</Link></div>
        </section>
      ) : null}

      {!loading && garageVehicles.length ? (
        <div className="create-grid listing-create-grid single-column-create">
          <section className="detail-card create-panel">
            <div className="create-toolbar">
              <div>
                <div className="card-label">Arac secimi</div>
                <h3 className="card-title">Koleksiyondan ilana tasinacak araci sec</h3>
              </div>
              <Link className="secondary-link" href="/vehicles/create">+ Arac ekle</Link>
            </div>

            <div className="vehicle-inline-grid">
              {garageVehicles.map((vehicle) => (
                <button key={vehicle.id} className={`vehicle-inline-tile button-reset ${form.garageVehicleId === vehicle.id ? 'active' : ''}`} type="button" onClick={() => patchForm('garageVehicleId', vehicle.id)}>
                  {vehicle.firstMediaUrl ? (
                    <WebMediaView
                      alt={`${vehicle.brand} ${vehicle.model}`}
                      mediaType="IMAGE"
                      uri={vehicle.firstMediaUrl}
                    />
                  ) : <div className="profile-tile-fallback">ARAC</div>}
                  <strong>{vehicle.brand} {vehicle.model}</strong>
                  <small>{vehicle.package ?? vehicle.plateMasked}</small>
                </button>
              ))}
            </div>

            <div className="filters-grid">
              <label className="input-label">Baslik<input className="text-input" value={form.title} onChange={(event) => patchForm('title', event.target.value)} /></label>
              <label className="input-label">Satici tipi<select className="text-input" disabled={session.user.userType !== UserType.COMMERCIAL} value={form.sellerType} onChange={(event) => patchForm('sellerType', event.target.value as SellerType)}><option value={SellerType.OWNER}>{sellerTypeLabels[SellerType.OWNER]}</option><option value={SellerType.DEALER}>{sellerTypeLabels[SellerType.DEALER]}</option></select></label>
              <label className="input-label full-span">Aciklama<textarea className="text-input text-area-input" rows={5} maxLength={600} value={form.description} onChange={(event) => patchForm('description', event.target.value)} /></label>
              <label className="input-label">Fiyat<input className="text-input" inputMode="numeric" value={form.price || ''} onChange={(event) => patchForm('price', Number(event.target.value))} /></label>
              <label className="input-label">Sehir<input className="text-input" value={form.city} onChange={(event) => patchForm('city', event.target.value)} /></label>
              <label className="input-label">Ilce<input className="text-input" value={form.district ?? ''} onChange={(event) => patchForm('district', event.target.value)} /></label>
              <label className="input-label">Iletisim telefonu<input className="text-input" value={form.contactPhone ?? ''} onChange={(event) => patchForm('contactPhone', event.target.value)} /></label>
              <label className="input-label">Ruhsat plakasi<input className="text-input" value={form.licenseInfo.plateNumber} onChange={(event) => setForm((current) => ({ ...current, licenseInfo: { ...current.licenseInfo, plateNumber: event.target.value } }))} /></label>
              <label className="input-label">Ruhsat sahibi ad<input className="text-input" value={form.licenseInfo.ownerFirstName} onChange={(event) => setForm((current) => ({ ...current, licenseInfo: { ...current.licenseInfo, ownerFirstName: event.target.value } }))} /></label>
              <label className="input-label">Ruhsat sahibi soyad<input className="text-input" value={form.licenseInfo.ownerLastName} onChange={(event) => setForm((current) => ({ ...current, licenseInfo: { ...current.licenseInfo, ownerLastName: event.target.value } }))} /></label>
              <label className="input-label">Ruhsat sahibi TC<input className="text-input" value={form.licenseInfo.ownerTcIdentityNo ?? ''} onChange={(event) => setForm((current) => ({ ...current, licenseInfo: { ...current.licenseInfo, ownerTcIdentityNo: event.target.value } }))} /></label>
            </div>

            <div className="inline-toggle-row">
              <label className="inline-check"><input checked={Boolean(form.tradeAvailable)} type="checkbox" onChange={(event) => patchForm('tradeAvailable', event.target.checked)} />Takas dusunuluyor</label>
              <label className="inline-check"><input checked={Boolean(form.showPhone)} type="checkbox" onChange={(event) => patchForm('showPhone', event.target.checked)} />Telefonu ilanda goster</label>
            </div>

            <label className="upload-dropzone">
              <input accept="image/jpeg,image/png,image/webp,video/mp4" className="upload-input-hidden" multiple type="file" onChange={(event) => void handleListingMediaUpload(event)} />
              <span className="upload-dropzone-title">{uploading ? 'Ilan medyalari yukleniyor...' : 'Ilan medyasi sec'}</span>
              <span className="upload-dropzone-copy">En az 3, en fazla 20 medya. Gorsel ve MP4 video desteklenir.</span>
            </label>

            {listingUploads.length > 0 ? (
              <div className="upload-preview-row">
                {listingUploads.map((item) => (
                  <button key={item.id} className="upload-preview-tile button-reset" type="button" onClick={() => setListingUploads((current) => current.filter((entry) => entry.id !== item.id))}>
                    <WebMediaView
                      alt="Ilan medya"
                      className="upload-preview-image"
                      mediaType={item.mimeType.startsWith('video/') ? 'VIDEO' : 'IMAGE'}
                      uri={item.url}
                    />
                  </button>
                ))}
              </div>
            ) : null}

            <div className="listing-damage-card no-padding-card">
              <VehicleDamageMap editable value={form.damageParts ?? createEmptyDamageParts()} onChange={(nextValue) => patchForm('damageParts', nextValue)} />
            </div>

            {selectedGarageVehicle ? (
              <section className="detail-card compact-card compact-summary-card">
                <div className="card-label">Secili Arac</div>
                <p className="card-copy">{selectedGarageVehicle.brand} {selectedGarageVehicle.model}{selectedGarageVehicle.package ? ` / ${selectedGarageVehicle.package}` : ''} / {selectedGarageVehicle.year}</p>
              </section>
            ) : null}

            <button className="primary-link wide-button button-reset" onClick={() => void handleSubmit()}>{submitting ? 'Ilan yayina hazirlaniyor...' : 'Ilani paylas'}</button>
          </section>
        </div>
      ) : null}
    </AppShell>
  );
}

