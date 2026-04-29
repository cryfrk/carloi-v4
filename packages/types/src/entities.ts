import {
  AdminRole,
  CommercialApplicationStatus,
  FuelType,
  InsuranceRequestStatus,
  ListingStatus,
  PaymentStatus,
  TransmissionType,
  UserType,
  VehicleType,
} from './enums';

export interface BaseEntity {
  id: string;
  createdAt: string;
  updatedAt: string;
}

export interface UserSummary extends BaseEntity {
  email?: string | null;
  phone?: string | null;
  username: string;
  userType: UserType;
}

export interface ProfileSummary extends BaseEntity {
  userId: string;
  avatarUrl?: string | null;
  bio?: string | null;
  websiteUrl?: string | null;
  locationText?: string | null;
}

export interface ListingSummary extends BaseEntity {
  sellerId: string;
  title: string;
  price: number;
  status: ListingStatus;
}

export interface VehicleSummary extends BaseEntity {
  brandText?: string | null;
  modelText?: string | null;
  year?: number | null;
  vehicleType?: VehicleType | null;
  fuelType?: FuelType | null;
  transmissionType?: TransmissionType | null;
}

export interface PaymentSummary extends BaseEntity {
  userId: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
}

export interface InsuranceRequestSummary extends BaseEntity {
  buyerId: string;
  sellerId: string;
  status: InsuranceRequestStatus;
}

export interface CommercialApplicationSummary extends BaseEntity {
  userId: string;
  companyName: string;
  status: CommercialApplicationStatus;
}

export interface AdminUserSummary extends BaseEntity {
  username: string;
  role: AdminRole;
}
