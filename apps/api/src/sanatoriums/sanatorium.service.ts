import { Inject, Injectable, Optional, type OnModuleInit } from '@nestjs/common';
import { createHmac, randomInt, randomUUID } from 'node:crypto';
import { z } from 'zod';
import { CONFIG, type Config } from '../common/config';
import { passwordMatches } from '../common/crypto';
import { Db, audit, emit, lock } from '../common/db';
import { AppError, fail, parse, uuid, version, reason, pageQuery, paged, validationDetail } from '../common/errors';
import { EmailService } from '../auth/email';
import { Actor, requirePlatform, scope, tenantIds } from '../auth/permissions';
import { phoneSchema } from '../auth/auth.service';
import { withMapLocation } from './maps';

export const profileSchema = z.object({
  name: z.string().trim().min(2).max(150), description: z.string().trim().min(30).max(10000),
  legal_name: z.string().trim().min(2).max(150), stir: z.string().regex(/^\d{9}$/),
  region: z.string().trim().min(2).max(80), address: z.string().trim().min(5).max(500),
  latitude: z.number().min(-90).max(90).optional(), longitude: z.number().min(-180).max(180).optional(),
  map_url: z.string().trim().max(2048).optional(),
  contact_phone: phoneSchema, check_in_time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/), check_out_time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  amenities: z.array(z.string().min(1).max(80)).max(50).default([]), services: z.array(z.string().min(1).max(200)).max(50).default([]),
  meals: z.string().max(1000).default(''), child_rules: z.string().max(2000).default(''), medical_requirements: z.string().max(2000).default(''),
  directions: z.string().max(2000).default(''), required_documents: z.string().max(2000).default(''),
  photo_ids: z.array(uuid).min(1).max(30), document_ids: z.array(uuid).min(1).max(15), terms_accepted: z.boolean(),
});
// Drafts retain unfinished input; complete profile validation runs on submission.
const draftProfileSchema = profileSchema.partial().extend({
  name: z.string().max(150).optional(), description: z.string().max(10000).optional(), legal_name: z.string().max(150).optional(),
  stir: z.string().max(9).optional(), region: z.string().max(80).optional(), address: z.string().max(500).optional(),
  contact_phone: z.string().max(30).optional(), check_in_time: z.string().max(5).optional(), check_out_time: z.string().max(5).optional(),
  latitude: z.number().min(-90).max(90).nullable().optional(), longitude: z.number().min(-180).max(180).nullable().optional(),
  amenities: z.array(z.string().min(1).max(80)).max(50).optional(), services: z.array(z.string().min(1).max(200)).max(50).optional(),
  meals: z.string().max(1000).optional(), child_rules: z.string().max(2000).optional(), medical_requirements: z.string().max(2000).optional(),
  directions: z.string().max(2000).optional(), required_documents: z.string().max(2000).optional(),
  photo_ids: z.array(uuid).max(30).optional(), document_ids: z.array(uuid).max(15).optional(),
}).strict();
export const draftInput = z.object({ version, data: draftProfileSchema }).strict();
export const featuredInput = z.object({ version, featured: z.boolean() }).strict();
export const deleteSanatoriumInput = z.object({
  method: z.enum(['PASSWORD', 'EMAIL_CODE']),
  password: z.string().min(1).max(200).optional(),
  email_code: z.string().trim().regex(/^\d{6}$/, '6 xonali tasdiqlash kodini kiriting').optional(),
  reason: z.string().trim().max(500).optional(),
}).strict();

export function maskAdminEmail(email: string): string {
  const [local = '', domain = ''] = email.trim().split('@');
  if (!local || !domain) return '***';
  const head = local.slice(0, Math.min(2, local.length));
  const tail = local.length > 3 ? local.slice(-1) : '';
  return `${head}***${tail}@${domain}`;
}

