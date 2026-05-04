import { Ionicons } from '@expo/vector-icons';
import {
  FuelType,
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
import { Redirect, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { MobileMediaView } from '../components/mobile-media-view';
import { MobileShell } from '../components/mobile-shell';
import { useAuth } from '../context/auth-context';
import { mobileTheme } from '../lib/design-system';
import { mobileListingsApi } from '../lib/listings-api';
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

export default function ListingsScreen() {
  const router = useRouter();
  const { session } = useAuth();
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
  const [filterModalVisible, setFilterModalVisible] = useState(false);

  const accessToken = session?.accessToken;
  const token = accessToken ?? '';

  const filteredCities = useMemo(() => {
    const search = citySearch.trim().toLocaleLowerCase('tr-TR');
    return TURKIYE_CITIES.filter((city) => city.toLocaleLowerCase('tr-TR').includes(search)).slice(
      0,
      24,
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
    void mobileListingsApi
      .getBrands(draftFilters.vehicleType)
      .then((response) => {
        setBrands(response);
        setCatalogError(response.length === 0 ? 'Marka listesi bos geldi. Tekrar deneyin.' : null);
      })
      .catch(() => {
        setBrands([]);
        setCatalogError('Marka listesi yuklenemedi. Tekrar deneyin.');
      });
  }, [draftFilters.vehicleType]);

  useEffect(() => {
    if (!draftFilters.brandId) {
      setModels([]);
      setPackages([]);
      return;
    }

    void mobileListingsApi
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

    void mobileListingsApi
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
    if (accessToken) {
      void loadFeed(true, filters);
    }
  }, [accessToken, filters]);

  useEffect(() => {
    if (!filterModalVisible || !accessToken) {
      return;
    }

    const timeout = setTimeout(() => {
      void mobileListingsApi
        .getCount(token, normalizeFilters(draftFilters))
        .then((response) => setDraftCount(response.count))
        .catch(() => setDraftCount(null));
    }, 250);

    return () => clearTimeout(timeout);
  }, [accessToken, draftFilters, filterModalVisible, token]);

  if (!accessToken) {
    return <Redirect href="/login" />;
  }

  async function loadFeed(reset: boolean, sourceFilters: ListingFeedQuery) {
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
      const response = await mobileListingsApi.getFeed(token, query);
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

  function addDistrict(value: string) {
    const trimmed = value.trim();
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

  function clearAllFilters() {
    setDraftFilters(initialFilters);
    setFilters(initialFilters);
    setCitySearch('');
    setDistrictDraft('');
    setBrandSearch('');
    setModelSearch('');
    setPackageSearch('');
    setFilterModalVisible(false);
  }

  function clearLocationOnly() {
    const next = {
      ...filters,
      cities: [],
      districts: [],
    };
    setFilters(next);
    setDraftFilters(next);
  }

  function applyFilters() {
    setFilters({
      ...draftFilters,
      ...normalizeFilters(draftFilters),
      cursor: undefined,
    });
    setFilterModalVisible(false);
  }

  async function toggleSave(item: ListingFeedItem) {
    try {
      const response = item.isSaved
        ? await mobileListingsApi.unsaveListing(token, item.listingId)
        : await mobileListingsApi.saveListing(token, item.listingId);

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
      setFilters((current) => ({
        ...current,
        [key]: (current[key] as string[] | undefined)?.filter((item) => item !== value) ?? [],
      }));
      setDraftFilters((current) => ({
        ...current,
        [key]: (current[key] as string[] | undefined)?.filter((item) => item !== value) ?? [],
      }));
    };

    (filters.cities ?? []).forEach((city) => {
      chips.push({
        id: `city:${city}`,
        label: city,
        onRemove: () => removeArrayValue('cities', city),
      });
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
          setFilters((current) => ({ ...current, brandId: '', modelId: '', packageId: '' }));
          setDraftFilters((current) => ({ ...current, brandId: '', modelId: '', packageId: '' }));
        },
      });
    }

    if (model) {
      chips.push({
        id: 'model',
        label: model,
        onRemove: () => {
          setFilters((current) => ({ ...current, modelId: '', packageId: '' }));
          setDraftFilters((current) => ({ ...current, modelId: '', packageId: '' }));
        },
      });
    }

    if (packageName) {
      chips.push({
        id: 'package',
        label: packageName,
        onRemove: () => {
          setFilters((current) => ({ ...current, packageId: '' }));
          setDraftFilters((current) => ({ ...current, packageId: '' }));
        },
      });
    }

    if (filters.minPrice || filters.maxPrice) {
      chips.push({
        id: 'price',
        label: `${filters.minPrice ? formatPrice(filters.minPrice) : '0'} - ${filters.maxPrice ? formatPrice(filters.maxPrice) : 'Sinirsiz'}`,
        onRemove: () => {
          setFilters((current) => ({ ...current, minPrice: undefined, maxPrice: undefined }));
          setDraftFilters((current) => ({ ...current, minPrice: undefined, maxPrice: undefined }));
        },
      });
    }

    (filters.fuelTypes ?? []).forEach((value) => {
      chips.push({
        id: `fuel:${value}`,
        label: fuelTypeLabels[value],
        onRemove: () => removeArrayValue('fuelTypes', value),
      });
    });

    (filters.transmissionTypes ?? []).forEach((value) => {
      chips.push({
        id: `transmission:${value}`,
        label: transmissionLabels[value],
        onRemove: () => removeArrayValue('transmissionTypes', value),
      });
    });

    if (filters.onlyVerifiedSeller) {
      chips.push({
        id: 'verified',
        label: 'Dogrulanmis satici',
        onRemove: () => {
          setFilters((current) => ({ ...current, onlyVerifiedSeller: false }));
          setDraftFilters((current) => ({ ...current, onlyVerifiedSeller: false }));
        },
      });
    }

    return chips;
  }, [brands, filters, models, packages]);

  return (
    <MobileShell
      title="Ilanlar"
      subtitle="Sahibinden mantiginda filtrele, coklu il sec ve sonucu akista takip et."
      actionLabel="Ilan ver"
      onActionPress={() => router.push('/create-listing')}
    >
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <View style={styles.toolbar}>
          <View>
            <Text style={styles.resultTitle}>{totalCount} ilan bulundu</Text>
            <Text style={styles.resultMeta}>Yuklenen: {items.length}</Text>
          </View>
          <Pressable onPress={() => setFilterModalVisible(true)} style={styles.filterButton}>
            <Ionicons color="#111111" name="options-outline" size={18} />
            <Text style={styles.filterButtonLabel}>Filtre</Text>
          </Pressable>
        </View>

        {activeFilterChips.length > 0 ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.activeChipsRow}
          >
            {activeFilterChips.map((chip) => (
              <Pressable key={chip.id} onPress={chip.onRemove} style={styles.activeChip}>
                <Text style={styles.activeChipLabel}>{chip.label}</Text>
                <Ionicons color="#475569" name="close" size={14} />
              </Pressable>
            ))}
          </ScrollView>
        ) : null}

        {errorMessage ? (
          <View style={[styles.banner, styles.errorBanner]}>
            <Text style={styles.bannerText}>{errorMessage}</Text>
          </View>
        ) : null}

        {loading ? (
          <View style={styles.loadingCard}>
            <ActivityIndicator color={mobileTheme.colors.accent} />
            <Text style={styles.loadingText}>Ilanlar getiriliyor...</Text>
          </View>
        ) : null}

        {!loading && items.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>Bu filtrelere uygun ilan bulunamadi</Text>
            <Text style={styles.emptyCopy}>
              Filtreleri genisletin veya Tum Turkiye secenegine donun.
            </Text>
            <View style={styles.emptyActions}>
              <Pressable onPress={() => setFilterModalVisible(true)} style={styles.secondaryButton}>
                <Text style={styles.secondaryButtonLabel}>Filtreleri genislet</Text>
              </Pressable>
              <Pressable onPress={clearLocationOnly} style={styles.primaryButton}>
                <Text style={styles.primaryButtonLabel}>Tum Turkiye'de ara</Text>
              </Pressable>
            </View>
          </View>
        ) : null}

        {items.map((item) => (
          <Pressable
            key={item.listingId}
            onPress={() => router.push(`/listings/${item.listingId}`)}
            style={styles.listingCard}
          >
            <View style={styles.mediaWrap}>
              <MobileMediaView
                mediaType="IMAGE"
                resizeMode="cover"
                style={styles.cardImage}
                uri={item.firstMediaUrl}
              />
            </View>
            <View style={styles.cardBody}>
              <View style={styles.cardTop}>
                <Text numberOfLines={2} style={styles.cardTitle}>
                  {item.title}
                </Text>
                <Pressable onPress={() => void toggleSave(item)} style={styles.saveButton}>
                  <Ionicons
                    color="#111111"
                    name={item.isSaved ? 'bookmark' : 'bookmark-outline'}
                    size={16}
                  />
                </Pressable>
              </View>
              <Text numberOfLines={1} style={styles.cardMeta}>
                {[item.brand, item.model, item.package].filter(Boolean).join(' / ')}
              </Text>
              <Text style={styles.cardMeta}>
                {item.city}
                {item.district ? ` / ${item.district}` : ''} · {sellerTypeLabels[item.sellerType]}
              </Text>
              <Text style={styles.cardMeta}>
                {[
                  item.fuelType ? fuelTypeLabels[item.fuelType] : null,
                  item.transmissionType ? transmissionLabels[item.transmissionType] : null,
                  item.bodyType,
                ]
                  .filter(Boolean)
                  .join(' · ')}
              </Text>
              <View style={styles.cardBottom}>
                <Text style={styles.cardSecondary}>
                  {item.year ?? '-'} · {formatKm(item.km)}
                </Text>
                <Text style={styles.cardPrice}>{formatPrice(item.price)}</Text>
              </View>
            </View>
          </Pressable>
        ))}

        {!loading && nextCursor ? (
          <Pressable
            disabled={loadingMore}
            onPress={() => void loadFeed(false, filters)}
            style={styles.loadMoreButton}
          >
            <Text style={styles.loadMoreLabel}>
              {loadingMore ? 'Yukleniyor...' : 'Daha fazla ilan'}
            </Text>
          </Pressable>
        ) : null}
      </ScrollView>

      <Modal animationType="slide" transparent visible={filterModalVisible}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Detayli filtre</Text>
                <Text style={styles.modalSubtitle}>{draftCount ?? totalCount} ilan bulundu</Text>
              </View>
              <Pressable onPress={() => setFilterModalVisible(false)} style={styles.closeButton}>
                <Ionicons color="#111111" name="close" size={20} />
              </Pressable>
            </View>

            <ScrollView contentContainerStyle={styles.modalContent}>
              <FilterSection title="Arama kelimesi">
                <TextInput
                  onChangeText={(value) => updateDraft('q', value)}
                  placeholder="Egea urban, dizel otomatik..."
                  placeholderTextColor="#94a3b8"
                  style={styles.textInput}
                  value={draftFilters.q ?? ''}
                />
              </FilterSection>

              <FilterSection title="Konum">
                <View style={styles.inlineRow}>
                  <TextInput
                    onChangeText={setCitySearch}
                    placeholder="Il ara"
                    placeholderTextColor="#94a3b8"
                    style={[styles.textInput, styles.inlineInput]}
                    value={citySearch}
                  />
                  <Pressable
                    onPress={() => {
                      updateDraft('cities', []);
                      updateDraft('districts', []);
                    }}
                    style={styles.ghostButton}
                  >
                    <Text style={styles.ghostButtonLabel}>Tum Turkiye</Text>
                  </Pressable>
                </View>
                <View style={styles.wrapRow}>
                  {(draftFilters.cities ?? []).map((city) => (
                    <ChoiceChip
                      key={city}
                      active
                      label={city}
                      onPress={() => toggleArrayValue('cities', city)}
                    />
                  ))}
                </View>
                <View style={styles.wrapRow}>
                  {filteredCities.map((city) => (
                    <ChoiceChip
                      key={city}
                      active={(draftFilters.cities ?? []).includes(city)}
                      label={city}
                      onPress={() => toggleArrayValue('cities', city)}
                    />
                  ))}
                </View>

                {(draftFilters.cities?.length ?? 0) > 0 ? (
                  <>
                    <View style={styles.inlineRow}>
                      <TextInput
                        onChangeText={setDistrictDraft}
                        placeholder="Ilce ekle"
                        placeholderTextColor="#94a3b8"
                        style={[styles.textInput, styles.inlineInput]}
                        value={districtDraft}
                      />
                      <Pressable onPress={() => addDistrict(districtDraft)} style={styles.ghostButton}>
                        <Text style={styles.ghostButtonLabel}>Ekle</Text>
                      </Pressable>
                    </View>
                    <View style={styles.wrapRow}>
                      {(draftFilters.districts ?? []).map((district) => (
                        <ChoiceChip
                          key={district}
                          active
                          label={district}
                          onPress={() => toggleArrayValue('districts', district)}
                        />
                      ))}
                    </View>
                    <View style={styles.wrapRow}>
                      {districtSuggestions.map((district) => (
                        <ChoiceChip
                          key={district}
                          active={(draftFilters.districts ?? []).includes(district)}
                          label={district}
                          onPress={() => toggleArrayValue('districts', district)}
                        />
                      ))}
                    </View>
                  </>
                ) : null}
              </FilterSection>

              <FilterSection title="Arac">
                <View style={styles.wrapRow}>
                  {LISTING_VEHICLE_TYPE_OPTIONS.map((option) => (
                    <ChoiceChip
                      key={option.value}
                      active={draftFilters.vehicleType === option.value}
                      label={option.label}
                      onPress={() => {
                        updateDraft(
                          'vehicleType',
                          draftFilters.vehicleType === option.value ? undefined : option.value,
                        );
                        updateDraft('brandId', '');
                        updateDraft('modelId', '');
                        updateDraft('packageId', '');
                      }}
                    />
                  ))}
                </View>
                <TextInput
                  onChangeText={setBrandSearch}
                  placeholder="Marka ara"
                  placeholderTextColor="#94a3b8"
                  style={styles.textInput}
                  value={brandSearch}
                />
                <View style={styles.wrapRow}>
                  {visibleBrands.map((brand) => (
                    <ChoiceChip
                      key={brand.id}
                      active={draftFilters.brandId === brand.id}
                      label={brand.name}
                      onPress={() => {
                        updateDraft('brandId', draftFilters.brandId === brand.id ? '' : brand.id);
                        updateDraft('modelId', '');
                        updateDraft('packageId', '');
                      }}
                    />
                  ))}
                </View>

                {draftFilters.brandId ? (
                  <>
                    <TextInput
                      onChangeText={setModelSearch}
                      placeholder="Model ara"
                      placeholderTextColor="#94a3b8"
                      style={styles.textInput}
                      value={modelSearch}
                    />
                    <View style={styles.wrapRow}>
                      {visibleModels.map((model) => (
                        <ChoiceChip
                          key={model.id}
                          active={draftFilters.modelId === model.id}
                          label={model.name}
                          onPress={() => {
                            updateDraft('modelId', draftFilters.modelId === model.id ? '' : model.id);
                            updateDraft('packageId', '');
                          }}
                        />
                      ))}
                    </View>
                  </>
                ) : null}

                {draftFilters.modelId ? (
                  <>
                    <TextInput
                      onChangeText={setPackageSearch}
                      placeholder="Paket ara"
                      placeholderTextColor="#94a3b8"
                      style={styles.textInput}
                      value={packageSearch}
                    />
                    <View style={styles.wrapRow}>
                      {visiblePackages.map((item) => (
                        <ChoiceChip
                          key={item.id}
                          active={draftFilters.packageId === item.id}
                          label={item.name}
                          onPress={() =>
                            updateDraft('packageId', draftFilters.packageId === item.id ? '' : item.id)
                          }
                        />
                      ))}
                    </View>
                  </>
                ) : null}

                {catalogError ? <Text style={styles.helperError}>{catalogError}</Text> : null}
              </FilterSection>

              <FilterSection title="Fiyat">
                <RangeRow
                  maxPlaceholder="Max fiyat"
                  maxValue={draftFilters.maxPrice}
                  minPlaceholder="Min fiyat"
                  minValue={draftFilters.minPrice}
                  onMaxChange={(value) => updateDraft('maxPrice', value ? Number(value) : undefined)}
                  onMinChange={(value) => updateDraft('minPrice', value ? Number(value) : undefined)}
                />
              </FilterSection>

              <FilterSection title="Yil">
                <RangeRow
                  maxPlaceholder="Max yil"
                  maxValue={draftFilters.maxYear}
                  minPlaceholder="Min yil"
                  minValue={draftFilters.minYear}
                  onMaxChange={(value) => updateDraft('maxYear', value ? Number(value) : undefined)}
                  onMinChange={(value) => updateDraft('minYear', value ? Number(value) : undefined)}
                />
              </FilterSection>

              <FilterSection title="KM">
                <RangeRow
                  maxPlaceholder="Max km"
                  maxValue={draftFilters.maxKm}
                  minPlaceholder="Min km"
                  minValue={draftFilters.minKm}
                  onMaxChange={(value) => updateDraft('maxKm', value ? Number(value) : undefined)}
                  onMinChange={(value) => updateDraft('minKm', value ? Number(value) : undefined)}
                />
              </FilterSection>

              <FilterSection title="Teknik">
                <Text style={styles.sectionHint}>Yakit</Text>
                <View style={styles.wrapRow}>
                  {LISTING_FUEL_OPTIONS.map((option) => (
                    <ChoiceChip
                      key={option}
                      active={(draftFilters.fuelTypes ?? []).includes(option)}
                      label={fuelTypeLabels[option]}
                      onPress={() => toggleArrayValue('fuelTypes', option)}
                    />
                  ))}
                </View>
                <Text style={styles.sectionHint}>Vites</Text>
                <View style={styles.wrapRow}>
                  {LISTING_TRANSMISSION_OPTIONS.map((option) => (
                    <ChoiceChip
                      key={option}
                      active={(draftFilters.transmissionTypes ?? []).includes(option)}
                      label={transmissionLabels[option]}
                      onPress={() => toggleArrayValue('transmissionTypes', option)}
                    />
                  ))}
                </View>
                <Text style={styles.sectionHint}>Kasa tipi</Text>
                <View style={styles.wrapRow}>
                  {LISTING_BODY_TYPE_OPTIONS.map((option) => (
                    <ChoiceChip
                      key={option}
                      active={(draftFilters.bodyTypes ?? []).includes(option)}
                      label={option}
                      onPress={() => toggleArrayValue('bodyTypes', option)}
                    />
                  ))}
                </View>
                <Text style={styles.sectionHint}>Renk</Text>
                <View style={styles.wrapRow}>
                  {LISTING_COLOR_OPTIONS.map((option) => (
                    <ChoiceChip
                      key={option}
                      active={(draftFilters.colors ?? []).includes(option)}
                      label={option}
                      onPress={() => toggleArrayValue('colors', option)}
                    />
                  ))}
                </View>
              </FilterSection>

              <FilterSection title="Durum">
                <View style={styles.wrapRow}>
                  <ChoiceChip
                    active={Boolean(draftFilters.noPaint)}
                    label="Boyasiz"
                    onPress={() => updateDraft('noPaint', !draftFilters.noPaint)}
                  />
                  <ChoiceChip
                    active={Boolean(draftFilters.noChangedParts)}
                    label="Degisensiz"
                    onPress={() => updateDraft('noChangedParts', !draftFilters.noChangedParts)}
                  />
                  <ChoiceChip
                    active={Boolean(draftFilters.noHeavyDamage)}
                    label="Agir hasar kayitli degil"
                    onPress={() => updateDraft('noHeavyDamage', !draftFilters.noHeavyDamage)}
                  />
                  <ChoiceChip
                    active={Boolean(draftFilters.tradeAvailable)}
                    label="Takasa acik"
                    onPress={() => updateDraft('tradeAvailable', !draftFilters.tradeAvailable)}
                  />
                  <ChoiceChip
                    active={Boolean(draftFilters.guaranteed)}
                    label="Garantili"
                    onPress={() => updateDraft('guaranteed', !draftFilters.guaranteed)}
                  />
                </View>
              </FilterSection>

              <FilterSection title="Satici">
                <View style={styles.wrapRow}>
                  {LISTING_SELLER_OPTIONS.map((option) => (
                    <ChoiceChip
                      key={option.value}
                      active={(draftFilters.sellerTypes ?? []).includes(option.value)}
                      label={option.label}
                      onPress={() => toggleArrayValue('sellerTypes', option.value)}
                    />
                  ))}
                  <ChoiceChip
                    active={Boolean(draftFilters.onlyVerifiedSeller)}
                    label="Dogrulanmis satici"
                    onPress={() => updateDraft('onlyVerifiedSeller', !draftFilters.onlyVerifiedSeller)}
                  />
                </View>
              </FilterSection>

              <FilterSection title="Siralama">
                <View style={styles.wrapRow}>
                  {Object.values(ListingSortOption).map((option) => (
                    <ChoiceChip
                      key={option}
                      active={draftFilters.sort === option}
                      label={LISTING_SORT_LABELS[option]}
                      onPress={() => updateDraft('sort', option)}
                    />
                  ))}
                </View>
              </FilterSection>
            </ScrollView>

            <View style={styles.modalFooter}>
              <Pressable onPress={clearAllFilters} style={styles.footerSecondary}>
                <Text style={styles.footerSecondaryLabel}>Temizle</Text>
              </Pressable>
              <Pressable onPress={applyFilters} style={styles.footerPrimary}>
                <Text style={styles.footerPrimaryLabel}>
                  {draftCount ?? totalCount} sonucu goster
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </MobileShell>
  );
}

