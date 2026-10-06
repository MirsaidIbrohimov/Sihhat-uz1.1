-- Existing web sessions start their inactivity window when this migration is applied.
ALTER TABLE "Session" ADD COLUMN "lastActivityAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
