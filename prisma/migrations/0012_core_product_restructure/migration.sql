-- AlterTable
ALTER TABLE "GarageVehicle"
ADD COLUMN "description" VARCHAR(600),
ADD COLUMN "equipmentNotes" TEXT,
ADD COLUMN "showInExplore" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "openToOffers" BOOLEAN NOT NULL DEFAULT false;
