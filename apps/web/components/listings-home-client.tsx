'use client';

import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import {
  LISTING_BODY_TYPE_OPTIONS,
  LISTING_COLOR_OPTIONS,
  LISTING_FUEL_OPTIONS,
  LISTING_SELLER_OPTIONS,
  LISTING_SORT_LABELS,
  LISTING_TRANSMISSION_OPTIONS,
  LISTING_VEHICLE_TYPE_OPTIONS,
  ListingSortOption,
  TURKIYE_CITIES,
  TURKIYE_DISTRICT_SUGGESTIONS,
  type ListingFeedItem,
  type ListingFeedQuery,
  type VehicleCatalogBrand,
  type VehicleCatalogModel,
  type VehicleCatalogPackage,
} from '@carloi-v4/types';
import { AppShell } from './app-shell';
import { useAuth } from './auth-provider';
import { WebMediaView } from './web-media-view';
import { webListingsApi } from '../lib/listings-api';
import {
  formatKm,
  formatPrice,
  fuelTypeLabels,
  sellerTypeLabels,
  transmissionLabels,
} from '../lib/listings-ui';

type ArrayFilterKey =
  | 'cities'
  | 'districts'
  | 'fuelTypes'
  | 'transmissionTypes'
  | 'bodyTypes'
  | 'colors'
  | 'sellerTypes';

type ActiveFilterChip = {
  id: string;
  label: string;
  onRemove: () => void;
};

type SearchParamLike = {
  get(key: string): string | null;
};

const initialFilters: ListingFeedQuery = {
  q: '',
  cities: [],
  districts: [],
  vehicleType: undefined,
  brandId: '',
  modelId: '',
  packageId: '',
  minPrice: undefined,
  maxPrice: undefined,
  minYear: undefined,
  maxYear: undefined,
  minKm: undefined,
  maxKm: undefined,
  fuelTypes: [],
  transmissionTypes: [],
  bodyTypes: [],
  colors: [],
  sellerTypes: [],
  onlyVerifiedSeller: false,
  noPaint: false,
  noChangedParts: false,
  noHeavyDamage: false,
  tradeAvailable: false,
  guaranteed: false,
  sort: ListingSortOption.NEWEST,
};

function normalizeFilters(filters: ListingFeedQuery): ListingFeedQuery {
  const keepArray = (values?: string[]) => (values && values.length > 0 ? values : undefined);

  return {
    q: filters.q?.trim() || undefined,
    cities: keepArray(filters.cities),
    districts: keepArray(filters.districts),
    vehicleType: filters.vehicleType,
    brandId: filters.brandId || undefined,
    modelId: filters.modelId || undefined,
    packageId: filters.packageId || undefined,
    minPrice: filters.minPrice,
    maxPrice: filters.maxPrice,
    minYear: filters.minYear,
    maxYear: filters.maxYear,
    minKm: filters.minKm,
    maxKm: filters.maxKm,
    fuelTypes: (filters.fuelTypes?.length ?? 0) > 0 ? filters.fuelTypes : undefined,
    transmissionTypes:
      (filters.transmissionTypes?.length ?? 0) > 0 ? filters.transmissionTypes : undefined,
    bodyTypes: keepArray(filters.bodyTypes),
    colors: keepArray(filters.colors),
    sellerTypes: (filters.sellerTypes?.length ?? 0) > 0 ? filters.sellerTypes : undefined,
    onlyVerifiedSeller: filters.onlyVerifiedSeller || undefined,
    noPaint: filters.noPaint || undefined,
    noChangedParts: filters.noChangedParts || undefined,
    noHeavyDamage: filters.noHeavyDamage || undefined,
    tradeAvailable: filters.tradeAvailable || undefined,
    guaranteed: filters.guaranteed || undefined,
    sort: filters.sort,
  };
}

function buildSearchQuery(filters: ListingFeedQuery) {
  const query = normalizeFilters(filters);
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null || value === '') {
      continue;
    }

    if (Array.isArray(value)) {
      if (value.length > 0) {
        params.set(key, value.join(','));
      }
      continue;
    }

    if (typeof value === 'boolean') {
      params.set(key, value ? 'true' : 'false');
      continue;
    }

    params.set(key, String(value));
  }

  return params.toString();
}

