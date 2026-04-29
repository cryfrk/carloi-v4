import { Injectable } from '@nestjs/common';
import {
  type EidsVerificationPayload,
  type EidsVerificationProvider,
} from './eids-verification.provider';

function normalizeHumanName(value: string) {
  return value
    .trim()
    .toLocaleUpperCase('tr-TR')
    .replace(/\s+/g, ' ');
}

function normalizeIdentityNo(value?: string | null) {
  return value?.replace(/\D/g, '') || null;
}

@Injectable()
export class MockEidsVerificationProvider implements EidsVerificationProvider {
  async verify(payload: EidsVerificationPayload) {
    const normalizedUserName = normalizeHumanName(payload.userFullName);
    const normalizedOwnerName = normalizeHumanName(
      `${payload.licenseInfo.ownerFirstName} ${payload.licenseInfo.ownerLastName}`,
    );
    const userTcIdentityNo = normalizeIdentityNo(payload.userTcIdentityNo);
    const ownerTcIdentityNo = normalizeIdentityNo(payload.licenseInfo.ownerTcIdentityNo);
    const nameMatches = normalizedUserName === normalizedOwnerName;
    const tcMatches = ownerTcIdentityNo ? ownerTcIdentityNo === userTcIdentityNo : true;
    const isMatch = nameMatches && tcMatches;

    return {
      isMatch,
      requiresManualApproval: !isMatch,
      reason: isMatch ? 'mock-eids-match' : 'mock-eids-owner-mismatch',
      normalizedOwnerName,
    };
  }
}
