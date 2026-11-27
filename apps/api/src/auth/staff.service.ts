import { Inject, Injectable } from '@nestjs/common';
import { z } from 'zod';
import { Db, audit, emit, lock, type Tx } from '../common/db';
import { fail, parse, uuid, version, reason, pageQuery, paged } from '../common/errors';
import { passwordHash, opaque } from '../common/crypto';
import { loginSchema, optionalEmailSchema, passwordSchema, phoneSchema, type AuthRequestMeta } from './auth.service';
import { describeDeviceMeta, normalizeIp, sanitizeUserAgent } from '../common/request-meta';
import { normalizeAvatarInput } from './avatar.util';
import { allocateUserPublicId, resolveUserPublicId } from './public-id.util';
import { Actor, ACCOUNTANT, DELEGATABLE, DIRECTOR, effective, requirePlatform, scope, tenantIds } from './permissions';

export const staffInput = z.object({ sanatorium_id: uuid, name: z.string().trim().min(2).max(120), login: loginSchema, phone: phoneSchema, email: optionalEmailSchema.nullable().optional(), temporary_password: passwordSchema.optional(), grants: z.array(z.enum(DELEGATABLE)).max(30).default([]) }).strict();
export const staffInvitationInput = staffInput.extend({role: z.enum(['RECEPTION', 'ACCOUNTANT']).default('RECEPTION')});
export const loginAvailabilityQuery = z.object({ login: z.string().max(128).optional().default(''), email: z.string().max(128).optional(), exclude_user_id: z.string().max(128).optional() }).passthrough();
export const resetPasswordInput = z.object({ new_password: passwordSchema, confirm_password: z.string().max(128) }).strict().refine(v => v.new_password === v.confirm_password, { message: 'Yangi parollar bir xil bo‘lsin', path: ['confirm_password'] });
@Injectable()
export class StaffService {
  constructor(@Inject(Db) readonly db: Db) {}
  private async loadUserSessionsSummary(userIds: string[], defaultChannel: 'WEB' | 'MOBILE' = 'WEB') {
    const nowDate = new Date();
    const now = nowDate.getTime();
    if (!userIds.length || typeof (this.db as any).session?.findMany !== 'function') {
      return {
        lastSessionMap: new Map<string, any>(),
        activeDevicesMap: new Map<string, any[]>(),
      };
    }
    const [lastSessions, activeSessions] = await Promise.all([
      this.db.session.findMany({
        where: { userId: { in: userIds } },
        orderBy: { lastActivityAt: 'desc' },
        select: {
          id: true,
          userId: true,
          lastActivityAt: true,
          createdAt: true,
          revokedAt: true,
          refreshExpiresAt: true,
          deviceLabel: true,
          userAgent: true,
          ipAddress: true,
          channel: true,
        },
        distinct: ['userId'],
      }),
      this.db.session.findMany({
        where: { userId: { in: userIds }, revokedAt: null, refreshExpiresAt: { gt: nowDate } },
        orderBy: { lastActivityAt: 'desc' },
        select: {
          id: true,
          userId: true,
          lastActivityAt: true,
          createdAt: true,
          refreshExpiresAt: true,
          deviceLabel: true,
          userAgent: true,
          ipAddress: true,
          channel: true,
        },
        take: Math.max(50, userIds.length * 6),
      }),
    ]);
    const lastSessionMap = new Map(lastSessions.map((s) => [s.userId, s]));
    const activeDevicesMap = new Map<string, any[]>();
    for (const s of activeSessions) {
      const ch = (s.channel === 'MOBILE' ? 'MOBILE' : s.channel === 'WEB' ? 'WEB' : defaultChannel) as 'WEB' | 'MOBILE';
      const meta = describeDeviceMeta(s.userAgent, ch, s.deviceLabel);
      const list = activeDevicesMap.get(s.userId) ?? [];
      list.push({
        id: s.id,
        channel: ch,
        deviceLabel: meta.deviceLabel,
        deviceType: meta.deviceType,
        deviceTypeLabel: meta.deviceTypeLabel,
        browser: meta.browser,
        os: meta.os,
        channelLabel: meta.channelLabel,
        deviceSummary: meta.summary,
        ipAddress: s.ipAddress ?? null,
        userAgent: s.userAgent ?? null,
        createdAt: s.createdAt,
        lastActivityAt: s.lastActivityAt,
        isOnline: now - s.lastActivityAt.getTime() < 180_000,
      });
      activeDevicesMap.set(s.userId, list);
    }
    return { lastSessionMap, activeDevicesMap };
  }

