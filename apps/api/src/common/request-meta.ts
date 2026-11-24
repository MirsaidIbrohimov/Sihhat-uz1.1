import type { Request } from 'express';

const IP_TOKEN_RE = /^[a-fA-F0-9:.]{2,64}$/;

export function normalizeIp(raw?: string | null): string {
  if (!raw || typeof raw !== 'string') return 'unknown';
  let value = raw.trim();
  if (!value) return 'unknown';
  if (value.startsWith('::ffff:')) value = value.slice(7);
  if (value.startsWith('[') && value.includes(']')) {
    value = value.slice(1, value.indexOf(']'));
  }
  const colonParts = value.split(':');
  if (colonParts.length === 2 && /^\d+\.\d+\.\d+\.\d+$/.test(colonParts[0])) {
    value = colonParts[0];
  }
  if (!IP_TOKEN_RE.test(value)) return 'unknown';
  return value;
}

function isPrivateOrLoopback(ip: string): boolean {
  if (ip === 'unknown' || ip === '::1' || ip === '127.0.0.1' || ip.startsWith('127.')) return true;
  if (ip.startsWith('10.') || ip.startsWith('192.168.')) return true;
  if (/^172\.(1[6-9]|2\d|3[01])\./.test(ip)) return true;
  if (ip.toLowerCase().startsWith('fc') || ip.toLowerCase().startsWith('fd') || ip.toLowerCase().startsWith('fe80:')) return true;
  return false;
}

/**
 * Resolves the client IP address for audit/session storage.
 * Uses Express's req.ip first (which respects TRUST_PROXY). When req.ip is a
 * private/loopback reverse-proxy hop, inspects standard proxy forwarding headers.
 */
export function resolveAuditIp(req?: Request): string {
  if (!req) return 'unknown';
  const direct = normalizeIp(req.ip || req.socket?.remoteAddress || '');
  if (direct !== 'unknown' && !isPrivateOrLoopback(direct)) {
    return direct;
  }

  const cfIp = normalizeIp(req.header('cf-connecting-ip'));
  if (cfIp !== 'unknown') return cfIp;

  const realIp = normalizeIp(req.header('x-real-ip'));
  if (realIp !== 'unknown') return realIp;

  const forwarded = req.header('x-forwarded-for');
  if (forwarded && typeof forwarded === 'string') {
    const hops = forwarded
      .split(',')
      .map((part) => normalizeIp(part))
      .filter((part) => part !== 'unknown');
    if (hops.length > 0) {
      const publicHop = hops.find((hop) => !isPrivateOrLoopback(hop));
      return publicHop ?? hops[0];
    }
  }

  return direct;
}

export function sanitizeUserAgent(userAgent?: string | null): string | null {
  if (!userAgent || typeof userAgent !== 'string') return null;
  const clean = userAgent.replace(/[\r\n\t]+/g, ' ').trim().slice(0, 512);
  return clean || null;
}

