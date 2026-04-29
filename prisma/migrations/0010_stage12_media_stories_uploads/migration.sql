-- CreateEnum
CREATE TYPE "MediaAssetPurpose" AS ENUM ('POST_MEDIA', 'STORY_MEDIA', 'LISTING_MEDIA', 'PROFILE_AVATAR', 'MESSAGE_ATTACHMENT', 'COMMERCIAL_DOCUMENT', 'INSURANCE_OFFER', 'INSURANCE_POLICY', 'INSURANCE_INVOICE', 'GARAGE_VEHICLE_MEDIA');

-- CreateEnum
CREATE TYPE "MediaVisibility" AS ENUM ('PUBLIC', 'PRIVATE');

-- AlterTable
ALTER TABLE "CommercialApplication" ADD COLUMN     "taxDocumentMediaAssetId" TEXT;

-- AlterTable
ALTER TABLE "GarageVehicleMedia" ADD COLUMN     "mediaAssetId" TEXT;

-- AlterTable
ALTER TABLE "InsuranceOffer" ADD COLUMN     "offerFileMediaAssetId" TEXT;

-- AlterTable
ALTER TABLE "InsurancePolicyDocument" ADD COLUMN     "mediaAssetId" TEXT;

-- AlterTable
ALTER TABLE "ListingMedia" ADD COLUMN     "mediaAssetId" TEXT;

-- AlterTable
ALTER TABLE "MessageAttachment" ADD COLUMN     "mediaAssetId" TEXT;

-- AlterTable
ALTER TABLE "PostMedia" ADD COLUMN     "mediaAssetId" TEXT;

-- AlterTable
ALTER TABLE "Profile" ADD COLUMN     "avatarMediaAssetId" TEXT;

-- AlterTable
ALTER TABLE "StoryMedia" ADD COLUMN     "mediaAssetId" TEXT;

-- CreateTable
CREATE TABLE "StoryView" (
    "id" TEXT NOT NULL,
    "storyId" TEXT NOT NULL,
    "viewerId" TEXT NOT NULL,
    "viewedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StoryView_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MediaAsset" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT,
    "uploadedByAdminId" TEXT,
    "purpose" "MediaAssetPurpose" NOT NULL,
    "url" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "originalFileName" TEXT,
    "mimeType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "visibility" "MediaVisibility" NOT NULL DEFAULT 'PUBLIC',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "MediaAsset_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "StoryView_storyId_viewedAt_idx" ON "StoryView"("storyId", "viewedAt");

-- CreateIndex
CREATE UNIQUE INDEX "StoryView_storyId_viewerId_key" ON "StoryView"("storyId", "viewerId");

-- CreateIndex
CREATE UNIQUE INDEX "MediaAsset_storageKey_key" ON "MediaAsset"("storageKey");

-- CreateIndex
CREATE INDEX "MediaAsset_ownerId_purpose_createdAt_idx" ON "MediaAsset"("ownerId", "purpose", "createdAt");

-- CreateIndex
CREATE INDEX "MediaAsset_uploadedByAdminId_purpose_createdAt_idx" ON "MediaAsset"("uploadedByAdminId", "purpose", "createdAt");

-- CreateIndex
CREATE INDEX "MediaAsset_visibility_purpose_createdAt_idx" ON "MediaAsset"("visibility", "purpose", "createdAt");

-- CreateIndex
CREATE INDEX "MediaAsset_deletedAt_idx" ON "MediaAsset"("deletedAt");

-- AddForeignKey
ALTER TABLE "Profile" ADD CONSTRAINT "Profile_avatarMediaAssetId_fkey" FOREIGN KEY ("avatarMediaAssetId") REFERENCES "MediaAsset"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommercialApplication" ADD CONSTRAINT "CommercialApplication_taxDocumentMediaAssetId_fkey" FOREIGN KEY ("taxDocumentMediaAssetId") REFERENCES "MediaAsset"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PostMedia" ADD CONSTRAINT "PostMedia_mediaAssetId_fkey" FOREIGN KEY ("mediaAssetId") REFERENCES "MediaAsset"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StoryMedia" ADD CONSTRAINT "StoryMedia_mediaAssetId_fkey" FOREIGN KEY ("mediaAssetId") REFERENCES "MediaAsset"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StoryView" ADD CONSTRAINT "StoryView_storyId_fkey" FOREIGN KEY ("storyId") REFERENCES "Story"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StoryView" ADD CONSTRAINT "StoryView_viewerId_fkey" FOREIGN KEY ("viewerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GarageVehicleMedia" ADD CONSTRAINT "GarageVehicleMedia_mediaAssetId_fkey" FOREIGN KEY ("mediaAssetId") REFERENCES "MediaAsset"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ListingMedia" ADD CONSTRAINT "ListingMedia_mediaAssetId_fkey" FOREIGN KEY ("mediaAssetId") REFERENCES "MediaAsset"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MessageAttachment" ADD CONSTRAINT "MessageAttachment_mediaAssetId_fkey" FOREIGN KEY ("mediaAssetId") REFERENCES "MediaAsset"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InsuranceOffer" ADD CONSTRAINT "InsuranceOffer_offerFileMediaAssetId_fkey" FOREIGN KEY ("offerFileMediaAssetId") REFERENCES "MediaAsset"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InsurancePolicyDocument" ADD CONSTRAINT "InsurancePolicyDocument_mediaAssetId_fkey" FOREIGN KEY ("mediaAssetId") REFERENCES "MediaAsset"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MediaAsset" ADD CONSTRAINT "MediaAsset_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MediaAsset" ADD CONSTRAINT "MediaAsset_uploadedByAdminId_fkey" FOREIGN KEY ("uploadedByAdminId") REFERENCES "AdminUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

