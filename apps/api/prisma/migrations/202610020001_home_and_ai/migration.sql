CREATE TABLE "PublicArticle" (
  "id" UUID NOT NULL, "title" TEXT NOT NULL, "summary" TEXT NOT NULL, "body" TEXT NOT NULL,
  "kind" TEXT NOT NULL DEFAULT 'NEWS', "status" TEXT NOT NULL DEFAULT 'DRAFT',
  "publishedAt" TIMESTAMP(3), "version" INTEGER NOT NULL DEFAULT 1,
  "createdBy" UUID NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PublicArticle_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "PublicArticle_kind_check" CHECK ("kind" IN ('NEWS', 'TIP')),
  CONSTRAINT "PublicArticle_status_check" CHECK ("status" IN ('DRAFT', 'PUBLISHED', 'ARCHIVED')),
  CONSTRAINT "PublicArticle_published_check" CHECK ("status" <> 'PUBLISHED' OR "publishedAt" IS NOT NULL)
);
CREATE INDEX "PublicArticle_status_publishedAt_idx" ON "PublicArticle"("status", "publishedAt");
CREATE TABLE "AiUsage" (
  "id" UUID NOT NULL, "userId" UUID NOT NULL, "provider" TEXT NOT NULL, "model" TEXT NOT NULL,
  "outcome" TEXT NOT NULL, "inputTokens" INTEGER NOT NULL DEFAULT 0, "outputTokens" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AiUsage_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "AiUsage_createdAt_provider_idx" ON "AiUsage"("createdAt", "provider");
