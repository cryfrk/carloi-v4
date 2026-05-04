import type {
  DamageStatus,
  FuelType,
  ListingSortOption,
  ListingStatus,
  SellerType,
  TransmissionType,
  VehicleCatalogPackageSource,
  VehicleCatalogEquipmentSource,
  VehicleCatalogSpecSource,
  VehicleCatalogSource,
  VehicleEquipmentCategory,
  VehicleCatalogType,
} from './enums';

export const VEHICLE_DAMAGE_PARTS = [
  'on tampon',
  'arka tampon',
  'kaput',
  'sag on camurluk',
  'sol on camurluk',
  'sol on kapi',
  'sol arka kapi',
  'sol arka camurluk',
  'bagaj kapagi',
  'sag arka camurluk',
  'sag arka kapi',
  'sag on kapi',
  'tavan',
] as const;

export type VehicleDamagePartName = (typeof VEHICLE_DAMAGE_PARTS)[number];

export interface ListingMediaInput {
  url: string;
  mediaType?: 'IMAGE' | 'VIDEO';
  mediaAssetId?: string;
}

export interface ListingDamagePartInput {
  partName: VehicleDamagePartName;
  damageStatus: DamageStatus;
}

export interface ListingLicenseInfoInput {
  plateNumber: string;
  ownerFirstName: string;
  ownerLastName: string;
  ownerTcIdentityNo?: string;
}

export interface CreateListingRequest {
  garageVehicleId: string;
  title: string;
  description: string;
  price: number;
  currency: string;
  city: string;
  district?: string;
  sellerType: SellerType;
  tradeAvailable?: boolean;
  media: ListingMediaInput[];
  damageParts?: ListingDamagePartInput[];
  licenseInfo: ListingLicenseInfoInput;
  contactPhone?: string;
  showPhone?: boolean;
}

export interface UpdateListingRequest {
  title?: string;
  description?: string;
  price?: number;
  currency?: string;
  city?: string;
  district?: string;
  tradeAvailable?: boolean;
  media?: ListingMediaInput[];
  damageParts?: ListingDamagePartInput[];
  contactPhone?: string;
  showPhone?: boolean;
}

export interface ListingFeedQuery {
  q?: string;
  cities?: string[];
  districts?: string[];
  vehicleType?: VehicleCatalogType;
  brandId?: string;
  modelId?: string;
  packageId?: string;
  minPrice?: number;
  maxPrice?: number;
  minYear?: number;
  maxYear?: number;
  minKm?: number;
  maxKm?: number;
  fuelTypes?: FuelType[];
  transmissionTypes?: TransmissionType[];
  bodyTypes?: string[];
  colors?: string[];
  sellerTypes?: SellerType[];
  onlyVerifiedSeller?: boolean;
  noPaint?: boolean;
  noChangedParts?: boolean;
  noHeavyDamage?: boolean;
  tradeAvailable?: boolean;
  guaranteed?: boolean;
  sort?: ListingSortOption;
  city?: string;
  district?: string;
  sellerType?: SellerType;
  fuelType?: FuelType;
  transmissionType?: TransmissionType;
  bodyType?: string;
  yearMin?: number;
  yearMax?: number;
  limit?: number;
  cursor?: string;
}

export interface ListingFeedItem {
  listingId: string;
  listingNo: string;
  firstMediaUrl: string | null;
  title: string;
  brand: string | null;
  model: string | null;
  package: string | null;
  city: string;
  district: string | null;
  price: number;
  year: number | null;
  km: number | null;
  fuelType: FuelType | null;
  transmissionType: TransmissionType | null;
  bodyType: string | null;
  color: string | null;
  sellerType: SellerType;
  tradeAvailable: boolean;
  isVerifiedSeller: boolean;
  isSaved: boolean;
}

export interface ListingFeedResponse {
  items: ListingFeedItem[];
  nextCursor: string | null;
  totalCount: number;
}

export interface ListingFeedCountResponse {
  count: number;
}

export interface ListingOwnerProfile {
  id: string;
  username: string;
  fullName: string;
  avatarUrl: string | null;
  blueVerified: boolean;
  goldVerified: boolean;
}

