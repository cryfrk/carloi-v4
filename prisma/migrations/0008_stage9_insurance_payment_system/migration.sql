ALTER TABLE "Payment"
  ADD COLUMN "insuranceOfferId" TEXT,
  ADD COLUMN "failureReason" TEXT,
  ADD COLUMN "callbackVerifiedAt" TIMESTAMP(3),
  ADD COLUMN "completedAt" TIMESTAMP(3),
  ADD COLUMN "metadata" JSONB;

CREATE INDEX "Payment_insuranceRequestId_status_idx" ON "Payment"("insuranceRequestId", "status");
CREATE INDEX "Payment_insuranceOfferId_status_idx" ON "Payment"("insuranceOfferId", "status");

ALTER TABLE "Payment"
  ADD CONSTRAINT "Payment_insuranceOfferId_fkey"
  FOREIGN KEY ("insuranceOfferId") REFERENCES "InsuranceOffer"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;