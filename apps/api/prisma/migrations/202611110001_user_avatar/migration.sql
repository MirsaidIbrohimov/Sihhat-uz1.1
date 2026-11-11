-- AlterTable User with avatarUrl for profile photos across web and mobile
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "avatarUrl" TEXT;
