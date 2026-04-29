import type { CommercialApplicationStatus, UserType } from './enums';
import type { FeedPost } from './social';
import type { ProfileListingItem } from './profiles';

export interface SettingsMeResponse {
  profile: {
    avatarUrl: string | null;
    firstName: string;
    lastName: string;
    username: string;
    email: string | null;
    phone: string | null;
    bio: string | null;
    websiteUrl: string | null;
    locationText: string | null;
    blueVerified: boolean;
    goldVerified: boolean;
  };
  privacy: {
    isPrivate: boolean;
    showGarageVehicles: boolean;
  };
  accountCenter: {
    userType: UserType;
    isVerified: boolean;
    isCommercialApproved: boolean;
    activeSessionCount: number;
    savedPostsCount: number;
    savedListingsCount: number;
  };
  commercialApplication: {
    id: string;
    status: CommercialApplicationStatus;
    companyName: string;
    taxNumberMasked: string;
    submittedAt: string;
    reviewedAt: string | null;
    rejectionReason: string | null;
  } | null;
}

export interface UpdateProfileRequest {
  avatarUrl?: string;
  avatarMediaAssetId?: string;
  firstName?: string;
  lastName?: string;
  username?: string;
  bio?: string;
  websiteUrl?: string;
  locationText?: string;
}

export interface UpdatePrivacyRequest {
  isPrivate?: boolean;
  showGarageVehicles?: boolean;
}

export interface UpdatePrivacyResponse {
  success: true;
  privacy: {
    isPrivate: boolean;
    showGarageVehicles: boolean;
  };
}

export interface ChangePasswordRequest {
  oldPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export interface SavedItemsResponse {
  savedPosts: Array<{
    savedAt: string;
    post: FeedPost;
  }>;
  savedListings: Array<{
    savedAt: string;
    listing: ProfileListingItem;
  }>;
}
