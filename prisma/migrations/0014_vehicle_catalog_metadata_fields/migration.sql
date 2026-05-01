ALTER TABLE "VehicleBrand"
ADD COLUMN     "type" "VehicleCatalogType" NOT NULL DEFAULT 'AUTOMOBILE',
ADD COLUMN     "logoUrl" TEXT,
ADD COLUMN     "country" TEXT,
ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE "VehicleModel"
ADD COLUMN     "bodyType" TEXT,
ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE "VehiclePackage"
ADD COLUMN     "yearStart" INTEGER,
ADD COLUMN     "yearEnd" INTEGER,
ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE "VehicleSpec"
ADD COLUMN     "year" INTEGER,
ADD COLUMN     "engineVolume" INTEGER,
ADD COLUMN     "enginePower" INTEGER;

UPDATE "VehicleBrand"
SET "type" = COALESCE((
  SELECT "catalogType"
  FROM "VehicleModel"
  WHERE "VehicleModel"."brandId" = "VehicleBrand"."id"
  ORDER BY "VehicleModel"."updatedAt" DESC
  LIMIT 1
), 'AUTOMOBILE');

UPDATE "VehicleModel"
SET "bodyType" = COALESCE((
  SELECT "bodyType"
  FROM "VehicleSpec"
  INNER JOIN "VehiclePackage" ON "VehiclePackage"."id" = "VehicleSpec"."packageId"
  WHERE "VehiclePackage"."modelId" = "VehicleModel"."id"
  ORDER BY "VehicleSpec"."updatedAt" DESC
  LIMIT 1
), "bodyType");

UPDATE "VehiclePackage"
SET
  "yearStart" = COALESCE("yearStart", 2018),
  "yearEnd" = COALESCE("yearEnd", 2026);

UPDATE "VehicleSpec"
SET
  "engineVolume" = COALESCE("engineVolume", "engineVolumeCc"),
  "enginePower" = COALESCE("enginePower", "enginePowerHp");

CREATE INDEX "VehicleBrand_type_isActive_name_idx" ON "VehicleBrand"("type", "isActive", "name");
CREATE INDEX "VehicleModel_brandId_catalogType_isActive_idx" ON "VehicleModel"("brandId", "catalogType", "isActive");
CREATE INDEX "VehiclePackage_modelId_isActive_yearStart_yearEnd_idx" ON "VehiclePackage"("modelId", "isActive", "yearStart", "yearEnd");
CREATE INDEX "VehicleSpec_packageId_year_idx" ON "VehicleSpec"("packageId", "year");
