ALTER TYPE "FuelType" ADD VALUE IF NOT EXISTS 'UNKNOWN';
ALTER TYPE "TransmissionType" ADD VALUE IF NOT EXISTS 'UNKNOWN';

DO $$
BEGIN
  CREATE TYPE "VehicleCatalogSpecSource" AS ENUM ('MANUAL_SEED', 'CARLOI_SEED', 'CARLOI_PHASE3_SEED');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "VehicleSpec"
  ADD COLUMN IF NOT EXISTS "engineName" TEXT,
  ADD COLUMN IF NOT EXISTS "torqueNm" INTEGER,
  ADD COLUMN IF NOT EXISTS "source" "VehicleCatalogSpecSource" NOT NULL DEFAULT 'CARLOI_SEED',
  ADD COLUMN IF NOT EXISTS "manualReviewNeeded" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "isActive" BOOLEAN NOT NULL DEFAULT true;

DROP INDEX IF EXISTS "VehicleSpec_packageId_key";

CREATE UNIQUE INDEX IF NOT EXISTS "VehicleSpec_package_year_engine_fuel_transmission_key"
  ON "VehicleSpec"("packageId", "year", "engineName", "fuelType", "transmissionType");

CREATE INDEX IF NOT EXISTS "VehicleSpec_packageId_year_isActive_idx"
  ON "VehicleSpec"("packageId", "year", "isActive");
