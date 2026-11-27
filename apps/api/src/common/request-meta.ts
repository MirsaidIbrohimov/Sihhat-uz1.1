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

export type DeviceDescriptor = {
  deviceLabel: string;
  deviceType: 'SMARTPHONE' | 'TABLET' | 'DESKTOP';
  deviceTypeLabel: string;
  browser: string;
  os: string;
  channelLabel: string;
  summary: string;
};

const GENERIC_DEVICE_LABELS = new Set([
  '',
  'unknown',
  'web',
  'mobile',
  'brauzer',
  'veb brauzer',
  'veb panel',
  'mobil ilova',
  'noma’lum qurilma',
  "noma'lum qurilma",
  'brauzer · noma’lum qurilma',
  "brauzer · noma'lum qurilma",
]);

export function isGenericDeviceLabel(label?: string | null): boolean {
  if (!label || typeof label !== 'string') return true;
  return GENERIC_DEVICE_LABELS.has(label.trim().toLowerCase());
}

function parseBrowserWithVersion(ua: string, chUa = ''): { shortName: string; fullName: string } {
  const matchVer = (re: RegExp) => re.exec(ua)?.[1]?.split('.')[0] ?? '';
  if (/Edg\//i.test(ua) || /Microsoft Edge/i.test(chUa)) {
    const v = matchVer(/Edg\/([\d.]+)/i) || /Microsoft Edge";v="(\d+)/i.exec(chUa)?.[1] || '';
    return { shortName: 'Edge', fullName: v ? `Microsoft Edge ${v}` : 'Microsoft Edge' };
  }
  if (/OPR\/|Opera/i.test(ua) || /Opera/i.test(chUa)) {
    const v = matchVer(/(?:OPR|Opera)\/([\d.]+)/i);
    return { shortName: 'Opera', fullName: v ? `Opera ${v}` : 'Opera' };
  }
  if (/YaBrowser\//i.test(ua)) {
    const v = matchVer(/YaBrowser\/([\d.]+)/i);
    return { shortName: 'Yandex Browser', fullName: v ? `Yandex Browser ${v}` : 'Yandex Browser' };
  }
  if (/SamsungBrowser\//i.test(ua)) {
    const v = matchVer(/SamsungBrowser\/([\d.]+)/i);
    return { shortName: 'Samsung Browser', fullName: v ? `Samsung Internet ${v}` : 'Samsung Internet' };
  }
  if (/Telegram/i.test(ua)) {
    return { shortName: 'Telegram Browser', fullName: 'Telegram ichki brauzeri' };
  }
  if (/Firefox\//i.test(ua)) {
    const v = matchVer(/Firefox\/([\d.]+)/i);
    return { shortName: 'Firefox', fullName: v ? `Mozilla Firefox ${v}` : 'Mozilla Firefox' };
  }
  if (/Chrome\//i.test(ua) || /Google Chrome/i.test(chUa)) {
    const v = matchVer(/Chrome\/([\d.]+)/i) || /Google Chrome";v="(\d+)/i.exec(chUa)?.[1] || '';
    return { shortName: 'Chrome', fullName: v ? `Google Chrome ${v}` : 'Google Chrome' };
  }
  if (/Safari\//i.test(ua)) {
    const v = matchVer(/Version\/([\d.]+)/i);
    return { shortName: 'Safari', fullName: v ? `Apple Safari ${v}` : 'Apple Safari' };
  }
  return { shortName: 'Brauzer', fullName: 'Veb brauzer' };
}

