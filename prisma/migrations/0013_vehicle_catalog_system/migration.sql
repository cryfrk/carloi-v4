CREATE TYPE "VehicleCatalogType" AS ENUM ('AUTOMOBILE', 'MOTORCYCLE', 'COMMERCIAL');

ALTER TABLE "VehicleModel"
ADD COLUMN "catalogType" "VehicleCatalogType" NOT NULL DEFAULT 'AUTOMOBILE';

CREATE INDEX "VehicleModel_brandId_catalogType_idx" ON "VehicleModel"("brandId", "catalogType");
CREATE INDEX "VehicleModel_catalogType_idx" ON "VehicleModel"("catalogType");
