import type {
  FuelType,
  ListingStatus,
  MediaType,
  SellerType,
  TransmissionType,
} from './enums';

export interface MutualFollowerSummary {
  id: string;
  username: string;
  avatarUrl: string | null;
}

export interface ProfileDetailResponse {
  id: string;
  avatarUrl: string | null;
  firstName: string;
  lastName: string;
  username: string;
  bio: string | null;
  bioMentions: string[];
  websiteUrl: string | null;
  locationText: string | null;
  blueVerified: boolean;
  goldVerified: boolean;
  postCount: number;
  listingCount: number;
  vehicleCount: number;
  followerCount: number;
  followingCount: number;
  isFollowing: boolean;
  isOwnProfile: boolean;
  isPrivate: boolean;
  canViewContent: boolean;
  mutualFollowers: MutualFollowerSummary[];
}

export interface ProfilePostGridItem {
  id: string;
  thumbnailUrl: string | null;
  mediaType: MediaType;
  likeCount: number;
  commentCount: number;
  createdAt: string;
}

export interface ProfilePostsResponse {
  items: ProfilePostGridItem[];
  hiddenByPrivacy: boolean;
}

export interface ProfileListingItem {
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
  listingStatus: ListingStatus;
  createdAt: string;
}

export interface ProfileListingsResponse {
  items: ProfileListingItem[];
  hiddenByPrivacy: boolean;
}

export interface ProfileVehicleMediaItem {
  id: string;
  url: string;
  mediaType: MediaType;
  sortOrder: number;
}

export interface ProfileVehicleItem {
  id: string;
  firstMediaUrl: string | null;
  media: ProfileVehicleMediaItem[];
  brand: string;
  model: string;
  package: string | null;
  plateNumberMasked: string;
  year: number;
  km: number;
  isPublic: boolean;
  color: string | null;
  fuelType: FuelType;
  transmissionType: TransmissionType;
  bodyType: string | null;
  engineVolume: number | null;
  enginePower: number | null;
  enginePowerHp: number | null;
  engineVolumeCc: number | null;
  tractionType: string | null;
  description: string | null;
  equipmentNotes: string | null;
  showInExplore: boolean;
  openToOffers: boolean;
}

export interface ProfileVehiclesResponse {
  items: ProfileVehicleItem[];
  hiddenByPrivacy: boolean;
  hiddenByProfile: boolean;
}
