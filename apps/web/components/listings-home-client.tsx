'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import type {
  ListingFeedItem,
  ListingFeedQuery,
  VehicleCatalogBrand,
  VehicleCatalogModel,
  VehicleCatalogPackage,
} from '@carloi-v4/types';
import { FuelType, SellerType, TransmissionType } from '@carloi-v4/types';
import { AppShell } from './app-shell';
import { useAuth } from './auth-provider';
import { formatKm, formatPrice, fuelTypeLabels, sellerTypeLabels, transmissionLabels } from '../lib/listings-ui';
import { webListingsApi } from '../lib/listings-api';

const initialFilters: ListingFeedQuery = {
  city: '',
  district: '',
  brandId: '',
  modelId: '',
  packageId: '',
  sellerType: undefined,
  fuelType: undefined,
  transmissionType: undefined,
  minPrice: undefined,
  maxPrice: undefined,
  yearMin: undefined,
  yearMax: undefined,
  minKm: undefined,
  maxKm: undefined,
};

export function ListingsHomeClient() {
  const { session, isReady } = useAuth();
  const [items, setItems] = useState<ListingFeedItem[]>([]);
  const [filters, setFilters] = useState<ListingFeedQuery>(initialFilters);
  const [draftFilters, setDraftFilters] = useState<ListingFeedQuery>(initialFilters);
  const [brands, setBrands] = useState<VehicleCatalogBrand[]>([]);
  const [models, setModels] = useState<VehicleCatalogModel[]>([]);
  const [packages, setPackages] = useState<VehicleCatalogPackage[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const hasActiveFilters = useMemo(
    () =>
      Object.values(filters).some(
        (value) => value !== undefined && value !== null && value !== '',
      ),
    [filters],
  );

  useEffect(() => {
    void webListingsApi
      .getBrands()
      .then(setBrands)
      .catch(() => setBrands([]));
  }, []);

  useEffect(() => {
    if (!draftFilters.brandId) {
      setModels([]);
      setPackages([]);
      return;
    }

    void webListingsApi
      .getModels(draftFilters.brandId)
      .then((response) => {
        setModels(response);
      })
      .catch(() => setModels([]));
  }, [draftFilters.brandId]);

  useEffect(() => {
    if (!draftFilters.modelId) {
      setPackages([]);
      return;
    }

    void webListingsApi
      .getPackages(draftFilters.modelId)
      .then((response) => {
        setPackages(response);
      })
      .catch(() => setPackages([]));
  }, [draftFilters.modelId]);

  useEffect(() => {
    if (!session?.accessToken) {
      return;
    }

    void loadFeed(true, filters);
  }, [session?.accessToken, filters]);

  async function loadFeed(reset: boolean, activeFilters: ListingFeedQuery) {
    if (!session?.accessToken) {
      return;
    }

    const nextQuery: ListingFeedQuery = reset
      ? activeFilters
      : { ...activeFilters, cursor: nextCursor ?? undefined };

    if (reset) {
      setLoading(true);
    } else {
      setLoadingMore(true);
    }

    setErrorMessage(null);

    try {
      const response = await webListingsApi.getFeed(session.accessToken, nextQuery);
      setItems((current) => (reset ? response.items : [...current, ...response.items]));
      setNextCursor(response.nextCursor);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Ilanlar yuklenemedi.');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }

  async function toggleSave(item: ListingFeedItem) {
    if (!session?.accessToken) {
      return;
    }

    try {
      const response = item.isSaved
        ? await webListingsApi.unsaveListing(session.accessToken, item.listingId)
        : await webListingsApi.saveListing(session.accessToken, item.listingId);

      setItems((current) =>
        current.map((listing) =>
          listing.listingId === item.listingId ? { ...listing, isSaved: response.isSaved } : listing,
        ),
      );
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Kaydetme islemi tamamlanamadi.');
    }
  }

  function updateDraft<K extends keyof ListingFeedQuery>(key: K, value: ListingFeedQuery[K]) {
    setDraftFilters((current) => ({
      ...current,
      [key]: value,
    }));
  }

  function applyFilters() {
    setFilters({
      ...draftFilters,
      cursor: undefined,
    });
    setFiltersOpen(false);
  }

  function resetFilters() {
    setDraftFilters(initialFilters);
    setFilters(initialFilters);
  }

  if (!isReady) {
    return (
      <AppShell>
        <section className="detail-card gate-card">
          <div className="card-label">Listings</div>
          <h3 className="card-title">Oturum kontrol ediliyor</h3>
          <p className="card-copy">Ilan akisiniz hazirlaniyor.</p>
        </section>
      </AppShell>
    );
  }

  if (!session) {
    return (
      <AppShell>
        <section className="detail-card gate-card">
          <div className="card-label">Auth required</div>
          <h3 className="card-title">Ilan akisina erismek icin giris yapin</h3>
          <p className="card-copy">
            Giris yaptiginizda kaydetme, filtreleme ve detay ekranlari aktif hale gelir.
          </p>
          <div className="gate-actions">
            <Link className="primary-link" href="/login">
              Giris yap
            </Link>
            <Link className="secondary-link" href="/register">
              Uye ol
            </Link>
          </div>
        </section>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <section className="feed-hero-card listings-hero-card">
        <div>
          <div className="card-label">Marketplace Layer</div>
          <h2 className="feed-hero-title">Sosyal akisla birlesen ilan alani</h2>
          <p className="feed-hero-copy">
            Konuma oncelik veren akista ilanlari tarayin, filtreleyin ve garajinizdaki araci
            saniyeler icinde yayina alin.
          </p>
        </div>
        <div className="hero-actions">
          <button className="secondary-link subtle-button" onClick={() => setFiltersOpen((current) => !current)}>
            Filtrele
          </button>
          <Link className="primary-link" href="/listings/create">
            Ilan ver
          </Link>
        </div>
      </section>

      {filtersOpen ? (
        <section className="detail-card listings-filter-panel">
          <div className="filter-panel-head">
            <div>
              <div className="card-label">Filtreler</div>
              <h3 className="card-title">Aradiginiz araci daraltin</h3>
            </div>
            <div className="filter-panel-actions">
              <button className="secondary-link subtle-button" onClick={resetFilters}>
                Temizle
              </button>
              <button className="primary-link" onClick={applyFilters}>
                Uygula
              </button>
            </div>
          </div>

          <div className="filters-grid">
            <label className="input-label">
              Sehir
              <input
                className="text-input"
                value={String(draftFilters.city ?? '')}
                onChange={(event) => updateDraft('city', event.target.value)}
                placeholder="Istanbul"
              />
            </label>
            <label className="input-label">
              Ilce
              <input
                className="text-input"
                value={String(draftFilters.district ?? '')}
                onChange={(event) => updateDraft('district', event.target.value)}
                placeholder="Kadikoy"
              />
            </label>
            <label className="input-label">
              Marka
              <select
                className="text-input"
                value={String(draftFilters.brandId ?? '')}
                onChange={(event) => {
                  updateDraft('brandId', event.target.value);
                  updateDraft('modelId', '');
                  updateDraft('packageId', '');
                }}
              >
                <option value="">Tum markalar</option>
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
                value={String(draftFilters.modelId ?? '')}
                onChange={(event) => {
                  updateDraft('modelId', event.target.value);
                  updateDraft('packageId', '');
                }}
              >
                <option value="">Tum modeller</option>
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
                value={String(draftFilters.packageId ?? '')}
                onChange={(event) => updateDraft('packageId', event.target.value)}
              >
                <option value="">Tum paketler</option>
                {packages.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="input-label">
              Kimden
              <select
                className="text-input"
                value={String(draftFilters.sellerType ?? '')}
                onChange={(event) =>
                  updateDraft(
                    'sellerType',
                    event.target.value ? (event.target.value as SellerType) : undefined,
                  )
                }
              >
                <option value="">Tum saticilar</option>
                <option value={SellerType.OWNER}>Sahibinden</option>
                <option value={SellerType.DEALER}>Galeriden</option>
              </select>
            </label>
            <label className="input-label">
              Yakit
              <select
                className="text-input"
                value={String(draftFilters.fuelType ?? '')}
                onChange={(event) =>
                  updateDraft(
                    'fuelType',
                    event.target.value ? (event.target.value as FuelType) : undefined,
                  )
                }
              >
                <option value="">Tum yakit tipleri</option>
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
                value={String(draftFilters.transmissionType ?? '')}
                onChange={(event) =>
                  updateDraft(
                    'transmissionType',
                    event.target.value ? (event.target.value as TransmissionType) : undefined,
                  )
                }
              >
                <option value="">Tum vites tipleri</option>
                {Object.values(TransmissionType).map((transmissionType) => (
                  <option key={transmissionType} value={transmissionType}>
                    {transmissionLabels[transmissionType]}
                  </option>
                ))}
              </select>
            </label>
            <label className="input-label">
              Min fiyat
              <input
                className="text-input"
                inputMode="numeric"
                value={draftFilters.minPrice ?? ''}
                onChange={(event) =>
                  updateDraft(
                    'minPrice',
                    event.target.value ? Number(event.target.value) : undefined,
                  )
                }
                placeholder="750000"
              />
            </label>
            <label className="input-label">
              Max fiyat
              <input
                className="text-input"
                inputMode="numeric"
                value={draftFilters.maxPrice ?? ''}
                onChange={(event) =>
                  updateDraft(
                    'maxPrice',
                    event.target.value ? Number(event.target.value) : undefined,
                  )
                }
                placeholder="1500000"
              />
            </label>
            <label className="input-label">
              Min yil
              <input
                className="text-input"
                inputMode="numeric"
                value={draftFilters.yearMin ?? ''}
                onChange={(event) =>
                  updateDraft(
                    'yearMin',
                    event.target.value ? Number(event.target.value) : undefined,
                  )
                }
                placeholder="2018"
              />
            </label>
            <label className="input-label">
              Max yil
              <input
                className="text-input"
                inputMode="numeric"
                value={draftFilters.yearMax ?? ''}
                onChange={(event) =>
                  updateDraft(
                    'yearMax',
                    event.target.value ? Number(event.target.value) : undefined,
                  )
                }
                placeholder="2025"
              />
            </label>
          </div>
        </section>
      ) : null}

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

      <section className="listings-meta-row">
        <div className="card-label">Ilanlar</div>
        <div className="listing-meta-inline">
          <span>{items.length} kart yuklendi</span>
          <span>{hasActiveFilters ? 'Filtre aktif' : 'Sehir oncelikli akis'}</span>
        </div>
      </section>

      {loading ? (
        <section className="detail-card gate-card">
          <h3 className="card-title">Ilanlar getiriliyor</h3>
          <p className="card-copy">Akis, sehir onceligi ve secili filtrelerle hazirlaniyor.</p>
        </section>
      ) : null}

      {!loading && items.length === 0 ? (
        <section className="detail-card gate-card">
          <h3 className="card-title">Sonuc bulunamadi</h3>
          <p className="card-copy">
            Su an secili filtrelerle eslesen ilan yok. Filtreleri genisletip tekrar deneyin.
          </p>
        </section>
      ) : null}

      <div className="listing-feed-grid">
        {items.map((item) => (
          <article className="listing-card" key={item.listingId}>
            <Link className="listing-card-media" href={`/listings/${item.listingId}`}>
              {item.firstMediaUrl ? (
                <img alt={item.title} src={item.firstMediaUrl} />
              ) : (
                <div className="listing-card-fallback">FOTO</div>
              )}
            </Link>

            <div className="listing-card-body">
              <div className="listing-card-top">
                <div>
                  <div className="card-label">{item.listingNo}</div>
                  <Link className="listing-card-title" href={`/listings/${item.listingId}`}>
                    {item.title}
                  </Link>
                </div>
                <button className="post-action" onClick={() => void toggleSave(item)}>
                  {item.isSaved ? 'Kayitli' : 'Kaydet'}
                </button>
              </div>

              <div className="listing-card-spec">
                <span>{[item.brand, item.model, item.package].filter(Boolean).join(' / ') || 'Paket bilgisi bekleniyor'}</span>
                <span>{formatKm(item.km)}</span>
              </div>

              <div className="listing-card-location">
                <span>
                  {item.city}
                  {item.district ? ` / ${item.district}` : ''}
                </span>
                <span>{sellerTypeLabels[item.sellerType]}</span>
              </div>

              <div className="listing-card-bottom">
                <strong>{formatPrice(item.price)}</strong>
                <div className="listing-card-actions">
                  <Link className="secondary-link" href={`/listings/${item.listingId}`}>
                    Detay
                  </Link>
                  <button
                    className="secondary-link subtle-button"
                    onClick={() => setNotice('Mesajlasma aksiyonu bir sonraki asamada ilan tarafina baglanacak.')}
                  >
                    Mesaj
                  </button>
                </div>
              </div>
            </div>
          </article>
        ))}
      </div>

      {!loading && nextCursor ? (
        <div className="load-more-wrap">
          <button className="primary-link" onClick={() => void loadFeed(false, filters)}>
            {loadingMore ? 'Yukleniyor...' : 'Daha fazla ilan'}
          </button>
        </div>
      ) : null}
    </AppShell>
  );
}
