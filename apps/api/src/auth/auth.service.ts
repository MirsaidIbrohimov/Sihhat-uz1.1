import { Inject, Injectable, type OnModuleInit } from '@nestjs/common';
import { z } from 'zod';
import { createHmac, randomInt } from 'node:crypto';
import { CONFIG, type Config } from '../common/config';
import { Db, audit, hash, lock, emit, type Tx } from '../common/db';
import { fail, parse, uuid, pageQuery, paged } from '../common/errors';
import { decrypt, encrypt, matchTotp, opaque, passwordHash, passwordMatches } from '../common/crypto';
import { describeDeviceMeta, detectDeviceLabel, ENSURE_AUTH_EVENTS_AND_PARTNER_REG_SQL, isGenericDeviceLabel, normalizeIp, sanitizeUserAgent } from '../common/request-meta';
import { dateFilter } from '../bookings/search';
import { Sms } from './sms';
import { EmailService } from './email';
import { Actor, effective, requirePlatform, scope } from './permissions';
import { normalizeAvatarInput } from './avatar.util';
import { allocateUserPublicId, resolveUserPublicId } from './public-id.util';

export const phoneSchema = z.string().transform(v => v.replace(/[\s()-]/g, '')).pipe(z.string().regex(/^\+998\d{9}$/));
export const loginSchema = z.string().trim().toLowerCase().min(3).max(64).regex(/^[a-z0-9._@-]+$/);
export const optionalEmailSchema = z.string().trim().toLowerCase().email('To‘g‘ri email manzil kiriting').max(120);
export const passwordSchema = z.string().min(8).max(128).refine(v => /[a-z]/.test(v) && /[A-Z]/.test(v) && /[0-9]/.test(v), 'Parolda katta/kichik harf va raqam bo‘lsin');
export const staffLoginInput = z.object({ login: loginSchema, password: z.string().min(1).max(128), mfa_code: z.string().optional() }).passthrough();
export const partnerForgotPasswordInput = z.object({
  login: loginSchema,
  phone: z.string().trim().max(30).optional(),
  note: z.string().trim().max(300).optional(),
}).strict();
export const otpRequestInput = z.object({
  email: z.string().email('To‘g‘ri email manzil kiriting').max(120).toLowerCase().trim().optional(),
  phone: phoneSchema.optional(),
}).strict().refine(d => Boolean(d.email || d.phone), { message: 'Elektron pochta (email) kiritilishi shart' });
export const otpVerifyInput = z.object({ challenge_id: uuid, code: z.string().regex(/^\d{6}$/) }).strict();
export const changePasswordInput = z.object({ current_password: z.string().max(128), new_password: passwordSchema }).strict();
export const webIdleTimeoutSeconds = (kind: string) => kind === 'SUPERADMIN' ? 2 * 3600 : kind === 'STAFF' ? 4 * 3600 : null;
const idleExpired = (session: { channel: string; lastActivityAt: Date }, kind: string) => {
  const seconds = session.channel === 'WEB' ? webIdleTimeoutSeconds(kind) : null;
  return seconds !== null && Date.now() - session.lastActivityAt.getTime() >= seconds * 1000;
};
const idleFailure = () => fail('SESSION_IDLE_EXPIRED', 'Faolsizlik sababli hisobdan chiqdingiz. Qayta kiring.', 401);
export function webDeviceLabel(userAgent = '') {
  return detectDeviceLabel(userAgent, 'WEB');
}
export type AuthRequestMeta = {
  rateLimitIp?: string;
  ipAddress?: string;
  userAgent?: string | null;
  deviceLabel?: string | null;
};

