-- CreateTable
CREATE TABLE "VehicleKnowledge" (
    "id" TEXT NOT NULL,
    "vehicleModelId" TEXT,
    "brandName" TEXT NOT NULL,
    "modelName" TEXT NOT NULL,
    "chronicIssues" JSONB NOT NULL,
    "marketNotes" TEXT NOT NULL,
    "partsAvailability" TEXT NOT NULL,
    "buyerAdvice" TEXT NOT NULL,
    "sellerAdvice" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VehicleKnowledge_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "VehicleKnowledge_vehicleModelId_key" ON "VehicleKnowledge"("vehicleModelId");

-- CreateIndex
CREATE UNIQUE INDEX "VehicleKnowledge_brandName_modelName_key" ON "VehicleKnowledge"("brandName", "modelName");

-- AddForeignKey
ALTER TABLE "VehicleKnowledge" ADD CONSTRAINT "VehicleKnowledge_vehicleModelId_fkey" FOREIGN KEY ("vehicleModelId") REFERENCES "VehicleModel"("id") ON DELETE SET NULL ON UPDATE CASCADE;
