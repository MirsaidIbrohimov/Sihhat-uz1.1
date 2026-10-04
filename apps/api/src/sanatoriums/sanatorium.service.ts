import { Inject, Injectable } from '@nestjs/common';
import { z } from 'zod';
import { Db, audit, emit, lock } from '../common/db';
import { AppError, fail, parse, uuid, version, reason, pageQuery, paged, validationDetail } from '../common/errors';
import { Actor, requirePlatform, scope, tenantIds } from '../auth/permissions';
import { phoneSchema } from '../auth/auth.service';

export const profileSchema = z.object({
  name: z.string().trim().min(2).max(150), description: z.string().trim().min(30).max(10000),
  legal_name: z.string().trim().min(2).max(150), stir: z.string().regex(/^\d{9}$/),
  region: z.string().trim().min(2).max(80), address: z.string().trim().min(5).max(500),
  latitude: z.number().min(-90).max(90), longitude: z.number().min(-180).max(180),
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
export function publicProfile(data: any) {
  const { legal_name, stir, document_ids, terms_accepted, ...publicData } = data; return publicData;
}
@Injectable()
export class SanatoriumService {
  constructor(@Inject(Db) readonly db: Db) {}
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
    return paged(data.map(s => ({ ...s, revision: revisions.find(r => r.sanatoriumId === s.id && r.status !== 'APPROVED') ?? revisions.find(r => r.id === s.publicRevisionId) })), total, page, limit);
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
      const data = parse(draftProfileSchema, { ...(r.data as object), ...input.data });
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
      if (approve) await tx.sanatorium.update({ where: { id: r.sanatoriumId }, data: { publicRevisionId: r.id, name: (r.data as any).name, version: { increment: 1 } } });
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
      const r = await tx.bankRevision.create({ data: { sanatoriumId: id, data } }); await audit(tx, actor.id, 'bank.change_requested', r.id, id); return r;
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
}
