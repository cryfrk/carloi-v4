ALTER TYPE "ListingStatus" ADD VALUE IF NOT EXISTS 'PENDING_LEGAL_CHECK';

ALTER TABLE "VehicleSpec"
  ALTER COLUMN "vehicleId" DROP NOT NULL,
  ADD COLUMN "packageId" TEXT,
  ADD COLUMN "fuelType" "FuelType",
  ADD COLUMN "transmissionType" "TransmissionType",
  ADD COLUMN "equipmentSummary" TEXT,
  ADD COLUMN "multimediaSummary" TEXT,
  ADD COLUMN "interiorSummary" TEXT,
  ADD COLUMN "exteriorSummary" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "VehicleSpec_packageId_key" ON "VehicleSpec"("packageId");

ALTER TABLE "VehicleSpec"
  ADD CONSTRAINT "VehicleSpec_packageId_fkey"
  FOREIGN KEY ("packageId") REFERENCES "VehiclePackage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Listing"
  ADD COLUMN "tradeAvailable" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "contactPhone" TEXT,
  ADD COLUMN "showPhone" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "plateNumberHash" TEXT,
  ADD COLUMN "ownerAuthorizationRequired" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "deletedAt" TIMESTAMP(3);

CREATE INDEX IF NOT EXISTS "Listing_listingStatus_createdAt_idx" ON "Listing"("listingStatus", "createdAt");
CREATE INDEX IF NOT EXISTS "Listing_deletedAt_idx" ON "Listing"("deletedAt");
