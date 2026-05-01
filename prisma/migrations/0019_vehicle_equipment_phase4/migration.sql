DO $$
BEGIN
  CREATE TYPE "VehicleCatalogEquipmentSource" AS ENUM ('MANUAL_SEED', 'CARLOI_SEED', 'CARLOI_PHASE4_SEED');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE "VehicleEquipmentCategory" AS ENUM (
    'SAFETY',
    'COMFORT',
    'MULTIMEDIA',
    'EXTERIOR',
    'INTERIOR',
    'DRIVING_ASSIST',
    'LIGHTING',
    'OTHER'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "VehiclePackageEquipment" (
  "id" TEXT NOT NULL,
  "packageId" TEXT NOT NULL,
  "category" "VehicleEquipmentCategory" NOT NULL,
  "name" TEXT NOT NULL,
  "isStandard" BOOLEAN NOT NULL DEFAULT true,
  "source" "VehicleCatalogEquipmentSource" NOT NULL DEFAULT 'CARLOI_PHASE4_SEED',
  "manualReviewNeeded" BOOLEAN NOT NULL DEFAULT false,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "VehiclePackageEquipment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "UserVehicleExtraEquipment" (
  "id" TEXT NOT NULL,
  "vehicleId" TEXT NOT NULL,
  "category" "VehicleEquipmentCategory",
  "name" TEXT NOT NULL,
  "note" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "UserVehicleExtraEquipment_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "VehiclePackageEquipment_packageId_category_name_key"
  ON "VehiclePackageEquipment"("packageId", "category", "name");

CREATE INDEX IF NOT EXISTS "VehiclePackageEquipment_packageId_category_isActive_idx"
  ON "VehiclePackageEquipment"("packageId", "category", "isActive");

CREATE INDEX IF NOT EXISTS "UserVehicleExtraEquipment_vehicleId_createdAt_idx"
  ON "UserVehicleExtraEquipment"("vehicleId", "createdAt");

DO $$
BEGIN
  ALTER TABLE "VehiclePackageEquipment"
    ADD CONSTRAINT "VehiclePackageEquipment_packageId_fkey"
    FOREIGN KEY ("packageId") REFERENCES "VehiclePackage"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE "UserVehicleExtraEquipment"
    ADD CONSTRAINT "UserVehicleExtraEquipment_vehicleId_fkey"
    FOREIGN KEY ("vehicleId") REFERENCES "GarageVehicle"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
