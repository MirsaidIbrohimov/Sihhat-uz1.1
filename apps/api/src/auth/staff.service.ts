import { Inject, Injectable } from '@nestjs/common';
import { z } from 'zod';
import { Db, audit, emit, lock, type Tx } from '../common/db';
import { fail, parse, uuid, version, reason, pageQuery, paged } from '../common/errors';
import { passwordHash, opaque } from '../common/crypto';
import { loginSchema, passwordSchema, phoneSchema } from './auth.service';
import { Actor, ACCOUNTANT, DELEGATABLE, DIRECTOR, effective, requirePlatform, scope, tenantIds } from './permissions';

export const staffInput = z.object({ sanatorium_id: uuid, name: z.string().trim().min(2).max(120), login: loginSchema, phone: phoneSchema, temporary_password: passwordSchema.optional(), grants: z.array(z.enum(DELEGATABLE)).max(30).default([]) }).strict();
export const staffInvitationInput = staffInput.extend({role: z.enum(['RECEPTION', 'ACCOUNTANT']).default('RECEPTION')});
export const resetPasswordInput = z.object({ new_password: passwordSchema, confirm_password: z.string().max(128) }).strict().refine(v => v.new_password === v.confirm_password, { message: 'Yangi parollar bir xil bo‘lsin', path: ['confirm_password'] });
@Injectable()
export class StaffService {
  constructor(@Inject(Db) readonly db: Db) {}
  async list(actor: Actor, query: unknown) {
    const { page, limit, sanatorium_id, q, status, role } = parse(pageQuery.extend({ sanatorium_id: uuid.optional(), q: z.string().trim().max(120).optional(), status: z.enum(['ACTIVE', 'PENDING_APPROVAL', 'REJECTED', 'REVOKED', 'BLOCKED']).optional(), role: z.enum(['DIRECTOR', 'RECEPTION', 'ACCOUNTANT']).optional() }).strict(), query);
    if (sanatorium_id) scope(actor, sanatorium_id, 'staff.invite');
    const ids = sanatorium_id ? [sanatorium_id] : tenantIds(actor, 'staff.invite');
    const matchingUsers = q ? await this.db.user.findMany({ where: { OR: [{ name: { contains: q, mode: 'insensitive' } }, { login: { contains: q, mode: 'insensitive' } }, { phone: { contains: q.replace(/[\s()-]/g, '') } }] }, select: { id: true } }) : null;
    const where = { ...(ids ? { sanatoriumId: { in: ids } } : {}), ...(matchingUsers ? { userId: { in: matchingUsers.map(u => u.id) } } : {}), ...(status ? { status } : {}), ...(role ? { role } : {}) };
    const [memberships, total] = await Promise.all([this.db.membership.findMany({ where, skip: (page - 1) * limit, take: limit, orderBy: { createdAt: 'desc' } }), this.db.membership.count({ where })]);
    const users = await this.db.user.findMany({ where: { id: { in: memberships.map(m => m.userId) } }, select: { id: true, name: true, login: true, phone: true, status: true, mustChangePassword: true } });
    return paged(memberships.map(m => ({ ...m, user: users.find(u => u.id === m.userId), permissions: effective(m) })), total, page, limit);
  }
  private async createUser(tx: Tx, input: z.infer<typeof staffInput>, password: string) {
    return tx.user.create({ data: { kind: 'STAFF', name: input.name, login: input.login, phone: input.phone, passwordHash: await passwordHash(password), mustChangePassword: true } });
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
      const user = await this.createUser(tx, input, password);
      const membership = await tx.membership.create({ data: { userId: user.id, sanatoriumId: input.sanatorium_id, role: 'DIRECTOR', status: 'ACTIVE', ceiling: DIRECTOR, invitedBy: actor.id } });
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
      const user = await this.createUser(tx, input, password);
      const membership = await tx.membership.create({ data: { userId: user.id, sanatoriumId: input.sanatorium_id, role: input.role, status: actor.kind === 'SUPERADMIN' ? 'ACTIVE' : 'PENDING_APPROVAL', grants: input.grants, ceiling, invitedBy: actor.id } });
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
}