function FilterSection({ children, title }: { children: React.ReactNode; title: string }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

function ChoiceChip({
  active,
  label,
  onPress,
}: {
  active?: boolean;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={[styles.choiceChip, active ? styles.choiceChipActive : null]}>
      <Text style={[styles.choiceChipLabel, active ? styles.choiceChipLabelActive : null]}>
        {label}
      </Text>
    </Pressable>
  );
}

function RangeRow({
  maxPlaceholder,
  maxValue,
  minPlaceholder,
  minValue,
  onMaxChange,
  onMinChange,
}: {
  maxPlaceholder: string;
  maxValue?: number;
  minPlaceholder: string;
  minValue?: number;
  onMaxChange: (value: string) => void;
  onMinChange: (value: string) => void;
}) {
  return (
    <View style={styles.rangeRow}>
      <TextInput
        keyboardType="numeric"
        onChangeText={onMinChange}
        placeholder={minPlaceholder}
        placeholderTextColor="#94a3b8"
        style={[styles.textInput, styles.rangeInput]}
        value={minValue ? String(minValue) : ''}
      />
      <TextInput
        keyboardType="numeric"
        onChangeText={onMaxChange}
        placeholder={maxPlaceholder}
        placeholderTextColor="#94a3b8"
        style={[styles.textInput, styles.rangeInput]}
        value={maxValue ? String(maxValue) : ''}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  content: { gap: 14, paddingBottom: 18 },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  resultTitle: { color: '#0f172a', fontSize: 18, fontWeight: '700' },
  resultMeta: { color: '#64748b', fontSize: 12, marginTop: 2 },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  filterButtonLabel: { color: '#111111', fontSize: 13, fontWeight: '700' },
  activeChipsRow: { gap: 8, paddingRight: 6 },
  activeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#dbe4ea',
  },
  activeChipLabel: { color: '#334155', fontSize: 12, fontWeight: '600' },
  banner: { borderRadius: 18, padding: 14 },
  errorBanner: { backgroundColor: '#fee2e2' },
  bannerText: { color: '#991b1b', fontSize: 13, fontWeight: '600' },
  loadingCard: {
    alignItems: 'center',
    gap: 8,
    paddingVertical: 26,
    borderRadius: 22,
    backgroundColor: '#f8fafc',
  },
  loadingText: { color: '#64748b', fontSize: 13, fontWeight: '600' },
  emptyCard: {
    gap: 10,
    padding: 22,
    borderRadius: 22,
    backgroundColor: '#f8fafc',
  },
  emptyTitle: { color: '#0f172a', fontSize: 18, fontWeight: '700' },
  emptyCopy: { color: '#64748b', fontSize: 13, lineHeight: 19 },
  emptyActions: { flexDirection: 'row', gap: 10 },
  secondaryButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#dbe4ea',
    backgroundColor: '#ffffff',
  },
  secondaryButtonLabel: { color: '#334155', fontSize: 13, fontWeight: '700' },
  primaryButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: '#111111',
  },
  primaryButtonLabel: { color: '#ffffff', fontSize: 13, fontWeight: '700' },
  listingCard: {
    overflow: 'hidden',
    borderRadius: 22,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#eef2f6',
  },
  mediaWrap: { backgroundColor: '#eef2f6' },
  cardImage: { width: '100%', aspectRatio: 1.42, backgroundColor: '#eef2f6' },
  cardBody: { gap: 7, padding: 14 },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  cardTitle: { flex: 1, color: '#0f172a', fontSize: 16, fontWeight: '700', lineHeight: 22 },
  saveButton: {
    width: 34,
    height: 34,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f8fafc',
  },
  cardMeta: { color: '#64748b', fontSize: 12, lineHeight: 18 },
  cardBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  cardSecondary: { color: '#475569', fontSize: 12, fontWeight: '600' },
  cardPrice: { color: '#0f172a', fontSize: 16, fontWeight: '800' },
  loadMoreButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 16,
    backgroundColor: '#111111',
  },
  loadMoreLabel: { color: '#ffffff', fontSize: 13, fontWeight: '700' },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.34)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    maxHeight: '92%',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    backgroundColor: '#ffffff',
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 18,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingBottom: 12,
  },
  modalTitle: { color: '#0f172a', fontSize: 22, fontWeight: '800' },
  modalSubtitle: { color: '#64748b', fontSize: 12, marginTop: 3 },
  closeButton: {
    width: 38,
    height: 38,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f8fafc',
  },
  modalContent: { gap: 18, paddingBottom: 20 },
  section: { gap: 10, paddingVertical: 4 },
  sectionTitle: { color: '#0f172a', fontSize: 15, fontWeight: '800' },
  sectionHint: { color: '#475569', fontSize: 12, fontWeight: '700' },
  helperError: { color: '#b91c1c', fontSize: 12, fontWeight: '600' },
  textInput: {
    borderWidth: 1,
    borderColor: '#dbe4ea',
    borderRadius: 16,
    backgroundColor: '#f8fafc',
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: '#0f172a',
    fontSize: 14,
  },
  inlineRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  inlineInput: { flex: 1 },
  ghostButton: {
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderRadius: 14,
    backgroundColor: '#eef2f6',
  },
  ghostButtonLabel: { color: '#334155', fontSize: 12, fontWeight: '700' },
  wrapRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  choiceChip: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#dbe4ea',
    backgroundColor: '#ffffff',
  },
  choiceChipActive: {
    borderColor: '#111111',
    backgroundColor: '#111111',
  },
  choiceChipLabel: { color: '#334155', fontSize: 12, fontWeight: '700' },
  choiceChipLabelActive: { color: '#ffffff' },
  rangeRow: { flexDirection: 'row', gap: 10 },
  rangeInput: { flex: 1 },
  modalFooter: {
    flexDirection: 'row',
    gap: 10,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#eef2f6',
  },
  footerSecondary: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 13,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#dbe4ea',
  },
  footerSecondaryLabel: { color: '#334155', fontSize: 13, fontWeight: '700' },
  footerPrimary: {
    flex: 1.4,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 13,
    borderRadius: 16,
    backgroundColor: '#111111',
  },
  footerPrimaryLabel: { color: '#ffffff', fontSize: 13, fontWeight: '800' },
});
