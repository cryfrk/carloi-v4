-- CreateIndex
CREATE INDEX "AiConversation_userId_updatedAt_idx" ON "AiConversation"("userId", "updatedAt");

-- CreateIndex
CREATE INDEX "GarageVehicle_ownerId_deletedAt_createdAt_idx" ON "GarageVehicle"("ownerId", "deletedAt", "createdAt");

-- CreateIndex
CREATE INDEX "Listing_listingStatus_deletedAt_createdAt_idx" ON "Listing"("listingStatus", "deletedAt", "createdAt");

-- CreateIndex
CREATE INDEX "Listing_listingStatus_city_createdAt_idx" ON "Listing"("listingStatus", "city", "createdAt");

-- CreateIndex
CREATE INDEX "Post_visibility_ownerId_createdAt_idx" ON "Post"("visibility", "ownerId", "createdAt");