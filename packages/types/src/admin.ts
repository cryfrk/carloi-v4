import type {
  AdminRole,
  CommercialApplicationStatus,
  ListingStatus,
  PaymentStatus,
  SellerType,
  UserType,
} from './enums';

export interface AdminAuthUser {
  id: string;
  username: string;
  role: AdminRole;
  isActive: boolean;
}

export interface AdminAuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface AdminLoginRequest {
  username: string;
  password: string;
}

export interface AdminLoginResponse extends AdminAuthTokens {
  admin: AdminAuthUser;
}

export interface AdminRefreshRequest {
  refreshToken: string;
}

export interface AdminRefreshResponse extends AdminAuthTokens {
  admin: AdminAuthUser;
}

export interface AdminLogoutRequest {
  refreshToken: string;
}

export interface AdminMeResponse {
  admin: AdminAuthUser;
}

export interface AdminDashboardMetric {
  key: string;
  label: string;
  value: number | string;
}

export interface AdminAuditLogItem {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  metadata: unknown;
  createdAt: string;
  actor: {
    type: 'ADMIN' | 'USER';
    id: string;
    username: string;
    role: AdminRole | null;
  } | null;
}

export interface AdminDashboardResponse {
  role: AdminRole;
  metrics: AdminDashboardMetric[];
  recentAuditLogs?: AdminAuditLogItem[];
}

export interface AdminUserListItem {
  id: string;
  username: string;
  fullName: string;
  email: string | null;
  phone: string | null;
  userType: UserType;
  isVerified: boolean;
  isCommercialApproved: boolean;
  isActive: boolean;
  avatarUrl: string | null;
  blueVerified: boolean;
  goldVerified: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AdminUsersResponse {
  items: AdminUserListItem[];
}

export interface AdminUserDetail {
  id: string;
  username: string;
  fullName: string;
  email: string | null;
  phone: string | null;
  userType: UserType;
  tcIdentityNoMasked: string | null;
  isVerified: boolean;
  isCommercialApproved: boolean;
  isActive: boolean;
  disabledAt: string | null;
  createdAt: string;
  updatedAt: string;
  profile: {
    avatarUrl: string | null;
    bio: string | null;
    locationText: string | null;
    isPrivate: boolean;
    showGarageVehicles: boolean;
    blueVerified: boolean;
    goldVerified: boolean;
  } | null;
  commercialApplications: Array<{
    id: string;
    status: CommercialApplicationStatus;
    companyName: string;
    taxNumberMasked: string;
    submittedAt: string;
    reviewedAt: string | null;
    rejectionReason: string | null;
    reviewer: {
      id: string;
      username: string;
      role: AdminRole;
    } | null;
  }>;
  recentListings: Array<{
    id: string;
    title: string;
    listingNo: string;
    listingStatus: ListingStatus;
    createdAt: string;
  }>;
}

export interface UpdateAdminUserStatusRequest {
  isActive: boolean;
}

export interface AdminListingListItem {
  id: string;
  listingNo: string;
  title: string;
  listingStatus: ListingStatus;
  sellerType: SellerType;
  price: number;
  currency: string;
  city: string;
  district: string | null;
  suspensionReason: string | null;
  firstMediaUrl: string | null;
  seller: {
    id: string;
    username: string;
    fullName: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface AdminListingsResponse {
  items: AdminListingListItem[];
}

export interface AdminListingDetail {
  id: string;
  listingNo: string;
  title: string;
  description: string;
  listingStatus: ListingStatus;
  sellerType: SellerType;
  price: number;
  currency: string;
  city: string;
  district: string | null;
  contactPhone: string | null;
  showPhone: boolean;
  tradeAvailable: boolean;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  suspensionReason: string | null;
  ownerAuthorizationRequired: boolean;
  isLicenseVerified: boolean;
  seller: {
    id: string;
    username: string;
    fullName: string;
    email: string | null;
    phone: string | null;
    userType: UserType;
  };
  vehicle: {
    brand: string | null;
    model: string | null;
    package: string | null;
    year: number | null;
    km: number | null;
    fuelType: string | null;
    transmissionType: string | null;
    bodyType: string | null;
    color: string | null;
  };
  licenseInfo: {
    ownerName: string | null;
    maskedTcNo: string | null;
    maskedPlate: string | null;
  };
  media: Array<{
    id: string;
    url: string;
    mediaType: string;
    sortOrder: number;
  }>;
  damageParts: Array<{
    id: string;
    partName: string;
    damageStatus: string;
  }>;
  insuranceRequestCount: number;
}

export interface UpdateAdminListingStatusRequest {
  listingStatus: ListingStatus;
  reason?: string;
  note?: string;
}

export interface AdminPaymentItem {
  id: string;
  amount: number;
  currency: string;
  provider: string;
  status: PaymentStatus;
  providerTransactionId: string | null;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
  failureReason: string | null;
  metadata: unknown;
  user: {
    id: string;
    username: string;
    fullName: string;
  };
  insuranceRequest: {
    id: string;
    status: string;
    listingId: string;
    listingTitle: string;
  } | null;
}

export interface AdminPaymentsResponse {
  items: AdminPaymentItem[];
}

export interface AdminAuditLogsResponse {
  items: AdminAuditLogItem[];
}
