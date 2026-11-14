-- AlterTable User with email for superadmin security & operational alerts
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "email" TEXT;