function parseOsInfo(
  ua: string,
  chPlatform = '',
  chModel = '',
): { shortOs: string; fullOs: string; deviceType: 'SMARTPHONE' | 'TABLET' | 'DESKTOP' } {
  const cleanHintModel = chModel.replace(/"/g, '').trim().slice(0, 40);
  if (/iPad/i.test(ua) || /iPad/i.test(chPlatform)) {
    const iosVer = /OS (\d+[._]\d+)/i.exec(ua)?.[1]?.replace('_', '.') ?? '';
    return {
      shortOs: 'iPad (iOS)',
      fullOs: iosVer ? `iPadOS ${iosVer}` : 'iPad (iPadOS)',
      deviceType: 'TABLET',
    };
  }
  if (/iPhone/i.test(ua) || /iOS/i.test(chPlatform)) {
    const iosVer = /iPhone OS (\d+[._]\d+)/i.exec(ua)?.[1]?.replace('_', '.') ?? '';
    return {
      shortOs: 'iPhone (iOS)',
      fullOs: iosVer ? `iPhone · iOS ${iosVer}` : 'iPhone (iOS)',
      deviceType: 'SMARTPHONE',
    };
  }
  if (/Android/i.test(ua) || /Android/i.test(chPlatform)) {
    const verMatch = /Android\s+([\d.]+)/i.exec(ua)?.[1] ?? '';
    const m = /Android\s+[\d.]+;\s*([^;)]+?)(?:\s+Build\/|\))/i.exec(ua);
    const rawModel = m?.[1]?.trim().slice(0, 40);
    const model = rawModel && !/^K$|^wv$/i.test(rawModel) ? rawModel : cleanHintModel;
    const isTablet = /Tablet|SM-T|SM-X|Pad/i.test(ua);
    const shortOs = model ? `Android (${model})` : 'Android';
    const fullOs = [verMatch ? `Android ${verMatch}` : 'Android', model ? `(${model})` : ''].filter(Boolean).join(' ');
    return {
      shortOs,
      fullOs,
      deviceType: isTablet ? 'TABLET' : 'SMARTPHONE',
    };
  }
  if (/Windows/i.test(ua) || /Windows/i.test(chPlatform)) {
    const isWin10Or11 = /Windows NT 10\.0/i.test(ua);
    return {
      shortOs: 'Windows',
      fullOs: isWin10Or11 ? 'Windows 10/11 (Kompyuter)' : 'Windows (Kompyuter)',
      deviceType: 'DESKTOP',
    };
  }
  if (/Macintosh|Mac OS X/i.test(ua) || /macOS/i.test(chPlatform)) {
    return {
      shortOs: 'macOS',
      fullOs: 'Apple macOS (Mac)',
      deviceType: 'DESKTOP',
    };
  }
  if (/Linux/i.test(ua) || /Linux/i.test(chPlatform)) {
    return {
      shortOs: 'Linux',
      fullOs: 'Linux (Kompyuter)',
      deviceType: 'DESKTOP',
    };
  }
  return {
    shortOs: 'Noma’lum qurilma',
    fullOs: 'Aniqlanmagan tizim',
    deviceType: 'DESKTOP',
  };
}

export function detectDeviceLabel(
  userAgent?: string | null,
  channel: 'WEB' | 'MOBILE' = 'WEB',
  customDeviceLabel?: string | null,
  appVersion?: string | null,
  chUa?: string | null,
  chPlatform?: string | null,
  chModel?: string | null,
): string {
  const custom = typeof customDeviceLabel === 'string'
    ? customDeviceLabel.replace(/[\r\n\t]+/g, ' ').trim().slice(0, 120)
    : '';
  const cleanAppVer = typeof appVersion === 'string'
    ? appVersion.replace(/[^a-zA-Z0-9.+_-]/g, '').slice(0, 32)
    : '';
  if (custom && !isGenericDeviceLabel(custom)) {
    return cleanAppVer && !custom.includes(cleanAppVer)
      ? `${custom} (v${cleanAppVer})`
      : custom;
  }

  const ua = (userAgent ?? '').slice(0, 512);
  if (channel === 'MOBILE') {
    const androidModelMatch = /Android\s+[\d.]+;\s*([^;)]+?)(?:\s+Build\/|\))/i.exec(ua);
    const rawModel = androidModelMatch?.[1]?.trim().slice(0, 48);
    const hintModel = (chModel ?? '').replace(/"/g, '').trim().slice(0, 48);
    const model = rawModel && !/^wv$|^K$/i.test(rawModel) ? rawModel : hintModel;
    if (/iPhone/i.test(ua)) return cleanAppVer ? `iPhone · iOS ilovasi (v${cleanAppVer})` : 'iPhone · iOS ilovasi';
    if (/iPad/i.test(ua)) return cleanAppVer ? `iPad · iOS ilovasi (v${cleanAppVer})` : 'iPad · iOS ilovasi';
    if (model) {
      return cleanAppVer ? `Android (${model}) · v${cleanAppVer}` : `Android (${model})`;
    }
    if (/Android|Dart\/|okhttp|Flutter/i.test(ua)) {
      return cleanAppVer ? `Android ilovasi (v${cleanAppVer})` : 'Android ilovasi';
    }
    return cleanAppVer ? `Mobil ilova (v${cleanAppVer})` : 'Android ilovasi';
  }

  const { shortName: browser } = parseBrowserWithVersion(ua, chUa ?? '');
  const { shortOs: system } = parseOsInfo(ua, chPlatform ?? '', chModel ?? '');
  return `${browser} · ${system}`;
}