  async list(actor: Actor, query: unknown) {
    const { page, limit, sanatorium_id, q, status, role } = parse(pageQuery.extend({ sanatorium_id: uuid.optional(), q: z.string().trim().max(120).optional(), status: z.enum(['ACTIVE', 'PENDING_APPROVAL', 'REJECTED', 'REVOKED', 'BLOCKED']).optional(), role: z.enum(['DIRECTOR', 'RECEPTION', 'ACCOUNTANT']).optional() }).strict(), query);
    if (sanatorium_id) scope(actor, sanatorium_id, 'staff.invite');
    const ids = sanatorium_id ? [sanatorium_id] : tenantIds(actor, 'staff.invite');
    const cleanIdDigits = q ? q.replace(/^#/, '').trim() : '';
    const numericPublicId = /^\d{5,8}$/.test(cleanIdDigits) ? Number(cleanIdDigits) : null;
    const matchingUsers = q
      ? await this.db.user.findMany({
          where: {
            OR: [
              { name: { contains: q, mode: 'insensitive' } },
              { login: { contains: q, mode: 'insensitive' } },
              { email: { contains: q, mode: 'insensitive' } },
              { phone: { contains: q.replace(/[\s()-]/g, '') } },
              ...(numericPublicId !== null ? [{ publicId: numericPublicId }] : []),
            ],
          },
          select: { id: true },
        })
      : null;
    const where = { ...(ids ? { sanatoriumId: { in: ids } } : {}), ...(matchingUsers ? { userId: { in: matchingUsers.map(u => u.id) } } : {}), ...(status ? { status } : {}), ...(role ? { role } : {}) };
    const [memberships, total] = await Promise.all([this.db.membership.findMany({ where, skip: (page - 1) * limit, take: limit, orderBy: { createdAt: 'desc' } }), this.db.membership.count({ where })]);
    const userIds = [...new Set(memberships.map(m => m.userId))];
    const [users, sessionSummary] = await Promise.all([
      userIds.length
        ? this.db.user.findMany({
            where: { id: { in: userIds } },
            select: {
              id: true,
              publicId: true,
              name: true,
              login: true,
              phone: true,
              email: true,
              avatarUrl: true,
              status: true,
              mustChangePassword: true,
              createdAt: true,
              updatedAt: true,
            },
          })
        : [],
      this.loadUserSessionsSummary(userIds, 'WEB'),
    ]);
    const { lastSessionMap, activeDevicesMap } = sessionSummary;
    const now = Date.now();
    return paged(
      memberships.map(m => {
        const u = users.find(usr => usr.id === m.userId);
        const s = u ? lastSessionMap.get(u.id) : undefined;
        const activeDevices = u ? (activeDevicesMap.get(u.id) ?? []) : [];
        const isOnline = Boolean(
          s &&
          !s.revokedAt &&
          s.refreshExpiresAt.getTime() > now &&
          now - s.lastActivityAt.getTime() < 180_000,
        );
        const lastMeta = s ? describeDeviceMeta(s.userAgent, (s.channel === 'MOBILE' ? 'MOBILE' : 'WEB'), s.deviceLabel) : null;
        return {
          ...m,
          user: u
            ? {
                ...u,
                publicId: resolveUserPublicId(u),
                email: u.email ?? (u.login?.includes('@') ? u.login : null),
                avatarUrl: u.avatarUrl ?? null,
                isOnline,
                activeSessionsCount: activeDevices.length,
                activeDevices,
                lastSeenAt: s?.lastActivityAt ?? u.updatedAt,
                device: lastMeta?.deviceLabel || 'Veb panel',
                deviceSummary: lastMeta?.summary || null,
                lastIp: s?.ipAddress ?? null,
              }
            : undefined,
          permissions: effective(m),
        };
      }),
      total,
      page,
      limit,
    );
  }
  async checkLoginAvailability(actor: Actor, query: unknown) {
    const q = parse(loginAvailabilityQuery, query);
    const excludeId = q.exclude_user_id && uuid.safeParse(q.exclude_user_id).success ? q.exclude_user_id : undefined;
    if (q.email !== undefined) {
      if (actor.kind !== 'SUPERADMIN' && !actor.memberships.some(m => m.status === 'ACTIVE')) {
        fail('PERMISSION_DENIED', 'Bu amal uchun ruxsat berilmagan', 403);
      }
      const normalizedEmail = q.email.trim().toLowerCase();
      if (!normalizedEmail) {
        return { login: '', email: '', valid: false, available: false, reason: 'EMPTY' as const };
      }
      if (!optionalEmailSchema.safeParse(normalizedEmail).success) {
        return { login: normalizedEmail, email: normalizedEmail, valid: false, available: false, reason: 'INVALID_FORMAT' as const };
      }
      let existingEmail: { id: string } | null = null;
      try {
        existingEmail = await this.db.user.findFirst({
          where: {
            ...(excludeId ? { id: { not: excludeId } } : {}),
            OR: [
              { email: { equals: normalizedEmail, mode: 'insensitive' as const } },
              { login: { equals: normalizedEmail, mode: 'insensitive' as const } },
            ],
          },
          select: { id: true },
        });
      } catch {
        existingEmail = await this.db.user.findFirst({
          where: {
            ...(excludeId ? { id: { not: excludeId } } : {}),
            login: { equals: normalizedEmail, mode: 'insensitive' as const },
          },
          select: { id: true },
        });
      }
      if (!existingEmail && typeof (this.db as any).partnerRegistration?.findFirst === 'function') {
        existingEmail = await this.db.partnerRegistration.findFirst({
          where: { status: 'PENDING', email: { equals: normalizedEmail, mode: 'insensitive' as const } },
          select: { id: true },
        }).catch(() => null);
      }
      return {
        login: normalizedEmail,
        email: normalizedEmail,
        valid: true,
        available: !existingEmail,
        reason: existingEmail ? ('TAKEN' as const) : null,
      };
    }
    const normalized = q.login.trim().toLowerCase();
    const isCheckingOwnEmailOrLogin =
      (excludeId && excludeId === actor.id) ||
      (normalized.includes('@') && actor.memberships.some(m => m.status === 'ACTIVE'));
    if (
      actor.kind !== 'SUPERADMIN' &&
      !isCheckingOwnEmailOrLogin &&
      !actor.memberships.some(m => m.permissions.includes('staff.invite'))
    ) {
      fail('PERMISSION_DENIED', 'Xodim taklif qilish huquqi yo‘q', 403);
    }
    if (!normalized) {
      return { login: '', valid: false, available: false, reason: 'EMPTY' as const };
    }
    if (!loginSchema.safeParse(normalized).success) {
      return { login: normalized, valid: false, available: false, reason: 'INVALID_FORMAT' as const };
    }
    let existing: { id: string } | null = null;
    try {
      existing = await this.db.user.findFirst({
        where: {
          OR: [
            { login: { equals: normalized, mode: 'insensitive' as const } },
            ...(normalized.includes('@') ? [{ email: { equals: normalized, mode: 'insensitive' as const } }] : []),
          ],
          ...(excludeId ? { id: { not: excludeId } } : {}),
        },
        select: { id: true },
      });
    } catch {
      existing = await this.db.user.findFirst({
        where: {
          login: { equals: normalized, mode: 'insensitive' as const },
          ...(excludeId ? { id: { not: excludeId } } : {}),
        },
        select: { id: true },
      });
    }
    if (!existing && typeof (this.db as any).partnerRegistration?.findFirst === 'function') {
      existing = await this.db.partnerRegistration.findFirst({
        where: {
          status: 'PENDING',
          OR: [
            { username: { equals: normalized, mode: 'insensitive' as const } },
            ...(normalized.includes('@') ? [{ email: { equals: normalized, mode: 'insensitive' as const } }] : []),
          ],
        },
        select: { id: true },
      }).catch(() => null);
    }
    return {
      login: normalized,
      ...(normalized.includes('@') ? { email: normalized } : {}),
      valid: true,
      available: !existing,
      reason: existing ? ('TAKEN' as const) : null,
    };
  }
  private async findOrCreateStaffUser(
    tx: Tx,
    input: z.infer<typeof staffInput>,
    password: string,
    options: { allowSameSanatoriumPromotion?: boolean } = {},
  ) {
    const existingByLogin = await tx.user.findFirst({
      where: {
        OR: [
          { login: { equals: input.login, mode: 'insensitive' as const } },
          ...(input.login.includes('@') ? [{ email: { equals: input.login, mode: 'insensitive' as const } }] : []),
        ],
      },
    });
    const existingByPhone = await tx.user.findFirst({
      where: { phone: input.phone },
    });
    if (existingByLogin) {
      const canPromote =
        Boolean(options.allowSameSanatoriumPromotion) &&
        existingByLogin.kind === 'STAFF' &&
        (!existingByLogin.phone || existingByLogin.phone === input.phone) &&
        Boolean(
          await tx.membership.findUnique({
            where: {
              userId_sanatoriumId: {
                userId: existingByLogin.id,
                sanatoriumId: input.sanatorium_id,
              },
            },
            select: { id: true },
          }),
        );
      if (!canPromote) {
        fail('LOGIN_IN_USE', 'Bu login allaqachon band. Boshqa login kiriting', 409);
      }
      if (existingByPhone && existingByPhone.id !== existingByLogin.id) {
        fail('PHONE_IN_USE', 'Bu telefon raqami boshqa foydalanuvchiga biriktirilgan', 409);
      }
      return tx.user.update({
        where: { id: existingByLogin.id },
        data: {
          kind: 'STAFF',
          name: input.name,
          login: input.login,
          phone: input.phone,
          status: 'ACTIVE',
          passwordHash: await passwordHash(password),
          mustChangePassword: true,
        },
      });
    }
    if (existingByPhone) {
      fail('PHONE_IN_USE', 'Bu telefon raqami boshqa foydalanuvchiga biriktirilgan', 409);
    }
    if (input.email) {
      const existingByEmail = await tx.user.findFirst({
        where: {
          OR: [
            { email: { equals: input.email, mode: 'insensitive' as const } },
            { login: { equals: input.email, mode: 'insensitive' as const } },
          ],
        },
        select: { id: true },
      });
      if (existingByEmail) {
        fail('EMAIL_IN_USE', 'Bu elektron pochta boshqa hisobga ulangan. Boshqa email kiriting', 409);
      }
    }
    const publicId = await allocateUserPublicId(tx);
    return tx.user.create({
      data: {
        publicId,
        kind: 'STAFF',
        name: input.name,
        login: input.login,
        phone: input.phone,
        ...(input.email ? { email: input.email } : {}),
        passwordHash: await passwordHash(password),
        mustChangePassword: true,
      },
    });
  }
  async assignDirector(actor: Actor, body: unknown) {
    requirePlatform(actor, 'sanatoriums.manage');
    const input = parse(staffInput, body); const password = input.temporary_password ?? `A3a-${opaque()}`;
    return this.db.atomic(async tx => {
      await lock(tx, `tenant:${input.sanatorium_id}`);
      if (!await tx.sanatorium.findUnique({ where: { id: input.sanatorium_id } })) fail('NOT_FOUND', 'Sanatoriya topilmadi', 404);
      const previous = await tx.membership.findMany({ where: { sanatoriumId: input.sanatorium_id, role: 'DIRECTOR', status: 'ACTIVE' } });
      await tx.membership.updateMany({ where: { id: { in: previous.map(m => m.id) } }, data: { status: 'REVOKED', version: { increment: 1 } } });
      await tx.session.updateMany({ where: { userId: { in: previous.map(m => m.userId) }, revokedAt: null }, data: { revokedAt: new Date() } });
      const user = await this.findOrCreateStaffUser(tx, input, password, { allowSameSanatoriumPromotion: true });
      const existingMembership = await tx.membership.findUnique({
        where: { userId_sanatoriumId: { userId: user.id, sanatoriumId: input.sanatorium_id } }
      });
      const membership = existingMembership
        ? await tx.membership.update({
            where: { id: existingMembership.id },
            data: {
              role: 'DIRECTOR',
              status: 'ACTIVE',
              ceiling: DIRECTOR,
              grants: [],
              denies: [],
              adminDenies: [],
              version: { increment: 1 },
            }
          })
        : await tx.membership.create({
            data: {
              userId: user.id,
              sanatoriumId: input.sanatorium_id,
              role: 'DIRECTOR',
              status: 'ACTIVE',
              ceiling: DIRECTOR,
              invitedBy: actor.id,
            }
          });
      await audit(tx, actor.id, 'staff.director_assigned', membership.id, input.sanatorium_id, previous.map(p => ({ id: p.id, userId: p.userId })), { userId: user.id });
      return { membership, temporary_password: password };
    });
  }
  async invite(actor: Actor, body: unknown) {
    const input = parse(staffInvitationInput, body); scope(actor, input.sanatorium_id, 'staff.invite');
    const password = input.temporary_password ?? `A3a-${opaque()}`;
    return this.db.atomic(async tx => {
      const current = actor.kind === 'SUPERADMIN' ? null : await tx.membership.findUnique({ where: { userId_sanatoriumId: { userId: actor.id, sanatoriumId: input.sanatorium_id } } });
      const delegatable = current ? effective(current).filter(p => (DELEGATABLE as readonly string[]).includes(p)) : [...DELEGATABLE];
      const ceiling = input.role === 'ACCOUNTANT' ? delegatable.filter(p => ACCOUNTANT.includes(p)) : delegatable;
      if (current && (current.status !== 'ACTIVE' || !effective(current).includes('staff.invite'))) fail('PERMISSION_DENIED', 'Taklif yuborish vakolati bekor qilingan', 403);
      if (input.grants.some(p => !ceiling.includes(p))) fail('DELEGATION_DENIED', 'O‘zingizda yo‘q ruxsatni bera olmaysiz', 403);
      if (input.role === 'ACCOUNTANT' && !ACCOUNTANT.every(p => ceiling.includes(p))) fail('DELEGATION_DENIED', 'Hisobchini taklif qilish uchun hisobot va eksport vakolatlari kerak', 403);
      const user = await this.findOrCreateStaffUser(tx, input, password);
      const existingMembership = await tx.membership.findUnique({
        where: { userId_sanatoriumId: { userId: user.id, sanatoriumId: input.sanatorium_id } }
      });
      const membership = existingMembership
        ? await tx.membership.update({
            where: { id: existingMembership.id },
            data: {
              role: input.role,
              status: actor.kind === 'SUPERADMIN' ? 'ACTIVE' : 'PENDING_APPROVAL',
              grants: input.grants,
              ceiling,
              version: { increment: 1 },
            }
          })
        : await tx.membership.create({
            data: {
              userId: user.id,
              sanatoriumId: input.sanatorium_id,
              role: input.role,
              status: actor.kind === 'SUPERADMIN' ? 'ACTIVE' : 'PENDING_APPROVAL',
              grants: input.grants,
              ceiling,
              invitedBy: actor.id,
            }
          });
      await audit(tx, actor.id, 'staff.invited', membership.id, input.sanatorium_id, undefined, { userId: user.id, role: membership.role, status: membership.status, grants: input.grants });
      const admins = await tx.user.findMany({ where: { kind: 'SUPERADMIN', status: 'ACTIVE' }, select: { id: true } });
      await emit(tx, 'staff.invited', { recipient_ids: admins.map(a => a.id), membership_id: membership.id });
      return { membership, temporary_password: password };
    });
  }
  async decision(actor: Actor, id: string, approve: boolean, body: unknown) {
    requirePlatform(actor, 'staff.approve'); parse(uuid, id);
    const input = parse(z.object({ version, reason: reason.optional() }).strict(), body);
    if (!approve && !input.reason) fail('REASON_REQUIRED', 'Rad etish sababini yozing', 422);
    return this.db.atomic(async tx => {
      await lock(tx, `membership:${id}`);
      const m = await tx.membership.findUnique({ where: { id } });
      if (!m) fail('NOT_FOUND', 'Xodim topilmadi', 404);
      if (m.status !== 'PENDING_APPROVAL' || m.version !== input.version) fail('VERSION_CONFLICT', 'Xodim holati o‘zgargan');
      const changed = await tx.membership.update({ where: { id }, data: { status: approve ? 'ACTIVE' : 'REJECTED', decisionReason: input.reason, version: { increment: 1 } } });
      await audit(tx, actor.id, approve ? 'staff.approved' : 'staff.rejected', id, m.sanatoriumId, { status: m.status }, { status: changed.status, reason: input.reason }); return changed;
    });
  }
  async permissions(actor: Actor, id: string, body: unknown) {
    parse(uuid, id);
    const input = parse(z.object({ version, grants: z.array(z.enum(DELEGATABLE)).max(30), denies: z.array(z.enum(DELEGATABLE)).max(30), ceiling: z.array(z.string()).max(40).optional() }).strict(), body);
    return this.db.atomic(async tx => {
      await lock(tx, `membership:${id}`);
      const target = await tx.membership.findUnique({ where: { id } });
      if (!target) fail('NOT_FOUND', 'Xodim topilmadi', 404);
      scope(actor, target.sanatoriumId, 'staff.permissions.manage');
      if (target.version !== input.version) fail('VERSION_CONFLICT', 'Ruxsatlar o‘zgargan');
      if (target.role === 'ACCOUNTANT' && [...input.grants, ...input.denies, ...(input.ceiling ?? [])].some(p => !ACCOUNTANT.includes(p))) fail('DELEGATION_DENIED', 'Hisobchiga faqat hisobot va eksport vakolatlari beriladi', 403);
      if (actor.kind !== 'SUPERADMIN') {
        if (target.userId === actor.id || !['RECEPTION', 'ACCOUNTANT'].includes(target.role) || input.ceiling || input.grants.some(p => target.adminDenies.includes(p))) fail('DELEGATION_DENIED', 'Vakolat chegarasi yoki admin taqiqini o‘zgartira olmaysiz', 403);
        const director = await tx.membership.findUnique({ where: { userId_sanatoriumId: { userId: actor.id, sanatoriumId: target.sanatoriumId } } });
        const allowed = director ? effective(director) : [];
        if (!director || director.status !== 'ACTIVE' || !allowed.includes('staff.permissions.manage') || input.grants.some(p => !allowed.includes(p) || (target.ceiling.length > 0 && !target.ceiling.includes(p)))) fail('DELEGATION_DENIED', 'Bu ruxsatni berishga vakolat yo‘q', 403);
      }
      if (input.ceiling?.some(p => !DIRECTOR.includes(p as any))) fail('DELEGATION_DENIED', 'Noma’lum permission', 422);
      const changed = await tx.membership.update({ where: { id }, data: { grants: input.grants, ...(actor.kind === 'SUPERADMIN' ? { adminDenies: input.denies, denies: [] } : { denies: input.denies }), ...(input.ceiling ? { ceiling: input.ceiling } : {}), version: { increment: 1 } } });
      await audit(tx, actor.id, 'staff.permissions_updated', id, target.sanatoriumId, { grants: target.grants, denies: target.denies, adminDenies: target.adminDenies, ceiling: target.ceiling }, { grants: changed.grants, denies: changed.denies, adminDenies: changed.adminDenies, ceiling: changed.ceiling });
      return { ...changed, permissions: effective(changed) };
    });
  }
  async block(actor: Actor, id: string, body: unknown) {
    requirePlatform(actor, 'staff.approve'); parse(uuid, id); const input = parse(z.object({ version, reason }).strict(), body);
    return this.db.atomic(async tx => {
      const m = await tx.membership.findUnique({ where: { id } }); if (!m) fail('NOT_FOUND', 'Xodim topilmadi', 404);
      const changed = await tx.membership.updateMany({ where: { id, version: input.version }, data: { status: 'BLOCKED', decisionReason: input.reason, version: { increment: 1 } } });
      if (!changed.count) fail('VERSION_CONFLICT', 'Xodim holati o‘zgargan');
      await tx.session.updateMany({ where: { userId: m.userId, revokedAt: null }, data: { revokedAt: new Date() } });
      await audit(tx, actor.id, 'staff.blocked', id, m.sanatoriumId, undefined, { reason: input.reason }); return { success: true };
    });
  }
  async reset(actor: Actor, id: string, body: unknown, partner = false) {
    parse(uuid, id);
    const input = parse(resetPasswordInput, body);
    if (!partner) requirePlatform(actor, 'staff.reset');
    const encoded = await passwordHash(input.new_password);
    return this.db.atomic(async tx => {
      let userId = id, sanatoriumId: string | undefined;
      if (partner) {
        const target = await tx.membership.findUnique({ where: { id } });
        if (!target) fail('NOT_FOUND', 'Xodim topilmadi', 404);
        sanatoriumId = target.sanatoriumId;
        scope(actor, sanatoriumId, 'staff.reset');
        const director = await tx.membership.findUnique({ where: { userId_sanatoriumId: { userId: actor.id, sanatoriumId } } });
        if (actor.kind !== 'SUPERADMIN' && (!director || director.role !== 'DIRECTOR' || director.status !== 'ACTIVE' || !effective(director).includes('staff.reset'))) fail('PERMISSION_DENIED', 'Bu amal uchun direktor vakolati kerak', 403);
        if (!['RECEPTION', 'ACCOUNTANT'].includes(target.role) || target.userId === actor.id) fail('PERMISSION_DENIED', 'Direktor faqat resepshin va hisobchi parolini tiklaydi', 403);
        userId = target.userId;
        if (actor.kind !== 'SUPERADMIN' && await tx.membership.count({ where: { userId, status: 'ACTIVE', OR: [{ sanatoriumId: { not: sanatoriumId } }, { role: 'DIRECTOR' }] } })) fail('PERMISSION_DENIED', 'Bir nechta sanatoriyaga ulangan hisob parolini superadmin tiklaydi', 403);
      }
      await lock(tx, `user:${userId}`);
      const user = await tx.user.findUnique({ where: { id: userId } }); if (!user || user.kind !== 'STAFF') fail('NOT_FOUND', 'Xodim topilmadi', 404);
      if (!sanatoriumId) sanatoriumId = (await tx.membership.findFirst({ where: { userId }, orderBy: { createdAt: 'desc' } }))?.sanatoriumId;
      await tx.user.update({ where: { id: userId }, data: { passwordHash: encoded, mustChangePassword: false } });
      await tx.session.updateMany({ where: { userId, revokedAt: null }, data: { revokedAt: new Date() } });
      await audit(tx, actor.id, 'staff.password_reset', userId, sanatoriumId); return { success: true };
    });
  }
  async updateStaff(actor: Actor, id: string, body: unknown) {
    if (actor.kind !== 'SUPERADMIN') fail('PERMISSION_DENIED', 'Faqat superadmin tahrirlay oladi', 403);
    parse(uuid, id);
    const rawBody = body && typeof body === 'object' ? (body as Record<string, unknown>) : null;
    const clearField = (val: unknown) => val === null || val === '';
    const rawPhone = typeof rawBody?.phone === 'string' ? rawBody.phone.replace(/[\s()-]/g, '') : rawBody?.phone;
    const normalizedPhone =
      typeof rawPhone === 'string' && /^\d{9}$/.test(rawPhone)
        ? `+998${rawPhone}`
        : typeof rawPhone === 'string' && /^998\d{9}$/.test(rawPhone)
          ? `+${rawPhone}`
          : rawPhone;
    const rawPassword =
      typeof rawBody?.new_password === 'string' && rawBody.new_password.trim()
        ? rawBody.new_password.trim()
        : typeof rawBody?.password === 'string' && rawBody.password.trim()
          ? rawBody.password.trim()
          : undefined;
    const normalizedBody = rawBody
      ? {
          ...rawBody,
          ...(rawBody.avatarUrl === undefined && rawBody.avatar_url !== undefined ? { avatarUrl: rawBody.avatar_url } : {}),
          ...(rawBody.remove_avatar === true ? { avatarUrl: null } : {}),
          ...(clearField(normalizedPhone) && rawBody.phone !== undefined ? { phone: null } : normalizedPhone !== undefined ? { phone: normalizedPhone } : {}),
          ...(clearField(rawBody.login) && rawBody.login !== undefined ? { login: undefined } : {}),
          ...(clearField(rawBody.email) && rawBody.email !== undefined ? { email: null } : {}),
          ...(rawPassword !== undefined ? { new_password: rawPassword } : { new_password: undefined }),
        }
      : body;
    const input = parse(
      z
        .object({
          name: z.string().trim().min(2).max(120).optional(),
          phone: phoneSchema.nullable().optional(),
          login: loginSchema.optional(),
          email: optionalEmailSchema.nullable().optional(),
          new_password: passwordSchema.optional(),
          avatarUrl: z.string().max(25_000_000).nullable().optional(),
          remove_avatar: z.boolean().optional(),
          role: z.enum(['DIRECTOR', 'RECEPTION', 'ACCOUNTANT']).optional(),
          status: z.enum(['ACTIVE', 'BLOCKED', 'PENDING_APPROVAL']).optional(),
        })
        .passthrough()
        .refine(
          v =>
            v.name !== undefined ||
            v.phone !== undefined ||
            v.login !== undefined ||
            v.email !== undefined ||
            v.new_password !== undefined ||
            v.avatarUrl !== undefined ||
            v.remove_avatar !== undefined ||
            v.role !== undefined ||
            v.status !== undefined,
          { message: 'Kamida bitta maydon kiriting' },
        ),
      normalizedBody,
    );
    const normalizedAvatar = input.remove_avatar ? null : normalizeAvatarInput(input.avatarUrl);
    const nextPasswordHash = input.new_password ? await passwordHash(input.new_password) : undefined;
    return this.db.atomic(async tx => {
      let membership = await tx.membership.findUnique({ where: { id } });
      let targetUser = membership
        ? await tx.user.findUnique({ where: { id: membership.userId } })
        : await tx.user.findUnique({ where: { id } });
      if (!targetUser || targetUser.kind === 'CUSTOMER') {
        fail('NOT_FOUND', 'Xodim hisobi topilmadi', 404);
      }
      if (!membership) {
        membership = await tx.membership.findFirst({
          where: { userId: targetUser.id },
          orderBy: { createdAt: 'desc' },
        });
      }
      const userId = targetUser.id;
      await lock(tx, `user:${userId}`);
      if (input.login) {
        const takenLogin = await tx.user.findFirst({
          where: {
            id: { not: userId },
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
            id: { not: userId },
            OR: [
              { email: { equals: input.email, mode: 'insensitive' as const } },
              { login: { equals: input.email, mode: 'insensitive' as const } },
            ],
          },
          select: { id: true },
        });
        if (takenEmail) fail('EMAIL_IN_USE', 'Bu elektron pochta boshqa hisobga ulangan. Boshqa email kiriting', 409);
      }
      if (input.phone) {
        const takenPhone = await tx.user.findFirst({
          where: { phone: input.phone, id: { not: userId } },
          select: { id: true },
        });
        if (takenPhone) fail('PHONE_IN_USE', 'Bu telefon raqami boshqa foydalanuvchiga biriktirilgan', 409);
      }
      const updatedUser = await tx.user.update({
        where: { id: userId },
        data: {
          ...(input.name !== undefined ? { name: input.name } : {}),
          ...(input.phone !== undefined ? { phone: input.phone } : {}),
          ...(input.login !== undefined ? { login: input.login } : {}),
          ...(input.email !== undefined ? { email: input.email } : {}),
          ...(normalizedAvatar !== undefined ? { avatarUrl: normalizedAvatar } : {}),
          ...(nextPasswordHash !== undefined ? { passwordHash: nextPasswordHash, mustChangePassword: false } : {}),
          ...(input.status === 'ACTIVE' ? { status: 'ACTIVE' } : {}),
        },
        select: {
          id: true,
          publicId: true,
          kind: true,
          status: true,
          name: true,
          phone: true,
          email: true,
          login: true,
          avatarUrl: true,
          mustChangePassword: true,
          updatedAt: true,
        },
      });
      if (membership && (input.role !== undefined || input.status !== undefined)) {
        const nextRole = input.role ?? membership.role;
        const nextCeiling =
          input.role === 'DIRECTOR'
            ? DIRECTOR
            : input.role === 'ACCOUNTANT'
              ? [...ACCOUNTANT]
              : input.role === 'RECEPTION'
                ? [...DELEGATABLE]
                : membership.ceiling;
        membership = await tx.membership.update({
          where: { id: membership.id },
          data: {
            ...(input.role !== undefined ? { role: nextRole, ceiling: nextCeiling } : {}),
            ...(input.status !== undefined ? { status: input.status } : {}),
            version: { increment: 1 },
          },
        });
      }
      if (nextPasswordHash !== undefined || input.status === 'BLOCKED') {
        await tx.session.updateMany({
          where: { userId, revokedAt: null },
          data: { revokedAt: new Date() },
        });
      }
      const avatarRemoved = normalizedAvatar === null && Boolean(targetUser.avatarUrl);
      await audit(
        tx,
        actor.id,
        avatarRemoved ? 'staff.avatar_removed' : 'staff.profile_updated',
        userId,
        membership?.sanatoriumId,
        {
          name: targetUser.name,
          phone: targetUser.phone,
          login: targetUser.login,
          email: targetUser.email,
          hasAvatar: Boolean(targetUser.avatarUrl),
        },
        {
          name: updatedUser.name,
          phone: updatedUser.phone,
          login: updatedUser.login,
          email: updatedUser.email,
          hasAvatar: Boolean(updatedUser.avatarUrl),
          passwordChanged: Boolean(nextPasswordHash),
          role: membership?.role,
          status: membership?.status,
        },
      );
      return {
        ...updatedUser,
        publicId: resolveUserPublicId(updatedUser),
        membership,
      };
    });
  }
  async revokeStaffSessions(actor: Actor, id: string, meta?: AuthRequestMeta) {
    if (actor.kind !== 'SUPERADMIN') fail('PERMISSION_DENIED', 'Faqat superadmin bajara oladi', 403);
    parse(uuid, id);
    return this.db.atomic(async tx => {
      const membership = await tx.membership.findUnique({ where: { id } });
      const userId = membership ? membership.userId : id;
      await lock(tx, `user:${userId}`);
      const target = await tx.user.findUnique({ where: { id: userId } });
      if (!target) fail('NOT_FOUND', 'Xodim hisobi topilmadi', 404);
      const activeSessions = typeof (tx as any).session?.findMany === 'function'
        ? await tx.session.findMany({ where: { userId, revokedAt: null }, select: { id: true, channel: true, deviceLabel: true, ipAddress: true, userAgent: true } })
        : [];
      const res = await tx.session.updateMany({
        where: { userId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      if (typeof (tx as any).authEvent?.create === 'function') {
        for (const s of activeSessions) {
          await tx.authEvent.create({
            data: {
              userId,
              sessionId: s.id,
              eventType: 'SESSION_REVOKED',
              channel: s.channel,
              authMethod: 'ADMIN_REVOKE',
              ipAddress: normalizeIp(s.ipAddress ?? meta?.ipAddress),
              deviceLabel: s.deviceLabel || 'Veb panel',
              userAgent: sanitizeUserAgent(s.userAgent ?? meta?.userAgent),
              userKind: target.kind,
              userName: target.name,
              userLogin: target.login,
              userEmail: target.email ?? (target.login?.includes('@') ? target.login : null),
              sanatoriumId: membership?.sanatoriumId ?? null,
            },
          }).catch(() => undefined);
        }
      }
      await audit(tx, actor.id, 'staff.sessions_revoked', userId, membership?.sanatoriumId, undefined, { revoked_count: res.count });
      return { success: true, revoked_count: res.count };
    });
  }
  async customers(actor: Actor, query: unknown) {
    if (actor.kind !== 'SUPERADMIN') fail('PERMISSION_DENIED', 'Faqat superadmin ko‘ra oladi', 403);
    const { page, limit, q, status } = parse(
      pageQuery.extend({
        q: z.string().trim().max(120).optional(),
        status: z.enum(['ACTIVE', 'BLOCKED']).optional()
      }).strict(),
      query
    );
    const where: any = { kind: 'CUSTOMER' };
    if (status) where.status = status;
    if (q) {
      const digits = q.replace(/[\s()-]/g, '');
      const cleanIdDigits = q.replace(/^#/, '').trim();
      const numericPublicId = /^\d{5,8}$/.test(cleanIdDigits) ? Number(cleanIdDigits) : null;
      where.OR = [
        { name: { contains: q, mode: 'insensitive' } },
        ...(digits.length > 2 ? [{ phone: { contains: digits } }] : []),
        { login: { contains: q, mode: 'insensitive' } },
        { email: { contains: q, mode: 'insensitive' } },
        ...(numericPublicId !== null ? [{ publicId: numericPublicId }] : []),
      ];
    }
    const [users, total] = await Promise.all([
      this.db.user.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          publicId: true,
          name: true,
          phone: true,
          email: true,
          login: true,
          avatarUrl: true,
          status: true,
          createdAt: true,
          updatedAt: true,
        }
      }),
      this.db.user.count({ where })
    ]);

    const userIds = users.map(u => u.id);
    const [bookingCounts, ticketCounts, sessionSummary] = await Promise.all([
      userIds.length ? this.db.booking.groupBy({
        by: ['userId'],
        where: {
          userId: { in: userIds },
          status: { in: ['CONFIRMED', 'CHECKED_IN', 'CHECKED_OUT'] },
        },
        _count: { id: true },
      }) : [],
      userIds.length ? this.db.supportTicket.groupBy({
        by: ['userId'],
        where: { userId: { in: userIds } },
        _count: { id: true },
      }) : [],
      this.loadUserSessionsSummary(userIds, 'MOBILE'),
    ]);

    const bookingMap = new Map(bookingCounts.filter(b => b.userId !== null).map(b => [b.userId!, b._count.id]));
    const ticketMap = new Map(ticketCounts.map(t => [t.userId, t._count.id]));
    const { lastSessionMap, activeDevicesMap } = sessionSummary;
    const now = Date.now();

    const data = users.map(u => {
      const s = lastSessionMap.get(u.id);
      const activeDevices = activeDevicesMap.get(u.id) ?? [];
      const isOnline = Boolean(
        s &&
        !s.revokedAt &&
        s.refreshExpiresAt.getTime() > now &&
        now - s.lastActivityAt.getTime() < 180_000,
      );
      const lastMeta = s ? describeDeviceMeta(s.userAgent, (s.channel === 'WEB' ? 'WEB' : 'MOBILE'), s.deviceLabel) : null;
      return {
        ...u,
        publicId: resolveUserPublicId(u),
        email: u.email ?? (u.login?.includes('@') ? u.login : null),
        avatarUrl: u.avatarUrl ?? null,
        isOnline,
        activeSessionsCount: activeDevices.length,
        activeDevices,
        bookingsCount: bookingMap.get(u.id) || 0,
        ticketsCount: ticketMap.get(u.id) || 0,
        lastSeenAt: s?.lastActivityAt ?? u.updatedAt,
        device: lastMeta?.deviceLabel || 'Mobil ilova',
        deviceSummary: lastMeta?.summary || null,
        lastIp: s?.ipAddress ?? null,
      };
    });

    return paged(data, total, page, limit);
  }

  async quickLookup(actor: Actor, query: unknown) {
    const i = parse(
      z
        .object({
          q: z.string().trim().min(1).max(120),
          sanatorium_id: uuid.optional(),
          limit: z.coerce.number().int().min(1).max(20).default(10),
        })
        .strict(),
      query,
    );
    const rawQ = i.q.trim();
    const isHashId = rawQ.startsWith('#');
    const cleanToken = rawQ.replace(/^#+\s*/, '').trim();
    if (!cleanToken) {
      return { query: rawQ, isHashId, exactMatch: null, data: [] };
    }
    const isDigits = /^\d{1,8}$/.test(cleanToken);

    let allowedSanatoriumIds: string[] | null = null;
    let allowedUserIds: Set<string> | null = null;
    if (actor.kind !== 'SUPERADMIN') {
      if (i.sanatorium_id) {
        scope(actor, i.sanatorium_id);
        allowedSanatoriumIds = [i.sanatorium_id];
      } else {
        allowedSanatoriumIds = actor.memberships
          .filter((m) => m.status === 'ACTIVE')
          .map((m) => m.sanatoriumId);
      }
      const [staffMems, bookedUsers, ticketUsers] = allowedSanatoriumIds.length
        ? await Promise.all([
            this.db.membership.findMany({
              where: { sanatoriumId: { in: allowedSanatoriumIds } },
              select: { userId: true },
            }),
            typeof (this.db as any).booking?.findMany === 'function'
              ? this.db.booking.findMany({
                  where: { sanatoriumId: { in: allowedSanatoriumIds }, userId: { not: null } },
                  distinct: ['userId'],
                  select: { userId: true },
                  take: 500,
                })
              : [],
            typeof (this.db as any).supportTicket?.findMany === 'function'
              ? this.db.supportTicket.findMany({
                  where: { sanatoriumId: { in: allowedSanatoriumIds } },
                  distinct: ['userId'],
                  select: { userId: true },
                  take: 500,
                })
              : [],
          ])
        : [[], [], []];
      allowedUserIds = new Set<string>([
        actor.id,
        ...staffMems.map((m) => m.userId),
        ...bookedUsers.map((b) => b.userId).filter((v): v is string => Boolean(v)),
        ...ticketUsers.map((t) => t.userId),
      ]);
    }

    const userSelect = {
      id: true,
      publicId: true,
      kind: true,
      status: true,
      name: true,
      phone: true,
      email: true,
      login: true,
      avatarUrl: true,
      mustChangePassword: true,
      createdAt: true,
      updatedAt: true,
    } as const;

    let candidateUsers: any[] = [];
    if (isDigits) {
      const orConditions: any[] = [];
      const exactNum = Number(cleanToken);
      if (Number.isSafeInteger(exactNum)) {
        orConditions.push({ publicId: exactNum });
      }
      if (cleanToken.length < 6) {
        const minId = Number(cleanToken.padEnd(6, '0'));
        const maxId = Number(cleanToken.padEnd(6, '9'));
        orConditions.push({ publicId: { gte: minId, lte: maxId } });
      }
      orConditions.push({ publicId: null });

      const fetched = await this.db.user.findMany({
        where: {
          ...(allowedUserIds ? { id: { in: [...allowedUserIds] } } : {}),
          OR: orConditions,
        },
        select: userSelect,
        take: 250,
      });
      candidateUsers = fetched.filter((u) => {
        if (actor.kind !== 'SUPERADMIN' && u.kind === 'SUPERADMIN' && u.id !== actor.id) return false;
        const resolved = String(resolveUserPublicId(u));
        return resolved === cleanToken || resolved.startsWith(cleanToken);
      });
    } else {
      const digitsPhone = cleanToken.replace(/[\s()-]/g, '');
      candidateUsers = await this.db.user.findMany({
        where: {
          ...(allowedUserIds ? { id: { in: [...allowedUserIds] } } : {}),
          ...(actor.kind !== 'SUPERADMIN' ? { OR: [{ kind: { not: 'SUPERADMIN' } }, { id: actor.id }] } : {}),
          AND: [
            {
              OR: [
                { name: { contains: cleanToken, mode: 'insensitive' } },
                { login: { contains: cleanToken.replace(/^@/, ''), mode: 'insensitive' } },
                { email: { contains: cleanToken, mode: 'insensitive' } },
                ...(digitsPhone.length >= 3 ? [{ phone: { contains: digitsPhone } }] : []),
              ],
            },
          ],
        },
        select: userSelect,
        take: 40,
      });
    }

    candidateUsers.sort((a, b) => {
      const pubA = String(resolveUserPublicId(a));
      const pubB = String(resolveUserPublicId(b));
      const exactA = pubA === cleanToken ? 1 : 0;
      const exactB = pubB === cleanToken ? 1 : 0;
      if (exactA !== exactB) return exactB - exactA;
      if (a.status === 'ACTIVE' && b.status !== 'ACTIVE') return -1;
      if (b.status === 'ACTIVE' && a.status !== 'ACTIVE') return 1;
      return b.createdAt.getTime() - a.createdAt.getTime();
    });

    const slicedUsers = candidateUsers.slice(0, i.limit);
    const matchedIds = slicedUsers.map((u) => u.id);
    if (!matchedIds.length) {
      return { query: rawQ, isHashId, exactMatch: null, data: [] };
    }

    const [memberships, bookingCounts, ticketCounts, sessionSummary] = await Promise.all([
      typeof (this.db as any).membership?.findMany === 'function'
        ? this.db.membership.findMany({
            where: {
              userId: { in: matchedIds },
              ...(allowedSanatoriumIds ? { sanatoriumId: { in: allowedSanatoriumIds } } : {}),
            },
            orderBy: { createdAt: 'desc' },
          })
        : [],
      typeof (this.db as any).booking?.groupBy === 'function'
        ? this.db.booking.groupBy({
            by: ['userId'],
            where: {
              userId: { in: matchedIds },
              status: { in: ['CONFIRMED', 'CHECKED_IN', 'CHECKED_OUT'] },
              ...(allowedSanatoriumIds ? { sanatoriumId: { in: allowedSanatoriumIds } } : {}),
            },
            _count: { id: true },
          })
        : [],
      typeof (this.db as any).supportTicket?.groupBy === 'function'
        ? this.db.supportTicket.groupBy({
            by: ['userId'],
            where: {
              userId: { in: matchedIds },
              ...(allowedSanatoriumIds ? { sanatoriumId: { in: allowedSanatoriumIds } } : {}),
            },
            _count: { id: true },
          })
        : [],
      this.loadUserSessionsSummary(matchedIds, 'WEB'),
    ]);

    const sanIds = [...new Set(memberships.map((m) => m.sanatoriumId))];
    const sanatoriums =
      sanIds.length && typeof (this.db as any).sanatorium?.findMany === 'function'
        ? await this.db.sanatorium.findMany({
            where: { id: { in: sanIds } },
            select: { id: true, name: true },
          })
        : [];
    const sanMap = new Map(sanatoriums.map((s) => [s.id, s.name]));
    const bookingMap = new Map(bookingCounts.filter((b) => b.userId !== null).map((b) => [b.userId!, b._count.id]));
    const ticketMap = new Map(ticketCounts.map((t) => [t.userId, t._count.id]));
    const { lastSessionMap, activeDevicesMap } = sessionSummary;
    const now = Date.now();

    const data = slicedUsers.map((u) => {
      const pubId = resolveUserPublicId(u);
      const exactIdMatch = String(pubId) === cleanToken;
      const userMemberships = memberships.filter((m) => m.userId === u.id);
      const primaryMembership =
        userMemberships.find((m) => (i.sanatorium_id ? m.sanatoriumId === i.sanatorium_id : m.status === 'ACTIVE')) ??
        userMemberships[0] ??
        null;
      const s = lastSessionMap.get(u.id);
      const activeDevices = activeDevicesMap.get(u.id) ?? [];
      const isOnline = Boolean(
        s &&
          !s.revokedAt &&
          s.refreshExpiresAt.getTime() > now &&
          now - s.lastActivityAt.getTime() < 180_000,
      );
      const defaultCh = u.kind === 'CUSTOMER' ? 'MOBILE' : 'WEB';
      const lastMeta = s
        ? describeDeviceMeta(s.userAgent, s.channel === 'MOBILE' ? 'MOBILE' : 'WEB', s.deviceLabel)
        : null;
      const enrichedUser = {
        ...u,
        publicId: pubId,
        email: u.email ?? (u.login?.includes('@') ? u.login : null),
        avatarUrl: u.avatarUrl ?? null,
        isOnline,
        activeSessionsCount: activeDevices.length,
        activeDevices,
        bookingsCount: bookingMap.get(u.id) || 0,
        ticketsCount: ticketMap.get(u.id) || 0,
        lastSeenAt: s?.lastActivityAt ?? u.updatedAt,
        device: lastMeta?.deviceLabel || (defaultCh === 'MOBILE' ? 'Mobil ilova' : 'Veb panel'),
        deviceSummary: lastMeta?.summary || null,
        lastIp: s?.ipAddress ?? null,
      };
      const matchType =
        u.kind === 'SUPERADMIN'
          ? ('SELF' as const)
          : u.kind === 'STAFF'
            ? ('PARTNER' as const)
            : ('USER' as const);
      return {
        matchType,
        exactIdMatch,
        publicId: pubId,
        user: enrichedUser,
        staff: primaryMembership
          ? {
              ...primaryMembership,
              sanatoriumName: sanMap.get(primaryMembership.sanatoriumId) ?? null,
              permissions: effective(primaryMembership),
              user: enrichedUser,
            }
          : null,
      };
    });

    const exactMatch = data.find((item) => item.exactIdMatch) ?? null;
    return {
      query: rawQ,
      isHashId,
      exactMatch,
      data,
    };
  }

  async toggleCustomerStatus(actor: Actor, id: string, body: unknown) {
    if (actor.kind !== 'SUPERADMIN') fail('PERMISSION_DENIED', 'Faqat superadmin o‘zgartira oladi', 403);
    parse(uuid, id);
    const input = parse(z.object({ status: z.enum(['ACTIVE', 'BLOCKED']), reason: z.string().trim().max(300).optional() }).strict(), body);
    return this.db.atomic(async tx => {
      await lock(tx, `user:${id}`);
      const target = await tx.user.findUnique({ where: { id } });
      if (!target || target.kind !== 'CUSTOMER') fail('NOT_FOUND', 'Ilova foydalanuvchisi topilmadi', 404);
      const updated = await tx.user.update({
        where: { id },
        data: { status: input.status }
      });
      if (input.status === 'BLOCKED') {
        await tx.session.updateMany({
          where: { userId: id, revokedAt: null },
          data: { revokedAt: new Date() }
        });
      }
      await audit(tx, actor.id, 'customer.status_updated', id, undefined, { status: target.status }, { status: updated.status, reason: input.reason });
      return updated;
    });
  }

  async updateCustomer(actor: Actor, id: string, body: unknown) {
    if (actor.kind !== 'SUPERADMIN') fail('PERMISSION_DENIED', 'Faqat superadmin tahrirlay oladi', 403);
    parse(uuid, id);
    const rawBody = body && typeof body === 'object' ? (body as Record<string, unknown>) : null;
    const clearField = (val: unknown) => val === null || val === '';
    const normalizedBody = rawBody
      ? {
          ...rawBody,
          ...(rawBody.avatarUrl === undefined && rawBody.avatar_url !== undefined ? { avatarUrl: rawBody.avatar_url } : {}),
          ...(rawBody.remove_avatar === true ? { avatarUrl: null } : {}),
          ...(clearField(rawBody.phone) && rawBody.phone !== undefined ? { phone: null } : {}),
          ...(clearField(rawBody.login) && rawBody.login !== undefined ? { login: null } : {}),
          ...(clearField(rawBody.email) && rawBody.email !== undefined ? { email: null } : {}),
        }
      : body;
    const input = parse(
      z.object({
        name: z.string().trim().min(2).max(120).optional(),
        phone: phoneSchema.nullable().optional(),
        login: loginSchema.nullable().optional(),
        email: optionalEmailSchema.nullable().optional(),
        avatarUrl: z.string().max(25_000_000).nullable().optional(),
        remove_avatar: z.boolean().optional(),
      }).passthrough().refine(
        v =>
          v.name !== undefined ||
          v.phone !== undefined ||
          v.login !== undefined ||
          v.email !== undefined ||
          v.avatarUrl !== undefined ||
          v.remove_avatar !== undefined,
        { message: 'Kamida bitta maydon kiriting' },
      ),
      normalizedBody,
    );
    const normalizedAvatar = input.remove_avatar ? null : normalizeAvatarInput(input.avatarUrl);
    return this.db.atomic(async tx => {
      await lock(tx, `user:${id}`);
      const target = await tx.user.findUnique({ where: { id } });
      if (!target || target.kind !== 'CUSTOMER') fail('NOT_FOUND', 'Ilova foydalanuvchisi topilmadi', 404);
      const nextPhone = input.phone !== undefined ? input.phone : target.phone;
      const nextLogin = input.login !== undefined ? input.login : target.login;
      const nextEmail = input.email !== undefined ? input.email : target.email;
      if (!nextPhone && !nextLogin && !nextEmail) {
        fail('CONTACT_REQUIRED', 'Foydalanuvchida kamida telefon, login yoki email bo‘lishi kerak', 422);
      }
      if (input.login) {
        const takenLogin = await tx.user.findFirst({
          where: {
            id: { not: id },
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
            id: { not: id },
            OR: [
              { email: { equals: input.email, mode: 'insensitive' as const } },
              { login: { equals: input.email, mode: 'insensitive' as const } },
            ],
          },
          select: { id: true },
        });
        if (takenEmail) fail('EMAIL_IN_USE', 'Bu elektron pochta boshqa hisobga ulangan. Boshqa email kiriting', 409);
      }
      if (input.phone) {
        const takenPhone = await tx.user.findFirst({
          where: { phone: input.phone, id: { not: id } },
          select: { id: true },
        });
        if (takenPhone) fail('PHONE_IN_USE', 'Bu telefon raqami boshqa foydalanuvchiga biriktirilgan', 409);
      }
      const updated = await tx.user.update({
        where: { id },
        data: {
          ...(input.name !== undefined ? { name: input.name } : {}),
          ...(input.phone !== undefined ? { phone: input.phone } : {}),
          ...(input.login !== undefined ? { login: input.login } : {}),
          ...(input.email !== undefined ? { email: input.email } : {}),
          ...(normalizedAvatar !== undefined ? { avatarUrl: normalizedAvatar } : {}),
        },
        select: {
          id: true,
          publicId: true,
          kind: true,
          status: true,
          name: true,
          phone: true,
          email: true,
          login: true,
          avatarUrl: true,
          updatedAt: true,
        },
      });
      const avatarRemoved = normalizedAvatar === null && Boolean(target.avatarUrl);
      await audit(
        tx,
        actor.id,
        avatarRemoved ? 'customer.avatar_removed' : 'customer.profile_updated',
        id,
        undefined,
        { name: target.name, phone: target.phone, login: target.login, email: target.email, hasAvatar: Boolean(target.avatarUrl) },
        { name: updated.name, phone: updated.phone, login: updated.login, email: updated.email, hasAvatar: Boolean(updated.avatarUrl) },
      );
      return { ...updated, publicId: resolveUserPublicId(updated) };
    });
  }

  async revokeCustomerSessions(actor: Actor, id: string, meta?: AuthRequestMeta) {
    if (actor.kind !== 'SUPERADMIN') fail('PERMISSION_DENIED', 'Faqat superadmin bajara oladi', 403);
    parse(uuid, id);
    return this.db.atomic(async tx => {
      await lock(tx, `user:${id}`);
      const target = await tx.user.findUnique({ where: { id } });
      if (!target || target.kind !== 'CUSTOMER') fail('NOT_FOUND', 'Ilova foydalanuvchisi topilmadi', 404);
      const activeSessions = typeof (tx as any).session?.findMany === 'function'
        ? await tx.session.findMany({ where: { userId: id, revokedAt: null }, select: { id: true, channel: true, deviceLabel: true, ipAddress: true, userAgent: true } })
        : [];
      const res = await tx.session.updateMany({
        where: { userId: id, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      if (typeof (tx as any).authEvent?.create === 'function') {
        for (const s of activeSessions) {
          await tx.authEvent.create({
            data: {
              userId: id,
              sessionId: s.id,
              eventType: 'SESSION_REVOKED',
              channel: s.channel,
              authMethod: 'ADMIN_REVOKE',
              ipAddress: normalizeIp(s.ipAddress ?? meta?.ipAddress),
              deviceLabel: s.deviceLabel || 'Mobil ilova',
              userAgent: sanitizeUserAgent(s.userAgent ?? meta?.userAgent),
              userKind: target.kind,
              userName: target.name,
              userLogin: target.login,
              userEmail: target.email ?? (target.login?.includes('@') ? target.login : null),
            },
          }).catch(() => undefined);
        }
      }
      await audit(tx, actor.id, 'customer.sessions_revoked', id, undefined, undefined, { revoked_count: res.count });
      return { success: true, revoked_count: res.count };
    });
  }

  async deleteCustomer(actor: Actor, id: string) {
    if (actor.kind !== 'SUPERADMIN') fail('PERMISSION_DENIED', 'Faqat superadmin o‘chira oladi', 403);
    parse(uuid, id);
    return this.db.atomic(async tx => {
      await lock(tx, `user:${id}`);
      const target = await tx.user.findUnique({ where: { id } });
      if (!target || target.kind !== 'CUSTOMER') fail('NOT_FOUND', 'Ilova foydalanuvchisi topilmadi', 404);

      await tx.session.deleteMany({ where: { userId: id } });
      await tx.favorite.deleteMany({ where: { userId: id } });
      await tx.notificationDelivery.deleteMany({ where: { userId: id } });
      await tx.messageRecipient.deleteMany({ where: { userId: id } });
      await tx.surveyResponse.deleteMany({ where: { userId: id } });
      await tx.telegramAccount.deleteMany({ where: { userId: id } });
      await tx.telegramLinkRequest.deleteMany({ where: { userId: id } });

      const userTickets = await tx.supportTicket.findMany({ where: { userId: id }, select: { id: true } });
      const ticketIds = userTickets.map(t => t.id);
      if (ticketIds.length) {
        await tx.supportMessage.deleteMany({ where: { ticketId: { in: ticketIds } } });
        await tx.supportTicket.deleteMany({ where: { id: { in: ticketIds } } });
      }
      await tx.supportMessage.deleteMany({ where: { userId: id } });

      await tx.review.deleteMany({ where: { userId: id } });
      await tx.booking.updateMany({ where: { userId: id }, data: { userId: null } });
      const usedQuotes = (await tx.booking.findMany({ select: { quoteId: true } })).map(b => b.quoteId);
      await tx.quote.deleteMany({ where: { userId: id, id: { notIn: usedQuotes } } });
      await tx.quote.updateMany({ where: { userId: id }, data: { userId: actor.id } });
      await tx.aiUsage.deleteMany({ where: { userId: id } });
      await tx.idempotencyRecord.deleteMany({ where: { userId: id } });

      await audit(tx, actor.id, 'customer.deleted', id, undefined, { name: target.name, phone: target.phone, login: target.login, email: target.email ?? (target.login?.includes('@') ? target.login : null) });
      await tx.user.delete({ where: { id } });

      return { success: true };
    });
  }
  async clearAllNonSuperadmin(actor: Actor) {
    if (actor.kind !== 'SUPERADMIN') fail('PERMISSION_DENIED', 'Faqat superadmin bajara oladi', 403);
    return this.db.atomic(async tx => {
      const users = await tx.user.findMany({
        where: {
          OR: [
            { kind: { not: 'SUPERADMIN' } },
            { login: { not: 'mirsaid' } },
            { login: null },
          ],
        },
        select: { id: true, login: true, kind: true, name: true }
      });
      const ids = users.map(u => u.id);
      if (!ids.length) return { success: true, deleted_count: 0, message: 'Bazada faqat superadmin hisobi mavjud' };

      await tx.membership.deleteMany({ where: { OR: [{ userId: { in: ids } }, { invitedBy: { in: ids } }] } });
      await tx.membership.deleteMany({ where: { role: { in: ['DIRECTOR', 'RECEPTION', 'ACCOUNTANT'] } } });
      await tx.session.deleteMany({ where: { userId: { in: ids } } });
      await tx.favorite.deleteMany({ where: { userId: { in: ids } } });
      await tx.notificationDelivery.deleteMany({ where: { userId: { in: ids } } });
      await tx.messageRecipient.deleteMany({ where: { userId: { in: ids } } });
      await tx.surveyResponse.deleteMany({ where: { userId: { in: ids } } });
      await tx.telegramAccount.deleteMany({ where: { userId: { in: ids } } });
      await tx.telegramLinkRequest.deleteMany({ where: { userId: { in: ids } } });

      const userTickets = await tx.supportTicket.findMany({ where: { userId: { in: ids } }, select: { id: true } });
      const ticketIds = userTickets.map(t => t.id);
      if (ticketIds.length) {
        await tx.supportMessage.deleteMany({ where: { ticketId: { in: ticketIds } } });
        await tx.supportTicket.deleteMany({ where: { id: { in: ticketIds } } });
      }
      await tx.supportMessage.deleteMany({ where: { userId: { in: ids } } });

      await tx.review.deleteMany({ where: { userId: { in: ids } } });
      await tx.booking.updateMany({ where: { userId: { in: ids } }, data: { userId: null } });
      const usedQuotes = (await tx.booking.findMany({ select: { quoteId: true } })).map(b => b.quoteId);
      await tx.quote.deleteMany({ where: { userId: { in: ids }, id: { notIn: usedQuotes } } });
      await tx.quote.updateMany({ where: { userId: { in: ids } }, data: { userId: actor.id } });
      await tx.aiUsage.deleteMany({ where: { userId: { in: ids } } });
      await tx.idempotencyRecord.deleteMany({ where: { userId: { in: ids } } });

      await audit(tx, actor.id, 'superadmin.all_accounts_cleared', actor.id, undefined, { deleted_count: ids.length, deleted_users: users.map(u => u.login || u.name) });
      await tx.user.deleteMany({ where: { id: { in: ids } } });

      return { success: true, deleted_count: ids.length, deleted_users: users.map(u => u.login || u.name) };
    });
  }
}
