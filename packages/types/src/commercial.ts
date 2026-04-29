import type { AdminRole, CommercialApplicationStatus, UserType } from './enums';

export interface CommercialApplicationUserSummary {
  id: string;
  username: string;
  fullName: string;
  email: string | null;
  phone: string | null;
  userType: UserType;
  isVerified: boolean;
  isCommercialApproved: boolean;
  maskedTcIdentityNo: string | null;
}

export interface CommercialApplicationReviewerSummary {
  id: string;
  username: string;
  role: AdminRole;
}

export interface CommercialApplicationView {
  id: string;
  status: CommercialApplicationStatus;
  companyName: string;
  taxNumber: string;
  taxDocumentUrl: string | null;
  otherDocumentUrls: string[];
  notes: string | null;
  rejectionReason: string | null;
  submittedAt: string;
  reviewedAt: string | null;
  createdAt: string;
  updatedAt: string;
  user: CommercialApplicationUserSummary;
  reviewer: CommercialApplicationReviewerSummary | null;
}

export interface CommercialApplicationsResponse {
  items: CommercialApplicationView[];
}

export interface CommercialApplicationResponse {
  application: CommercialApplicationView | null;
}

export interface SubmitCommercialApplicationRequest {
  companyTitle: string;
  taxNumber: string;
  tcIdentityNo: string;
  taxDocumentUrl?: string;
  taxDocumentMediaAssetId?: string;
  otherDocumentUrls?: Array<{
    url: string;
  }>;
  notes?: string;
}

export interface SubmitCommercialApplicationResponse {
  success: true;
  application: CommercialApplicationView;
}

export interface RejectCommercialApplicationRequest {
  rejectionReason: string;
}
