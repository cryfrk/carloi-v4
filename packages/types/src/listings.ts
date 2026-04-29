import type {
  DamageStatus,
  FuelType,
  ListingStatus,
  SellerType,
  TransmissionType,
} from './enums';
import type { ObdExpertiseReportSummary } from './garage';

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
  obdExpertiseReportId?: string;
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
  obdExpertiseReportId?: string;
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
  brandId?: string;
  modelId?: string;
  packageId?: string;
  minPrice?: number;
  maxPrice?: number;
  city?: string;
  district?: string;
  sellerType?: SellerType;
  minKm?: number;
  maxKm?: number;
  fuelType?: FuelType;
  transmissionType?: TransmissionType;
  bodyType?: string;
  yearMin?: number;
  yearMax?: number;
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
  km: number | null;
  sellerType: SellerType;
  isSaved: boolean;
}

export interface ListingFeedResponse {
  items: ListingFeedItem[];
  nextCursor: string | null;
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
  bodyType: string | null;
  engineVolumeCc: number | null;
  enginePowerHp: number | null;
  tractionType: string | null;
  fuelType: FuelType | null;
  transmissionType: TransmissionType | null;
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
  expertiseSummary: string | null;
  expertiseReport: ObdExpertiseReportSummary | null;
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
  name: string;
  slug: string;
}

export interface VehicleCatalogModel {
  id: string;
  brandId: string;
  name: string;
  slug: string;
}

export interface VehicleCatalogPackage {
  id: string;
  modelId: string;
  name: string;
  slug: string;
}
