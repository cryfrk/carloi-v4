import type {
  AdminRole,
  InsuranceRequestStatus,
  PaymentStatus,
} from './enums';

export interface InsuranceParticipantSummary {
  id: string;
  username: string;
  fullName: string;
  email: string | null;
  phoneMasked: string | null;
  avatarUrl: string | null;
}

export interface InsuranceListingSummary {
  id: string;
  listingNo: string;
  title: string;
  city: string;
  district: string | null;
  price: number;
  currency: string;
  firstMediaUrl: string | null;
}

export interface InsuranceVehicleSummary {
  brand: string | null;
  model: string | null;
  package: string | null;
  year: number | null;
  fuelType: string | null;
  transmissionType: string | null;
  km: number | null;
  bodyType: string | null;
}

export interface InsuranceLicenseInfo {
  ownerName: string | null;
  maskedTcNo: string | null;
  maskedPlate: string | null;
}

export interface InsuranceOfferSummary {
  id: string;
  amount: number;
  currency: string;
  offerFileUrl: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
  admin: {
    id: string;
    username: string;
    role: AdminRole;
  };
}

export interface InsurancePaymentSummary {
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
}

export interface InsuranceDocumentSummary {
  id: string;
  documentType: string;
  fileUrl: string | null;
  createdAt: string;
}

export interface InsuranceRequestView {
  id: string;
  status: InsuranceRequestStatus;
  createdAt: string;
  updatedAt: string;
  sourceThreadId: string | null;
  buyer: InsuranceParticipantSummary;
  seller: InsuranceParticipantSummary;
  listing: InsuranceListingSummary;
  vehicle: InsuranceVehicleSummary;
  licenseInfo: InsuranceLicenseInfo;
  currentOffer: InsuranceOfferSummary | null;
  offers?: InsuranceOfferSummary[];
  payment: InsurancePaymentSummary | null;
  documents: InsuranceDocumentSummary[];
}

export interface InsuranceRequestsResponse {
  items: InsuranceRequestView[];
}

export interface CreateInsuranceOfferRequest {
  amount: number;
  currency?: string;
  offerFileUrl?: string;
  offerFileMediaAssetId?: string;
}

export interface UpdateInsuranceOfferStatusRequest {
  status: string;
}

export interface UploadInsuranceDocumentsRequest {
  policyDocumentUrl?: string;
  invoiceDocumentUrl?: string;
  policyDocumentMediaAssetId?: string;
  invoiceDocumentMediaAssetId?: string;
}

export interface InsuranceOfferActionResponse {
  success: true;
  requestId: string;
  offerId: string;
  status?: string;
  paymentId?: string;
  paymentStatus?: PaymentStatus;
  insuranceRequestStatus?: InsuranceRequestStatus;
}

export interface InsuranceDocumentsResponse {
  requestId: string;
  documents: Array<{
    id: string;
    documentType: string;
    fileUrl: string;
    createdAt: string;
  }>;
}