export function publicProfile(data: any) {
  const { legal_name, stir, document_ids, terms_accepted, contact_phone, ...publicData } = data; return publicData;
}
@Injectable()
export class SanatoriumService implements OnModuleInit {
  constructor(
    @Inject(Db) readonly db: Db,
    @Optional() @Inject(CONFIG) readonly config?: Config,
    @Optional() @Inject(EmailService) readonly email?: EmailService,
  ) {}
  async onModuleInit() {
    if (process.env.NODE_ENV === 'test') return;
    if (typeof (this.db as unknown as { sanatorium?: { updateMany?: unknown } })?.sanatorium?.updateMany !== 'function') return;
    try {
      await this.db.sanatorium.updateMany({
        where: { status: 'ACTIVE', publicRevisionId: { not: null }, paymentReady: false },
        data: { paymentReady: true },
      });
    } catch {
      // Ignore during bootstrap or mocked environments
    }
  }
  async featured(actor: Actor, id: string, body: unknown) {
    requirePlatform(actor, 'sanatoriums.manage'); parse(uuid, id);
    const input = parse(featuredInput, body);
    return this.db.atomic(async tx => {
      const before = await tx.sanatorium.findUnique({ where: { id } });
      if (!before) fail('NOT_FOUND', 'Sanatoriya topilmadi', 404);
      const changed = await tx.sanatorium.updateMany({ where: { id, version: input.version }, data: { featuredOnHome: input.featured, version: { increment: 1 } } });
      if (!changed.count) fail('VERSION_CONFLICT', 'Sanatoriya o‘zgargan. Sahifani yangilang.');
      const after = await tx.sanatorium.findUniqueOrThrow({ where: { id } });
      await audit(tx, actor.id, 'sanatorium.featured_updated', id, id, { featured_on_home: before.featuredOnHome }, { featured_on_home: after.featuredOnHome });
      return after;
    });
  }
  async create(actor: Actor, body: unknown) {
    requirePlatform(actor, 'sanatoriums.manage'); const input = parse(z.object({ name: z.string().trim().min(2).max(150) }).strict(), body);
    return this.db.atomic(async tx => {
      const sanatorium = await tx.sanatorium.create({ data: { name: input.name } });
      const revision = await tx.sanatoriumRevision.create({ data: { sanatoriumId: sanatorium.id, data: { name: input.name }, createdBy: actor.id } });
      await audit(tx, actor.id, 'sanatorium.created', sanatorium.id, sanatorium.id, undefined, { name: input.name }); return { ...sanatorium, revision };
    });
  }
  async list(actor: Actor, query: unknown) {
    const { page, limit } = parse(pageQuery, query); const ids = tenantIds(actor);
    const where = ids ? { id: { in: ids } } : {};
    const [data, total] = await Promise.all([this.db.sanatorium.findMany({ where, skip: (page-1)*limit, take: limit, orderBy: { createdAt: 'desc' } }), this.db.sanatorium.count({ where })]);
    const revisions = await this.db.sanatoriumRevision.findMany({ where: { sanatoriumId: { in: data.map(s => s.id) } }, orderBy: { createdAt: 'desc' } });
    return paged(data.map(s => actor.kind !== 'SUPERADMIN' && actor.memberships.some(m => m.sanatoriumId === s.id && m.status === 'ACTIVE' && m.role === 'ACCOUNTANT') ? {id: s.id, name: s.name, status: s.status} : ({ ...s, revision: revisions.find(r => r.sanatoriumId === s.id && r.status !== 'APPROVED') ?? revisions.find(r => r.id === s.publicRevisionId) })), total, page, limit);
  }
  async get(actor: Actor, id: string) {
    parse(uuid, id); scope(actor, id);
    const s = await this.db.sanatorium.findUnique({ where: { id } }); if (!s) fail('NOT_FOUND', 'Sanatoriya topilmadi', 404);
    const revisions = await this.db.sanatoriumRevision.findMany({ where: { sanatoriumId: id }, orderBy: { createdAt: 'desc' }, take: 20 });
    return { ...s, revisions };
  }
  async newDraft(actor: Actor, id: string) {
    parse(uuid, id); scope(actor, id, 'sanatorium.profile.edit');
    return this.db.atomic(async tx => {
      await lock(tx, `tenant:${id}`);
      const s = await tx.sanatorium.findUnique({ where: { id } }); if (!s) fail('NOT_FOUND', 'Sanatoriya topilmadi', 404);
      const existing = await tx.sanatoriumRevision.findFirst({ where: { sanatoriumId: id, status: { in: ['DRAFT','SUBMITTED','CHANGES_REQUESTED'] } } });
      if (existing) return existing;
      const previous = s.publicRevisionId ? await tx.sanatoriumRevision.findUnique({ where: { id: s.publicRevisionId } }) : null;
      const draft = await tx.sanatoriumRevision.create({ data: { sanatoriumId: id, data: previous?.data ?? { name: s.name }, createdBy: actor.id } });
      await audit(tx, actor.id, 'sanatorium.draft_created', draft.id, id); return draft;
    });
  }
  async save(actor: Actor, revisionId: string, body: unknown) {
    parse(uuid, revisionId); const input = parse(draftInput, body);
    return this.db.atomic(async tx => {
      await lock(tx, `revision:${revisionId}`);
      const r = await tx.sanatoriumRevision.findUnique({ where: { id: revisionId } }); if (!r) fail('NOT_FOUND', 'Tahrir topilmadi', 404);
      scope(actor, r.sanatoriumId, 'sanatorium.profile.edit');
      if (!['DRAFT','CHANGES_REQUESTED'].includes(r.status) || r.version !== input.version) fail('VERSION_CONFLICT', 'Tahrir o‘zgargan yoki tekshiruvda');
      const data = parse(draftProfileSchema, withMapLocation({ ...(r.data as object), ...input.data }, true));
      const ids = [...(data.photo_ids ?? []), ...(data.document_ids ?? [])];
      if (ids.length) {
        const assets = await tx.mediaAsset.findMany({ where: { id: { in: ids }, sanatoriumId: r.sanatoriumId } });
        if (new Set(ids).size !== assets.length || assets.some(a => (data.document_ids?.includes(a.id) && a.visibility !== 'PRIVATE') || (data.photo_ids?.includes(a.id) && (a.visibility !== 'PUBLIC' || !a.mime.startsWith('image/'))))) fail('MEDIA_SCOPE_INVALID', 'Fayllarni tekshiring', 422);
      }
      const changed = await tx.sanatoriumRevision.update({ where: { id: revisionId }, data: { data, version: { increment: 1 }, status: 'DRAFT' } });
      await audit(tx, actor.id, 'sanatorium.draft_saved', revisionId, r.sanatoriumId, r.data, changed.data); return changed;
    });
  }
  async submit(actor: Actor, revisionId: string, body: unknown) {
    parse(uuid, revisionId); const input = parse(z.object({ version }).strict(), body);
    return this.db.atomic(async tx => {
      await lock(tx, `revision:${revisionId}`);
      const r = await tx.sanatoriumRevision.findUnique({ where: { id: revisionId } }); if (!r) fail('NOT_FOUND', 'Tahrir topilmadi', 404);
      scope(actor, r.sanatoriumId, 'sanatorium.profile.edit');
      if (!['DRAFT','CHANGES_REQUESTED'].includes(r.status) || r.version !== input.version) fail('VERSION_CONFLICT', 'Tahrir holati o‘zgargan');
      const profile = profileSchema.strict().safeParse(r.data);
      const details = profile.success ? [] : profile.error.issues.map(validationDetail);
      try { withMapLocation(r.data as any); } catch (error) {
        details.push({ path: 'map_url', field: 'Xaritadagi joylashuv', message: 'Google Maps yoki Yandex Maps HTTPS havolasini kiriting.' });
      }
      if (!(r.data as any).map_url && (typeof (r.data as any).latitude !== 'number' || typeof (r.data as any).longitude !== 'number')) details.push({ path: 'map_url', field: 'Xaritadagi joylashuv', message: 'Google Maps yoki Yandex Maps havolasini kiriting.' });
      if (!(r.data as any).terms_accepted && !details.some(d => d.path === 'terms_accepted')) details.push({ path: 'terms_accepted', field: 'Platforma xizmat shartlari', message: 'Xizmat shartlarini qabul qiling.' });
      const room = await tx.room.findFirst({ where: { sanatoriumId: r.sanatoriumId, active: true } });
      const rate = await tx.ratePlan.findFirst({ where: { sanatoriumId: r.sanatoriumId, active: true } });
      if (!room) details.push({ path: 'rooms', field: 'Xonalar', message: 'Kamida bitta faol xona kiriting.' });
      if (!rate) details.push({ path: 'rate_plans', field: 'Tariflar', message: 'Kamida bitta faol boshlang‘ich tarif kiriting.' });
      if (details.length || !profile.success) throw new AppError('ONBOARDING_INCOMPLETE', 'Tekshiruvga yuborish uchun quyidagi ma’lumotlarni to‘ldiring yoki tuzating.', 422, details);
      const changed = await tx.sanatoriumRevision.update({ where: { id: revisionId }, data: { data: profile.data, status: 'SUBMITTED', submittedAt: new Date(), version: { increment: 1 } } });
      const admins = await tx.user.findMany({ where: { kind: 'SUPERADMIN', status: 'ACTIVE' }, select: { id: true } });
      await emit(tx, 'sanatorium.submitted', { recipient_ids: admins.map(u => u.id), revision_id: revisionId });
      await audit(tx, actor.id, 'sanatorium.submitted', revisionId, r.sanatoriumId); return changed;
    });
  }
  async moderate(actor: Actor, revisionId: string, approve: boolean, body: unknown) {
    requirePlatform(actor, 'moderation.manage'); parse(uuid, revisionId);
    const input = parse(z.object({ version, reason: reason.optional() }).strict(), body);
    if (!approve && !input.reason) fail('REASON_REQUIRED', 'Tuzatish sababini yozing', 422);
    return this.db.atomic(async tx => {
      await lock(tx, `revision:${revisionId}`);
      const r = await tx.sanatoriumRevision.findUnique({ where: { id: revisionId } }); if (!r) fail('NOT_FOUND', 'Tahrir topilmadi', 404);
      if (r.status !== 'SUBMITTED' || r.version !== input.version) fail('VERSION_CONFLICT', 'Tekshiruvdagi version o‘zgargan');
      const changed = await tx.sanatoriumRevision.update({ where: { id: revisionId }, data: { status: approve ? 'APPROVED' : 'CHANGES_REQUESTED', reason: input.reason, approvedAt: approve ? new Date() : null, version: { increment: 1 } } });
      if (approve) await tx.sanatorium.update({ where: { id: r.sanatoriumId }, data: { publicRevisionId: r.id, name: (r.data as any).name, paymentReady: true, version: { increment: 1 } } });
      const members = await tx.membership.findMany({ where: { sanatoriumId: r.sanatoriumId, status: 'ACTIVE' }, select: { userId: true } });
      await emit(tx, 'sanatorium.moderated', { recipient_ids: members.map(m => m.userId), revision_id: r.id, status: changed.status, reason: input.reason });
      await audit(tx, actor.id, approve ? 'sanatorium.approved' : 'sanatorium.changes_requested', r.id, r.sanatoriumId, undefined, { version: input.version, reason: input.reason }); return changed;
    });
  }
  async state(actor: Actor, id: string, status: string, body: unknown) {
    requirePlatform(actor, 'sanatoriums.manage'); parse(uuid, id); const input = parse(z.object({ version, reason }).strict(), body);
    return this.db.atomic(async tx => {
      await lock(tx, `inventory:${id}`);
      const result = await tx.sanatorium.updateMany({ where: { id, version: input.version }, data: { status, version: { increment: 1 } } });
      if (!result.count) fail('VERSION_CONFLICT', 'Sanatoriya holati o‘zgargan');
      await audit(tx, actor.id, `sanatorium.${status.toLowerCase()}`, id, id, undefined, { reason: input.reason }); return tx.sanatorium.findUniqueOrThrow({ where: { id } });
    });
  }
  async bankRequest(actor: Actor, id: string, body: unknown) {
    parse(uuid, id); scope(actor, id, 'bank.request');
    const data = parse(z.object({ legal_name: z.string().min(2).max(150), account: z.string().regex(/^\d{20}$/), mfo: z.string().regex(/^\d{5}$/), stir: z.string().regex(/^\d{9}$/) }).strict(), body);
    return this.db.atomic(async tx => {
      const r = await tx.bankRevision.create({ data: { sanatoriumId: id, data } });
      await audit(tx, actor.id, 'bank.change_requested', r.id, id);
      const [san, admins] = await Promise.all([
        tx.sanatorium.findUnique({ where: { id }, select: { name: true } }),
        tx.user.findMany({ where: { kind: 'SUPERADMIN', status: 'ACTIVE' }, select: { id: true } }),
      ]);
      await emit(tx, 'bank.change_requested', {
        recipient_ids: admins.map(a => a.id),
        revision_id: r.id,
        sanatorium_id: id,
        sanatorium_name: san?.name ?? null,
      });
      return r;
    });
  }
  async banks(actor: Actor, id: string) {
    parse(uuid,id); scope(actor,id,'bank.request');
    return this.db.bankRevision.findMany({where:{sanatoriumId:id},orderBy:{createdAt:'desc'},take:30});
  }
  async bankApprove(actor: Actor, id: string) {
    requirePlatform(actor, 'payouts.manage'); parse(uuid, id);
    return this.db.atomic(async tx => {
      const r = await tx.bankRevision.findUnique({ where: { id } }); if (!r || r.status !== 'PENDING') fail('NOT_FOUND', 'Kutilayotgan rekvizit topilmadi', 404);
      await lock(tx, `settlement:${r.sanatoriumId}`);
      await tx.bankRevision.update({ where: { id }, data: { status: 'APPROVED', approvedBy: actor.id } });
      await tx.sanatorium.update({ where: { id: r.sanatoriumId }, data: { bankRevisionId: id } });
      await audit(tx, actor.id, 'bank.approved', id, r.sanatoriumId); return { success: true };
    });
  }