export function describeDeviceMeta(
  userAgent?: string | null,
  channel: 'WEB' | 'MOBILE' = 'WEB',
  deviceLabel?: string | null,
  appVersion?: string | null,
): DeviceDescriptor {
  const ua = (userAgent ?? '').slice(0, 512);
  const resolvedLabel = !isGenericDeviceLabel(deviceLabel)
    ? String(deviceLabel).trim()
    : detectDeviceLabel(ua, channel, null, appVersion);

  const osParsed = parseOsInfo(ua);
  let os = osParsed.fullOs;
  let deviceType = osParsed.deviceType;
  let browser = '';

  if (channel === 'MOBILE') {
    if (deviceType === 'DESKTOP') deviceType = /iPad|Tablet/i.test(resolvedLabel) ? 'TABLET' : 'SMARTPHONE';
    if (os === 'Aniqlanmagan tizim') {
      if (/iPhone|iOS/i.test(resolvedLabel)) os = 'iPhone (iOS)';
      else if (/iPad/i.test(resolvedLabel)) os = 'iPad (iPadOS)';
      else {
        const m = /Android\s*\(([^)]+)\)/i.exec(resolvedLabel);
        os = m ? `Android (${m[1]})` : 'Android smartfoni';
      }
    }
    const verMatch = /v(\d+\.\d+(?:\.\d+)?)/i.exec(resolvedLabel) || (appVersion ? [null, appVersion] : null);
    browser = verMatch?.[1] ? `Sihhat.uz ilovasi v${verMatch[1]}` : 'Sihhat.uz mobil ilovasi';
  } else {
    const b = parseBrowserWithVersion(ua);
    browser = b.fullName;
    if (browser === 'Veb brauzer' && !isGenericDeviceLabel(resolvedLabel)) {
      const parts = resolvedLabel.split('·').map((s) => s.trim());
      if (parts[0]) browser = parts[0];
      if (parts[1] && os === 'Aniqlanmagan tizim') os = parts[1];
    }
    if (os === 'Aniqlanmagan tizim') {
      if (/Android/i.test(resolvedLabel)) {
        os = 'Android';
        deviceType = 'SMARTPHONE';
      } else if (/iPhone|iOS/i.test(resolvedLabel)) {
        os = 'iPhone (iOS)';
        deviceType = 'SMARTPHONE';
      } else if (/iPad/i.test(resolvedLabel)) {
        os = 'iPad (iPadOS)';
        deviceType = 'TABLET';
      } else if (/Windows/i.test(resolvedLabel)) {
        os = 'Windows (Kompyuter)';
      } else if (/macOS|Mac/i.test(resolvedLabel)) {
        os = 'Apple macOS';
      } else if (/Linux/i.test(resolvedLabel)) {
        os = 'Linux';
      } else {
        os = 'Kompyuter / Veb qurilma';
      }
    }
  }

  const deviceTypeLabel =
    deviceType === 'SMARTPHONE'
      ? 'Smartfon'
      : deviceType === 'TABLET'
        ? 'Planshet'
        : 'Kompyuter';
  const channelLabel = channel === 'MOBILE' ? 'Sihhat.uz mobil ilovasi' : 'Veb boshqaruv paneli';
  const displayLabel = isGenericDeviceLabel(resolvedLabel)
    ? (channel === 'MOBILE' ? 'Android ilovasi' : `${browser} · ${os}`)
    : resolvedLabel;
  const summary = `${deviceTypeLabel} · ${os} · ${browser} · ${channelLabel}`;

  return {
    deviceLabel: displayLabel,
    deviceType,
    deviceTypeLabel,
    browser,
    os,
    channelLabel,
    summary,
  };
}

export function extractRequestMeta(req?: Request, channel: 'WEB' | 'MOBILE' = 'WEB') {
  const userAgent = sanitizeUserAgent(req?.header('User-Agent'));
  const customDevice = req?.header('X-Device-Label') || req?.header('X-Device-Name') || null;
  const appVersion = req?.header('X-App-Version') || null;
  const chUa = req?.header('Sec-CH-UA') || null;
  const chPlatform = req?.header('Sec-CH-UA-Platform') || null;
  const chModel = req?.header('Sec-CH-UA-Model') || null;
  return {
    rateLimitIp: req?.ip ?? 'unknown',
    ipAddress: resolveAuditIp(req),
    userAgent,
    deviceLabel: detectDeviceLabel(userAgent, channel, customDevice, appVersion, chUa, chPlatform, chModel),
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
