-- Sprint 2: DM share system + active sessions metadata

CREATE TYPE "SharedContentType" AS ENUM ('POST', 'LISTING', 'VEHICLE');

ALTER TABLE "AccountSession"
ADD COLUMN "platform" TEXT,
ADD COLUMN "approximateLocation" TEXT;

CREATE TABLE "SharedContent" (
    "id" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "type" "SharedContentType" NOT NULL,
    "targetId" TEXT NOT NULL,
    "previewTitle" TEXT NOT NULL,
    "previewImageUrl" TEXT,
    "previewSubtitle" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SharedContent_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "SharedContent_messageId_key" ON "SharedContent"("messageId");
CREATE INDEX "SharedContent_type_targetId_idx" ON "SharedContent"("type", "targetId");

ALTER TABLE "SharedContent"
ADD CONSTRAINT "SharedContent_messageId_fkey"
FOREIGN KEY ("messageId") REFERENCES "Message"("id") ON DELETE CASCADE ON UPDATE CASCADE;
