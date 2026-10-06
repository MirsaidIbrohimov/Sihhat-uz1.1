CREATE TABLE "MerchantSetup" (
  "id" UUID NOT NULL,
  "sanatoriumId" UUID NOT NULL,
  "bankRevisionId" UUID,
  "legalName" TEXT NOT NULL,
  "stir" TEXT NOT NULL,
  "merchantId" TEXT,
  "cashDeskCode" TEXT,
  "status" TEXT NOT NULL DEFAULT 'WAITING_MERCHANT',
  "settlementMode" TEXT NOT NULL DEFAULT 'DIRECT',
  "version" INTEGER NOT NULL DEFAULT 1,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "MerchantSetup_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "MerchantSetup_sanatorium_fkey" FOREIGN KEY ("sanatoriumId") REFERENCES "Sanatorium"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "MerchantSetup_bank_fkey" FOREIGN KEY ("bankRevisionId", "sanatoriumId") REFERENCES "BankRevision"("id", "sanatoriumId") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "MerchantSetup_mode_check" CHECK ("settlementMode" = 'DIRECT'),
  CONSTRAINT "MerchantSetup_status_check" CHECK ("status" IN ('WAITING_MERCHANT', 'WAITING_VERIFICATION'))
);
CREATE UNIQUE INDEX "MerchantSetup_sanatoriumId_key" ON "MerchantSetup"("sanatoriumId");
