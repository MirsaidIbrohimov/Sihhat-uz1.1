BEGIN;
ALTER TABLE "Membership" ADD COLUMN "adminDenies" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
-- Preserve pre-existing restrictions conservatively during upgrade.
UPDATE "Membership" SET "adminDenies" = "denies", "denies" = ARRAY[]::TEXT[];
COMMIT;