  private deleteOtpHash(challengeId: string, code: string): string {
    return createHmac('sha256', this.config?.AUTH_SECRET ?? 'sihhat-sanatorium-delete-otp')
      .update(`DELETE_SANATORIUM:${challengeId}:${code}`)
      .digest('hex');
  }

  private async checkDeleteRateLimit(key: string, max: number, windowSeconds: number) {
    if (!this.db.rateLimit) return;
    const now = new Date();
    const expiresAt = new Date(now.getTime() + windowSeconds * 1000);
    const existing = await this.db.rateLimit.findUnique({ where: { id: key } });
    if (!existing || existing.expiresAt <= now) {
      await this.db.rateLimit.upsert({
        where: { id: key },
        create: { id: key, count: 1, expiresAt },
        update: { count: 1, expiresAt },
      });
      return;
    }
    if (existing.count >= max) {
      fail('RATE_LIMITED', 'Urinishlar soni oshib ketdi. Biroz kutib qayta urinib ko‘ring.', 429);
    }
    await this.db.rateLimit.update({
      where: { id: key },
      data: { count: { increment: 1 } },
    });
  }

  private async resolveAdminDeleteEmail(actorId: string): Promise<{ email: string; adminName: string | null }> {
    const pickEmail = (u?: { email?: string | null; login?: string | null } | null): string | null => {
      const candidate = (u?.email?.trim() || (u?.login?.includes('@') ? u.login.trim() : '')).toLowerCase();
      return candidate && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(candidate) ? candidate : null;
    };

    const current = await this.db.user.findUnique({ where: { id: actorId } });
    const direct = pickEmail(current);
    if (direct) return { email: direct, adminName: current?.name ?? null };

    const otherAdmins = await this.db.user?.findMany?.({
      where: { kind: 'SUPERADMIN', status: 'ACTIVE' },
      orderBy: { createdAt: 'asc' },
    }) ?? [];
    for (const candidate of otherAdmins) {
      const found = pickEmail(candidate);
      if (found) return { email: found, adminName: current?.name ?? candidate.name ?? null };
    }

    const smtpUser = this.config?.SMTP_USER?.trim().toLowerCase() ?? '';
    if (smtpUser && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(smtpUser) && !['resend', 'apikey'].includes(smtpUser.split('@')[0])) {
      return { email: smtpUser, adminName: current?.name ?? null };
    }

    return fail(
      'ADMIN_EMAIL_MISSING',
      'Tasdiqlash kodi yuborish uchun avval «Mening hisobim» bo‘limida admin email manzilini saqlang yoki admin paroli orqali o‘chiring.',
      422,
    );
  }

