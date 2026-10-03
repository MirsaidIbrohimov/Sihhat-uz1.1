-- Staff Telegram accounts are linked only after an authenticated web confirmation.
ALTER TABLE "NotificationDelivery"
  ADD COLUMN "attempts" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "availableAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN "leaseUntil" TIMESTAMP(3),
  ADD COLUMN "lastError" TEXT;
CREATE INDEX "NotificationDelivery_channel_status_availableAt_idx" ON "NotificationDelivery"("channel", "status", "availableAt");

CREATE TABLE "TelegramAccount" (
  "id" UUID NOT NULL,
  "userId" UUID NOT NULL,
  "telegramUserId" TEXT NOT NULL,
  "chatId" TEXT NOT NULL,
  "displayName" TEXT NOT NULL,
  "username" TEXT,
  "sanatoriumId" UUID,
  "notificationsEnabled" BOOLEAN NOT NULL DEFAULT true,
  "notifyBookings" BOOLEAN NOT NULL DEFAULT true,
  "notifyPayments" BOOLEAN NOT NULL DEFAULT true,
  "notifyTasks" BOOLEAN NOT NULL DEFAULT true,
  "notifySupport" BOOLEAN NOT NULL DEFAULT true,
  "notifyBilling" BOOLEAN NOT NULL DEFAULT true,
  "dailyDigest" BOOLEAN NOT NULL DEFAULT true,
  "digestHour" INTEGER NOT NULL DEFAULT 8,
  "quietHours" BOOLEAN NOT NULL DEFAULT true,
  "state" JSONB NOT NULL DEFAULT '{}',
  "stateUpdatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "blockedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "TelegramAccount_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "TelegramAccount_identity_check" CHECK ("telegramUserId" ~ '^[1-9][0-9]{0,19}$' AND "chatId" = "telegramUserId"),
  CONSTRAINT "TelegramAccount_digestHour_check" CHECK ("digestHour" BETWEEN 0 AND 23),
  CONSTRAINT "TelegramAccount_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "TelegramAccount_sanatoriumId_fkey" FOREIGN KEY ("sanatoriumId") REFERENCES "Sanatorium"("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "TelegramAccount_userId_key" ON "TelegramAccount"("userId");
CREATE UNIQUE INDEX "TelegramAccount_telegramUserId_key" ON "TelegramAccount"("telegramUserId");
CREATE UNIQUE INDEX "TelegramAccount_chatId_key" ON "TelegramAccount"("chatId");

CREATE TABLE "TelegramLinkRequest" (
  "id" UUID NOT NULL,
  "userId" UUID NOT NULL,
  "sessionId" UUID NOT NULL,
  "tokenHash" TEXT NOT NULL,
  "telegramUserId" TEXT,
  "chatId" TEXT,
  "displayName" TEXT,
  "username" TEXT,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "claimedAt" TIMESTAMP(3),
  "consumedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TelegramLinkRequest_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "TelegramLinkRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "TelegramLinkRequest_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "Session"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "TelegramLinkRequest_tokenHash_key" ON "TelegramLinkRequest"("tokenHash");
CREATE INDEX "TelegramLinkRequest_userId_createdAt_idx" ON "TelegramLinkRequest"("userId", "createdAt");

CREATE TABLE "TelegramInbound" (
  "id" TEXT NOT NULL,
  "botId" TEXT NOT NULL,
  "updateId" BIGINT NOT NULL,
  "chatId" TEXT,
  "encryptedPayload" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "availableAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "leaseUntil" TIMESTAMP(3),
  "lastError" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TelegramInbound_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "TelegramInbound_status_check" CHECK ("status" IN ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED')),
  CONSTRAINT "TelegramInbound_updateId_check" CHECK ("updateId" >= 0)
);
CREATE UNIQUE INDEX "TelegramInbound_botId_updateId_key" ON "TelegramInbound"("botId", "updateId");
CREATE INDEX "TelegramInbound_botId_status_availableAt_idx" ON "TelegramInbound"("botId", "status", "availableAt");

CREATE TABLE "TelegramBotState" (
  "botId" TEXT NOT NULL,
  "username" TEXT,
  "offset" BIGINT NOT NULL DEFAULT 0,
  "lastPollAt" TIMESTAMP(3),
  "workerHeartbeatAt" TIMESTAMP(3),
  CONSTRAINT "TelegramBotState_pkey" PRIMARY KEY ("botId")
);
CREATE TABLE "TelegramScheduledEvent" (
  "id" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TelegramScheduledEvent_pkey" PRIMARY KEY ("id")
);
