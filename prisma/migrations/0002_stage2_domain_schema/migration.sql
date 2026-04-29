-- CreateEnum
CREATE TYPE "ContentVisibility" AS ENUM ('PUBLIC', 'FOLLOWERS_ONLY', 'PRIVATE');

-- CreateEnum
CREATE TYPE "MediaType" AS ENUM ('IMAGE', 'VIDEO');

-- CreateEnum
CREATE TYPE "SavedItemType" AS ENUM ('POST', 'LISTING');

-- CreateEnum
CREATE TYPE "SellerType" AS ENUM ('OWNER', 'DEALER');

-- CreateEnum
CREATE TYPE "DamageStatus" AS ENUM ('NONE', 'PAINTED', 'REPLACED');

-- CreateEnum
CREATE TYPE "MessageThreadType" AS ENUM ('DIRECT', 'GROUP', 'LISTING_DEAL');

-- CreateEnum
CREATE TYPE "MessageType" AS ENUM ('TEXT', 'IMAGE', 'VIDEO', 'AUDIO', 'FILE', 'SYSTEM_CARD');

-- CreateEnum
CREATE TYPE "AttachmentType" AS ENUM ('IMAGE', 'VIDEO', 'AUDIO', 'FILE');

-- CreateEnum
CREATE TYPE "AiMessageRole" AS ENUM ('USER', 'ASSISTANT', 'SYSTEM');

-- CreateEnum
CREATE TYPE "AiProvider" AS ENUM ('OPENAI', 'DEEPSEEK', 'INTERNAL');