  async requestDeleteCode(actor: Actor, id: string) {
    requirePlatform(actor, 'sanatoriums.manage');
    parse(uuid, id);
    if (this.config?.PUBLIC_DEMO_ENABLED) {
      fail('DEMO_ACCESS_DENIED', 'Demo serverda sanatoriyani o‘chirish yopiq', 403);
    }
    const sanatorium = await this.db.sanatorium.findUnique({ where: { id } });
    if (!sanatorium) fail('NOT_FOUND', 'Sanatoriya topilmadi', 404);

    if (this.config?.NODE_ENV === 'production' && this.email && !this.email.configured && !this.config.DEMO_OTP_ENABLED) {
      fail('EMAIL_NOT_CONFIGURED', 'Serverda email yuborish xizmati sozlanmagan. Admin paroli orqali o‘chiring.', 503);
    }

    const { email: targetEmail, adminName } = await this.resolveAdminDeleteEmail(actor.id);
    await this.checkDeleteRateLimit(`sanatorium-del-otp:${actor.id}`, 10, 900);

    const code = randomInt(0, 1_000_000).toString().padStart(6, '0');
    const targetKey = `sanatorium-delete:${id}:${actor.id}`;
    const ttlSeconds = 300;
    const resendAfter = 30;

    const challenge = await this.db.atomic(async tx => {
      await lock(tx, `otp:${targetKey}`);
      const recent = await tx.otpChallenge.findFirst({
        where: { phone: targetKey, purpose: 'DELETE_SANATORIUM' },
        orderBy: { createdAt: 'desc' },
      });
      if (recent && !recent.consumedAt && recent.createdAt.getTime() + resendAfter * 1000 > Date.now()) {
        fail('OTP_COOLDOWN', 'Qayta kod yuborish uchun 30 soniya kuting', 429);
      }
      await tx.otpChallenge.updateMany({
        where: { phone: targetKey, purpose: 'DELETE_SANATORIUM', consumedAt: null },
        data: { consumedAt: new Date() },
      });
      const challengeId = randomUUID();
      const created = await tx.otpChallenge.create({
        data: {
          id: challengeId,
          phone: targetKey,
          purpose: 'DELETE_SANATORIUM',
          actorId: actor.id,
          codeHash: this.deleteOtpHash(challengeId, code),
          expiresAt: new Date(Date.now() + ttlSeconds * 1000),
        },
      });
      await audit(tx, actor.id, 'sanatorium.delete_code_requested', id, id, undefined, {
        masked_email: maskAdminEmail(targetEmail),
      });
      return created;
    });

    if (this.email) {
      await this.email.sendSanatoriumDeleteCode({
        id: challenge.id,
        email: targetEmail,
        code,
        sanatoriumName: sanatorium.name,
        adminName,
        expiresAt: challenge.expiresAt,
      });
    }

    return {
      sent: true,
      masked_email: maskAdminEmail(targetEmail),
      expires_at: challenge.expiresAt,
      expires_in_seconds: ttlSeconds,
      resend_after: resendAfter,
      ...(this.config?.DEMO_OTP_ENABLED && this.config?.NODE_ENV !== 'production' ? { demo_code: code } : {}),
    };
  }