function parseSearchFilters(searchParams: SearchParamLike) {
  const parseArray = (key: string) =>
    searchParams
      .get(key)
      ?.split(',')
      .map((item) => item.trim())
      .filter(Boolean) ?? [];
  const parseNumber = (key: string) => {
    const value = searchParams.get(key);
    return value ? Number(value) : undefined;
  };
  const parseBoolean = (key: string) => searchParams.get(key) === 'true';

  return {
    ...initialFilters,
    q: searchParams.get('q') ?? '',
    cities: parseArray('cities'),
    districts: parseArray('districts'),
    vehicleType: (searchParams.get('vehicleType') as ListingFeedQuery['vehicleType']) ?? undefined,
    brandId: searchParams.get('brandId') ?? '',
    modelId: searchParams.get('modelId') ?? '',
    packageId: searchParams.get('packageId') ?? '',
    minPrice: parseNumber('minPrice'),
    maxPrice: parseNumber('maxPrice'),
    minYear: parseNumber('minYear'),
    maxYear: parseNumber('maxYear'),
    minKm: parseNumber('minKm'),
    maxKm: parseNumber('maxKm'),
    fuelTypes: parseArray('fuelTypes') as ListingFeedQuery['fuelTypes'],
    transmissionTypes: parseArray('transmissionTypes') as ListingFeedQuery['transmissionTypes'],
    bodyTypes: parseArray('bodyTypes'),
    colors: parseArray('colors'),
    sellerTypes: parseArray('sellerTypes') as ListingFeedQuery['sellerTypes'],
    onlyVerifiedSeller: parseBoolean('onlyVerifiedSeller'),
    noPaint: parseBoolean('noPaint'),
    noChangedParts: parseBoolean('noChangedParts'),
    noHeavyDamage: parseBoolean('noHeavyDamage'),
    tradeAvailable: parseBoolean('tradeAvailable'),
    guaranteed: parseBoolean('guaranteed'),
    sort:
      (searchParams.get('sort') as ListingSortOption | null) ?? ListingSortOption.NEWEST,
  } satisfies ListingFeedQuery;
}