-- CreateEnum
CREATE TYPE "InsuranceOfferStatus" AS ENUM ('ACTIVE', 'ACCEPTED', 'REJECTED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "PaymentProvider" AS ENUM ('GARANTI');

-- CreateEnum
CREATE TYPE "VerificationTargetType" AS ENUM ('EMAIL', 'PHONE');

-- CreateEnum
CREATE TYPE "VerificationCodePurpose" AS ENUM ('SIGN_UP', 'LOGIN', 'PASSWORD_RESET', 'EMAIL_UPDATE', 'PHONE_UPDATE');

-- CreateEnum
CREATE TYPE "ObdConnectionStatus" AS ENUM ('CONNECTED', 'DISCONNECTED', 'ERROR', 'REVOKED');

-- CreateEnum
CREATE TYPE "ObdReportStatus" AS ENUM ('CREATED', 'PROCESSING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "ObdFaultSeverity" AS ENUM ('INFO', 'WARNING', 'CRITICAL');

-- CreateEnum
CREATE TYPE "LegalComplianceCheckType" AS ENUM ('IDENTITY_VERIFICATION', 'LISTING_LIMIT', 'COMMERCIAL_ELIGIBILITY', 'LICENSE_OWNERSHIP', 'CONTENT_POLICY', 'KVKK_CONSENT');

-- CreateEnum
CREATE TYPE "LegalComplianceStatus" AS ENUM ('PENDING', 'PASSED', 'FAILED', 'NEEDS_REVIEW');

-- AlterEnum
BEGIN;
CREATE TYPE "InsuranceRequestStatus_new" AS ENUM ('PENDING', 'OFFER_CREATED', 'ACCEPTED', 'REJECTED', 'PAID', 'POLICY_UPLOADED', 'CANCELLED');
ALTER TABLE "public"."InsuranceRequest" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "InsuranceRequest" ALTER COLUMN "status" TYPE "InsuranceRequestStatus_new" USING ("status"::text::"InsuranceRequestStatus_new");
ALTER TYPE "InsuranceRequestStatus" RENAME TO "InsuranceRequestStatus_old";
ALTER TYPE "InsuranceRequestStatus_new" RENAME TO "InsuranceRequestStatus";
DROP TYPE "public"."InsuranceRequestStatus_old";
ALTER TABLE "InsuranceRequest" ALTER COLUMN "status" SET DEFAULT 'PENDING';
COMMIT;

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "ListingStatus" ADD VALUE 'RESERVED';
ALTER TYPE "ListingStatus" ADD VALUE 'REJECTED';

-- AlterEnum
BEGIN;
CREATE TYPE "PaymentStatus_new" AS ENUM ('PENDING', 'PAID', 'FAILED', 'CANCELLED', 'REFUNDED');
ALTER TABLE "public"."Payment" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "Payment" ALTER COLUMN "status" TYPE "PaymentStatus_new" USING ("status"::text::"PaymentStatus_new");
ALTER TYPE "PaymentStatus" RENAME TO "PaymentStatus_old";
ALTER TYPE "PaymentStatus_new" RENAME TO "PaymentStatus";
DROP TYPE "public"."PaymentStatus_old";
ALTER TABLE "Payment" ALTER COLUMN "status" SET DEFAULT 'PENDING';
COMMIT;

-- DropForeignKey
ALTER TABLE "Account" DROP CONSTRAINT "Account_userId_fkey";

-- DropForeignKey
ALTER TABLE "AuditLog" DROP CONSTRAINT "AuditLog_adminUserId_fkey";

-- DropForeignKey
ALTER TABLE "Comment" DROP CONSTRAINT "Comment_userId_fkey";

-- DropForeignKey
ALTER TABLE "InsuranceRequest" DROP CONSTRAINT "InsuranceRequest_reviewerId_fkey";

-- DropForeignKey
ALTER TABLE "InsuranceRequest" DROP CONSTRAINT "InsuranceRequest_userId_fkey";

-- DropForeignKey
ALTER TABLE "Listing" DROP CONSTRAINT "Listing_ownerId_fkey";

-- DropForeignKey
ALTER TABLE "Listing" DROP CONSTRAINT "Listing_vehicleId_fkey";

-- DropForeignKey
ALTER TABLE "MessageThread" DROP CONSTRAINT "MessageThread_participantOneId_fkey";

-- DropForeignKey
ALTER TABLE "MessageThread" DROP CONSTRAINT "MessageThread_participantTwoId_fkey";

-- DropForeignKey
ALTER TABLE "Payment" DROP CONSTRAINT "Payment_listingId_fkey";

-- DropForeignKey
ALTER TABLE "Post" DROP CONSTRAINT "Post_authorId_fkey";

-- DropForeignKey
ALTER TABLE "Vehicle" DROP CONSTRAINT "Vehicle_ownerId_fkey";

-- DropForeignKey
ALTER TABLE "VehicleGarage" DROP CONSTRAINT "VehicleGarage_userId_fkey";

-- DropForeignKey
ALTER TABLE "VehicleGarage" DROP CONSTRAINT "VehicleGarage_vehicleId_fkey";

-- DropIndex
DROP INDEX "AdminUser_email_key";

-- DropIndex
DROP INDEX "MessageThread_participantOneId_participantTwoId_key";

-- AlterTable
ALTER TABLE "AdminUser" DROP COLUMN "email",
ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "username" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "AuditLog" DROP COLUMN "adminUserId",
ADD COLUMN     "actorAdminId" TEXT,
ADD COLUMN     "actorUserId" TEXT,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
ALTER COLUMN "entityId" SET NOT NULL,
ALTER COLUMN "metadata" SET NOT NULL;

-- AlterTable
ALTER TABLE "Comment" DROP COLUMN "content",
DROP COLUMN "userId",
ADD COLUMN     "body" TEXT NOT NULL,
ADD COLUMN     "ownerId" TEXT NOT NULL,
ADD COLUMN     "parentCommentId" TEXT;

-- AlterTable
ALTER TABLE "CommercialApplication" ADD COLUMN     "contactEmail" TEXT,
ADD COLUMN     "contactPhone" TEXT;

-- AlterTable
ALTER TABLE "Follow" ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "InsuranceRequest" DROP COLUMN "notes",
DROP COLUMN "reviewedAt",
DROP COLUMN "reviewerId",
DROP COLUMN "submittedAt",
DROP COLUMN "userId",
ADD COLUMN     "buyerId" TEXT NOT NULL,
ADD COLUMN     "listingId" TEXT NOT NULL,
ADD COLUMN     "sellerId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Like" ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "Listing" DROP COLUMN "ownerId",
DROP COLUMN "publishedAt",
DROP COLUMN "status",
DROP COLUMN "vehicleId",
ADD COLUMN     "district" TEXT,
ADD COLUMN     "garageVehicleId" TEXT,
ADD COLUMN     "hasExpertiseReport" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "isLicenseVerified" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "licenseOwnerName" TEXT,
ADD COLUMN     "licenseOwnerTcNo" TEXT,
ADD COLUMN     "listingNo" TEXT NOT NULL,
ADD COLUMN     "listingStatus" "ListingStatus" NOT NULL DEFAULT 'DRAFT',
ADD COLUMN     "plateNumber" TEXT,
ADD COLUMN     "sellerId" TEXT NOT NULL,
ADD COLUMN     "sellerType" "SellerType" NOT NULL,
ALTER COLUMN "description" SET DATA TYPE VARCHAR(600),
ALTER COLUMN "price" SET DATA TYPE DECIMAL(14,2),
ALTER COLUMN "city" SET NOT NULL;

-- AlterTable
ALTER TABLE "Message" ADD COLUMN     "messageType" "MessageType" NOT NULL DEFAULT 'TEXT',
ADD COLUMN     "seenAt" TIMESTAMP(3),
ALTER COLUMN "body" DROP NOT NULL;

-- AlterTable
ALTER TABLE "MessageThread" DROP COLUMN "participantOneId",
DROP COLUMN "participantTwoId",
ADD COLUMN     "groupName" TEXT,
ADD COLUMN     "listingId" TEXT,
ADD COLUMN     "type" "MessageThreadType" NOT NULL;

-- AlterTable
ALTER TABLE "Notification" DROP COLUMN "meta",
ADD COLUMN     "actorAdminId" TEXT,
ADD COLUMN     "actorUserId" TEXT,
ADD COLUMN     "metadata" JSONB,
ADD COLUMN     "targetUrl" TEXT,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "Payment" DROP COLUMN "listingId",
DROP COLUMN "referenceId",
ADD COLUMN     "insuranceRequestId" TEXT,
ADD COLUMN     "providerTransactionId" TEXT,
ALTER COLUMN "amount" SET DATA TYPE DECIMAL(14,2),
DROP COLUMN "provider",
ADD COLUMN     "provider" "PaymentProvider" NOT NULL DEFAULT 'GARANTI';

-- AlterTable
ALTER TABLE "Post" DROP COLUMN "authorId",
DROP COLUMN "content",
ADD COLUMN     "caption" VARCHAR(600),
ADD COLUMN     "locationText" TEXT,
ADD COLUMN     "ownerId" TEXT NOT NULL,
ADD COLUMN     "visibility" "ContentVisibility" NOT NULL DEFAULT 'PUBLIC';

-- AlterTable
ALTER TABLE "PostMedia" DROP COLUMN "type",
ADD COLUMN     "mediaType" "MediaType" NOT NULL,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "Profile" DROP COLUMN "city",
DROP COLUMN "country",
DROP COLUMN "displayName",
ADD COLUMN     "blueVerified" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "goldVerified" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "isPrivate" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "locationText" TEXT,
ADD COLUMN     "showGarageVehicles" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "websiteUrl" TEXT;

-- AlterTable
ALTER TABLE "User" DROP COLUMN "isActive",
ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "firstName" TEXT NOT NULL,
ADD COLUMN     "isCommercialApproved" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "isVerified" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "lastName" TEXT NOT NULL,
ADD COLUMN     "phone" TEXT,
ADD COLUMN     "tcIdentityNo" TEXT,
ALTER COLUMN "email" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Vehicle" DROP COLUMN "make",
DROP COLUMN "mileageKm",
DROP COLUMN "model",
DROP COLUMN "ownerId",
ADD COLUMN     "brandId" TEXT,
ADD COLUMN     "brandText" TEXT,
ADD COLUMN     "chassisNo" TEXT,
ADD COLUMN     "engineNo" TEXT,
ADD COLUMN     "modelId" TEXT,
ADD COLUMN     "modelText" TEXT,
ADD COLUMN     "packageText" TEXT,
ADD COLUMN     "vehiclePackageId" TEXT,
ALTER COLUMN "year" DROP NOT NULL,
ALTER COLUMN "vehicleType" DROP NOT NULL,
ALTER COLUMN "fuelType" DROP NOT NULL,
ALTER COLUMN "transmissionType" DROP NOT NULL;

-- DropTable
DROP TABLE "Account";

-- DropTable
DROP TABLE "VehicleGarage";

-- CreateTable
CREATE TABLE "AccountSession" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "sessionTokenHash" TEXT NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "deviceName" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "lastSeenAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AccountSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VerificationCode" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "targetType" "VerificationTargetType" NOT NULL,
    "targetValue" TEXT NOT NULL,
    "purpose" "VerificationCodePurpose" NOT NULL,
    "codeHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "consumedAt" TIMESTAMP(3),
    "attemptCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VerificationCode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PasswordResetToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PasswordResetToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Story" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "caption" VARCHAR(250),
    "locationText" TEXT,
    "visibility" "ContentVisibility" NOT NULL DEFAULT 'PUBLIC',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Story_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StoryMedia" (
    "id" TEXT NOT NULL,
    "storyId" TEXT NOT NULL,
    "mediaType" "MediaType" NOT NULL,
    "url" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StoryMedia_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SavedItem" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "itemType" "SavedItemType" NOT NULL,
    "postId" TEXT,
    "listingId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SavedItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VehicleBrand" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VehicleBrand_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VehicleModel" (
    "id" TEXT NOT NULL,
    "brandId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VehicleModel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VehiclePackage" (
    "id" TEXT NOT NULL,
    "modelId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VehiclePackage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VehicleSpec" (
    "id" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "bodyType" TEXT,
    "engineVolumeCc" INTEGER,
    "enginePowerHp" INTEGER,
    "tractionType" TEXT,
    "seatCount" INTEGER,
    "doorCount" INTEGER,
    "batteryCapacityKwh" DECIMAL(10,2),
    "rangeKm" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VehicleSpec_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GarageVehicle" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "vehiclePackageId" TEXT,
    "brandText" TEXT NOT NULL,
    "modelText" TEXT NOT NULL,
    "packageText" TEXT,
    "year" INTEGER NOT NULL,
    "plateNumber" TEXT NOT NULL,
    "color" TEXT,
    "fuelType" "FuelType" NOT NULL,
    "transmissionType" "TransmissionType" NOT NULL,
    "km" INTEGER NOT NULL,
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GarageVehicle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ListingMedia" (
    "id" TEXT NOT NULL,
    "listingId" TEXT NOT NULL,
    "mediaType" "MediaType" NOT NULL,
    "url" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ListingMedia_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ListingDamagePart" (
    "id" TEXT NOT NULL,
    "listingId" TEXT NOT NULL,
    "partName" TEXT NOT NULL,
    "damageStatus" "DamageStatus" NOT NULL DEFAULT 'NONE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ListingDamagePart_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ObdConnection" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "garageVehicleId" TEXT NOT NULL,
    "provider" TEXT,
    "deviceSerial" TEXT,
    "connectionStatus" "ObdConnectionStatus" NOT NULL DEFAULT 'DISCONNECTED',
    "lastConnectedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ObdConnection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ObdExpertiseReport" (
    "id" TEXT NOT NULL,
    "garageVehicleId" TEXT NOT NULL,
    "obdConnectionId" TEXT,
    "reportStatus" "ObdReportStatus" NOT NULL DEFAULT 'CREATED',
    "summaryText" TEXT,
    "reportJson" JSONB,
    "reportedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ObdExpertiseReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ObdFaultCode" (
    "id" TEXT NOT NULL,
    "reportId" TEXT NOT NULL,
    "faultCode" TEXT NOT NULL,
    "description" TEXT,
    "severity" "ObdFaultSeverity" NOT NULL DEFAULT 'INFO',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ObdFaultCode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ObdMetricSnapshot" (
    "id" TEXT NOT NULL,
    "garageVehicleId" TEXT NOT NULL,
    "reportId" TEXT,
    "metricKey" TEXT NOT NULL,
    "metricValue" TEXT NOT NULL,
    "metricUnit" TEXT,
    "capturedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ObdMetricSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MessageThreadParticipant" (
    "id" TEXT NOT NULL,
    "threadId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastReadAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MessageThreadParticipant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MessageAttachment" (
    "id" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "attachmentType" "AttachmentType" NOT NULL,
    "url" TEXT NOT NULL,
    "fileName" TEXT,
    "mimeType" TEXT,
    "sizeBytes" INTEGER,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MessageAttachment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ListingDealAgreement" (
    "id" TEXT NOT NULL,
    "listingId" TEXT NOT NULL,
    "threadId" TEXT NOT NULL,
    "buyerId" TEXT NOT NULL,
    "sellerId" TEXT NOT NULL,
    "buyerAgreedAt" TIMESTAMP(3),
    "sellerAgreedAt" TIMESTAMP(3),
    "licenseSharedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ListingDealAgreement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiConversation" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AiConversation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiMessage" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "role" "AiMessageRole" NOT NULL,
    "provider" "AiProvider",
    "content" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AiMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiToolResult" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "messageId" TEXT,
    "toolName" TEXT NOT NULL,
    "resultJson" JSONB NOT NULL,
    "success" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AiToolResult_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InsuranceOffer" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "adminId" TEXT NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'TRY',
    "offerFileUrl" TEXT,
    "status" "InsuranceOfferStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InsuranceOffer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InsurancePolicyDocument" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "adminId" TEXT,
    "documentType" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InsurancePolicyDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdminSession" (
    "id" TEXT NOT NULL,
    "adminUserId" TEXT NOT NULL,
    "sessionTokenHash" TEXT NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "lastSeenAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AdminSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LegalComplianceCheck" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "listingId" TEXT,
    "checkType" "LegalComplianceCheckType" NOT NULL,
    "status" "LegalComplianceStatus" NOT NULL,
    "resultJson" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LegalComplianceCheck_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserListingLimit" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "listingCount" INTEGER NOT NULL DEFAULT 0,
    "warningShownAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserListingLimit_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AccountSession_sessionTokenHash_key" ON "AccountSession"("sessionTokenHash");

-- CreateIndex
CREATE INDEX "AccountSession_userId_expiresAt_idx" ON "AccountSession"("userId", "expiresAt");

-- CreateIndex
CREATE INDEX "VerificationCode_targetValue_purpose_idx" ON "VerificationCode"("targetValue", "purpose");

-- CreateIndex
CREATE UNIQUE INDEX "PasswordResetToken_tokenHash_key" ON "PasswordResetToken"("tokenHash");

-- CreateIndex
CREATE INDEX "PasswordResetToken_userId_expiresAt_idx" ON "PasswordResetToken"("userId", "expiresAt");

-- CreateIndex
CREATE INDEX "Story_ownerId_expiresAt_idx" ON "Story"("ownerId", "expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "StoryMedia_storyId_sortOrder_key" ON "StoryMedia"("storyId", "sortOrder");

-- CreateIndex
CREATE INDEX "SavedItem_userId_itemType_idx" ON "SavedItem"("userId", "itemType");

-- CreateIndex
CREATE UNIQUE INDEX "SavedItem_userId_postId_key" ON "SavedItem"("userId", "postId");

-- CreateIndex
CREATE UNIQUE INDEX "SavedItem_userId_listingId_key" ON "SavedItem"("userId", "listingId");

-- CreateIndex
CREATE UNIQUE INDEX "VehicleBrand_name_key" ON "VehicleBrand"("name");

-- CreateIndex
CREATE UNIQUE INDEX "VehicleBrand_slug_key" ON "VehicleBrand"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "VehicleModel_brandId_name_key" ON "VehicleModel"("brandId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "VehicleModel_brandId_slug_key" ON "VehicleModel"("brandId", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "VehiclePackage_modelId_name_key" ON "VehiclePackage"("modelId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "VehiclePackage_modelId_slug_key" ON "VehiclePackage"("modelId", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "VehicleSpec_vehicleId_key" ON "VehicleSpec"("vehicleId");

-- CreateIndex
CREATE UNIQUE INDEX "GarageVehicle_plateNumber_key" ON "GarageVehicle"("plateNumber");

-- CreateIndex
CREATE INDEX "GarageVehicle_ownerId_isPublic_idx" ON "GarageVehicle"("ownerId", "isPublic");

-- CreateIndex
CREATE UNIQUE INDEX "ListingMedia_listingId_sortOrder_key" ON "ListingMedia"("listingId", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "ListingDamagePart_listingId_partName_key" ON "ListingDamagePart"("listingId", "partName");

-- CreateIndex
CREATE UNIQUE INDEX "ObdConnection_deviceSerial_key" ON "ObdConnection"("deviceSerial");

-- CreateIndex
CREATE INDEX "ObdConnection_garageVehicleId_connectionStatus_idx" ON "ObdConnection"("garageVehicleId", "connectionStatus");

-- CreateIndex
CREATE INDEX "ObdExpertiseReport_garageVehicleId_reportedAt_idx" ON "ObdExpertiseReport"("garageVehicleId", "reportedAt");

-- CreateIndex
CREATE UNIQUE INDEX "ObdFaultCode_reportId_faultCode_key" ON "ObdFaultCode"("reportId", "faultCode");

-- CreateIndex
CREATE INDEX "ObdMetricSnapshot_garageVehicleId_capturedAt_idx" ON "ObdMetricSnapshot"("garageVehicleId", "capturedAt");

-- CreateIndex
CREATE UNIQUE INDEX "MessageThreadParticipant_threadId_userId_key" ON "MessageThreadParticipant"("threadId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "MessageAttachment_messageId_sortOrder_key" ON "MessageAttachment"("messageId", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "ListingDealAgreement_threadId_key" ON "ListingDealAgreement"("threadId");

-- CreateIndex
CREATE UNIQUE INDEX "ListingDealAgreement_listingId_buyerId_sellerId_key" ON "ListingDealAgreement"("listingId", "buyerId", "sellerId");

-- CreateIndex
CREATE INDEX "AiConversation_userId_createdAt_idx" ON "AiConversation"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "AiMessage_conversationId_createdAt_idx" ON "AiMessage"("conversationId", "createdAt");

-- CreateIndex
CREATE INDEX "AiToolResult_conversationId_createdAt_idx" ON "AiToolResult"("conversationId", "createdAt");

-- CreateIndex
CREATE INDEX "InsuranceOffer_requestId_status_idx" ON "InsuranceOffer"("requestId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "AdminSession_sessionTokenHash_key" ON "AdminSession"("sessionTokenHash");

-- CreateIndex
CREATE INDEX "AdminSession_adminUserId_expiresAt_idx" ON "AdminSession"("adminUserId", "expiresAt");

-- CreateIndex
CREATE INDEX "LegalComplianceCheck_userId_createdAt_idx" ON "LegalComplianceCheck"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "LegalComplianceCheck_listingId_createdAt_idx" ON "LegalComplianceCheck"("listingId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "UserListingLimit_userId_year_key" ON "UserListingLimit"("userId", "year");

-- CreateIndex
CREATE UNIQUE INDEX "AdminUser_username_key" ON "AdminUser"("username");

-- CreateIndex
CREATE INDEX "AuditLog_entityType_entityId_idx" ON "AuditLog"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "Comment_postId_createdAt_idx" ON "Comment"("postId", "createdAt");

-- CreateIndex
CREATE INDEX "CommercialApplication_status_submittedAt_idx" ON "CommercialApplication"("status", "submittedAt");

-- CreateIndex
CREATE INDEX "InsuranceRequest_status_createdAt_idx" ON "InsuranceRequest"("status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Listing_listingNo_key" ON "Listing"("listingNo");

-- CreateIndex
CREATE INDEX "Listing_sellerId_listingStatus_idx" ON "Listing"("sellerId", "listingStatus");

-- CreateIndex
CREATE INDEX "Listing_city_district_idx" ON "Listing"("city", "district");

-- CreateIndex
CREATE INDEX "Message_threadId_createdAt_idx" ON "Message"("threadId", "createdAt");

-- CreateIndex
CREATE INDEX "MessageThread_listingId_type_idx" ON "MessageThread"("listingId", "type");

-- CreateIndex
CREATE INDEX "Notification_userId_readAt_idx" ON "Notification"("userId", "readAt");

-- CreateIndex
CREATE INDEX "Payment_userId_createdAt_idx" ON "Payment"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "Post_ownerId_createdAt_idx" ON "Post"("ownerId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "PostMedia_postId_sortOrder_key" ON "PostMedia"("postId", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "User_phone_key" ON "User"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "User_tcIdentityNo_key" ON "User"("tcIdentityNo");

-- CreateIndex
CREATE INDEX "User_deletedAt_idx" ON "User"("deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Vehicle_vin_key" ON "Vehicle"("vin");

-- CreateIndex
CREATE INDEX "Vehicle_brandId_modelId_idx" ON "Vehicle"("brandId", "modelId");

-- AddForeignKey
ALTER TABLE "AccountSession" ADD CONSTRAINT "AccountSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VerificationCode" ADD CONSTRAINT "VerificationCode_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PasswordResetToken" ADD CONSTRAINT "PasswordResetToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Post" ADD CONSTRAINT "Post_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Story" ADD CONSTRAINT "Story_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StoryMedia" ADD CONSTRAINT "StoryMedia_storyId_fkey" FOREIGN KEY ("storyId") REFERENCES "Story"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_parentCommentId_fkey" FOREIGN KEY ("parentCommentId") REFERENCES "Comment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SavedItem" ADD CONSTRAINT "SavedItem_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SavedItem" ADD CONSTRAINT "SavedItem_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SavedItem" ADD CONSTRAINT "SavedItem_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "Listing"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_actorAdminId_fkey" FOREIGN KEY ("actorAdminId") REFERENCES "AdminUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VehicleModel" ADD CONSTRAINT "VehicleModel_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "VehicleBrand"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VehiclePackage" ADD CONSTRAINT "VehiclePackage_modelId_fkey" FOREIGN KEY ("modelId") REFERENCES "VehicleModel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vehicle" ADD CONSTRAINT "Vehicle_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "VehicleBrand"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vehicle" ADD CONSTRAINT "Vehicle_modelId_fkey" FOREIGN KEY ("modelId") REFERENCES "VehicleModel"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vehicle" ADD CONSTRAINT "Vehicle_vehiclePackageId_fkey" FOREIGN KEY ("vehiclePackageId") REFERENCES "VehiclePackage"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VehicleSpec" ADD CONSTRAINT "VehicleSpec_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GarageVehicle" ADD CONSTRAINT "GarageVehicle_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GarageVehicle" ADD CONSTRAINT "GarageVehicle_vehiclePackageId_fkey" FOREIGN KEY ("vehiclePackageId") REFERENCES "VehiclePackage"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Listing" ADD CONSTRAINT "Listing_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Listing" ADD CONSTRAINT "Listing_garageVehicleId_fkey" FOREIGN KEY ("garageVehicleId") REFERENCES "GarageVehicle"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ListingMedia" ADD CONSTRAINT "ListingMedia_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "Listing"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ListingDamagePart" ADD CONSTRAINT "ListingDamagePart_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "Listing"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ObdConnection" ADD CONSTRAINT "ObdConnection_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ObdConnection" ADD CONSTRAINT "ObdConnection_garageVehicleId_fkey" FOREIGN KEY ("garageVehicleId") REFERENCES "GarageVehicle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ObdExpertiseReport" ADD CONSTRAINT "ObdExpertiseReport_garageVehicleId_fkey" FOREIGN KEY ("garageVehicleId") REFERENCES "GarageVehicle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ObdExpertiseReport" ADD CONSTRAINT "ObdExpertiseReport_obdConnectionId_fkey" FOREIGN KEY ("obdConnectionId") REFERENCES "ObdConnection"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ObdFaultCode" ADD CONSTRAINT "ObdFaultCode_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "ObdExpertiseReport"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ObdMetricSnapshot" ADD CONSTRAINT "ObdMetricSnapshot_garageVehicleId_fkey" FOREIGN KEY ("garageVehicleId") REFERENCES "GarageVehicle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ObdMetricSnapshot" ADD CONSTRAINT "ObdMetricSnapshot_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "ObdExpertiseReport"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MessageThread" ADD CONSTRAINT "MessageThread_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "Listing"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MessageThreadParticipant" ADD CONSTRAINT "MessageThreadParticipant_threadId_fkey" FOREIGN KEY ("threadId") REFERENCES "MessageThread"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MessageThreadParticipant" ADD CONSTRAINT "MessageThreadParticipant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MessageAttachment" ADD CONSTRAINT "MessageAttachment_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "Message"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ListingDealAgreement" ADD CONSTRAINT "ListingDealAgreement_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "Listing"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ListingDealAgreement" ADD CONSTRAINT "ListingDealAgreement_threadId_fkey" FOREIGN KEY ("threadId") REFERENCES "MessageThread"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ListingDealAgreement" ADD CONSTRAINT "ListingDealAgreement_buyerId_fkey" FOREIGN KEY ("buyerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ListingDealAgreement" ADD CONSTRAINT "ListingDealAgreement_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiConversation" ADD CONSTRAINT "AiConversation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiMessage" ADD CONSTRAINT "AiMessage_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "AiConversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiToolResult" ADD CONSTRAINT "AiToolResult_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "AiConversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiToolResult" ADD CONSTRAINT "AiToolResult_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "AiMessage"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InsuranceRequest" ADD CONSTRAINT "InsuranceRequest_buyerId_fkey" FOREIGN KEY ("buyerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InsuranceRequest" ADD CONSTRAINT "InsuranceRequest_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InsuranceRequest" ADD CONSTRAINT "InsuranceRequest_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "Listing"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InsuranceOffer" ADD CONSTRAINT "InsuranceOffer_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "InsuranceRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InsuranceOffer" ADD CONSTRAINT "InsuranceOffer_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "AdminUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InsurancePolicyDocument" ADD CONSTRAINT "InsurancePolicyDocument_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "InsuranceRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InsurancePolicyDocument" ADD CONSTRAINT "InsurancePolicyDocument_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "AdminUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_insuranceRequestId_fkey" FOREIGN KEY ("insuranceRequestId") REFERENCES "InsuranceRequest"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdminSession" ADD CONSTRAINT "AdminSession_adminUserId_fkey" FOREIGN KEY ("adminUserId") REFERENCES "AdminUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_actorAdminId_fkey" FOREIGN KEY ("actorAdminId") REFERENCES "AdminUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LegalComplianceCheck" ADD CONSTRAINT "LegalComplianceCheck_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LegalComplianceCheck" ADD CONSTRAINT "LegalComplianceCheck_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "Listing"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserListingLimit" ADD CONSTRAINT "UserListingLimit_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

