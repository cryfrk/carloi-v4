ALTER TABLE "Message"
ADD COLUMN "metadata" JSONB;

ALTER TABLE "InsuranceRequest"
ADD COLUMN "sourceThreadId" TEXT;

CREATE UNIQUE INDEX "InsuranceRequest_sourceThreadId_key"
ON "InsuranceRequest"("sourceThreadId");

CREATE INDEX "MessageThreadParticipant_userId_joinedAt_idx"
ON "MessageThreadParticipant"("userId", "joinedAt");

CREATE INDEX "Message_threadId_seenAt_idx"
ON "Message"("threadId", "seenAt");

ALTER TABLE "InsuranceRequest"
ADD CONSTRAINT "InsuranceRequest_sourceThreadId_fkey"
FOREIGN KEY ("sourceThreadId") REFERENCES "MessageThread"("id")
ON DELETE SET NULL
ON UPDATE CASCADE;