@Injectable()
export class AuthService implements OnModuleInit {
  constructor(
    @Inject(Db) readonly db: Db,
    @Inject(CONFIG) readonly config: Config,
    @Inject(Sms) readonly sms: Sms,
    @Inject(EmailService) readonly email: EmailService,
  ) {}
  async onModuleInit() {
    if (typeof (this.db as unknown as { $executeRawUnsafe?: unknown })?.$executeRawUnsafe !== 'function') return;
    try {
      await this.db.$executeRawUnsafe('ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "avatarUrl" TEXT, ADD COLUMN IF NOT EXISTS "email" TEXT, ADD COLUMN IF NOT EXISTS "publicId" INTEGER');
      for (const stmt of ENSURE_AUTH_EVENTS_AND_PARTNER_REG_SQL) {
        await this.db.$executeRawUnsafe(stmt).catch(() => undefined);
      }
      await this.backfillAuthEventsFromSessions(500);
      if (typeof (this.db as unknown as { user?: { findMany?: unknown; update?: unknown } })?.user?.findMany === 'function') {
        await this.db.$executeRawUnsafe('CREATE UNIQUE INDEX IF NOT EXISTS "User_publicId_key" ON "User"("publicId")');
        const missing = await this.db.user.findMany({
          where: { publicId: null },
          select: { id: true },
          take: 500,
        });
        for (const row of missing) {
          const publicId = await allocateUserPublicId(this.db, row.id);
          await this.db.user.update({ where: { id: row.id }, data: { publicId } }).catch(() => undefined);
        }
      }
    } catch {
      // Schema already migrated or test mock without DDL support
    }
  }
  async recordAuthEvent(
    target: Tx | Db,
    params: {
      userId: string;
      sessionId?: string | null;
      eventType: 'LOGIN' | 'LOGOUT' | 'SESSION_REVOKED' | 'SESSION_EXPIRED';
      channel: string;
      authMethod?: string | null;
      ipAddress?: string | null;
      deviceLabel?: string | null;
      userAgent?: string | null;
      userKind?: string | null;
      userName?: string | null;
      userLogin?: string | null;
      userEmail?: string | null;
      sanatoriumId?: string | null;
    },
  ) {
    if (typeof (target as any)?.authEvent?.create !== 'function') return;
    try {
      await (target as any).authEvent.create({
        data: {
          userId: params.userId,
          sessionId: params.sessionId ?? null,
          eventType: params.eventType,
          channel: params.channel,
          authMethod: params.authMethod ?? null,
          ipAddress: normalizeIp(params.ipAddress),
          deviceLabel: (params.deviceLabel?.trim() || 'Noma’lum qurilma').slice(0, 140),
          userAgent: sanitizeUserAgent(params.userAgent),
          userKind: params.userKind ?? null,
          userName: params.userName ?? null,
          userLogin: params.userLogin ?? null,
          userEmail: params.userEmail ?? null,
          sanatoriumId: params.sanatoriumId ?? null,
        },
      });
    } catch {
      // Never break auth flow if AuthEvent DDL is absent in mocked tests
    }
  }
  async hydrateSessionMeta(sessionId: string | undefined, meta?: AuthRequestMeta) {
    if (!sessionId || !meta) return;
    if (typeof (this.db as any)?.session?.findUnique !== 'function' || typeof (this.db as any)?.session?.updateMany !== 'function') {
      return;
    }
    const cleanIp = normalizeIp(meta.ipAddress);
    const cleanUa = sanitizeUserAgent(meta.userAgent);
    if (cleanIp === 'unknown' && !cleanUa) return;
    try {
      const existing = await this.db.session.findUnique({
        where: { id: sessionId },
        select: { id: true, ipAddress: true, userAgent: true },
      });
      if (!existing) return;
      const needsIp = (!existing.ipAddress || existing.ipAddress === 'unknown') && cleanIp !== 'unknown';
      const needsUa = !existing.userAgent && Boolean(cleanUa);
      if (!needsIp && !needsUa) return;
      await this.db.session.updateMany({
        where: { id: sessionId },
        data: {
          ...(needsIp ? { ipAddress: cleanIp } : {}),
          ...(needsUa ? { userAgent: cleanUa } : {}),
        },
      });
      if (needsIp && typeof (this.db as any)?.authEvent?.updateMany === 'function') {
        await this.db.authEvent.updateMany({
          where: { sessionId, ipAddress: 'unknown' },
          data: {
            ipAddress: cleanIp,
            ...(needsUa ? { userAgent: cleanUa } : {}),
          },
        });
      }
    } catch {
      // Never block /auth/me or /auth/sessions on telemetry hydration
    }
  }
  async backfillAuthEventsFromSessions(limit = 500, onlyUserId?: string): Promise<number> {
    if (
      typeof (this.db as any)?.session?.findMany !== 'function' ||
      typeof (this.db as any)?.authEvent?.findMany !== 'function' ||
      typeof (this.db as any)?.authEvent?.createMany !== 'function'
    ) {
      return 0;
    }
    try {
      const sessions = await this.db.session.findMany({
        where: onlyUserId ? { userId: onlyUserId } : undefined,
        orderBy: { createdAt: 'desc' },
        take: limit,
        select: {
          id: true,
          userId: true,
          channel: true,
          deviceLabel: true,
          ipAddress: true,
          userAgent: true,
          createdAt: true,
          revokedAt: true,
        },
      });
      if (!sessions.length) return 0;

      const candidateUserIds = [...new Set(sessions.map((s) => s.userId))];
      const usersWithEvents = await this.db.authEvent.findMany({
        where: { userId: { in: candidateUserIds } },
        distinct: ['userId'],
        select: { userId: true },
      });
      const existingUserSet = new Set(usersWithEvents.map((e) => e.userId));
      const legacySessions = sessions.filter((s) => !existingUserSet.has(s.userId));
      if (!legacySessions.length) return 0;

      const legacyUserIds = [...new Set(legacySessions.map((s) => s.userId))];
      const [users, memberships] = await Promise.all([
        this.db.user.findMany({
          where: { id: { in: legacyUserIds } },
          select: { id: true, kind: true, name: true, login: true, email: true },
        }),
        typeof (this.db as any)?.membership?.findMany === 'function'
          ? this.db.membership.findMany({
              where: { userId: { in: legacyUserIds }, status: 'ACTIVE' },
              orderBy: { createdAt: 'asc' },
              select: { userId: true, sanatoriumId: true },
            })
          : [],
      ]);
      const userMap = new Map(users.map((u) => [u.id, u]));
      const sanMap = new Map<string, string>();
      for (const m of memberships) {
        if (!sanMap.has(m.userId)) sanMap.set(m.userId, m.sanatoriumId);
      }

      // Group per user chronologically and collapse token-refresh rotation chains
      // (where an old session is revoked within 5s of a new session starting on the same device/channel).
      const byUser = new Map<string, typeof legacySessions>();
      for (const s of legacySessions) {
        const arr = byUser.get(s.userId) ?? [];
        arr.push(s);
        byUser.set(s.userId, arr);
      }

      const toInsert: any[] = [];
      for (const [uid, list] of byUser.entries()) {
        const u = userMap.get(uid);
        if (!u) continue;
        const sorted = [...list].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
        const rotatedRevokedIds = new Set<string>();
        const rotatedCreatedIds = new Set<string>();
        for (let idx = 0; idx < sorted.length; idx++) {
          const cur = sorted[idx];
          if (!cur.revokedAt) continue;
          const next = sorted.find(
            (cand, j) =>
              j > idx &&
              cand.channel === cur.channel &&
              cand.deviceLabel === cur.deviceLabel &&
              Math.abs(cand.createdAt.getTime() - cur.revokedAt!.getTime()) <= 5000,
          );
          if (next) {
            rotatedRevokedIds.add(cur.id);
            rotatedCreatedIds.add(next.id);
          }
        }
        const sanId = u.kind === 'STAFF' ? (sanMap.get(u.id) ?? null) : null;
        for (const s of sorted) {
          const channel = s.channel || (u.kind === 'CUSTOMER' ? 'MOBILE' : 'WEB');
          const email = u.email ?? (u.login?.includes('@') ? u.login : null);
          const base = {
            userId: s.userId,
            sessionId: s.id,
            channel,
            ipAddress: normalizeIp(s.ipAddress),
            deviceLabel: (s.deviceLabel?.trim() || (channel === 'MOBILE' ? 'Android ilovasi' : 'Veb brauzer')).slice(0, 140),
            userAgent: sanitizeUserAgent(s.userAgent),
            userKind: u.kind,
            userName: u.name,
            userLogin: u.login,
            userEmail: email,
            sanatoriumId: sanId,
          };
          if (!rotatedCreatedIds.has(s.id)) {
            toInsert.push({
              ...base,
              eventType: 'LOGIN',
              authMethod: channel === 'MOBILE' ? (email ? 'EMAIL_OTP' : 'SMS_OTP') : 'PASSWORD',
              createdAt: s.createdAt,
            });
          }
          if (s.revokedAt && !rotatedRevokedIds.has(s.id)) {
            toInsert.push({
              ...base,
              eventType: 'LOGOUT',
              authMethod: 'LOGOUT',
              createdAt: s.revokedAt,
            });
          }
        }
      }
      if (!toInsert.length) return 0;
      await this.db.authEvent.createMany({ data: toInsert });
      return toInsert.length;
    } catch {
      return 0;
    }
  }
  async incrementCounter(key: string, seconds: number): Promise<number> {
    const id = hash(key);
    const rows = await this.db.$queryRaw<{ count: number }[]>`
      INSERT INTO "RateLimit" (id, count, "expiresAt") VALUES (${id}, 1, now() + (${seconds} * interval '1 second'))
      ON CONFLICT (id) DO UPDATE SET count = CASE WHEN "RateLimit"."expiresAt" <= now() THEN 1 ELSE "RateLimit".count + 1 END,
      "expiresAt" = CASE WHEN "RateLimit"."expiresAt" <= now() THEN now() + (${seconds} * interval '1 second') ELSE "RateLimit"."expiresAt" END
      RETURNING count`;
    return Number(rows[0]?.count ?? 1);
  }
  async limit(key: string, max: number, seconds: number) {
    const count = await this.incrementCounter(key, seconds);
    if (count > max) fail('RATE_LIMITED', 'Urinishlar ko‘p. Birozdan keyin qayta urinib ko‘ring', 429);
  }
  private async recordFailedLoginAttempt(
    searchLogin: string,
    user: { id: string; name: string; kind: string } | null,
    ip: string,
    userAgent: string,
  ) {
    if (typeof (this.db as unknown as { $queryRaw?: unknown })?.$queryRaw !== 'function') return;
    try {
      const loginFails = await this.incrementCounter(`failed-login-1h:${searchLogin}`, 3600);
      const ipFails = await this.incrementCounter(`failed-login-ip-1h:${ip}`, 3600);
      const loginTrigger = loginFails >= 5 && loginFails % 5 === 0;
      const ipTrigger = !loginTrigger && ipFails >= 5 && ipFails % 5 === 0;
      if (!loginTrigger && !ipTrigger) return;
      const attempts = loginTrigger ? loginFails : ipFails;
      await this.db.atomic(async tx => {
        const admins = await tx.user.findMany({ where: { kind: 'SUPERADMIN', status: 'ACTIVE' }, select: { id: true } });
        const payload = {
          recipient_ids: admins.map(a => a.id),
          attempted_login: searchLogin,
          user_id: user?.id ?? null,
          user_name: user?.name ?? null,
          user_kind: user?.kind ?? null,
          attempts,
          window_minutes: 60,
          ip,
          device: webDeviceLabel(userAgent),
          occurred_at: new Date().toISOString(),
        };
        await audit(tx, user?.id ?? null, 'auth.bruteforce_alert', user?.id ?? searchLogin, undefined, undefined, {
          attempted_login: searchLogin,
          attempts,
          ip,
        });
        await emit(tx, 'auth.bruteforce_alert', payload);
      });
    } catch {
      // Failed-login telemetry must never mask the 401 LOGIN_FAILED response or crash mocked tests
    }
  }
  private otpHash(id: string, code: string) { return createHmac('sha256', this.config.AUTH_SECRET).update(`${id}:${code}`).digest('hex'); }
  async login(body: unknown, ip: string, userAgent = '', meta?: AuthRequestMeta) {
    if (this.config.PUBLIC_DEMO_ENABLED) fail('DEMO_ACCESS_DENIED', 'Demo serverda xodim kirishi yopiq', 403);
    const input = parse(staffLoginInput, body);
    const auditIp = normalizeIp(meta?.ipAddress ?? ip);
    const cleanUa = sanitizeUserAgent(meta?.userAgent ?? userAgent);
    const deviceLabel = meta?.deviceLabel || webDeviceLabel(cleanUa ?? '');
    await this.limit(`staff-login-ip:${ip}`, 30, 900);
    await this.limit(`staff-login:${input.login}`, 10, 900);
    const searchLogin = input.login.trim().toLowerCase();
    const usernamePart = searchLogin.includes('@') ? searchLogin.split('@')[0] : searchLogin;
    const user = await this.db.user.findFirst({
      where: {
        OR: [
          { login: { equals: searchLogin, mode: 'insensitive' as const } },
          { login: { equals: usernamePart, mode: 'insensitive' as const } },
          ...(searchLogin.includes('@') ? [{ email: { equals: searchLogin, mode: 'insensitive' as const } }] : []),
        ],
      },
    });
    const valid = await passwordMatches(input.password, user?.passwordHash ?? null);
    if (!user || !valid || user.status !== 'ACTIVE' || user.kind === 'CUSTOMER') {
      await this.recordFailedLoginAttempt(searchLogin, user ? { id: user.id, name: user.name, kind: user.kind } : null, auditIp, cleanUa ?? '');
      fail('LOGIN_FAILED', 'Login yoki parol noto‘g‘ri', 401);
    }
    return this.db.atomic(async tx => {
      await lock(tx, `user:${user.id}`);
      const current = await tx.user.findUniqueOrThrow({ where: { id: user.id } });
      if (current.status !== 'ACTIVE' || current.passwordHash !== user.passwordHash) fail('LOGIN_FAILED', 'Kirish rad etildi', 401);
      let activeSanatoriumId: string | null = null;
      if (current.kind !== 'SUPERADMIN') {
        const activeMembership = await tx.membership.findFirst({ where: { userId: current.id, status: 'ACTIVE' }, select: { sanatoriumId: true } });
        if (!activeMembership) fail('STAFF_NOT_APPROVED', 'Hisob hali tasdiqlanmagan yoki bloklangan', 403);
        activeSanatoriumId = activeMembership.sanatoriumId;
      }
      const session = await this.issue(tx, current.id, 'WEB', new Date(), deviceLabel, auditIp, cleanUa);
      await this.recordAuthEvent(tx, {
        userId: current.id,
        sessionId: session.session_id,
        eventType: 'LOGIN',
        channel: 'WEB',
        authMethod: 'PASSWORD',
        ipAddress: auditIp,
        deviceLabel,
        userAgent: cleanUa,
        userKind: current.kind,
        userName: current.name,
        userLogin: current.login,
        userEmail: current.email ?? (current.login?.includes('@') ? current.login : null),
        sanatoriumId: activeSanatoriumId,
      });
      await audit(tx, current.id, 'auth.login', current.id, activeSanatoriumId ?? undefined, undefined, {
        ip: auditIp,
        device: deviceLabel,
        channel: 'WEB',
        session_id: session.session_id,
      });
      return { ...session, user: this.publicUser(current) };
    });
  }
  async partnerForgotPassword(body: unknown, ip: string) {
    if (this.config.PUBLIC_DEMO_ENABLED) fail('DEMO_ACCESS_DENIED', 'Demo serverda parol tiklash yopiq', 403);
    const input = parse(partnerForgotPasswordInput, body);
    const searchLogin = input.login.trim().toLowerCase();
    await this.limit(`forgot-ip:${ip}`, 10, 3600);
    await this.limit(`forgot-login:${searchLogin}`, 5, 3600);
    const usernamePart = searchLogin.includes('@') ? searchLogin.split('@')[0] : searchLogin;

    await this.db.atomic(async tx => {
      const target = await tx.user.findFirst({
        where: {
          kind: { not: 'CUSTOMER' },
          OR: [{ login: searchLogin }, { login: usernamePart }],
        },
        select: { id: true, name: true, login: true, phone: true, kind: true, status: true },
      });
      let sanatoriumName: string | null = null;
      if (target) {
        const m = await tx.membership.findFirst({
          where: { userId: target.id },
          orderBy: { createdAt: 'asc' },
          select: { sanatoriumId: true },
        });
        if (m) {
          const san = await tx.sanatorium.findUnique({ where: { id: m.sanatoriumId }, select: { name: true } });
          sanatoriumName = san?.name ?? null;
        }
      }
      const admins = await tx.user.findMany({
        where: { kind: 'SUPERADMIN', status: 'ACTIVE' },
        select: { id: true },
      });
      const cleanPhone = input.phone?.trim() || null;
      const cleanNote = input.note?.trim() || null;
      await audit(tx, target?.id ?? null, 'auth.partner_forgot_password', target?.id ?? searchLogin, undefined, undefined, {
        attempted_login: searchLogin,
        user_found: Boolean(target),
        ip,
      });
      await emit(tx, 'partner.password_reset_requested', {
        recipient_ids: admins.map(a => a.id),
        attempted_login: searchLogin,
        user_found: Boolean(target),
        user_id: target?.id ?? null,
        user_name: target?.name ?? null,
        user_phone: target?.phone ?? null,
        sanatorium_name: sanatoriumName,
        contact_phone: cleanPhone,
        note: cleanNote,
        ip,
        requested_at: new Date().toISOString(),
      });
    });

    return {
      success: true,
      message: 'Parolni tiklash so‘rovi superadminga yuborildi. Tez orada administrator siz bilan bog‘lanadi.',
    };
  }
  async requestOtp(body: unknown, ip: string) {
    const input = parse(otpRequestInput, body);
    const email = input.email?.trim().toLowerCase();
    const phone = input.phone;
    if (!email) {
      this.sms.assertReady();
    }
    const identifier = (email || phone)!;
    const isEmail = Boolean(email);
    await this.limit(`otp-ip:${ip}`, 20, 3600);
    await this.limit(`otp-target:${identifier}`, 10, 3600);
    const code = randomInt(0, 1_000_000).toString().padStart(6, '0');
    const challenge = await this.db.atomic(async tx => {
      await lock(tx, `otp:${identifier}`);
      const recent = await tx.otpChallenge.findFirst({ where: { phone: identifier, purpose: 'LOGIN' }, orderBy: { createdAt: 'desc' } });
      if (recent && recent.createdAt.getTime() + this.config.OTP_RESEND_SECONDS * 1000 > Date.now()) fail('OTP_COOLDOWN', isEmail ? 'Qayta kod uchun biroz kuting' : 'Qayta SMS uchun kuting', 429);
      const collision = await tx.user.findFirst({ where: { OR: [{ login: identifier }, { phone: identifier }] } });
      if (collision && collision.kind !== 'CUSTOMER') fail('CUSTOMER_AUTH_ONLY', isEmail ? 'Bu email xodim hisobiga tegishli' : 'Bu raqam xodim hisobiga tegishli', 403);
      await tx.otpChallenge.updateMany({ where: { phone: identifier, purpose: 'LOGIN', consumedAt: null }, data: { consumedAt: new Date() } });
      const { randomUUID } = await import('node:crypto'); const id = randomUUID();
      return tx.otpChallenge.create({ data: { id, phone: identifier, codeHash: this.otpHash(id, code), expiresAt: new Date(Date.now() + this.config.OTP_TTL_SECONDS * 1000) } });
    });
    if (isEmail) {
      await this.email.send(challenge.id, identifier, code, challenge.expiresAt);
    } else {
      await this.sms.send(challenge.id, identifier, code, challenge.expiresAt);
    }
    return {
      challenge_id: challenge.id,
      expires_at: challenge.expiresAt,
      resend_after: this.config.OTP_RESEND_SECONDS,
      ...(this.config.DEMO_OTP_ENABLED && this.config.NODE_ENV !== 'production' && (isEmail || this.config.SMS_ADAPTER === 'local') ? { demo_code: code } : {}),
    };
  }
  async verifyOtp(body: unknown, ip: string, meta?: AuthRequestMeta) {
    const input = parse(otpVerifyInput, body);
    if (this.config.SMS_ADAPTER === 'disabled' && !this.config.SMTP_HOST && !this.config.RESEND_API_KEY && this.config.NODE_ENV === 'production' && !this.config.DEMO_OTP_ENABLED) {
      this.sms.assertReady();
    }
    const auditIp = normalizeIp(meta?.ipAddress ?? ip);
    const cleanUa = sanitizeUserAgent(meta?.userAgent);
    const deviceLabel = meta?.deviceLabel || detectDeviceLabel(cleanUa, 'MOBILE');
    await this.limit(`verify-ip:${ip}`, 40, 900);
    const result = await this.db.atomic(async tx => {
      await lock(tx, `challenge:${input.challenge_id}`);
      const challenge = await tx.otpChallenge.findUnique({ where: { id: input.challenge_id } });
      if (!challenge || challenge.purpose !== 'LOGIN' || challenge.consumedAt || challenge.expiresAt <= new Date() || challenge.attempts >= this.config.OTP_MAX_ATTEMPTS) return null;
      await tx.otpChallenge.update({ where: { id: challenge.id }, data: { attempts: { increment: 1 } } });
      if (challenge.codeHash !== this.otpHash(challenge.id, input.code)) return null;
      await lock(tx, `otp:${challenge.phone}`);
      const identifier = challenge.phone;
      const isEmail = identifier.includes('@');
      let user = await tx.user.findFirst({
        where: isEmail ? { login: identifier } : { phone: identifier },
      });
      if (!user) {
        const publicId = await allocateUserPublicId(tx);
        user = await tx.user.create({
          data: {
            publicId,
            kind: 'CUSTOMER',
            name: isEmail ? identifier.split('@')[0] : 'Mijoz',
            login: isEmail ? identifier : null,
            phone: isEmail ? null : identifier,
            ...(isEmail ? { email: identifier } : {}),
          },
        });
      }
      if (user.kind !== 'CUSTOMER' || user.status !== 'ACTIVE') return null;
      await tx.otpChallenge.update({ where: { id: challenge.id }, data: { consumedAt: new Date() } });
      if (isEmail) {
        await tx.booking.updateMany({
          where: { userId: null, source: { not: 'APP' }, guest: { path: ['email'], equals: identifier } },
          data: { userId: user.id },
        });
      } else {
        await tx.booking.updateMany({
          where: { userId: null, source: { not: 'APP' }, guest: { path: ['phone'], equals: identifier } },
          data: { userId: user.id },
        });
      }
      const session = await this.issue(tx, user.id, 'MOBILE', new Date(), deviceLabel, auditIp, cleanUa);
      await this.recordAuthEvent(tx, {
        userId: user.id,
        sessionId: session.session_id,
        eventType: 'LOGIN',
        channel: 'MOBILE',
        authMethod: isEmail ? 'EMAIL_OTP' : 'SMS_OTP',
        ipAddress: auditIp,
        deviceLabel,
        userAgent: cleanUa,
        userKind: user.kind,
        userName: user.name,
        userLogin: user.login,
        userEmail: user.email ?? (isEmail ? identifier : null),
      });
      await audit(tx, user.id, 'auth.otp_login', user.id, undefined, undefined, {
        ip: auditIp,
        device: deviceLabel,
        channel: 'MOBILE',
        method: isEmail ? 'EMAIL_OTP' : 'SMS_OTP',
      });
      return { ...session, user: this.publicUser(user) };
    });
    if (!result) fail('OTP_INVALID', 'Kod xato, muddati tugagan yoki ishlatilgan', 401);
    return result;
  }
  async issue(
    tx: Tx,
    userId: string,
    channel: string,
    lastActivityAt = new Date(),
    deviceLabel = channel === 'MOBILE' ? 'Android ilovasi' : 'Brauzer · Noma’lum qurilma',
    ipAddress?: string | null,
    userAgent?: string | null,
  ) {
    const token = opaque(), refresh = opaque(), csrf = opaque();
    const expiresAt = new Date(Date.now() + 30 * 60_000);
    const refreshExpiresAt = new Date(Date.now() + 30 * 86400_000);
    const cleanIp = ipAddress ? normalizeIp(ipAddress) : null;
    const cleanUa = sanitizeUserAgent(userAgent);
    const session = await tx.session.create({
      data: {
        userId,
        channel,
        deviceLabel,
        ...(cleanIp && cleanIp !== 'unknown' ? { ipAddress: cleanIp } : {}),
        ...(cleanUa ? { userAgent: cleanUa } : {}),
        tokenHash: hash(token),
        refreshHash: hash(refresh),
        csrfHash: hash(csrf),
        expiresAt,
        refreshExpiresAt,
        lastActivityAt,
      },
    });
    return { access_token: token, refresh_token: refresh, csrf_token: csrf, expires_at: expiresAt, refresh_expires_at: refreshExpiresAt, session_id: session.id };
  }
  async authenticate(token: string, channel: 'WEB' | 'MOBILE'): Promise<Actor> {
    const session = await this.db.session.findUnique({ where: { tokenHash: hash(token) } });
    if (!session || session.revokedAt || session.expiresAt <= new Date() || session.channel !== channel) fail('UNAUTHENTICATED', 'Qayta kiring', 401);
    const user = await this.db.user.findUnique({ where: { id: session.userId } });
    if (!user || user.status !== 'ACTIVE') fail('UNAUTHENTICATED', 'Hisob bloklangan', 401);
    if (idleExpired(session, user.kind)) {
      const revoked = await this.db.session.updateMany({ where: { id: session.id, revokedAt: null }, data: { revokedAt: new Date() } });
      if (revoked.count) {
        const activeMem = user.kind === 'STAFF'
          ? await this.db.membership.findFirst({ where: { userId: user.id, status: 'ACTIVE' }, select: { sanatoriumId: true } }).catch(() => null)
          : null;
        await this.recordAuthEvent(this.db, {
          userId: user.id,
          sessionId: session.id,
          eventType: 'SESSION_EXPIRED',
          channel: session.channel,
          authMethod: 'IDLE_EXPIRED',
          ipAddress: session.ipAddress ?? 'unknown',
          deviceLabel: session.deviceLabel,
          userAgent: session.userAgent ?? null,
          userKind: user.kind,
          userName: user.name,
          userLogin: user.login,
          userEmail: user.email ?? (user.login?.includes('@') ? user.login : null),
          sanatoriumId: activeMem?.sanatoriumId ?? null,
        });
      }
      idleFailure();
    }
    const memberships = await this.db.membership.findMany({ where: { userId: user.id } });
    if (user.kind === 'STAFF' && !memberships.some(m => m.status === 'ACTIVE')) fail('STAFF_NOT_APPROVED', 'Xodim vakolati faol emas', 403);
    let lastActivityAt = session.lastActivityAt;
    if (channel === 'MOBILE' && Date.now() - session.lastActivityAt.getTime() >= 25_000) {
      const now = new Date();
      await this.db.session.updateMany({ where: { id: session.id, revokedAt: null }, data: { lastActivityAt: now } });
      lastActivityAt = now;
    }
    return { id: user.id, publicId: resolveUserPublicId(user), name: user.name, phone:user.phone, email: user.email ?? (user.login?.includes('@') ? user.login : null), login:user.login, avatarUrl: user.avatarUrl ?? null, kind: user.kind, sessionId: session.id, idleTimeoutSeconds: channel === 'WEB' ? webIdleTimeoutSeconds(user.kind) : null, lastActivityAt: lastActivityAt.toISOString(), mustChangePassword: user.mustChangePassword, memberships: memberships.map(m => ({ id: m.id, sanatoriumId: m.sanatoriumId, role: m.role, status: m.status, permissions: m.status === 'ACTIVE' ? effective(m) : [], version: m.version })) };
  }
  async csrf(sessionId: string, token: string | undefined, origin: string | undefined) {
    if (!token || !origin || !this.config.CORS_ORIGINS.split(',').includes(origin)) fail('CSRF_INVALID', 'Sahifani yangilab qayta urinib ko‘ring', 403);
    const session = await this.db.session.findUnique({ where: { id: sessionId } });
    if (!session || session.csrfHash !== hash(token)) fail('CSRF_INVALID', 'Sessiya himoyasi xatosi', 403);
  }
  async refresh(refreshToken: string, channel: 'WEB' | 'MOBILE', csrf?: string, origin?: string, meta?: AuthRequestMeta) {
    const result = await this.db.atomic(async tx => {
      await lock(tx, `refresh:${hash(refreshToken)}`);
      const session = await tx.session.findUnique({ where: { refreshHash: hash(refreshToken) } });
      if (!session || session.revokedAt || session.refreshExpiresAt <= new Date() || session.channel !== channel) fail('UNAUTHENTICATED', 'Qayta kiring', 401);
      await lock(tx, `user:${session.userId}`);
      const currentSession = await tx.session.findUniqueOrThrow({ where: { id: session.id } });
      if (currentSession.revokedAt || currentSession.refreshExpiresAt <= new Date()) fail('UNAUTHENTICATED', 'Qayta kiring', 401);
      if (channel === 'WEB') await this.csrf(session.id, csrf, origin);
      const user = await tx.user.findUniqueOrThrow({ where: { id: session.userId } });
      if (user.status !== 'ACTIVE' || (user.kind === 'STAFF' && !await tx.membership.count({ where: { userId: user.id, status: 'ACTIVE' } }))) fail('UNAUTHENTICATED', 'Hisob faol emas', 401);
      if (idleExpired(session, user.kind)) {
        await tx.session.update({ where: { id: session.id }, data: { revokedAt: new Date() } });
        const activeMem = user.kind === 'STAFF'
          ? await tx.membership.findFirst({ where: { userId: user.id, status: 'ACTIVE' }, select: { sanatoriumId: true } }).catch(() => null)
          : null;
        await this.recordAuthEvent(tx, {
          userId: user.id,
          sessionId: session.id,
          eventType: 'SESSION_EXPIRED',
          channel: session.channel,
          authMethod: 'IDLE_EXPIRED',
          ipAddress: session.ipAddress ?? meta?.ipAddress ?? 'unknown',
          deviceLabel: session.deviceLabel,
          userAgent: session.userAgent ?? meta?.userAgent ?? null,
          userKind: user.kind,
          userName: user.name,
          userLogin: user.login,
          userEmail: user.email ?? (user.login?.includes('@') ? user.login : null),
          sanatoriumId: activeMem?.sanatoriumId ?? null,
        });
        return null;
      }
      await tx.session.update({ where: { id: session.id }, data: { revokedAt: new Date() } });
      const nextIp = meta?.ipAddress && meta.ipAddress !== 'unknown' ? meta.ipAddress : session.ipAddress;
      const nextUa = meta?.userAgent ?? session.userAgent;
      return { ...await this.issue(tx, user.id, channel, session.lastActivityAt, session.deviceLabel, nextIp, nextUa), user: this.publicUser(user) };
    });
    if (!result) idleFailure();
    return result;
  }
  async activity(actor: Actor) {
    const now = new Date();
    const seconds = webIdleTimeoutSeconds(actor.kind);
    if (seconds === null) fail('PERMISSION_DENIED', 'Faqat boshqaruv paneli uchun', 403);
    const touched = await this.db.session.updateMany({
      where: { id: actor.sessionId, channel: 'WEB', revokedAt: null, lastActivityAt: { gt: new Date(now.getTime() - seconds * 1000) } },
      data: { lastActivityAt: now },
    });
    if (!touched.count) idleFailure();
    return { last_activity_at: now.toISOString(), idle_timeout_seconds: seconds };
  }
  async heartbeat(actor: Actor) {
    const now = new Date();
    const session = await this.db.session.findUnique({ where: { id: actor.sessionId }, select: { id: true, channel: true, revokedAt: true, lastActivityAt: true } });
    if (!session || session.revokedAt) fail('UNAUTHENTICATED', 'Qayta kiring', 401);
    if (session.channel === 'MOBILE') {
      await this.db.session.updateMany({ where: { id: session.id, revokedAt: null }, data: { lastActivityAt: now } });
      return { online: true, last_activity_at: now.toISOString() };
    }
    return { online: Date.now() - session.lastActivityAt.getTime() < 180_000, last_activity_at: session.lastActivityAt.toISOString() };
  }
  async logout(actor: Actor, body?: unknown, meta?: AuthRequestMeta) {
    const existingSession = await this.db.session.findUnique({
      where: { id: actor.sessionId },
      select: { id: true, channel: true, deviceLabel: true, ipAddress: true, userAgent: true },
    });
    await this.db.session.update({ where: { id: actor.sessionId }, data: { revokedAt: new Date() } });
    const channel = existingSession?.channel ?? (actor.kind === 'CUSTOMER' ? 'MOBILE' : 'WEB');
    const ipAddress = meta?.ipAddress && meta.ipAddress !== 'unknown'
      ? normalizeIp(meta.ipAddress)
      : normalizeIp(existingSession?.ipAddress ?? 'unknown');
    const deviceLabel = meta?.deviceLabel || existingSession?.deviceLabel || (channel === 'MOBILE' ? 'Android ilovasi' : 'Brauzer · Noma’lum qurilma');
    const userAgent = sanitizeUserAgent(meta?.userAgent ?? existingSession?.userAgent);
    const activeSanatoriumId = actor.memberships?.find(m => m.status === 'ACTIVE')?.sanatoriumId ?? null;
    await this.recordAuthEvent(this.db, {
      userId: actor.id,
      sessionId: actor.sessionId,
      eventType: 'LOGOUT',
      channel,
      authMethod: 'LOGOUT',
      ipAddress,
      deviceLabel,
      userAgent,
      userKind: actor.kind,
      userName: actor.name,
      userLogin: actor.login ?? null,
      userEmail: actor.email ?? null,
      sanatoriumId: activeSanatoriumId,
    });
    if (typeof (this.db as any)?.auditLog?.create === 'function') {
      await this.db.auditLog.create({
        data: {
          actorId: actor.id,
          sanatoriumId: activeSanatoriumId ?? undefined,
          action: 'auth.logout',
          entityId: actor.id,
          after: { ip: ipAddress, device: deviceLabel, channel, session_id: actor.sessionId },
        },
      }).catch(() => undefined);
    }
    if (body && typeof body === 'object' && (this.db as any).devicePushToken?.updateMany) {
      const raw = body as Record<string, unknown>;
      const token = typeof raw.push_token === 'string' && raw.push_token.trim().length >= 16 ? raw.push_token.trim() : null;
      const deviceId = typeof raw.device_id === 'string' && raw.device_id.trim().length >= 1 ? raw.device_id.trim() : null;
      if (token || deviceId) {
        const conditions = [
          ...(token ? [{ token }] : []),
          ...(deviceId ? [{ deviceId }] : []),
        ];
        await this.db.devicePushToken.updateMany({
          where: { userId: actor.id, active: true, OR: conditions },
          data: { active: false, invalidatedAt: new Date(), lastError: 'USER_LOGOUT' },
        }).catch(() => undefined);
      }
    }
    return { success: true };
  }
  async sessions(actor: Actor) {
    const rows = await this.db.session.findMany({
      where: { userId: actor.id, revokedAt: null, refreshExpiresAt: { gt: new Date() } },
      select: { id: true, deviceLabel: true, ipAddress: true, channel: true, createdAt: true, lastActivityAt: true, expiresAt: true },
      orderBy: { lastActivityAt: 'desc' },
      take: 100,
    });
    return { data: rows.filter(s => !idleExpired(s, actor.kind)).map(s => ({ ...s, ipAddress: s.ipAddress ?? null, current: s.id === actor.sessionId })) };
  }
  async loginHistory(actor: Actor, query: unknown) {
    const i = parse(pageQuery.extend({ event_type: z.enum(['LOGIN', 'LOGOUT', 'SESSION_REVOKED', 'SESSION_EXPIRED']).optional() }).strict(), query);
    if (typeof (this.db as any)?.authEvent?.findMany !== 'function') {
      return paged([], 0, i.page, i.limit);
    }
    const where = {
      userId: actor.id,
      ...(i.event_type ? { eventType: i.event_type } : {}),
    };
    let [data, total] = await Promise.all([
      this.db.authEvent.findMany({
        where,
        skip: (i.page - 1) * i.limit,
        take: i.limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.db.authEvent.count({ where }),
    ]);
    if (total === 0) {
      const inserted = await this.backfillAuthEventsFromSessions(100, actor.id);
      if (inserted > 0) {
        [data, total] = await Promise.all([
          this.db.authEvent.findMany({
            where,
            skip: (i.page - 1) * i.limit,
            take: i.limit,
            orderBy: { createdAt: 'desc' },
          }),
          this.db.authEvent.count({ where }),
        ]);
      }
    }
    return paged(data, total, i.page, i.limit);
  }
  async listAuthEvents(actor: Actor, query: unknown, partner = false) {
    const i = parse(
      pageQuery
        .extend({
          sanatorium_id: uuid.optional(),
          user_id: uuid.optional(),
          event_type: z.enum(['LOGIN', 'LOGOUT', 'SESSION_REVOKED', 'SESSION_EXPIRED']).optional(),
          user_kind: z.enum(['SUPERADMIN', 'STAFF', 'CUSTOMER']).optional(),
          q: z.string().trim().max(120).optional(),
          from: z.iso.date().optional(),
          to: z.iso.date().optional(),
        })
        .strict(),
      query,
    );
    let tenant = i.sanatorium_id;
    if (!partner) {
      requirePlatform(actor, 'audit.read');
    } else {
      tenant ??= actor.memberships.find(m => m.status === 'ACTIVE' && m.role === 'DIRECTOR')?.sanatoriumId;
      if (!tenant) fail('PERMISSION_DENIED', 'Bu sahifa uchun direktor vakolati kerak', 403);
      scope(actor, tenant, 'audit.read');
      if (actor.kind !== 'SUPERADMIN' && !actor.memberships.some(m => m.sanatoriumId === tenant && m.status === 'ACTIVE' && m.role === 'DIRECTOR')) {
        fail('PERMISSION_DENIED', 'Bu sahifa uchun direktor vakolati kerak', 403);
      }
    }
    if (typeof (this.db as any)?.authEvent?.findMany !== 'function') {
      return paged([], 0, i.page, i.limit);
    }
    const andClauses: Record<string, any>[] = [];
    if (tenant) {
      const tenantStaff = typeof (this.db as any)?.membership?.findMany === 'function'
        ? await this.db.membership.findMany({
            where: { sanatoriumId: tenant },
            select: { userId: true },
          })
        : [];
      const tenantStaffIds = [...new Set(tenantStaff.map((m) => m.userId))];
      andClauses.push({
        OR: [
          { sanatoriumId: tenant },
          ...(tenantStaffIds.length ? [{ userId: { in: tenantStaffIds }, userKind: 'STAFF' }] : []),
        ],
      });
    }
    if (i.q) {
      const cleanIdDigits = i.q.replace(/^#/, '').trim();
      const numericPublicId = /^\d{5,8}$/.test(cleanIdDigits) ? Number(cleanIdDigits) : null;
      const matchedUsers = numericPublicId !== null
        ? await this.db.user.findMany({ where: { publicId: numericPublicId }, select: { id: true } })
        : [];
      andClauses.push({
        OR: [
          { userName: { contains: i.q, mode: 'insensitive' } },
          { userLogin: { contains: i.q, mode: 'insensitive' } },
          { userEmail: { contains: i.q, mode: 'insensitive' } },
          { ipAddress: { contains: i.q, mode: 'insensitive' } },
          { deviceLabel: { contains: i.q, mode: 'insensitive' } },
          ...(matchedUsers.length ? [{ userId: { in: matchedUsers.map(u => u.id) } }] : []),
        ],
      });
    }
    const where: Record<string, any> = {
      ...(i.user_id ? { userId: i.user_id } : {}),
      ...(i.event_type ? { eventType: i.event_type } : {}),
      ...(i.user_kind ? { userKind: i.user_kind } : {}),
      ...(partner ? { userKind: 'STAFF' } : {}),
      ...((i.from || i.to) ? { createdAt: dateFilter(i.from, i.to, true) } : {}),
      ...(andClauses.length ? { AND: andClauses } : {}),
    };
    let [rows, total] = await Promise.all([
      this.db.authEvent.findMany({
        where,
        skip: (i.page - 1) * i.limit,
        take: i.limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.db.authEvent.count({ where }),
    ]);
    if (total === 0 && !i.q && !i.from && !i.to) {
      const inserted = await this.backfillAuthEventsFromSessions(300, i.user_id);
      if (inserted > 0) {
        [rows, total] = await Promise.all([
          this.db.authEvent.findMany({
            where,
            skip: (i.page - 1) * i.limit,
            take: i.limit,
            orderBy: { createdAt: 'desc' },
          }),
          this.db.authEvent.count({ where }),
        ]);
      }
    }
    const userIds = [...new Set(rows.map(r => r.userId))];
    const sanIds = [...new Set(rows.map(r => r.sanatoriumId).filter((v): v is string => Boolean(v)))];
    const [users, sanatoriums] = await Promise.all([
      userIds.length
        ? this.db.user.findMany({
            where: { id: { in: userIds } },
            select: { id: true, publicId: true, name: true, login: true, email: true, kind: true },
          })
        : [],
      sanIds.length
        ? this.db.sanatorium.findMany({
            where: { id: { in: sanIds } },
            select: { id: true, name: true },
          })
        : [],
    ]);
    const userMap = new Map(users.map(u => [u.id, u]));
    const sanMap = new Map(sanatoriums.map(s => [s.id, s.name]));
    return paged(
      rows.map(r => {
        const u = userMap.get(r.userId);
        return {
          ...r,
          publicId: u ? resolveUserPublicId(u) : null,
          userName: r.userName ?? u?.name ?? null,
          userLogin: r.userLogin ?? u?.login ?? null,
          userEmail: r.userEmail ?? u?.email ?? null,
          userKind: r.userKind ?? u?.kind ?? null,
          sanatoriumName: r.sanatoriumId ? (sanMap.get(r.sanatoriumId) ?? null) : null,
        };
      }),
      total,
      i.page,
      i.limit,
    );
  }
  async revokeSession(actor: Actor, id: string, meta?: AuthRequestMeta) {
    parse(uuid, id);
    if (id === actor.sessionId) fail('CURRENT_SESSION', 'Joriy qurilmadan chiqish uchun Chiqish tugmasini bosing', 422);
    return this.db.atomic(async tx => {
      await lock(tx, `user:${actor.id}`);
      const target = await tx.session.findFirst({
        where: { id, userId: actor.id, revokedAt: null },
        select: { id: true, channel: true, deviceLabel: true, ipAddress: true, userAgent: true },
      });
      if (!target) fail('NOT_FOUND', 'Faol kirish topilmadi', 404);
      await tx.session.update({ where: { id }, data: { revokedAt: new Date() } });
      await this.recordAuthEvent(tx, {
        userId: actor.id,
        sessionId: target.id,
        eventType: 'SESSION_REVOKED',
        channel: target.channel,
        authMethod: 'REVOKE',
        ipAddress: target.ipAddress ?? meta?.ipAddress ?? 'unknown',
        deviceLabel: target.deviceLabel,
        userAgent: target.userAgent ?? meta?.userAgent ?? null,
        userKind: actor.kind,
        userName: actor.name,
        userLogin: actor.login ?? null,
        userEmail: actor.email ?? null,
        sanatoriumId: actor.memberships?.find(m => m.status === 'ACTIVE')?.sanatoriumId ?? null,
      });
      const activeSanatoriumId = actor.memberships?.find(m => m.status === 'ACTIVE')?.sanatoriumId;
      await audit(tx, actor.id, 'auth.session_revoked', id, activeSanatoriumId);
      return { success: true };
    });
  }
  async revokeOtherSessions(actor: Actor, meta?: AuthRequestMeta) {
    return this.db.atomic(async tx => {
      await lock(tx, `user:${actor.id}`);
      const targets = await tx.session.findMany({
        where: { userId: actor.id, id: { not: actor.sessionId }, revokedAt: null },
        select: { id: true, channel: true, deviceLabel: true, ipAddress: true, userAgent: true },
      });
      const changed = await tx.session.updateMany({ where: { userId: actor.id, id: { not: actor.sessionId }, revokedAt: null }, data: { revokedAt: new Date() } });
      for (const target of targets) {
        await this.recordAuthEvent(tx, {
          userId: actor.id,
          sessionId: target.id,
          eventType: 'SESSION_REVOKED',
          channel: target.channel,
          authMethod: 'REVOKE_OTHERS',
          ipAddress: target.ipAddress ?? meta?.ipAddress ?? 'unknown',
          deviceLabel: target.deviceLabel,
          userAgent: target.userAgent ?? meta?.userAgent ?? null,
          userKind: actor.kind,
          userName: actor.name,
          userLogin: actor.login ?? null,
          userEmail: actor.email ?? null,
          sanatoriumId: actor.memberships?.find(m => m.status === 'ACTIVE')?.sanatoriumId ?? null,
        });
      }
      const activeSanatoriumId = actor.memberships?.find(m => m.status === 'ACTIVE')?.sanatoriumId;
      await audit(tx, actor.id, 'auth.other_sessions_revoked', actor.id, activeSanatoriumId, undefined, { count: changed.count });
      return { success: true, count: changed.count };
    });
  }
  async changePassword(actor: Actor, body: unknown) {
    const input = parse(changePasswordInput, body);
    const user = await this.db.user.findUniqueOrThrow({ where: { id: actor.id } });
    if (user.kind === 'CUSTOMER' || !await passwordMatches(input.current_password, user.passwordHash)) fail('PASSWORD_INVALID', 'Joriy parol xato', 403);
    if (input.current_password === input.new_password) fail('PASSWORD_UNCHANGED', 'Yangi parol boshqacha bo‘lsin', 422);
    const next = await passwordHash(input.new_password);
    return this.db.atomic(async tx => {
      await lock(tx, `user:${actor.id}`);
      const changed = await tx.user.updateMany({ where: { id: actor.id, passwordHash: user.passwordHash }, data: { passwordHash: next, mustChangePassword: false } });
      if (!changed.count) fail('VERSION_CONFLICT', 'Hisob o‘zgargan. Qayta kiring');
      await tx.session.updateMany({ where: { userId: actor.id, id: { not: actor.sessionId }, revokedAt: null }, data: { revokedAt: new Date() } });
      const sanatoriumId = actor.memberships?.find(m => m.status === 'ACTIVE')?.sanatoriumId;
      await audit(tx, actor.id, 'auth.password_changed', actor.id, sanatoriumId);
      return { success: true };
    });
  }
  async profile(actor: Actor, body: unknown) {
    const rawBody = body && typeof body === 'object' ? (body as Record<string, unknown>) : null;
    const clearEmailRequested = rawBody !== null && (rawBody.email === null || rawBody.email === '');
    const normalizedBody = rawBody
      ? {
          ...rawBody,
          ...(rawBody.avatarUrl === undefined && rawBody.avatar_url !== undefined ? { avatarUrl: rawBody.avatar_url } : {}),
          ...(rawBody.phone === null || rawBody.phone === '' ? { phone: undefined } : {}),
          ...(rawBody.login === null || rawBody.login === '' ? { login: undefined } : {}),
          ...(rawBody.name === null || rawBody.name === '' ? { name: undefined } : {}),
          ...(clearEmailRequested ? { email: null } : {}),
        }
      : body;
    const input = parse(
      z.object({
        name: z.string().trim().min(2).max(120).optional(),
        phone: phoneSchema.optional(),
        login: loginSchema.optional(),
        email: optionalEmailSchema.nullable().optional(),
        avatarUrl: z.string().max(25_000_000).nullable().optional(),
      }).passthrough().refine(
        v => v.name !== undefined || v.phone !== undefined || v.login !== undefined || v.email !== undefined || v.avatarUrl !== undefined,
        { message: 'Kamida bitta profil maydonini kiriting' },
      ),
      normalizedBody,
    );
    if (actor.kind === 'CUSTOMER' && input.login) fail('PERMISSION_DENIED', 'Mijoz login bilan kirmaydi', 403);
    const normalizedAvatar = normalizeAvatarInput(input.avatarUrl);
    const data: { name?: string; phone?: string; login?: string; email?: string | null; avatarUrl?: string | null } = {
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.phone !== undefined ? { phone: input.phone } : {}),
      ...(input.login !== undefined ? { login: input.login } : {}),
      ...(input.email !== undefined ? { email: input.email } : {}),
      ...(normalizedAvatar !== undefined ? { avatarUrl: normalizedAvatar } : {}),
    };
    return this.db.atomic(async tx => {
      if (input.login !== undefined) {
        const takenLogin = await tx.user.findFirst({
          where: {
            id: { not: actor.id },
            OR: [
              { login: { equals: input.login, mode: 'insensitive' as const } },
              ...(input.login.includes('@') ? [{ email: { equals: input.login, mode: 'insensitive' as const } }] : []),
            ],
          },
          select: { id: true },
        });
        if (takenLogin) fail('LOGIN_IN_USE', 'Bu login allaqachon band. Boshqa login kiriting', 409);
      }
      if (input.email) {
        const takenEmail = await tx.user.findFirst({
          where: {
            id: { not: actor.id },
            OR: [
              { email: { equals: input.email, mode: 'insensitive' as const } },
              { login: { equals: input.email, mode: 'insensitive' as const } },
            ],
          },
          select: { id: true },
        });
        if (takenEmail) fail('EMAIL_IN_USE', 'Bu elektron pochta boshqa hisobga ulangan. Boshqa email kiriting', 409);
      }
      if (input.phone !== undefined) {
        const takenPhone = await tx.user.findFirst({
          where: { phone: input.phone, id: { not: actor.id } },
          select: { id: true },
        });
        if (takenPhone) fail('PHONE_IN_USE', 'Bu telefon raqami boshqa foydalanuvchiga biriktirilgan', 409);
      }
      const user = await tx.user.update({ where: { id: actor.id }, data });
      const activeSanatoriumId = actor.memberships?.find(m => m.status === 'ACTIVE')?.sanatoriumId;
      await audit(tx, actor.id, 'account.profile_updated', actor.id, activeSanatoriumId, undefined, {
        name: user.name,
        login: user.login,
        phone: user.phone,
        email: user.email,
        avatarUpdated: normalizedAvatar !== undefined,
      });
      return this.publicUser(user);
    });
  }
  async phoneChangeRequest(actor:Actor,body:unknown){
    if(actor.kind!=='CUSTOMER')fail('PERMISSION_DENIED','Faqat mijoz telefonini o‘zgartiradi',403);
    this.sms.assertReady();
    const i=parse(z.object({new_phone:phoneSchema}).strict(),body);await this.limit(`phone-change:${actor.id}`,5,3600);
    const codes=[randomInt(0,1000000).toString().padStart(6,'0'),randomInt(0,1000000).toString().padStart(6,'0')];
    const result=await this.db.atomic(async tx=>{await lock(tx,`user:${actor.id}`);const user=await tx.user.findUniqueOrThrow({where:{id:actor.id}});if(!user.phone||user.phone===i.new_phone)fail('PHONE_UNCHANGED','Yangi raqam boshqacha bo‘lsin',422);if(await tx.user.findUnique({where:{phone:i.new_phone}}))fail('PHONE_IN_USE','Yangi raqam boshqa hisobga tegishli',409);
      await tx.otpChallenge.updateMany({where:{actorId:actor.id,purpose:{in:['OLD_PHONE','NEW_PHONE']},consumedAt:null},data:{consumedAt:new Date()}});
      const rows=[];for(const[index,purpose]of ['OLD_PHONE','NEW_PHONE'].entries()){const{randomUUID}=await import('node:crypto');const id=randomUUID();rows.push(await tx.otpChallenge.create({data:{id,actorId:actor.id,purpose,phone:index===0?user.phone:i.new_phone,codeHash:this.otpHash(id,codes[index]),expiresAt:new Date(Date.now()+this.config.OTP_TTL_SECONDS*1000)}}));}return rows;});
    for(let n=0;n<result.length;n++)await this.sms.send(result[n].id,result[n].phone,codes[n],result[n].expiresAt);return {old_challenge_id:result[0].id,new_challenge_id:result[1].id,expires_at:result[0].expiresAt};
  }
  async phoneChangeConfirm(actor:Actor,body:unknown){
    if(actor.kind!=='CUSTOMER')fail('PERMISSION_DENIED','Faqat mijoz telefonini o‘zgartiradi',403);
    this.sms.assertReady();
    const i=parse(z.object({old_challenge_id:uuid,new_challenge_id:uuid,old_code:z.string().regex(/^\d{6}$/),new_code:z.string().regex(/^\d{6}$/)}).strict(),body);
    const result=await this.db.atomic(async tx=>{await lock(tx,`user:${actor.id}`);const user=await tx.user.findUniqueOrThrow({where:{id:actor.id}});const old=await tx.otpChallenge.findUnique({where:{id:i.old_challenge_id}}),next=await tx.otpChallenge.findUnique({where:{id:i.new_challenge_id}});
      if(!old||!next||old.purpose!=='OLD_PHONE'||next.purpose!=='NEW_PHONE'||old.phone!==user.phone||[old,next].some(c=>c.actorId!==actor.id||c.consumedAt||c.expiresAt<=new Date()||c.attempts>=this.config.OTP_MAX_ATTEMPTS))return null;
      await tx.otpChallenge.updateMany({where:{id:{in:[old.id,next.id]}},data:{attempts:{increment:1}}});if(old.codeHash!==this.otpHash(old.id,i.old_code)||next.codeHash!==this.otpHash(next.id,i.new_code))return null;
      await tx.otpChallenge.updateMany({where:{id:{in:[old.id,next.id]}},data:{consumedAt:new Date()}});const changed=await tx.user.update({where:{id:actor.id},data:{phone:next.phone}});await tx.session.updateMany({where:{userId:actor.id,id:{not:actor.sessionId},revokedAt:null},data:{revokedAt:new Date()}});await audit(tx,actor.id,'account.phone_changed',actor.id);return this.publicUser(changed);});
    if(!result)fail('OTP_INVALID','Ikkala raqamning tasdiqlash kodini tekshiring',401);return result;
  }
  async bootstrap(login: string, password: string, secret: string) {
    login = parse(loginSchema, login); password = parse(passwordSchema, password);
    const encoded = await passwordHash(password);
    return this.db.atomic(async tx => {
      await lock(tx, 'bootstrap');
      if (await tx.user.count({ where: { kind: 'SUPERADMIN' } })) fail('BOOTSTRAP_DISABLED', 'Superadmin mavjud. Bootstrap yopilgan', 403);
      const publicId = await allocateUserPublicId(tx);
      const user = await tx.user.create({ data: { publicId, kind: 'SUPERADMIN', name: 'Superadmin', login, passwordHash: encoded, mfaSecret: encrypt(secret, this.config.MFA_ENCRYPTION_KEY) } });
      await audit(tx, user.id, 'auth.bootstrap', user.id); return this.publicUser(user);
    });
  }
  publicUser(user: { id: string; publicId?: number | null; kind: string; name: string; phone: string | null; email?: string | null; login: string | null; avatarUrl?: string | null; mustChangePassword: boolean }) {
    const isEmail = user.login?.includes('@');
    return {
      id: user.id,
      publicId: resolveUserPublicId(user),
      kind: user.kind,
      name: user.name,
      phone: user.phone,
      email: user.email ?? (isEmail ? user.login : null),
      login: user.login,
      avatarUrl: user.avatarUrl ?? null,
      must_change_password: user.mustChangePassword,
    };
  }
}
