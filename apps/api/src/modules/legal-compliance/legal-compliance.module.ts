import { Module } from '@nestjs/common';
import { PrismaModule } from '../../common/prisma/prisma.module';
import { LegalComplianceService } from './legal-compliance.service';
import { EIDS_VERIFICATION_PROVIDER } from './providers/eids-verification.provider';
import { MockEidsVerificationProvider } from './providers/mock-eids-verification.provider';

@Module({
  imports: [PrismaModule],
  providers: [
    LegalComplianceService,
    MockEidsVerificationProvider,
    {
      provide: EIDS_VERIFICATION_PROVIDER,
      useExisting: MockEidsVerificationProvider,
    },
  ],
  exports: [LegalComplianceService, EIDS_VERIFICATION_PROVIDER],
})
export class LegalComplianceModule {}
