-- CreateEnum
CREATE TYPE "ObdAdapterType" AS ENUM ('MOCK', 'BLUETOOTH', 'WIFI');

-- AlterTable
ALTER TABLE "GarageVehicle" ADD COLUMN     "brandId" TEXT,
ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "modelId" TEXT,
ADD COLUMN     "vehicleType" "VehicleType" NOT NULL DEFAULT 'OTHER';

-- AlterTable
ALTER TABLE "Listing" ADD COLUMN     "obdExpertiseReportId" TEXT;

-- AlterTable
ALTER TABLE "ObdConnection" ADD COLUMN     "adapterType" "ObdAdapterType" NOT NULL DEFAULT 'MOCK',
ADD COLUMN     "deviceId" TEXT,
ADD COLUMN     "deviceName" TEXT,
ADD COLUMN     "lastError" TEXT;

-- AlterTable
ALTER TABLE "ObdExpertiseReport" ADD COLUMN     "criticalIssues" JSONB,
ADD COLUMN     "durationSeconds" INTEGER,
ADD COLUMN     "endedAt" TIMESTAMP(3),
ADD COLUMN     "normalFindings" JSONB,
ADD COLUMN     "overallScore" INTEGER,
ADD COLUMN     "rawMetricsSummary" JSONB,
ADD COLUMN     "startedAt" TIMESTAMP(3),
ADD COLUMN     "warnings" JSONB;

-- AlterTable
ALTER TABLE "ObdMetricSnapshot" ADD COLUMN     "batteryVoltage" DECIMAL(10,2),
ADD COLUMN     "coolantTemp" INTEGER,
ADD COLUMN     "engineLoad" INTEGER,
ADD COLUMN     "fuelLevel" INTEGER,
ADD COLUMN     "intakeAirTemp" INTEGER,
ADD COLUMN     "rpm" INTEGER,
ADD COLUMN     "speed" INTEGER,
ADD COLUMN     "throttlePosition" INTEGER,
ALTER COLUMN "metricKey" DROP NOT NULL,
ALTER COLUMN "metricValue" DROP NOT NULL;

-- CreateTable
CREATE TABLE "GarageVehicleMedia" (
    "id" TEXT NOT NULL,
    "garageVehicleId" TEXT NOT NULL,
    "mediaType" "MediaType" NOT NULL,
    "url" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GarageVehicleMedia_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "GarageVehicleMedia_garageVehicleId_sortOrder_key" ON "GarageVehicleMedia"("garageVehicleId", "sortOrder");

-- CreateIndex
CREATE INDEX "GarageVehicle_deletedAt_idx" ON "GarageVehicle"("deletedAt");

-- CreateIndex
CREATE INDEX "Listing_obdExpertiseReportId_idx" ON "Listing"("obdExpertiseReportId");

-- AddForeignKey
ALTER TABLE "GarageVehicle" ADD CONSTRAINT "GarageVehicle_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "VehicleBrand"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GarageVehicle" ADD CONSTRAINT "GarageVehicle_modelId_fkey" FOREIGN KEY ("modelId") REFERENCES "VehicleModel"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GarageVehicleMedia" ADD CONSTRAINT "GarageVehicleMedia_garageVehicleId_fkey" FOREIGN KEY ("garageVehicleId") REFERENCES "GarageVehicle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Listing" ADD CONSTRAINT "Listing_obdExpertiseReportId_fkey" FOREIGN KEY ("obdExpertiseReportId") REFERENCES "ObdExpertiseReport"("id") ON DELETE SET NULL ON UPDATE CASCADE;

