import { FuelType, ListingSortOption, SellerType, TransmissionType, VehicleCatalogType } from './enums';

export const LISTING_VEHICLE_TYPE_OPTIONS: Array<{ value: VehicleCatalogType; label: string }> = [
  { value: VehicleCatalogType.CAR, label: 'Otomobil' },
  { value: VehicleCatalogType.MOTORCYCLE, label: 'Motosiklet' },
  { value: VehicleCatalogType.COMMERCIAL, label: 'Hafif Ticari' },
];

export const LISTING_SORT_LABELS: Record<ListingSortOption, string> = {
  [ListingSortOption.NEWEST]: 'En yeni',
  [ListingSortOption.PRICE_ASC]: 'Fiyat artan',
  [ListingSortOption.PRICE_DESC]: 'Fiyat azalan',
  [ListingSortOption.KM_ASC]: 'KM dusuk',
  [ListingSortOption.YEAR_DESC]: 'Yil yeni',
};

export const LISTING_BODY_TYPE_OPTIONS = [
  'Sedan',
  'SUV',
  'Hatchback',
  'Coupe',
  'Pickup',
  'Van',
  'Station Wagon',
  'Crossover',
  'Cabrio',
] as const;

export const LISTING_COLOR_OPTIONS = [
  'Beyaz',
  'Siyah',
  'Gri',
  'Gumus',
  'Kirmizi',
  'Mavi',
  'Yesil',
  'Kahverengi',
  'Bej',
  'Sari',
  'Turuncu',
  'Mor',
] as const;

export const LISTING_SELLER_OPTIONS: Array<{ value: SellerType; label: string }> = [
  { value: SellerType.OWNER, label: 'Bireysel' },
  { value: SellerType.DEALER, label: 'Galeri / Ticari' },
];

export const LISTING_FUEL_OPTIONS = Object.values(FuelType);
export const LISTING_TRANSMISSION_OPTIONS = Object.values(TransmissionType);