export function ListingsHomeClient() {
  const { session, isReady } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [items, setItems] = useState<ListingFeedItem[]>([]);
  const [filters, setFilters] = useState<ListingFeedQuery>(initialFilters);
  const [draftFilters, setDraftFilters] = useState<ListingFeedQuery>(initialFilters);
  const [brands, setBrands] = useState<VehicleCatalogBrand[]>([]);
  const [models, setModels] = useState<VehicleCatalogModel[]>([]);
  const [packages, setPackages] = useState<VehicleCatalogPackage[]>([]);
  const [citySearch, setCitySearch] = useState('');
  const [districtDraft, setDistrictDraft] = useState('');
  const [brandSearch, setBrandSearch] = useState('');
  const [modelSearch, setModelSearch] = useState('');
  const [packageSearch, setPackageSearch] = useState('');
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState(0);
  const [draftCount, setDraftCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const searchKey = searchParams.toString();
  const filteredCities = useMemo(() => {
    const search = citySearch.trim().toLocaleLowerCase('tr-TR');
    return TURKIYE_CITIES.filter((city) => city.toLocaleLowerCase('tr-TR').includes(search)).slice(
      0,
      30,
    );
  }, [citySearch]);
  const visibleBrands = useMemo(() => {
    const search = brandSearch.trim().toLocaleLowerCase('tr-TR');
    return brands.filter((brand) => brand.name.toLocaleLowerCase('tr-TR').includes(search));
  }, [brandSearch, brands]);
  const visibleModels = useMemo(() => {
    const search = modelSearch.trim().toLocaleLowerCase('tr-TR');
    return models.filter((model) => model.name.toLocaleLowerCase('tr-TR').includes(search));
  }, [modelSearch, models]);
  const visiblePackages = useMemo(() => {
    const search = packageSearch.trim().toLocaleLowerCase('tr-TR');
    return packages.filter((item) => item.name.toLocaleLowerCase('tr-TR').includes(search));
  }, [packageSearch, packages]);
  const districtSuggestions = useMemo(() => {
    const all =
      draftFilters.cities?.flatMap((city) => TURKIYE_DISTRICT_SUGGESTIONS[city] ?? []) ?? [];
    return all.filter((value, index) => all.indexOf(value) === index);
  }, [draftFilters.cities]);

  useEffect(() => {
    const parsed = parseSearchFilters(searchParams);
    setFilters(parsed);
    setDraftFilters(parsed);
  }, [searchKey, searchParams]);

  useEffect(() => {
    void webListingsApi
      .getBrands(draftFilters.vehicleType)
      .then((response) => {
        setBrands(response);
        setCatalogError(response.length === 0 ? 'Marka listesi bos geldi. Tekrar deneyin.' : null);
      })
      .catch(() => {
        setBrands([]);
        setCatalogError('Marka listesi yuklenemedi.');
      });
  }, [draftFilters.vehicleType]);

  useEffect(() => {
    if (!draftFilters.brandId) {
      setModels([]);
      setPackages([]);
      return;
    }

    void webListingsApi
      .getModels(draftFilters.brandId, draftFilters.vehicleType)
      .then((response) => {
        setModels(response);
        setCatalogError(response.length === 0 ? 'Secilen marka icin model bulunamadi.' : null);
      })
      .catch(() => {
        setModels([]);
        setCatalogError('Model listesi yuklenemedi.');
      });
  }, [draftFilters.brandId, draftFilters.vehicleType]);

  useEffect(() => {
    if (!draftFilters.modelId) {
      setPackages([]);
      return;
    }

    void webListingsApi
      .getPackages(draftFilters.modelId)
      .then((response) => {
        setPackages(response);
        setCatalogError(response.length === 0 ? 'Paket listesi yuklenemedi.' : null);
      })
      .catch(() => {
        setPackages([]);
        setCatalogError('Paket listesi yuklenemedi.');
      });
  }, [draftFilters.modelId]);

  useEffect(() => {
    if (!session?.accessToken) {
      return;
    }

    void loadFeed(true, filters);
  }, [filters, session?.accessToken]);

  useEffect(() => {
    if (!filtersOpen || !session?.accessToken) {
      return;
    }

    const timeout = setTimeout(() => {
      void webListingsApi
        .getCount(session.accessToken, normalizeFilters(draftFilters))
        .then((response) => setDraftCount(response.count))
        .catch(() => setDraftCount(null));
    }, 250);

    return () => clearTimeout(timeout);
  }, [draftFilters, filtersOpen, session?.accessToken]);

  async function loadFeed(reset: boolean, sourceFilters: ListingFeedQuery) {
    if (!session?.accessToken) {
      return;
    }

    const query = reset
      ? normalizeFilters(sourceFilters)
      : { ...normalizeFilters(sourceFilters), cursor: nextCursor ?? undefined };

    if (reset) {
      setLoading(true);
    } else {
      setLoadingMore(true);
    }

    setErrorMessage(null);

    try {
      const response = await webListingsApi.getFeed(session.accessToken, query);
      setItems((current) => (reset ? response.items : [...current, ...response.items]));
      setNextCursor(response.nextCursor);
      setTotalCount(response.totalCount);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Ilanlar yuklenemedi.');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }

  function updateDraft<K extends keyof ListingFeedQuery>(key: K, value: ListingFeedQuery[K]) {
    setDraftFilters((current) => ({
      ...current,
      [key]: value,
    }));
  }

  function toggleArrayValue(key: ArrayFilterKey, value: string) {
    setDraftFilters((current) => {
      const existing = ([...(current[key] as string[] | undefined ?? [])]) as string[];
      const next = existing.includes(value)
        ? existing.filter((item) => item !== value)
        : [...existing, value];

      return {
        ...current,
        [key]: next,
      };
    });
  }

  function addDistrict() {
    const trimmed = districtDraft.trim();
    if (!trimmed) {
      return;
    }

    setDraftFilters((current) => ({
      ...current,
      districts: current.districts?.includes(trimmed)
        ? current.districts
        : [...(current.districts ?? []), trimmed],
    }));
    setDistrictDraft('');
  }

  function applyFilters() {
    const query = buildSearchQuery(draftFilters);
    router.replace(query ? `${pathname}?${query}` : pathname);
    setFiltersOpen(false);
  }

  function resetFilters() {
    setDraftFilters(initialFilters);
    router.replace(pathname);
  }

  function clearLocationOnly() {
    const next = { ...filters, cities: [], districts: [] };
    router.replace(buildSearchQuery(next) ? `${pathname}?${buildSearchQuery(next)}` : pathname);
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

  const activeFilterChips = useMemo<ActiveFilterChip[]>(() => {
    const chips: ActiveFilterChip[] = [];
    const brand = brands.find((item) => item.id === filters.brandId)?.name;
    const model = models.find((item) => item.id === filters.modelId)?.name;
    const packageName = packages.find((item) => item.id === filters.packageId)?.name;

    const removeArrayValue = (key: ArrayFilterKey, value: string) => {
      const next = {
        ...filters,
        [key]: (filters[key] as string[] | undefined)?.filter((item) => item !== value) ?? [],
      };
      router.replace(buildSearchQuery(next) ? `${pathname}?${buildSearchQuery(next)}` : pathname);
    };

    (filters.cities ?? []).forEach((city) => {
      chips.push({ id: `city:${city}`, label: city, onRemove: () => removeArrayValue('cities', city) });
    });
    (filters.districts ?? []).forEach((district) => {
      chips.push({
        id: `district:${district}`,
        label: district,
        onRemove: () => removeArrayValue('districts', district),
      });
    });

    if (brand) {
      chips.push({
        id: 'brand',
        label: brand,
        onRemove: () => {
          const next = { ...filters, brandId: '', modelId: '', packageId: '' };
          router.replace(buildSearchQuery(next) ? `${pathname}?${buildSearchQuery(next)}` : pathname);
        },
      });
    }

    if (model) {
      chips.push({
        id: 'model',
        label: model,
        onRemove: () => {
          const next = { ...filters, modelId: '', packageId: '' };
          router.replace(buildSearchQuery(next) ? `${pathname}?${buildSearchQuery(next)}` : pathname);
        },
      });
    }

    if (packageName) {
      chips.push({
        id: 'package',
        label: packageName,
        onRemove: () => {
          const next = { ...filters, packageId: '' };
          router.replace(buildSearchQuery(next) ? `${pathname}?${buildSearchQuery(next)}` : pathname);
        },
      });
    }

    return chips;
  }, [brands, filters, models, packages, pathname, router]);

  if (!isReady) {
    return (
      <AppShell>
        <section className="detail-card gate-card">
          <div className="card-label">Listings</div>
          <h3 className="card-title">Oturum kontrol ediliyor</h3>
          <p className="card-copy">Filtre akisi hazirlaniyor.</p>
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
      <section className="feed-hero-card listings-hero-card">
        <div>
          <div className="card-label">Listings</div>
          <h2 className="feed-hero-title">{totalCount} ilan bulundu</h2>
          <p className="feed-hero-copy">
            Coklu il, teknik ozellik ve satici filtresiyle akis aninda daralir.
          </p>
        </div>
        <div className="hero-actions">
          <button
            className="secondary-link subtle-button"
            onClick={() => setFiltersOpen((current) => !current)}
            type="button"
          >
            Filtrele
          </button>
          <Link className="primary-link" href="/listings/create">
            Ilan ver
          </Link>
        </div>
      </section>

      {activeFilterChips.length > 0 ? (
        <div className="listings-active-chips">
          {activeFilterChips.map((chip) => (
            <button key={chip.id} className="listings-active-chip" onClick={chip.onRemove} type="button">
              <span>{chip.label}</span>
              <span>Ã—</span>
            </button>
          ))}
        </div>
      ) : null}

      {filtersOpen ? (
        <section className="detail-card listings-filter-panel">
          <div className="filter-panel-head">
            <div>
              <div className="card-label">Detayli filtre</div>
              <h3 className="card-title">{draftCount ?? totalCount} ilan bulundu</h3>
            </div>
            <div className="filter-panel-actions">
              <button className="secondary-link subtle-button" onClick={resetFilters} type="button">
                Temizle
              </button>
              <button className="primary-link" onClick={applyFilters} type="button">
                Sonuclari goster
              </button>
            </div>
          </div>

          <div className="filters-grid rebuilt">
            <label className="input-label span-2">
              Arama kelimesi
              <input
                className="text-input"
                onChange={(event) => updateDraft('q', event.target.value)}
                placeholder="Egea urban, dizel otomatik..."
                value={draftFilters.q ?? ''}
              />
            </label>

            <div className="filter-block span-2">
              <div className="filter-block-head">
                <span>Konum</span>
                <button className="tiny-filter-action" onClick={() => updateDraft('cities', [])} type="button">
                  Tum Turkiye
                </button>
              </div>
              <input
                className="text-input"
                onChange={(event) => setCitySearch(event.target.value)}
                placeholder="Il ara"
                value={citySearch}
              />
              <div className="choice-chip-grid">
                {filteredCities.map((city) => (
                  <button
                    key={city}
                    className={`choice-chip${(draftFilters.cities ?? []).includes(city) ? ' active' : ''}`}
                    onClick={() => toggleArrayValue('cities', city)}
                    type="button"
                  >
                    {city}
                  </button>
                ))}
              </div>
              {(draftFilters.cities?.length ?? 0) > 0 ? (
                <>
                  <div className="inline-form-row">
                    <input
                      className="text-input"
                      onChange={(event) => setDistrictDraft(event.target.value)}
                      placeholder="Ilce ekle"
                      value={districtDraft}
                    />
                    <button className="secondary-link subtle-button" onClick={addDistrict} type="button">
                      Ekle
                    </button>
                  </div>
                  <div className="choice-chip-grid">
                    {districtSuggestions.map((district) => (
                      <button
                        key={district}
                        className={`choice-chip${(draftFilters.districts ?? []).includes(district) ? ' active' : ''}`}
                        onClick={() => toggleArrayValue('districts', district)}
                        type="button"
                      >
                        {district}
                      </button>
                    ))}
                  </div>
                </>
              ) : null}
            </div>

            <div className="filter-block span-2">
              <div className="filter-block-head">
                <span>Arac</span>
              </div>
              <div className="choice-chip-grid">
                {LISTING_VEHICLE_TYPE_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    className={`choice-chip${draftFilters.vehicleType === option.value ? ' active' : ''}`}
                    onClick={() => {
                      updateDraft(
                        'vehicleType',
                        draftFilters.vehicleType === option.value ? undefined : option.value,
                      );
                      updateDraft('brandId', '');
                      updateDraft('modelId', '');
                      updateDraft('packageId', '');
                    }}
                    type="button"
                  >
                    {option.label}
                  </button>
                ))}
              </div>
              <input
                className="text-input"
                onChange={(event) => setBrandSearch(event.target.value)}
                placeholder="Marka ara"
                value={brandSearch}
              />
              <div className="choice-chip-grid">
                {visibleBrands.map((brand) => (
                  <button
                    key={brand.id}
                    className={`choice-chip${draftFilters.brandId === brand.id ? ' active' : ''}`}
                    onClick={() => {
                      updateDraft('brandId', draftFilters.brandId === brand.id ? '' : brand.id);
                      updateDraft('modelId', '');
                      updateDraft('packageId', '');
                    }}
                    type="button"
                  >
                    {brand.name}
                  </button>
                ))}
              </div>
              {draftFilters.brandId ? (
                <>
                  <input
                    className="text-input"
                    onChange={(event) => setModelSearch(event.target.value)}
                    placeholder="Model ara"
                    value={modelSearch}
                  />
                  <div className="choice-chip-grid">
                    {visibleModels.map((model) => (
                      <button
                        key={model.id}
                        className={`choice-chip${draftFilters.modelId === model.id ? ' active' : ''}`}
                        onClick={() => {
                          updateDraft('modelId', draftFilters.modelId === model.id ? '' : model.id);
                          updateDraft('packageId', '');
                        }}
                        type="button"
                      >
                        {model.name}
                      </button>
                    ))}
                  </div>
                </>
              ) : null}
              {draftFilters.modelId ? (
                <>
                  <input
                    className="text-input"
                    onChange={(event) => setPackageSearch(event.target.value)}
                    placeholder="Paket ara"
                    value={packageSearch}
                  />
                  <div className="choice-chip-grid">
                    {visiblePackages.map((item) => (
                      <button
                        key={item.id}
                        className={`choice-chip${draftFilters.packageId === item.id ? ' active' : ''}`}
                        onClick={() =>
                          updateDraft('packageId', draftFilters.packageId === item.id ? '' : item.id)
                        }
                        type="button"
                      >
                        {item.name}
                      </button>
                    ))}
                  </div>
                </>
              ) : null}
              {catalogError ? <p className="inline-error">{catalogError}</p> : null}
            </div>

            <label className="input-label">
              Min fiyat
              <input
                className="text-input"
                inputMode="numeric"
                onChange={(event) => updateDraft('minPrice', event.target.value ? Number(event.target.value) : undefined)}
                value={draftFilters.minPrice ?? ''}
              />
            </label>
            <label className="input-label">
              Max fiyat
              <input
                className="text-input"
                inputMode="numeric"
                onChange={(event) => updateDraft('maxPrice', event.target.value ? Number(event.target.value) : undefined)}
                value={draftFilters.maxPrice ?? ''}
              />
            </label>
            <label className="input-label">
              Min yil
              <input
                className="text-input"
                inputMode="numeric"
                onChange={(event) => updateDraft('minYear', event.target.value ? Number(event.target.value) : undefined)}
                value={draftFilters.minYear ?? ''}
              />
            </label>
            <label className="input-label">
              Max yil
              <input
                className="text-input"
                inputMode="numeric"
                onChange={(event) => updateDraft('maxYear', event.target.value ? Number(event.target.value) : undefined)}
                value={draftFilters.maxYear ?? ''}
              />
            </label>
            <label className="input-label">
              Min km
              <input
                className="text-input"
                inputMode="numeric"
                onChange={(event) => updateDraft('minKm', event.target.value ? Number(event.target.value) : undefined)}
                value={draftFilters.minKm ?? ''}
              />
            </label>
            <label className="input-label">
              Max km
              <input
                className="text-input"
                inputMode="numeric"
                onChange={(event) => updateDraft('maxKm', event.target.value ? Number(event.target.value) : undefined)}
                value={draftFilters.maxKm ?? ''}
              />
            </label>

            <div className="filter-block span-2">
              <div className="filter-block-head">
                <span>Teknik</span>
              </div>
              <div className="choice-chip-grid">
                {LISTING_FUEL_OPTIONS.map((option) => (
                  <button
                    key={option}
                    className={`choice-chip${(draftFilters.fuelTypes ?? []).includes(option) ? ' active' : ''}`}
                    onClick={() => toggleArrayValue('fuelTypes', option)}
                    type="button"
                  >
                    {fuelTypeLabels[option]}
                  </button>
                ))}
              </div>
              <div className="choice-chip-grid">
                {LISTING_TRANSMISSION_OPTIONS.map((option) => (
                  <button
                    key={option}
                    className={`choice-chip${(draftFilters.transmissionTypes ?? []).includes(option) ? ' active' : ''}`}
                    onClick={() => toggleArrayValue('transmissionTypes', option)}
                    type="button"
                  >
                    {transmissionLabels[option]}
                  </button>
                ))}
              </div>
              <div className="choice-chip-grid">
                {LISTING_BODY_TYPE_OPTIONS.map((option) => (
                  <button
                    key={option}
                    className={`choice-chip${(draftFilters.bodyTypes ?? []).includes(option) ? ' active' : ''}`}
                    onClick={() => toggleArrayValue('bodyTypes', option)}
                    type="button"
                  >
                    {option}
                  </button>
                ))}
              </div>
              <div className="choice-chip-grid">
                {LISTING_COLOR_OPTIONS.map((option) => (
                  <button
                    key={option}
                    className={`choice-chip${(draftFilters.colors ?? []).includes(option) ? ' active' : ''}`}
                    onClick={() => toggleArrayValue('colors', option)}
                    type="button"
                  >
                    {option}
                  </button>
                ))}
              </div>
            </div>

            <div className="filter-block span-2">
              <div className="filter-block-head">
                <span>Durum</span>
              </div>
              <div className="choice-chip-grid">
                <button className={`choice-chip${draftFilters.noPaint ? ' active' : ''}`} onClick={() => updateDraft('noPaint', !draftFilters.noPaint)} type="button">Boyasiz</button>
                <button className={`choice-chip${draftFilters.noChangedParts ? ' active' : ''}`} onClick={() => updateDraft('noChangedParts', !draftFilters.noChangedParts)} type="button">Degisensiz</button>
                <button className={`choice-chip${draftFilters.noHeavyDamage ? ' active' : ''}`} onClick={() => updateDraft('noHeavyDamage', !draftFilters.noHeavyDamage)} type="button">Agir hasar kayitli degil</button>
                <button className={`choice-chip${draftFilters.tradeAvailable ? ' active' : ''}`} onClick={() => updateDraft('tradeAvailable', !draftFilters.tradeAvailable)} type="button">Takasa acik</button>
                <button className={`choice-chip${draftFilters.guaranteed ? ' active' : ''}`} onClick={() => updateDraft('guaranteed', !draftFilters.guaranteed)} type="button">Garantili</button>
              </div>
            </div>

            <div className="filter-block span-2">
              <div className="filter-block-head">
                <span>Satici</span>
              </div>
              <div className="choice-chip-grid">
                {LISTING_SELLER_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    className={`choice-chip${(draftFilters.sellerTypes ?? []).includes(option.value) ? ' active' : ''}`}
                    onClick={() => toggleArrayValue('sellerTypes', option.value)}
                    type="button"
                  >
                    {option.label}
                  </button>
                ))}
                <button
                  className={`choice-chip${draftFilters.onlyVerifiedSeller ? ' active' : ''}`}
                  onClick={() => updateDraft('onlyVerifiedSeller', !draftFilters.onlyVerifiedSeller)}
                  type="button"
                >
                  Dogrulanmis satici
                </button>
              </div>
            </div>

            <div className="filter-block span-2">
              <div className="filter-block-head">
                <span>Siralama</span>
              </div>
              <div className="choice-chip-grid">
                {Object.values(ListingSortOption).map((option) => (
                  <button
                    key={option}
                    className={`choice-chip${draftFilters.sort === option ? ' active' : ''}`}
                    onClick={() => updateDraft('sort', option)}
                    type="button"
                  >
                    {LISTING_SORT_LABELS[option]}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>
      ) : null}

      {errorMessage ? (
        <section className="detail-card feedback-card danger">
          <p className="card-copy">{errorMessage}</p>
        </section>
      ) : null}

      {!loading && items.length === 0 ? (
        <section className="detail-card feedback-card">
          <h3 className="card-title">Bu filtrelere uygun ilan bulunamadi</h3>
          <p className="card-copy">Filtreleri genisletin veya tum Turkiye icin tekrar deneyin.</p>
          <div className="gate-actions">
            <button className="secondary-link subtle-button" onClick={() => setFiltersOpen(true)} type="button">
              Filtreleri genislet
            </button>
            <button className="primary-link" onClick={clearLocationOnly} type="button">
              Tum Turkiye'de ara
            </button>
          </div>
        </section>
      ) : null}

      <section className="listings-feed-grid">
        {items.map((item) => (
          <article key={item.listingId} className="listing-stream-card">
            <Link className="listing-stream-media" href={`/listings/${item.listingId}`}>
              <WebMediaView
                alt={item.title}
                className="listing-stream-media-asset"
                mediaType="IMAGE"
                placeholderLabel="CARLOI"
                uri={item.firstMediaUrl}
              />
            </Link>
            <div className="listing-stream-body">
              <div className="listing-stream-top">
                <div>
                  <Link className="listing-stream-title" href={`/listings/${item.listingId}`}>
                    {item.title}
                  </Link>
                  <p className="listing-stream-copy">
                    {[item.brand, item.model, item.package].filter(Boolean).join(' / ')}
                  </p>
                  <p className="listing-stream-copy">
                    {item.city}
                    {item.district ? ` / ${item.district}` : ''} · {sellerTypeLabels[item.sellerType]}
                  </p>
                </div>
                <button className="listing-save-button" onClick={() => void toggleSave(item)} type="button">
                  {item.isSaved ? 'Kayitli' : 'Kaydet'}
                </button>
              </div>
              <div className="listing-stream-meta">
                <span>{item.year ?? '-'}</span>
                <span>{formatKm(item.km)}</span>
                <span>{item.fuelType ? fuelTypeLabels[item.fuelType] : 'Yakit yok'}</span>
                <span>{item.transmissionType ? transmissionLabels[item.transmissionType] : 'Vites yok'}</span>
              </div>
              <div className="listing-stream-bottom">
                <span className="listing-price">{formatPrice(item.price)}</span>
                {item.isVerifiedSeller ? <span className="listing-badge">Dogrulanmis</span> : null}
              </div>
            </div>
          </article>
        ))}
      </section>

      {!loading && nextCursor ? (
        <div className="listings-load-more-row">
          <button
            className="primary-link"
            disabled={loadingMore}
            onClick={() => void loadFeed(false, filters)}
            type="button"
          >
            {loadingMore ? 'Yukleniyor...' : 'Daha fazla ilan'}
          </button>
        </div>
      ) : null}
    </AppShell>
  );
}

