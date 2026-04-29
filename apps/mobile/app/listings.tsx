import { Redirect, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import type {
  ListingFeedItem,
  ListingFeedQuery,
  VehicleCatalogBrand,
  VehicleCatalogModel,
  VehicleCatalogPackage,
} from '@carloi-v4/types';
import { FuelType, SellerType, TransmissionType } from '@carloi-v4/types';
import {
  ActivityIndicator,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { MobileShell } from '../components/mobile-shell';
import { useAuth } from '../context/auth-context';
import { mobileListingsApi } from '../lib/listings-api';
import { formatKm, formatPrice, fuelTypeLabels, sellerTypeLabels, transmissionLabels } from '../lib/listings-ui';

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

export default function ListingsScreen() {
  const router = useRouter();
  const { session } = useAuth();
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
  const [filterModalVisible, setFilterModalVisible] = useState(false);

  const accessToken = session?.accessToken;

  useEffect(() => {
    void mobileListingsApi
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

    void mobileListingsApi
      .getModels(draftFilters.brandId)
      .then(setModels)
      .catch(() => setModels([]));
  }, [draftFilters.brandId]);

  useEffect(() => {
    if (!draftFilters.modelId) {
      setPackages([]);
      return;
    }

    void mobileListingsApi
      .getPackages(draftFilters.modelId)
      .then(setPackages)
      .catch(() => setPackages([]));
  }, [draftFilters.modelId]);

  useEffect(() => {
    if (accessToken) {
      void loadFeed(true, filters);
    }
  }, [accessToken, filters]);

  if (!accessToken) {
    return <Redirect href="/login" />;
  }

  const token: string = accessToken;

  async function loadFeed(reset: boolean, activeFilters: ListingFeedQuery) {
    const query = reset ? activeFilters : { ...activeFilters, cursor: nextCursor ?? undefined };

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
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Ilanlar yuklenemedi.');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }

  function patchDraft<K extends keyof ListingFeedQuery>(key: K, value: ListingFeedQuery[K]) {
    setDraftFilters((current) => ({
      ...current,
      [key]: value,
    }));
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

  return (
    <MobileShell
      title="Ilanlar"
      subtitle="Sehir oncelikli ilan akisini filtrele, kaydet ve garajindaki araci yayina al."
      actionLabel="Ilan ver"
      onActionPress={() => router.push('/create-listing')}
    >
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <View style={styles.headerRow}>
          <Pressable onPress={() => setFilterModalVisible(true)} style={styles.filterButton}>
            <Text style={styles.filterButtonLabel}>Filtrele</Text>
          </Pressable>
          <Text style={styles.metaText}>{items.length} ilan yuklendi</Text>
        </View>

        {notice ? (
          <View style={[styles.banner, styles.noticeBanner]}>
            <Text style={styles.bannerText}>{notice}</Text>
          </View>
        ) : null}
        {errorMessage ? (
          <View style={[styles.banner, styles.errorBanner]}>
            <Text style={styles.bannerText}>{errorMessage}</Text>
          </View>
        ) : null}

        {loading ? (
          <View style={styles.loadingCard}>
            <ActivityIndicator color="#ef8354" />
            <Text style={styles.loadingText}>Ilanlar getiriliyor...</Text>
          </View>
        ) : null}

        {!loading && items.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>Sonuc bulunamadi</Text>
            <Text style={styles.emptyCopy}>Filtreleri genisletip tekrar deneyin.</Text>
          </View>
        ) : null}

        {items.map((item) => (
          <Pressable
            key={item.listingId}
            onPress={() => router.push(`/listings/${item.listingId}`)}
            style={styles.card}
          >
            <View style={styles.imageWrap}>
              {item.firstMediaUrl ? (
                <Image source={{ uri: item.firstMediaUrl }} style={styles.cardImage} resizeMode="cover" />
              ) : (
                <View style={styles.imageFallback}>
                  <Text style={styles.imageFallbackLabel}>FOTO</Text>
                </View>
              )}
            </View>
            <View style={styles.cardBody}>
              <View style={styles.cardTop}>
                <Text numberOfLines={2} style={styles.cardTitle}>
                  {item.title}
                </Text>
                <Pressable
                  onPress={() => {
                    void toggleSave(item);
                  }}
                  style={styles.savePill}
                >
                  <Text style={styles.savePillLabel}>{item.isSaved ? 'Kayitli' : 'Kaydet'}</Text>
                </Pressable>
              </View>
              <Text numberOfLines={2} style={styles.cardMeta}>
                {[item.brand, item.model, item.package].filter(Boolean).join(' / ') || 'Paket bilgisi yok'}
              </Text>
              <Text style={styles.cardMeta}>
                {item.city}
                {item.district ? ` / ${item.district}` : ''} · {sellerTypeLabels[item.sellerType]}
              </Text>
              <View style={styles.cardBottom}>
                <Text style={styles.cardKm}>{formatKm(item.km)}</Text>
                <Text style={styles.cardPrice}>{formatPrice(item.price)}</Text>
              </View>
            </View>
          </Pressable>
        ))}

        {!loading && nextCursor ? (
          <Pressable
            disabled={loadingMore}
            onPress={() => {
              void loadFeed(false, filters);
            }}
            style={styles.loadMoreButton}
          >
            <Text style={styles.loadMoreLabel}>
              {loadingMore ? 'Yukleniyor...' : 'Daha fazla ilan'}
            </Text>
          </Pressable>
        ) : null}
      </ScrollView>

      <Modal visible={filterModalVisible} animationType="slide" transparent>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Filtrele</Text>
            <ScrollView contentContainerStyle={styles.modalContent}>
              <TextInput
                style={styles.input}
                value={String(draftFilters.city ?? '')}
                onChangeText={(value) => patchDraft('city', value)}
                placeholder="Sehir"
                placeholderTextColor="#6d8090"
              />
              <TextInput
                style={styles.input}
                value={String(draftFilters.district ?? '')}
                onChangeText={(value) => patchDraft('district', value)}
                placeholder="Ilce"
                placeholderTextColor="#6d8090"
              />
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.choiceRow}>
                {brands.map((brand) => (
                  <Pressable
                    key={brand.id}
                    onPress={() => {
                      patchDraft('brandId', brand.id);
                      patchDraft('modelId', '');
                      patchDraft('packageId', '');
                    }}
                    style={[
                      styles.choiceChip,
                      draftFilters.brandId === brand.id ? styles.choiceChipActive : null,
                    ]}
                  >
                    <Text style={styles.choiceChipLabel}>{brand.name}</Text>
                  </Pressable>
                ))}
              </ScrollView>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.choiceRow}>
                {models.map((model) => (
                  <Pressable
                    key={model.id}
                    onPress={() => {
                      patchDraft('modelId', model.id);
                      patchDraft('packageId', '');
                    }}
                    style={[
                      styles.choiceChip,
                      draftFilters.modelId === model.id ? styles.choiceChipActive : null,
                    ]}
                  >
                    <Text style={styles.choiceChipLabel}>{model.name}</Text>
                  </Pressable>
                ))}
              </ScrollView>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.choiceRow}>
                {packages.map((item) => (
                  <Pressable
                    key={item.id}
                    onPress={() => patchDraft('packageId', item.id)}
                    style={[
                      styles.choiceChip,
                      draftFilters.packageId === item.id ? styles.choiceChipActive : null,
                    ]}
                  >
                    <Text style={styles.choiceChipLabel}>{item.name}</Text>
                  </Pressable>
                ))}
              </ScrollView>

              <TextInput
                style={styles.input}
                value={draftFilters.minPrice ? String(draftFilters.minPrice) : ''}
                onChangeText={(value) => patchDraft('minPrice', value ? Number(value) : undefined)}
                placeholder="Min fiyat"
                keyboardType="numeric"
                placeholderTextColor="#6d8090"
              />
              <TextInput
                style={styles.input}
                value={draftFilters.maxPrice ? String(draftFilters.maxPrice) : ''}
                onChangeText={(value) => patchDraft('maxPrice', value ? Number(value) : undefined)}
                placeholder="Max fiyat"
                keyboardType="numeric"
                placeholderTextColor="#6d8090"
              />
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.choiceRow}>
                {Object.values(SellerType).map((sellerType) => (
                  <Pressable
                    key={sellerType}
                    onPress={() => patchDraft('sellerType', sellerType)}
                    style={[
                      styles.choiceChip,
                      draftFilters.sellerType === sellerType ? styles.choiceChipActive : null,
                    ]}
                  >
                    <Text style={styles.choiceChipLabel}>{sellerTypeLabels[sellerType]}</Text>
                  </Pressable>
                ))}
              </ScrollView>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.choiceRow}>
                {Object.values(FuelType).map((fuelType) => (
                  <Pressable
                    key={fuelType}
                    onPress={() => patchDraft('fuelType', fuelType)}
                    style={[
                      styles.choiceChip,
                      draftFilters.fuelType === fuelType ? styles.choiceChipActive : null,
                    ]}
                  >
                    <Text style={styles.choiceChipLabel}>{fuelTypeLabels[fuelType]}</Text>
                  </Pressable>
                ))}
              </ScrollView>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.choiceRow}>
                {Object.values(TransmissionType).map((transmissionType) => (
                  <Pressable
                    key={transmissionType}
                    onPress={() => patchDraft('transmissionType', transmissionType)}
                    style={[
                      styles.choiceChip,
                      draftFilters.transmissionType === transmissionType ? styles.choiceChipActive : null,
                    ]}
                  >
                    <Text style={styles.choiceChipLabel}>{transmissionLabels[transmissionType]}</Text>
                  </Pressable>
                ))}
              </ScrollView>
            </ScrollView>

            <View style={styles.modalActions}>
              <Pressable
                onPress={() => {
                  setDraftFilters(initialFilters);
                  setFilters(initialFilters);
                  setFilterModalVisible(false);
                }}
                style={styles.modalSecondary}
              >
                <Text style={styles.modalSecondaryLabel}>Temizle</Text>
              </Pressable>
              <Pressable
                onPress={() => {
                  setFilters(draftFilters);
                  setFilterModalVisible(false);
                }}
                style={styles.modalPrimary}
              >
                <Text style={styles.modalPrimaryLabel}>Uygula</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </MobileShell>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
  },
  content: {
    gap: 14,
    paddingBottom: 10,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  filterButton: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 18,
    backgroundColor: '#ef8354',
  },
  filterButtonLabel: {
    color: '#08131d',
    fontWeight: '800',
  },
  metaText: {
    color: '#9cb0be',
  },
  banner: {
    borderRadius: 18,
    padding: 14,
  },
  noticeBanner: {
    backgroundColor: 'rgba(255,255,255,0.07)',
  },
  errorBanner: {
    backgroundColor: 'rgba(216,82,82,0.2)',
  },
  bannerText: {
    color: '#f8f2ea',
    lineHeight: 20,
  },
  loadingCard: {
    paddingVertical: 28,
    alignItems: 'center',
    gap: 10,
    borderRadius: 24,
    backgroundColor: '#0e1f2d',
  },
  loadingText: {
    color: '#d1dce5',
  },
  emptyCard: {
    padding: 22,
    borderRadius: 24,
    backgroundColor: '#102030',
    gap: 8,
  },
  emptyTitle: {
    color: '#f8f2ea',
    fontSize: 20,
    fontWeight: '800',
  },
  emptyCopy: {
    color: '#afbdc8',
  },
  card: {
    flexDirection: 'row',
    gap: 14,
    padding: 14,
    borderRadius: 24,
    backgroundColor: '#0d1d2a',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  imageWrap: {
    width: 108,
    aspectRatio: 1,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: '#08131d',
  },
  cardImage: {
    width: '100%',
    height: '100%',
  },
  imageFallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  imageFallbackLabel: {
    color: '#ffd6c2',
    fontWeight: '800',
    letterSpacing: 1.8,
  },
  cardBody: {
    flex: 1,
    gap: 8,
  },
  cardTop: {
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'space-between',
  },
  cardTitle: {
    flex: 1,
    color: '#f8f2ea',
    fontSize: 16,
    fontWeight: '800',
    lineHeight: 22,
  },
  savePill: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 14,
    backgroundColor: '#142636',
  },
  savePillLabel: {
    color: '#ffd6c2',
    fontSize: 12,
    fontWeight: '800',
  },
  cardMeta: {
    color: '#9cb0be',
    lineHeight: 19,
  },
  cardBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginTop: 4,
  },
  cardKm: {
    color: '#d6e1e8',
    fontWeight: '700',
  },
  cardPrice: {
    color: '#f8f2ea',
    fontWeight: '800',
    fontSize: 18,
  },
  loadMoreButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    borderRadius: 20,
    backgroundColor: '#ef8354',
  },
  loadMoreLabel: {
    color: '#08131d',
    fontWeight: '800',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(4,10,16,0.72)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    maxHeight: '88%',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 18,
    gap: 16,
    backgroundColor: '#0d1d2a',
  },
  modalTitle: {
    color: '#f8f2ea',
    fontSize: 22,
    fontWeight: '800',
  },
  modalContent: {
    gap: 12,
    paddingBottom: 8,
  },
  input: {
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 13,
    color: '#f8f2ea',
    backgroundColor: '#08131d',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  choiceRow: {
    gap: 10,
  },
  choiceChip: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 16,
    backgroundColor: '#142636',
  },
  choiceChipActive: {
    backgroundColor: 'rgba(239,131,84,0.2)',
  },
  choiceChipLabel: {
    color: '#f8f2ea',
    fontWeight: '700',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 10,
  },
  modalPrimary: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 18,
    backgroundColor: '#ef8354',
  },
  modalPrimaryLabel: {
    color: '#08131d',
    fontWeight: '800',
  },
  modalSecondary: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 18,
    backgroundColor: '#142636',
  },
  modalSecondaryLabel: {
    color: '#ffd6c2',
    fontWeight: '800',
  },
});
