CREATE TABLE IF NOT EXISTS "DevicePushToken" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "token" TEXT NOT NULL,
    "platform" TEXT NOT NULL DEFAULT 'ANDROID',
    "deviceId" TEXT,
    "deviceLabel" TEXT,
    "appVersion" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "invalidatedAt" TIMESTAMP(3),
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DevicePushToken_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "DevicePushToken_token_key" ON "DevicePushToken"("token");
CREATE INDEX IF NOT EXISTS "DevicePushToken_userId_active_idx" ON "DevicePushToken"("userId", "active");
CREATE INDEX IF NOT EXISTS "DevicePushToken_userId_deviceId_idx" ON "DevicePushToken"("userId", "deviceId");
