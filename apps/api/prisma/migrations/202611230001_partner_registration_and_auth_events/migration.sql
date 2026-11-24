ALTER TABLE "Session"
  ADD COLUMN IF NOT EXISTS "ipAddress" TEXT,
  ADD COLUMN IF NOT EXISTS "userAgent" TEXT;

CREATE TABLE IF NOT EXISTS "AuthEvent" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "sessionId" UUID,
    "eventType" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "authMethod" TEXT,
    "ipAddress" TEXT NOT NULL DEFAULT 'unknown',
    "deviceLabel" TEXT NOT NULL DEFAULT 'Noma’lum qurilma',
    "userAgent" TEXT,
    "userKind" TEXT,
    "userName" TEXT,
    "userLogin" TEXT,
    "userEmail" TEXT,
    "sanatoriumId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuthEvent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "AuthEvent_userId_createdAt_idx" ON "AuthEvent"("userId", "createdAt");
CREATE INDEX IF NOT EXISTS "AuthEvent_sanatoriumId_createdAt_idx" ON "AuthEvent"("sanatoriumId", "createdAt");
CREATE INDEX IF NOT EXISTS "AuthEvent_eventType_createdAt_idx" ON "AuthEvent"("eventType", "createdAt");
CREATE INDEX IF NOT EXISTS "AuthEvent_createdAt_idx" ON "AuthEvent"("createdAt");

CREATE TABLE IF NOT EXISTS "PartnerRegistration" (
    "id" UUID NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "applicantName" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "sanatoriumName" TEXT NOT NULL,
    "legalName" TEXT,
    "stir" TEXT,
    "region" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "contactPhone" TEXT NOT NULL,
    "mapUrl" TEXT,
    "checkInTime" TEXT NOT NULL DEFAULT '14:00',
    "checkOutTime" TEXT NOT NULL DEFAULT '12:00',
    "amenities" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "services" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "meals" TEXT NOT NULL DEFAULT '',
    "startingPriceMinor" BIGINT,
    "roomTypeName" TEXT,
    "roomsCount" INTEGER,
    "submittedIp" TEXT,
    "submittedDevice" TEXT,
    "reviewedBy" UUID,
    "reviewedAt" TIMESTAMP(3),
    "decisionReason" TEXT,
    "createdUserId" UUID,
    "createdSanatoriumId" UUID,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PartnerRegistration_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "PartnerRegistration_status_createdAt_idx" ON "PartnerRegistration"("status", "createdAt");
CREATE INDEX IF NOT EXISTS "PartnerRegistration_username_idx" ON "PartnerRegistration"("username");
CREATE INDEX IF NOT EXISTS "PartnerRegistration_email_idx" ON "PartnerRegistration"("email");
CREATE UNIQUE INDEX IF NOT EXISTS "PartnerRegistration_pending_username_key"
  ON "PartnerRegistration" (lower("username")) WHERE "status" = 'PENDING';
CREATE UNIQUE INDEX IF NOT EXISTS "PartnerRegistration_pending_email_key"
  ON "PartnerRegistration" (lower("email")) WHERE "status" = 'PENDING';
