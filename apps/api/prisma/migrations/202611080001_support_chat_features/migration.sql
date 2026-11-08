-- AlterTable SupportMessage with image, edit, and soft-delete/audit retention
ALTER TABLE "SupportMessage" ADD COLUMN IF NOT EXISTS "imageUrl" TEXT;
ALTER TABLE "SupportMessage" ADD COLUMN IF NOT EXISTS "isEdited" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "SupportMessage" ADD COLUMN IF NOT EXISTS "deletedForUser" BOOLEAN NOT NULL DEFAULT false;
