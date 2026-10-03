CREATE TABLE "TezcheckBill" (
  "id" UUID NOT NULL, "orderId" UUID NOT NULL,
  "cashDeskCode" TEXT NOT NULL, "billId" TEXT, "encryptedUrl" TEXT,
  "state" TEXT NOT NULL DEFAULT 'CREATING', "expiresAt" TIMESTAMP(3) NOT NULL,
  "nextPollAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "leasedUntil" TIMESTAMP(3), "leaseToken" TEXT, "lastError" TEXT,
  "lastCheckedAt" TIMESTAMP(3), "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TezcheckBill_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "TezcheckBill_order_fk" FOREIGN KEY ("orderId") REFERENCES "PaymentOrder"("id") ON DELETE RESTRICT
);
CREATE UNIQUE INDEX "TezcheckBill_orderId_key" ON "TezcheckBill"("orderId");
CREATE UNIQUE INDEX "TezcheckBill_billId_key" ON "TezcheckBill"("billId");
CREATE INDEX "TezcheckBill_nextPollAt_state_idx" ON "TezcheckBill"("nextPollAt", "state");
CREATE TABLE "TezcheckWebhook" (
  "eventId" TEXT NOT NULL, "billId" TEXT NOT NULL, "payloadHash" TEXT NOT NULL,
  "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TezcheckWebhook_pkey" PRIMARY KEY ("eventId")
);