export function detectDeviceLabel(
  userAgent?: string | null,
  channel: 'WEB' | 'MOBILE' = 'WEB',
  customDeviceLabel?: string | null,
  appVersion?: string | null,
): string {
  const custom = typeof customDeviceLabel === 'string'
    ? customDeviceLabel.replace(/[\r\n\t]+/g, ' ').trim().slice(0, 120)
    : '';
  const cleanAppVer = typeof appVersion === 'string'
    ? appVersion.replace(/[^a-zA-Z0-9.+_-]/g, '').slice(0, 32)
    : '';
  if (custom) {
    return cleanAppVer && !custom.includes(cleanAppVer)
      ? `${custom} (v${cleanAppVer})`
      : custom;
  }

  const ua = (userAgent ?? '').slice(0, 512);
  if (channel === 'MOBILE') {
    const androidModelMatch = /Android\s+[\d.]+;\s*([^;)]+?)(?:\s+Build\/|\))/i.exec(ua);
    const model = androidModelMatch?.[1]?.trim().slice(0, 48);
    if (/iPhone/i.test(ua)) return cleanAppVer ? `iPhone · iOS ilovasi (v${cleanAppVer})` : 'iPhone · iOS ilovasi';
    if (/iPad/i.test(ua)) return cleanAppVer ? `iPad · iOS ilovasi (v${cleanAppVer})` : 'iPad · iOS ilovasi';
    if (model && !/^wv$|^K$/i.test(model)) {
      return cleanAppVer ? `Android (${model}) · v${cleanAppVer}` : `Android (${model})`;
    }
    if (/Android|Dart\/|okhttp|Flutter/i.test(ua)) {
      return cleanAppVer ? `Android ilovasi (v${cleanAppVer})` : 'Android ilovasi';
    }
    return cleanAppVer ? `Mobil ilova (v${cleanAppVer})` : 'Android ilovasi';
  }

  const browser = /Edg\//i.test(ua)
    ? 'Edge'
    : /OPR\/|Opera/i.test(ua)
      ? 'Opera'
      : /YaBrowser\//i.test(ua)
        ? 'Yandex Browser'
        : /SamsungBrowser\//i.test(ua)
          ? 'Samsung Browser'
          : /Firefox\//i.test(ua)
            ? 'Firefox'
            : /Chrome\//i.test(ua)
              ? 'Chrome'
              : /Safari\//i.test(ua)
                ? 'Safari'
                : 'Brauzer';

  let system = 'Noma’lum qurilma';
  if (/Android/i.test(ua)) {
    const m = /Android\s+[\d.]+;\s*([^;)]+?)(?:\s+Build\/|\))/i.exec(ua);
    const model = m?.[1]?.trim().slice(0, 40);
    system = model && !/^K$|^wv$/i.test(model) ? `Android (${model})` : 'Android';
  } else if (/iPhone/i.test(ua)) {
    system = 'iPhone (iOS)';
  } else if (/iPad/i.test(ua)) {
    system = 'iPad (iOS)';
  } else if (/Windows/i.test(ua)) {
    system = 'Windows';
  } else if (/Macintosh|Mac OS X/i.test(ua)) {
    system = 'macOS';
  } else if (/Linux/i.test(ua)) {
    system = 'Linux';
  }

  return `${browser} · ${system}`;
}

export function extractRequestMeta(req?: Request, channel: 'WEB' | 'MOBILE' = 'WEB') {
  const userAgent = sanitizeUserAgent(req?.header('User-Agent'));
  const customDevice = req?.header('X-Device-Label') || req?.header('X-Device-Name') || null;
  const appVersion = req?.header('X-App-Version') || null;
  return {
    rateLimitIp: req?.ip ?? 'unknown',
    ipAddress: resolveAuditIp(req),
    userAgent,
    deviceLabel: detectDeviceLabel(userAgent, channel, customDevice, appVersion),
  };
}

export const ENSURE_AUTH_EVENTS_AND_PARTNER_REG_SQL = [
  'ALTER TABLE "Session" ADD COLUMN IF NOT EXISTS "ipAddress" TEXT, ADD COLUMN IF NOT EXISTS "userAgent" TEXT',
  `CREATE TABLE IF NOT EXISTS "AuthEvent" (
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
  )`,
  'CREATE INDEX IF NOT EXISTS "AuthEvent_userId_createdAt_idx" ON "AuthEvent"("userId", "createdAt")',
  'CREATE INDEX IF NOT EXISTS "AuthEvent_sanatoriumId_createdAt_idx" ON "AuthEvent"("sanatoriumId", "createdAt")',
  'CREATE INDEX IF NOT EXISTS "AuthEvent_eventType_createdAt_idx" ON "AuthEvent"("eventType", "createdAt")',
  'CREATE INDEX IF NOT EXISTS "AuthEvent_createdAt_idx" ON "AuthEvent"("createdAt")',
  `CREATE TABLE IF NOT EXISTS "PartnerRegistration" (
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
  )`,
  'CREATE INDEX IF NOT EXISTS "PartnerRegistration_status_createdAt_idx" ON "PartnerRegistration"("status", "createdAt")',
  'CREATE INDEX IF NOT EXISTS "PartnerRegistration_username_idx" ON "PartnerRegistration"("username")',
  'CREATE INDEX IF NOT EXISTS "PartnerRegistration_email_idx" ON "PartnerRegistration"("email")',
  `CREATE UNIQUE INDEX IF NOT EXISTS "PartnerRegistration_pending_username_key" ON "PartnerRegistration" (lower("username")) WHERE "status" = 'PENDING'`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "PartnerRegistration_pending_email_key" ON "PartnerRegistration" (lower("email")) WHERE "status" = 'PENDING'`,
];
