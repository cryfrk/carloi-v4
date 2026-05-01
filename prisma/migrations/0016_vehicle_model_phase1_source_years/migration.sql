CREATE TYPE "VehicleCatalogSource" AS ENUM ('MANUAL_SEED', 'CARLOI_SEED');

ALTER TABLE "VehicleModel"
ADD COLUMN "yearStart" INTEGER,
ADD COLUMN "yearEnd" INTEGER,
ADD COLUMN "source" "VehicleCatalogSource" NOT NULL DEFAULT 'CARLOI_SEED',
ADD COLUMN "manualReviewNeeded" BOOLEAN NOT NULL DEFAULT false;

DROP INDEX IF EXISTS "VehicleModel_brandId_catalogType_isActive_idx";
CREATE INDEX "VehicleModel_brandId_catalogType_isActive_yearStart_yearEnd_idx"
ON "VehicleModel"("brandId", "catalogType", "isActive", "yearStart", "yearEnd");
