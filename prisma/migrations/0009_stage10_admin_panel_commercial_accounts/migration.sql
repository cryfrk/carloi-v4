ALTER TYPE "ListingStatus" ADD VALUE 'SUSPENDED';
ALTER TYPE "ListingStatus" ADD VALUE 'DELETED';

ALTER TABLE "User"
  ADD COLUMN "isActive" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "disabledAt" TIMESTAMP(3);

ALTER TABLE "CommercialApplication"
  ADD COLUMN "taxDocumentUrl" TEXT,
  ADD COLUMN "otherDocumentUrls" JSONB,
  ADD COLUMN "rejectionReason" TEXT;

ALTER TABLE "Listing"
  ADD COLUMN "suspensionReason" TEXT;

CREATE INDEX "User_isActive_deletedAt_idx" ON "User"("isActive", "deletedAt");
CREATE INDEX "CommercialApplication_userId_status_idx" ON "CommercialApplication"("userId", "status");