  async remove(actor: Actor, id: string, body: unknown) {
    requirePlatform(actor, 'sanatoriums.manage');
    parse(uuid, id);
    if (this.config?.PUBLIC_DEMO_ENABLED) {
      fail('DEMO_ACCESS_DENIED', 'Demo serverda sanatoriyani o‘chirish yopiq', 403);
    }
    const input = parse(deleteSanatoriumInput, body);
    if (input.method === 'PASSWORD' && !input.password?.trim()) {
      fail('VALIDATION_ERROR', 'Sanatoriyani o‘chirish uchun admin parolini kiriting', 422);
    }
    if (input.method === 'EMAIL_CODE' && !input.email_code) {
      fail('VALIDATION_ERROR', 'Emailga yuborilgan 6 xonali tasdiqlash kodini kiriting', 422);
    }

    const admin = await this.db.user.findUnique({ where: { id: actor.id } });
    if (!admin || admin.kind !== 'SUPERADMIN' || admin.status !== 'ACTIVE') {
      fail('FORBIDDEN', 'Faqat faol superadmin sanatoriyani o‘chira oladi', 403);
    }

    let verifiedChallengeId: string | null = null;
    if (input.method === 'PASSWORD') {
      await this.checkDeleteRateLimit(`sanatorium-del-pw:${actor.id}`, 10, 900);
      const validPassword = await passwordMatches(input.password!, admin.passwordHash ?? null);
      if (!validPassword) {
        fail('INVALID_ADMIN_PASSWORD', 'Admin paroli noto‘g‘ri. Parolni tekshirib qayta kiriting yoki email kodi orqali tasdiqlang.', 422);
      }
    } else {
      await this.checkDeleteRateLimit(`sanatorium-del-verify:${actor.id}`, 15, 900);
      const targetKey = `sanatorium-delete:${id}:${actor.id}`;
      const maxAttempts = this.config?.OTP_MAX_ATTEMPTS ?? 5;
      const verified = await this.db.atomic(async tx => {
        await lock(tx, `otp:${targetKey}`);
        const challenge = await tx.otpChallenge.findFirst({
          where: { phone: targetKey, purpose: 'DELETE_SANATORIUM', actorId: actor.id, consumedAt: null },
          orderBy: { createdAt: 'desc' },
        });
        if (!challenge || challenge.expiresAt <= new Date() || challenge.attempts >= maxAttempts) {
          return null;
        }
        await tx.otpChallenge.update({
          where: { id: challenge.id },
          data: { attempts: { increment: 1 } },
        });
        if (challenge.codeHash !== this.deleteOtpHash(challenge.id, input.email_code!)) {
          return null;
        }
        return challenge.id;
      });
      if (!verified) {
        fail('OTP_INVALID', 'Tasdiqlash kodi noto‘g‘ri, muddati tugagan yoki allaqachon ishlatilgan.', 422);
      }
      verifiedChallengeId = verified;
    }

    return this.db.atomic(async tx => {
      await lock(tx, `tenant:${id}`);
      await lock(tx, `inventory:${id}`);
      const target = await tx.sanatorium.findUnique({ where: { id } });
      if (!target) fail('NOT_FOUND', 'Sanatoriya topilmadi', 404);

      if (verifiedChallengeId) {
        const consumed = await tx.otpChallenge.updateMany({
          where: { id: verifiedChallengeId, consumedAt: null },
          data: { consumedAt: new Date() },
        });
        if (!consumed.count) {
          fail('OTP_INVALID', 'Tasdiqlash kodi allaqachon ishlatilgan.', 422);
        }
      }

      // Break circular FKs on Sanatorium -> SanatoriumRevision / BankRevision first
      await tx.sanatorium.update({
        where: { id },
        data: { publicRevisionId: null, bankRevisionId: null },
      });

      await tx.telegramAccount?.updateMany?.({ where: { sanatoriumId: id }, data: { sanatoriumId: null } });
      await tx.partnerRegistration?.updateMany?.({ where: { createdSanatoriumId: id }, data: { createdSanatoriumId: null } });

      const campaigns = await tx.adCampaign?.findMany?.({ where: { sanatoriumId: id }, select: { id: true } }) ?? [];
      if (campaigns.length) {
        await tx.adEvent?.deleteMany?.({ where: { campaignId: { in: campaigns.map(c => c.id) } } });
      }
      await tx.adCampaign?.deleteMany?.({ where: { sanatoriumId: id } });

      const orders = await tx.paymentOrder?.findMany?.({ where: { sanatoriumId: id }, select: { id: true } }) ?? [];
      if (orders.length) {
        const orderIds = orders.map(o => o.id);
        await tx.tezcheckBill?.deleteMany?.({ where: { orderId: { in: orderIds } } });
        await tx.providerTransaction?.deleteMany?.({ where: { orderId: { in: orderIds } } });
        await tx.reconciliationDifference?.deleteMany?.({ where: { orderId: { in: orderIds } } });
      }
      await tx.paymentOrder?.deleteMany?.({ where: { sanatoriumId: id } });

      await tx.subscription?.deleteMany?.({ where: { sanatoriumId: id } });
      await tx.invoice?.deleteMany?.({ where: { sanatoriumId: id } });
      await tx.payoutItem?.deleteMany?.({ where: { sanatoriumId: id } });
      await tx.payout?.deleteMany?.({ where: { sanatoriumId: id } });

      const bookings = await tx.booking?.findMany?.({ where: { sanatoriumId: id }, select: { id: true } }) ?? [];
      const bookingIds = bookings.map(b => b.id);

      const tickets = await tx.supportTicket?.findMany?.({
        where: bookingIds.length ? { OR: [{ sanatoriumId: id }, { bookingId: { in: bookingIds } }] } : { sanatoriumId: id },
        select: { id: true },
      }) ?? [];
      if (tickets.length) {
        const ticketIds = tickets.map(t => t.id);
        await tx.supportMessage?.deleteMany?.({ where: { ticketId: { in: ticketIds } } });
        await tx.supportTicket?.deleteMany?.({ where: { id: { in: ticketIds } } });
      }

      await tx.refundRequest?.deleteMany?.({ where: { sanatoriumId: id } });
      await tx.offlinePayment?.deleteMany?.({ where: { sanatoriumId: id } });
      await tx.review?.deleteMany?.({ where: { sanatoriumId: id } });
      await tx.roomAllocation?.deleteMany?.({ where: { sanatoriumId: id } });
      await tx.bookingItem?.deleteMany?.({ where: { sanatoriumId: id } });

      if (bookingIds.length) {
        const rawExec = (tx as unknown as { $executeRawUnsafe?: (sql: string) => Promise<unknown> }).$executeRawUnsafe;
        if (typeof rawExec === 'function') {
          let triggerDisabled = false;
          try {
            await rawExec.call(tx, 'SAVEPOINT sp_sanatorium_booking_events');
            await rawExec.call(tx, 'ALTER TABLE "BookingEvent" DISABLE TRIGGER immutable_booking_event');
            triggerDisabled = true;
            await tx.bookingEvent?.deleteMany?.({ where: { bookingId: { in: bookingIds } } });
            await rawExec.call(tx, 'ALTER TABLE "BookingEvent" ENABLE TRIGGER immutable_booking_event');
            await rawExec.call(tx, 'RELEASE SAVEPOINT sp_sanatorium_booking_events');
          } catch {
            await rawExec.call(tx, 'ROLLBACK TO SAVEPOINT sp_sanatorium_booking_events').catch(() => undefined);
            if (triggerDisabled) {
              await rawExec.call(tx, 'ALTER TABLE "BookingEvent" ENABLE TRIGGER immutable_booking_event').catch(() => undefined);
            }
            fail(
              'SANATORIUM_HAS_IMMUTABLE_HISTORY',
              'Ushbu sanatoriyada o‘zgarmas bron tarixi mavjud bo‘lgani uchun uni to‘liq o‘chirib bo‘lmaydi — «Arxivlash» tugmasidan foydalaning.',
              409,
            );
          }
        } else {
          await tx.bookingEvent?.deleteMany?.({ where: { bookingId: { in: bookingIds } } });
        }
      }

      await tx.booking?.deleteMany?.({ where: { sanatoriumId: id } });
      await tx.quote?.deleteMany?.({ where: { sanatoriumId: id } });

      await tx.dailyRate?.deleteMany?.({ where: { sanatoriumId: id } });
      await tx.discount?.deleteMany?.({ where: { sanatoriumId: id } });
      await tx.ratePlan?.deleteMany?.({ where: { sanatoriumId: id } });
      await tx.room?.deleteMany?.({ where: { sanatoriumId: id } });
      await tx.roomType?.deleteMany?.({ where: { sanatoriumId: id } });

      await tx.mediaAsset?.deleteMany?.({ where: { sanatoriumId: id } });
      await tx.merchantSetup?.deleteMany?.({ where: { sanatoriumId: id } });
      await tx.sanatoriumRevision?.deleteMany?.({ where: { sanatoriumId: id } });
      await tx.bankRevision?.deleteMany?.({ where: { sanatoriumId: id } });

      await tx.favorite?.deleteMany?.({ where: { sanatoriumId: id } });

      const memberships = await tx.membership?.findMany?.({ where: { sanatoriumId: id }, select: { userId: true } }) ?? [];
      const memberUserIds = [...new Set(memberships.map(m => m.userId))];
      await tx.membership?.deleteMany?.({ where: { sanatoriumId: id } });

      if (memberUserIds.length && tx.membership?.findMany && tx.session?.updateMany) {
        const remaining = await tx.membership.findMany({
          where: { userId: { in: memberUserIds }, status: 'ACTIVE' },
          select: { userId: true },
        });
        const stillAssigned = new Set(remaining.map(r => r.userId));
        const orphanStaffIds = memberUserIds.filter(uid => !stillAssigned.has(uid));
        if (orphanStaffIds.length) {
          await tx.session.updateMany({
            where: { userId: { in: orphanStaffIds }, revokedAt: null },
            data: { revokedAt: new Date() },
          });
        }
      }

      await audit(
        tx,
        actor.id,
        'sanatorium.deleted',
        id,
        undefined,
        { id: target.id, name: target.name, status: target.status },
        {
          method: input.method,
          reason: input.reason?.trim() || null,
          deleted_sanatorium_id: id,
          name: target.name,
        },
      );

      await tx.sanatorium.delete({ where: { id } });

      return {
        success: true,
        deleted_id: id,
        name: target.name,
      };
    });
  }
}
