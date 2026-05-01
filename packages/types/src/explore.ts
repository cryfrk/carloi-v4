import type { FuelType, MediaType, TransmissionType, VehicleEquipmentCategory } from './enums';

export interface ExploreVehicleOwner {
  id: string;
  username: string;
  fullName: string;
  avatarUrl: string | null;
  blueVerified: boolean;
  goldVerified: boolean;
}

export interface ExploreVehicleMediaItem {
  id: string;
  url: string;
  mediaType: MediaType;
  sortOrder: number;
}

export interface ExploreVehicleItem {
  id: string;
  firstMediaUrl: string | null;
  media: ExploreVehicleMediaItem[];
  owner: ExploreVehicleOwner;
  city: string | null;
  brand: string;
  model: string;
  package: string | null;
  year: number;
  fuelType: FuelType;
  transmissionType: TransmissionType;
  km: number;
  bodyType: string | null;
  engineVolume: number | null;
  enginePower: number | null;
  description: string | null;
  equipmentNotes: string | null;
  standardEquipment: Array<{
    category: VehicleEquipmentCategory;
    items: Array<{
      id: string;
      name: string;
      isStandard: boolean;
      manualReviewNeeded: boolean;
    }>;
  }>;
  extraEquipment: Array<{
    id: string;
    category: VehicleEquipmentCategory | null;
    name: string;
    note: string | null;
    isStandard: false;
    manualReviewNeeded: false;
  }>;
  showInExplore: boolean;
  openToOffers: boolean;
}

export interface ExploreFeedResponse {
  items: ExploreVehicleItem[];
  nextCursor: string | null;
}

export type VehicleShowcaseDetailResponse = ExploreVehicleItem;