export interface VehiclePackageSpec {
  id: string;
  packageId: string | null;
  year: number | null;
  bodyType: string | null;
  engineName: string | null;
  engineVolume: number | null;
  enginePower: number | null;
  engineVolumeCc: number | null;
  enginePowerHp: number | null;
  torqueNm: number | null;
  tractionType: string | null;
  fuelType: FuelType | null;
  transmissionType: TransmissionType | null;
  source: VehicleCatalogSpecSource | null;
  manualReviewNeeded: boolean;
  isActive: boolean;
  equipmentSummary: string | null;
  multimediaSummary: string | null;
  interiorSummary: string | null;
  exteriorSummary: string | null;
}

export interface ListingDetailResponse {
  id: string;
  listingNo: string;
  title: string;
  description: string;
  listingStatus: ListingStatus;
  price: number;
  currency: string;
  city: string;
  district: string | null;
  createdAt: string;
  tradeAvailable: boolean;
  sellerType: SellerType;
  plateMasked: string | null;
  contactPhone: string | null;
  showPhone: boolean;
  isSaved: boolean;
  owner: ListingOwnerProfile;
  media: Array<{
    id: string;
    url: string;
    mediaType: 'IMAGE' | 'VIDEO';
    sortOrder: number;
  }>;
  vehicle: {
    garageVehicleId: string | null;
    brand: string | null;
    model: string | null;
    package: string | null;
    year: number | null;
    fuelType: FuelType | null;
    transmissionType: TransmissionType | null;
    km: number | null;
    bodyType: string | null;
    enginePower: number | null;
    engineVolume: number | null;
    enginePowerHp: number | null;
    engineVolumeCc: number | null;
    tractionType: string | null;
    color: string | null;
    guarantee: string | null;
  };
  damageParts: ListingDamagePartInput[];
  equipmentSummary: string | null;
  multimediaSummary: string | null;
  interiorSummary: string | null;
  exteriorSummary: string | null;
  contactActions: {
    canCall: boolean;
    canMessage: boolean;
    canSave: boolean;
  };
}

export interface ListingMutationResponse {
  success: true;
  listingId: string;
  listingNo: string;
  listingStatus: ListingStatus;
}

export interface ListingSaveResponse {
  success: true;
  isSaved: boolean;
}

export interface VehicleCatalogBrand {
  id: string;
  type: VehicleCatalogType;
  name: string;
  slug: string;
  logoUrl: string | null;
}

export interface VehicleCatalogTypeItem {
  key: VehicleCatalogType;
  label: string;
  description: string;
  type?: VehicleCatalogType;
}

export interface VehicleCatalogModel {
  id: string;
  name: string;
  slug?: string;
  brandId?: string;
  catalogType?: VehicleCatalogType;
  yearStart?: number | null;
  yearEnd?: number | null;
  bodyType: string | null;
  source?: VehicleCatalogSource;
  manualReviewNeeded?: boolean;
}

export interface VehicleCatalogPackage {
  id: string;
  name: string;
  slug?: string;
  modelId?: string;
  yearStart: number | null;
  yearEnd: number | null;
  marketRegion?: string | null;
  source?: VehicleCatalogPackageSource;
  manualReviewNeeded?: boolean;
}

export interface VehicleCatalogSpecOption {
  id: string;
  year: number | null;
  bodyType: string | null;
  engineName: string | null;
  engineVolume: number | null;
  enginePower: number | null;
  engineVolumeCc: number | null;
  enginePowerHp: number | null;
  torqueNm: number | null;
  fuelType: FuelType | null;
  transmissionType: TransmissionType | null;
  tractionType: string | null;
  source: VehicleCatalogSpecSource | null;
  manualReviewNeeded: boolean;
  isActive: boolean;
  equipmentSummary: string | null;
}

export interface VehicleCatalogSpecsResponse {
  availableYears: number[];
  engineOptions: Array<{
    id: string;
    label: string;
    year: number | null;
    engineName?: string | null;
    engineVolume: number | null;
    enginePower: number | null;
  }>;
  fuelTypes: FuelType[];
  transmissionTypes: TransmissionType[];
  specs: VehicleCatalogSpecOption[];
}

export interface VehicleCatalogEquipmentResponse {
  packageId: string;
  groups: Array<{
    category: VehicleEquipmentCategory;
    items: Array<{
      id: string;
      name: string;
      isStandard: boolean;
      manualReviewNeeded: boolean;
      source: VehicleCatalogEquipmentSource | null;
    }>;
  }>;
}




