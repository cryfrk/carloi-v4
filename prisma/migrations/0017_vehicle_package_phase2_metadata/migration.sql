CREATE TYPE "VehicleCatalogPackageSource" AS ENUM ('MANUAL_SEED', 'CARLOI_SEED', 'CARLOI_PHASE2_SEED');

ALTER TABLE "VehiclePackage"
ADD COLUMN "marketRegion" TEXT DEFAULT 'TR',
ADD COLUMN "source" "VehicleCatalogPackageSource" NOT NULL DEFAULT 'CARLOI_SEED',
ADD COLUMN "manualReviewNeeded" BOOLEAN NOT NULL DEFAULT false;

DROP INDEX IF EXISTS "VehiclePackage_modelId_isActive_yearStart_yearEnd_idx";
CREATE INDEX "VehiclePackage_modelId_isActive_yearStart_yearEnd_marketRegion_idx"
ON "VehiclePackage"("modelId", "isActive", "yearStart", "yearEnd", "marketRegion");
