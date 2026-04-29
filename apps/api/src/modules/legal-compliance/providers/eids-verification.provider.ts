export const EIDS_VERIFICATION_PROVIDER = Symbol('EIDS_VERIFICATION_PROVIDER');

export type LicenseInfoPayload = {
  plateNumber: string;
  ownerFirstName: string;
  ownerLastName: string;
  ownerTcIdentityNo?: string | null;
};

export type EidsVerificationPayload = {
  userFullName: string;
  userTcIdentityNo?: string | null;
  licenseInfo: LicenseInfoPayload;
};

export type EidsVerificationResult = {
  isMatch: boolean;
  requiresManualApproval: boolean;
  reason: string;
  normalizedOwnerName: string;
};

export interface EidsVerificationProvider {
  verify(payload: EidsVerificationPayload): Promise<EidsVerificationResult>;
}
