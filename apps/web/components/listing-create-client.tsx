'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import type {
  CreateGarageVehicleRequest,
  CreateListingRequest,
  GarageVehicleOption,
  ListingDamagePartInput,
  MediaAssetUploadResponse,
  VehicleCatalogBrand,
  VehicleCatalogModel,
  VehicleCatalogPackage,
} from '@carloi-v4/types';
import {
  DamageStatus,
  FuelType,
  MediaAssetPurpose,
  MediaType,
  SellerType,
  TransmissionType,
  UserType,
  VEHICLE_DAMAGE_PARTS,
  VehicleType,
} from '@carloi-v4/types';
import { AppShell } from './app-shell';
import { useAuth } from './auth-provider';
import { VehicleDamageMap } from './vehicle-damage-map';
import { fuelTypeLabels, sellerTypeLabels, transmissionLabels } from '../lib/listings-ui';
import { webListingsApi } from '../lib/listings-api';
import { webMediaApi } from '../lib/media-api';

function createEmptyDamageParts(): ListingDamagePartInput[] {
  return VEHICLE_DAMAGE_PARTS.map((partName) => ({
    partName,
    damageStatus: DamageStatus.NONE,
  }));
}

export function ListingCreateClient() {
  const router = useRouter();
  const { session, isReady } = useAuth();
  const [garageVehicles, setGarageVehicles] = useState<GarageVehicleOption[]>([]);
  const [brands, setBrands] = useState<VehicleCatalogBrand[]>([]);
  const [models, setModels] = useState<VehicleCatalogModel[]>([]);
  const [packages, setPackages] = useState<VehicleCatalogPackage[]>([]);
  const [garageBrandId, setGarageBrandId] = useState('');
  const [garageModelId, setGarageModelId] = useState('');
  const [garagePackageId, setGaragePackageId] = useState('');
  const [garageForm, setGarageForm] = useState<CreateGarageVehicleRequest>({
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
    isPublic: false,
  });
  const [form, setForm] = useState<CreateListingRequest>({
    garageVehicleId: '',
    title: '',
    description: '',
    price: 0,
    currency: 'TRY',
    city: '',
    district: '',
    sellerType: SellerType.OWNER,
    tradeAvailable: false,
    media: [{ url: '' }, { url: '' }, { url: '' }],
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
  const [loading, setLoading] = useState(true);
  const [garageUploads, setGarageUploads] = useState<MediaAssetUploadResponse[]>([]);
  const [listingUploads, setListingUploads] = useState<MediaAssetUploadResponse[]>([]);
  const [uploadingGarageMedia, setUploadingGarageMedia] = useState(false);
  const [uploadingListingMedia, setUploadingListingMedia] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [creatingGarageVehicle, setCreatingGarageVehicle] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const selectedGarageVehicle = useMemo(
    () => garageVehicles.find((item) => item.id === form.garageVehicleId) ?? null,
    [form.garageVehicleId, garageVehicles],
  );

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
        setGarageVehicles(garageResponse.items);
        setBrands(brandResponse);
        setForm((current) => ({
          ...current,
          garageVehicleId: current.garageVehicleId || garageResponse.items[0]?.id || '',
          sellerType:
            session.user.userType === UserType.COMMERCIAL ? current.sellerType : SellerType.OWNER,
          licenseInfo: {
            ...current.licenseInfo,
            ownerFirstName: current.licenseInfo.ownerFirstName || session.user.firstName,
            ownerLastName: current.licenseInfo.ownerLastName || session.user.lastName,
          },
          contactPhone: current.contactPhone || session.user.phone || '',
        }));
      })
      .catch((error) => {
        setErrorMessage(error instanceof Error ? error.message : 'Ilan verileri yuklenemedi.');
      })
      .finally(() => setLoading(false));
  }, [
    session?.accessToken,
    session?.user.firstName,
    session?.user.lastName,
    session?.user.phone,
    session?.user.userType,
  ]);

  useEffect(() => {
    if (!garageBrandId) {
      setModels([]);
      setPackages([]);
      return;
    }

    void webListingsApi
      .getModels(garageBrandId)
      .then(setModels)
      .catch(() => setModels([]));
  }, [garageBrandId]);

  useEffect(() => {
    if (!garageModelId) {
      setPackages([]);
      return;
    }

    void webListingsApi
      .getPackages(garageModelId)
      .then(setPackages)
      .catch(() => setPackages([]));
  }, [garageModelId]);

  function patchForm<K extends keyof CreateListingRequest>(key: K, value: CreateListingRequest[K]) {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));
  }

  function patchGarageForm<K extends keyof CreateGarageVehicleRequest>(
    key: K,
    value: CreateGarageVehicleRequest[K],
  ) {
    setGarageForm((current) => ({
      ...current,
      [key]: value,
    }));
  }

  async function handleGarageMediaUpload(event: React.ChangeEvent<HTMLInputElement>) {
    if (!session?.accessToken) {
      return;
    }

    const files = event.target.files;

    if (!files?.length) {
      return;
    }

    setUploadingGarageMedia(true);

    try {
      const uploads = await webMediaApi.uploadFiles(
        session.accessToken,
        files,
        MediaAssetPurpose.GARAGE_VEHICLE_MEDIA,
      );
      setGarageUploads((current) => [...current, ...uploads].slice(0, 10));
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Garaj medya yuklemesi basarisiz oldu.');
    } finally {
      setUploadingGarageMedia(false);
      event.target.value = '';
    }
  }

  async function handleListingMediaUpload(event: React.ChangeEvent<HTMLInputElement>) {
    if (!session?.accessToken) {
      return;
    }

    const files = event.target.files;

    if (!files?.length) {
      return;
    }

    setUploadingListingMedia(true);

    try {
      const uploads = await webMediaApi.uploadFiles(
        session.accessToken,
        files,
        MediaAssetPurpose.LISTING_MEDIA,
      );
      setListingUploads((current) => [...current, ...uploads].slice(0, 20));
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Ilan medya yuklemesi basarisiz oldu.');
    } finally {
      setUploadingListingMedia(false);
      event.target.value = '';
    }
  }

  async function handleCreateGarageVehicle() {
    if (!session?.accessToken) {
      return;
    }

    const brand = brands.find((item) => item.id === garageBrandId);
    const model = models.find((item) => item.id === garageModelId);
    const selectedPackage = packages.find((item) => item.id === garagePackageId);

    if (!brand || !model || !selectedPackage) {
      setErrorMessage('Marka, model ve paket secimi zorunludur.');
      return;
    }

    setCreatingGarageVehicle(true);
    setErrorMessage(null);

    try {
      const response = await webListingsApi.createGarageVehicle(session.accessToken, {
        ...garageForm,
        vehiclePackageId: selectedPackage.id,
        brandText: brand.name,
        modelText: model.name,
        packageText: selectedPackage.name,
        media: garageUploads.map((item) => ({
          url: item.url,
          mediaAssetId: item.id,
          mediaType: item.mimeType.startsWith('video/') ? MediaType.VIDEO : MediaType.IMAGE,
        })),
      });

      const garageResponse = await webListingsApi.getGarageVehicles(session.accessToken);
      setGarageVehicles(garageResponse.items);
      setGarageUploads([]);
      setForm((current) => ({
        ...current,
        garageVehicleId: response.vehicle.id,
        obdExpertiseReportId: undefined,
      }));
      setNotice('Garaj araci olusturuldu ve ilan formuna secildi.');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Garaj araci olusturulamadi.');
    } finally {
      setCreatingGarageVehicle(false);
    }
  }

  async function handleSubmit() {
    if (!session?.accessToken) {
      return;
    }

    const media = listingUploads.map((item) => ({
      url: item.url,
      mediaAssetId: item.id,
      mediaType: (item.mimeType.startsWith('video/') ? 'VIDEO' : 'IMAGE') as 'IMAGE' | 'VIDEO',
    }));

    if (media.length < 3) {
      setErrorMessage('En az 3 medya yuklenmelidir.');
      return;
    }

    if (!form.garageVehicleId) {
      setErrorMessage('Ilan icin bir garaj araci secin.');
      return;
    }

    if (form.obdExpertiseReportId && !selectedGarageVehicle?.latestObdReportId) {
      setErrorMessage('Once garajdan Carloi expertiz olusturmalisiniz.');
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

  if (!isReady) {
    return (
      <AppShell>
        <section className="detail-card gate-card">
          <h3 className="card-title">Ilan olusturma hazirlaniyor</h3>
        </section>
      </AppShell>
    );
  }

  if (!session) {
    return (
      <AppShell>
        <section className="detail-card gate-card">
          <div className="card-label">Auth required</div>
          <h3 className="card-title">Ilan vermek icin giris yapin</h3>
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
          <h3 className="card-title">Garaj ve katalog verileri yukleniyor</h3>
        </section>
      ) : (
        <div className="create-grid listing-create-grid">
          <section className="detail-card create-panel">
            <div className="create-toolbar">
              <div>
                <div className="card-label">Garaj Secimi</div>
                <h3 className="card-title">Mevcut aractan ilan ac</h3>
              </div>
            </div>

            {garageVehicles.length > 0 ? (
              <label className="input-label">
                Garaj araci
                <select
                  className="text-input"
                  value={form.garageVehicleId}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      garageVehicleId: event.target.value,
                      obdExpertiseReportId: undefined,
                    }))
                  }
                >
                  <option value="">Arac secin</option>
                  {garageVehicles.map((vehicle) => (
                    <option key={vehicle.id} value={vehicle.id}>
                      {vehicle.brand} {vehicle.model}
                      {vehicle.package ? ` / ${vehicle.package}` : ''} / {vehicle.year} / {vehicle.plateMasked}
                    </option>
                  ))}
                </select>
              </label>
            ) : (
              <p className="card-copy">
                Garajinizda arac gorunmuyor. Asagidaki hizli form ile once aracinizi ekleyin.
              </p>
            )}

            <button
              className={`toggle-card ${form.obdExpertiseReportId ? 'active' : ''}`}
              type="button"
              onClick={() => {
                if (!selectedGarageVehicle?.latestObdReportId) {
                  setNotice('Bu arac icin expertiz yok. Once Garajim ekranindan mock OBD testi baslatin.');
                  patchForm('obdExpertiseReportId', undefined);
                  return;
                }

                patchForm(
                  'obdExpertiseReportId',
                  form.obdExpertiseReportId ? undefined : selectedGarageVehicle.latestObdReportId,
                );
              }}
            >
              <span className="toggle-copy">
                <strong className="toggle-title">Carloi Expertiz ekle</strong>
                <span className="toggle-meta">
                  {selectedGarageVehicle?.latestObdReportId
                    ? `Rapor skoru: ${selectedGarageVehicle.latestObdReportScore ?? '-'}`
                    : 'Bu arac icin henuz expertiz raporu yok'}
                </span>
              </span>
              <span className="toggle-badge">{form.obdExpertiseReportId ? 'Acik' : 'Kapali'}</span>
            </button>

            <div className="create-toolbar">
              <div>
                <div className="card-label">Hizli Garaj Kaydi</div>
                <p className="card-copy">Katalogdan paket secip aracinizi dakikalar icinde kaydedin.</p>
              </div>
            </div>

            <div className="filters-grid">
              <label className="input-label">
                Marka
                <select
                  className="text-input"
                  value={garageBrandId}
                  onChange={(event) => {
                    setGarageBrandId(event.target.value);
                    setGarageModelId('');
                    setGaragePackageId('');
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
                  value={garageModelId}
                  onChange={(event) => {
                    setGarageModelId(event.target.value);
                    setGaragePackageId('');
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
                <select
                  className="text-input"
                  value={garagePackageId}
                  onChange={(event) => setGaragePackageId(event.target.value)}
                >
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
                <input
                  className="text-input"
                  inputMode="numeric"
                  value={garageForm.year}
                  onChange={(event) => patchGarageForm('year', Number(event.target.value))}
                />
              </label>
              <label className="input-label">
                Plaka
                <input
                  className="text-input"
                  value={garageForm.plateNumber}
                  onChange={(event) => patchGarageForm('plateNumber', event.target.value)}
                />
              </label>
              <label className="input-label">
                Renk
                <input
                  className="text-input"
                  value={garageForm.color ?? ''}
                  onChange={(event) => patchGarageForm('color', event.target.value)}
                />
              </label>
              <label className="input-label">
                KM
                <input
                  className="text-input"
                  inputMode="numeric"
                  value={garageForm.km}
                  onChange={(event) => patchGarageForm('km', Number(event.target.value))}
                />
              </label>
              <label className="input-label">
                Yakit
                <select
                  className="text-input"
                  value={garageForm.fuelType}
                  onChange={(event) => patchGarageForm('fuelType', event.target.value as FuelType)}
                >
                  {Object.values(FuelType).map((fuelType) => (
                    <option key={fuelType} value={fuelType}>
                      {fuelTypeLabels[fuelType]}
                    </option>
                  ))}
                </select>
              </label>
              <label className="input-label">
                Vites
                <select
                  className="text-input"
                  value={garageForm.transmissionType}
                  onChange={(event) =>
                    patchGarageForm('transmissionType', event.target.value as TransmissionType)
                  }
                >
                  {Object.values(TransmissionType).map((transmissionType) => (
                    <option key={transmissionType} value={transmissionType}>
                      {transmissionLabels[transmissionType]}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <label className="upload-dropzone">
              <input
                accept="image/jpeg,image/png,image/webp,video/mp4"
                className="upload-input-hidden"
                multiple
                type="file"
                onChange={(event) => void handleGarageMediaUpload(event)}
              />
              <span className="upload-dropzone-title">
                {uploadingGarageMedia ? 'Garaj fotograflari yukleniyor...' : 'Garaj medya sec'}
              </span>
              <span className="upload-dropzone-copy">Istersen bu araca gorsel veya video ekleyebilirsin.</span>
            </label>

            {garageUploads.length > 0 ? (
              <div className="upload-preview-row">
                {garageUploads.map((item) => (
                  <div className="upload-preview-tile" key={item.id}>
                    <img alt="Garaj medya" className="upload-preview-image" src={item.url} />
                    <button
                      className="caption-toggle"
                      type="button"
                      onClick={() =>
                        setGarageUploads((current) => current.filter((entry) => entry.id !== item.id))
                      }
                    >
                      Kaldir
                    </button>
                  </div>
                ))}
              </div>
            ) : null}

            <button className="secondary-link subtle-button" onClick={() => void handleCreateGarageVehicle()}>
              {creatingGarageVehicle ? 'Garaja ekleniyor...' : 'Araci garaja ekle'}
            </button>
          </section>

          <section className="detail-card create-panel">
            <div className="create-toolbar">
              <div>
                <div className="card-label">Ilan Formu</div>
                <h3 className="card-title">Sosyal akisa hazir ilan yayini</h3>
              </div>
            </div>

            <div className="filters-grid">
              <label className="input-label">
                Baslik
                <input
                  className="text-input"
                  value={form.title}
                  onChange={(event) => patchForm('title', event.target.value)}
                />
              </label>
              <label className="input-label">
                Satici tipi
                <select
                  className="text-input"
                  disabled={session.user.userType !== UserType.COMMERCIAL}
                  value={form.sellerType}
                  onChange={(event) => patchForm('sellerType', event.target.value as SellerType)}
                >
                  <option value={SellerType.OWNER}>{sellerTypeLabels[SellerType.OWNER]}</option>
                  <option value={SellerType.DEALER}>{sellerTypeLabels[SellerType.DEALER]}</option>
                </select>
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
              <label className="input-label">
                Fiyat
                <input
                  className="text-input"
                  inputMode="numeric"
                  value={form.price || ''}
                  onChange={(event) => patchForm('price', Number(event.target.value))}
                />
              </label>
              <label className="input-label">
                Para birimi
                <input
                  className="text-input"
                  value={form.currency}
                  onChange={(event) => patchForm('currency', event.target.value.toUpperCase())}
                />
              </label>
              <label className="input-label">
                Sehir
                <input
                  className="text-input"
                  value={form.city}
                  onChange={(event) => patchForm('city', event.target.value)}
                />
              </label>
              <label className="input-label">
                Ilce
                <input
                  className="text-input"
                  value={form.district ?? ''}
                  onChange={(event) => patchForm('district', event.target.value)}
                />
              </label>
              <label className="input-label">
                Iletisim telefonu
                <input
                  className="text-input"
                  value={form.contactPhone ?? ''}
                  onChange={(event) => patchForm('contactPhone', event.target.value)}
                />
              </label>
              <label className="input-label">
                Ruhsat plakasi
                <input
                  className="text-input"
                  value={form.licenseInfo.plateNumber}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      licenseInfo: {
                        ...current.licenseInfo,
                        plateNumber: event.target.value,
                      },
                    }))
                  }
                />
              </label>
              <label className="input-label">
                Ruhsat sahibi ad
                <input
                  className="text-input"
                  value={form.licenseInfo.ownerFirstName}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      licenseInfo: {
                        ...current.licenseInfo,
                        ownerFirstName: event.target.value,
                      },
                    }))
                  }
                />
              </label>
              <label className="input-label">
                Ruhsat sahibi soyad
                <input
                  className="text-input"
                  value={form.licenseInfo.ownerLastName}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      licenseInfo: {
                        ...current.licenseInfo,
                        ownerLastName: event.target.value,
                      },
                    }))
                  }
                />
              </label>
              <label className="input-label">
                Ruhsat sahibi TC
                <input
                  className="text-input"
                  value={form.licenseInfo.ownerTcIdentityNo ?? ''}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      licenseInfo: {
                        ...current.licenseInfo,
                        ownerTcIdentityNo: event.target.value,
                      },
                    }))
                  }
                />
              </label>
            </div>

            <div className="inline-toggle-row">
              <label className="inline-check">
                <input
                  checked={Boolean(form.tradeAvailable)}
                  type="checkbox"
                  onChange={(event) => patchForm('tradeAvailable', event.target.checked)}
                />
                Takas dusunuluyor
              </label>
              <label className="inline-check">
                <input
                  checked={Boolean(form.showPhone)}
                  type="checkbox"
                  onChange={(event) => patchForm('showPhone', event.target.checked)}
                />
                Telefonu ilanda goster
              </label>
            </div>

            <label className="upload-dropzone">
              <input
                accept="image/jpeg,image/png,image/webp,video/mp4"
                className="upload-input-hidden"
                multiple
                type="file"
                onChange={(event) => void handleListingMediaUpload(event)}
              />
              <span className="upload-dropzone-title">
                {uploadingListingMedia ? 'Ilan medyalari yukleniyor...' : 'Ilan medyasi sec'}
              </span>
              <span className="upload-dropzone-copy">En az 3, en fazla 20 medya. Gorsel ve MP4 video desteklenir.</span>
            </label>

            {listingUploads.length > 0 ? (
              <div className="upload-preview-row">
                {listingUploads.map((item) => (
                  <div className="upload-preview-tile" key={item.id}>
                    {item.mimeType.startsWith('video/') ? (
                      <video className="upload-preview-image" controls preload="metadata" src={item.url} />
                    ) : (
                      <img alt="Ilan medya" className="upload-preview-image" src={item.url} />
                    )}
                    <button
                      className="caption-toggle"
                      type="button"
                      onClick={() =>
                        setListingUploads((current) => current.filter((entry) => entry.id !== item.id))
                      }
                    >
                      Kaldir
                    </button>
                  </div>
                ))}
              </div>
            ) : null}

            <div className="listing-damage-card no-padding-card">
              <VehicleDamageMap
                editable
                value={form.damageParts ?? createEmptyDamageParts()}
                onChange={(nextValue) => patchForm('damageParts', nextValue)}
              />
            </div>

            {selectedGarageVehicle ? (
              <section className="detail-card compact-card">
                <div className="card-label">Secili Garaj Araci</div>
                <p className="card-copy">
                  {selectedGarageVehicle.brand} {selectedGarageVehicle.model}
                  {selectedGarageVehicle.package ? ` / ${selectedGarageVehicle.package}` : ''} / {selectedGarageVehicle.year} / {selectedGarageVehicle.plateMasked}
                </p>
                <p className="card-copy">
                  {selectedGarageVehicle.latestObdReportId
                    ? `Bagli expertiz skoru: ${selectedGarageVehicle.latestObdReportScore ?? '-'}`
                    : 'Bu arac icin henuz expertiz raporu yok.'}
                </p>
              </section>
            ) : null}

            <button className="primary-link wide-button" onClick={() => void handleSubmit()}>
              {submitting ? 'Ilan yayina hazirlaniyor...' : 'Ilani paylas'}
            </button>
          </section>
        </div>
      )}
    </AppShell>
  );
}
