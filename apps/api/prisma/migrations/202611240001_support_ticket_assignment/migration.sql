ALTER TABLE "SupportTicket"
  ADD COLUMN IF NOT EXISTS "assignedToUserId" UUID,
  ADD COLUMN IF NOT EXISTS "assignedByUserId" UUID,
  ADD COLUMN IF NOT EXISTS "assignedAt" TIMESTAMP(3);

CREATE INDEX IF NOT EXISTS "SupportTicket_assignedToUserId_status_idx"
  ON "SupportTicket"("assignedToUserId", "status");
CREATE INDEX IF NOT EXISTS "SupportTicket_sanatoriumId_status_idx"
  ON "SupportTicket"("sanatoriumId", "status");
