import { Inject, Injectable, OnModuleInit, Optional } from '@nestjs/common';
import { z } from 'zod';
import { Db,audit,emit,lock,bodyHash,type Tx } from '../common/db';
import { parse,uuid,version,reason,fail,pageQuery,paged } from '../common/errors';
import { Actor,scope,tenantIds,requirePlatform } from '../auth/permissions';
import { EmailService } from '../auth/email';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

@Injectable()
export class EngagementService implements OnModuleInit {
  constructor(
    @Inject(Db) readonly db: Db,
    @Optional() @Inject(EmailService) private readonly email?: EmailService,
  ) {}

  private extractDeliverableEmail(value?: string | null): string | null {
    const clean = value?.trim().toLowerCase();
    return clean && EMAIL_RE.test(clean) ? clean : null;
  }

  private async notifyUserSupportReply(params: {
    id: string;
    email?: string | null;
    recipientName?: string | null;
    ticketTitle: string;
    messageText: string;
    hasAttachment?: boolean;
  }) {
    const to = this.extractDeliverableEmail(params.email);
    if (!to || !this.email) return;
    try {
      await this.email.sendSupportReplyNotification({
        id: params.id,
        email: to,
        recipientName: params.recipientName,
        ticketTitle: params.ticketTitle,
        messageText: params.messageText,
        hasAttachment: params.hasAttachment,
      });
    } catch (err: any) {
      console.error('[EngagementService] Support email notification failed:', err?.message || err);
    }
  }
  async onModuleInit(){
    for (const stmt of [
      'ALTER TABLE "SupportMessage" ADD COLUMN IF NOT EXISTS "imageUrl" TEXT',
      'ALTER TABLE "SupportMessage" ADD COLUMN IF NOT EXISTS "isEdited" BOOLEAN NOT NULL DEFAULT false',
      'ALTER TABLE "SupportMessage" ADD COLUMN IF NOT EXISTS "deletedForUser" BOOLEAN NOT NULL DEFAULT false',
    ]) {
      await this.db.$executeRawUnsafe(stmt).catch(()=>{});
    }
  }
  private async recipients(actor:Actor,ids:string[]){
    if(actor.kind==='CUSTOMER')fail('PERMISSION_DENIED','Ruxsat yo‘q',403);
    if(!ids.length) return [];
    const users=await this.db.user.findMany({where:{id:{in:ids},status:'ACTIVE'},select:{id:true}});
    if(actor.kind!=='SUPERADMIN'&&users.length!==new Set(ids).size)fail('RECIPIENT_INVALID','Qabul qiluvchini tekshiring',422);
    if(actor.kind!=='SUPERADMIN'){const tenants=tenantIds(actor,'messages.send')??[];const members=await this.db.membership.findMany({where:{userId:{in:ids},sanatoriumId:{in:tenants},status:'ACTIVE'},select:{userId:true}});if(new Set(members.map(m=>m.userId)).size!==new Set(ids).size)fail('PERMISSION_DENIED','Boshqa sanatoriyaga yubora olmaysiz',403);}
    return [...new Set(users.map(u=>u.id))];
  }
  async broadcast(actor:Actor,body:unknown){
    requirePlatform(actor,'announcements.broadcast');
    const i=parse(z.object({
      target:z.enum(['ALL','CUSTOMERS','PARTNERS']).optional(),
      sanatorium_ids:z.array(uuid).max(100).optional(),
      title:z.string().min(2).max(150),
      body:z.string().min(1).max(10000),
      kind:z.enum(['MESSAGE','WARNING']),
      asset_ids:z.array(uuid).max(10).default([])
    }).strict(),body);
    const target = i.target ?? 'PARTNERS';
    const recipientSet = new Set<string>();
    if (target === 'PARTNERS' || target === 'ALL') {
      const members = await this.db.membership.findMany({
        where: { status: 'ACTIVE', ...(i.sanatorium_ids?.length ? { sanatoriumId: { in: i.sanatorium_ids } } : {}) },
        select: { userId: true },
      });
      for (const m of members) recipientSet.add(m.userId);
    }
    if (target === 'CUSTOMERS' || target === 'ALL') {
      const customers = await this.db.user.findMany({
        where: { kind: 'CUSTOMER', status: 'ACTIVE' },
        select: { id: true },
      });
      for (const c of customers) recipientSet.add(c.id);
    }
    return this.send(actor,{
      title:i.title,
      body:i.body,
      kind:i.kind,
      asset_ids:i.asset_ids,
      recipient_ids:[...recipientSet]
    });
  }
  async send(actor:Actor,body:unknown){const i=parse(z.object({title:z.string().min(2).max(150),body:z.string().min(1).max(10000),kind:z.enum(['MESSAGE','WARNING']).default('MESSAGE'),asset_ids:z.array(uuid).max(10).default([]),recipient_ids:z.array(uuid).max(50000)}).strict(),body);const ids=await this.recipients(actor,i.recipient_ids);
    for(const id of i.asset_ids){const file=await this.db.mediaAsset.findUnique({where:{id}});if(!file)fail('NOT_FOUND','Fayl topilmadi',404);scope(actor,file.sanatoriumId,'sanatorium.profile.edit');}
    return this.db.atomic(async tx=>{const m=await tx.message.create({data:{senderId:actor.id,title:i.title,body:i.body,kind:i.kind,assetIds:i.asset_ids}});await tx.messageRecipient.createMany({data:ids.map(userId=>({messageId:m.id,userId}))});await emit(tx,'message.created',{message_id:m.id,title:i.title,body:i.body,kind:i.kind,recipient_ids:ids});await audit(tx,actor.id,'message.sent',m.id,undefined,undefined,{recipient_count:ids.length});return m;});}
  async messages(actor:Actor,query:unknown){
    const i=parse(pageQuery.extend({ box: z.enum(['inbox', 'sent']).optional() }).strict(), query);
    const box = i.box ?? (actor.kind === 'SUPERADMIN' ? 'sent' : 'inbox');
    if (box === 'sent') {
      const [messages, total] = await Promise.all([
        this.db.message.findMany({
          where: { senderId: actor.id },
          skip: (i.page - 1) * i.limit,
          take: i.limit,
          orderBy: { createdAt: 'desc' },
        }),
        this.db.message.count({ where: { senderId: actor.id } }),
      ]);
      const msgIds = messages.map(m => m.id);
      const receipts = msgIds.length > 0
        ? await this.db.messageRecipient.findMany({ where: { messageId: { in: msgIds } } })
        : [];
      const data = messages.map(m => {
        const recs = receipts.filter(r => r.messageId === m.id);
        return {
          id: m.id,
          messageId: m.id,
          direction: 'sent',
          message: m,
          recipientCount: recs.length,
          readCount: recs.filter(r => r.readAt).length,
          acceptedCount: recs.filter(r => r.acceptedAt).length,
          readAt: null as Date | null,
          acceptedAt: null as Date | null,
          createdAt: m.createdAt,
        };
      });
      return paged(data, total, i.page, i.limit);
    }
    const receipts=await this.db.messageRecipient.findMany({where:{userId:actor.id},skip:(i.page-1)*i.limit,take:i.limit,orderBy:{id:'desc'}});
    const messages=await this.db.message.findMany({where:{id:{in:receipts.map(r=>r.messageId)}}});
    return paged(receipts.map(r=>({...r,direction:'inbox',message:messages.find(m=>m.id===r.messageId)})),await this.db.messageRecipient.count({where:{userId:actor.id}}),i.page,i.limit);
  }
  async receipt(actor:Actor,id:string,body:unknown){parse(uuid,id);const i=parse(z.object({accepted:z.boolean().default(false)}).strict(),body);const r=await this.db.messageRecipient.findUnique({where:{messageId_userId:{messageId:id,userId:actor.id}}});if(!r)fail('NOT_FOUND','Xabar topilmadi',404);return this.db.messageRecipient.update({where:{id:r.id},data:{readAt:r.readAt??new Date(),acceptedAt:i.accepted?(r.acceptedAt??new Date()):r.acceptedAt}});}
  async task(actor:Actor,body:unknown,key?:string){
    const i=parse(z.object({sanatorium_id:uuid,assigned_to:uuid,title:z.string().min(2).max(150),body:z.string().min(1).max(5000),due_at:z.iso.datetime()}).strict(),body);scope(actor,i.sanatorium_id,'tasks.manage');
    const run=async(tx:Tx)=>{if(!await tx.membership.findFirst({where:{sanatoriumId:i.sanatorium_id,userId:i.assigned_to,status:'ACTIVE'}})||!await tx.user.findFirst({where:{id:i.assigned_to,status:'ACTIVE',kind:'STAFF'}}))fail('NOT_FOUND','Faol xodim topilmadi',404);const t=await tx.task.create({data:{sanatoriumId:i.sanatorium_id,assignedBy:actor.id,assignedTo:i.assigned_to,title:i.title,body:i.body,dueAt:new Date(i.due_at)}});await emit(tx,'task.assigned',{task_id:t.id,recipient_ids:[i.assigned_to]});await audit(tx,actor.id,'task.assigned',t.id,i.sanatorium_id);return t;};
    return key?this.db.idempotent(actor.id,'task.create',key,i,run):this.db.atomic(run);
  }
  async tasks(actor:Actor){const ids=tenantIds(actor,'tasks.manage');const where=actor.kind==='SUPERADMIN'?{}:{OR:[{assignedTo:actor.id},{sanatoriumId:{in:ids??[]}}]};return this.db.task.findMany({where,orderBy:{dueAt:'asc'},take:200});}
  async taskReply(actor:Actor,id:string,body:unknown){parse(uuid,id);const i=parse(z.object({version,status:z.enum(['ACCEPTED','COMPLETED']),reply:z.string().max(5000).optional()}).strict(),body);return this.db.atomic(async tx=>{const t=await tx.task.findUnique({where:{id}});if(!t||(t.assignedTo!==actor.id&&actor.kind!=='SUPERADMIN'))fail('NOT_FOUND','Vazifa topilmadi',404);scope(actor,t.sanatoriumId);const from=i.status==='ACCEPTED'?'ASSIGNED':'ACCEPTED';const changed=await tx.task.updateMany({where:{id,version:i.version,status:from},data:{status:i.status,reply:i.reply,version:{increment:1}}});if(!changed.count)fail('VERSION_CONFLICT','Vazifa holati o‘zgargan');await audit(tx,actor.id,'task.updated',id,t.sanatoriumId,undefined,i);return tx.task.findUniqueOrThrow({where:{id}});});}
  async survey(actor:Actor,body:unknown){
    requirePlatform(actor,'announcements.broadcast');
    const i=parse(z.object({title:z.string().min(2).max(150),recipient_ids:z.array(uuid).min(1).max(1000).optional(),sanatorium_ids:z.array(uuid).min(1).max(100).optional(),questions:z.array(z.object({id:z.string().regex(/^[a-z_]{1,40}$/),label:z.string().min(1).max(300),type:z.enum(['TEXT','BOOLEAN','NUMBER']),required:z.boolean()}).strict()).min(1).max(30)}).strict(),body);
    if((!!i.recipient_ids)===(!!i.sanatorium_ids))fail('RECIPIENT_REQUIRED','Anketa yuboriladigan sanatoriyalarni belgilang',422);
    let recipients=i.recipient_ids;
    if(i.sanatorium_ids){
      const selected=[...new Set(i.sanatorium_ids)];
      if(await this.db.sanatorium.count({where:{id:{in:selected}}})!==selected.length)fail('RECIPIENT_INVALID','Sanatoriyani tekshiring',422);
      const members=await this.db.membership.findMany({where:{sanatoriumId:{in:selected},status:'ACTIVE'},select:{userId:true}});
      const users=await this.db.user.findMany({where:{id:{in:members.map(m=>m.userId)},status:'ACTIVE',kind:'STAFF'},select:{id:true}});
      recipients=users.map(u=>u.id);
    }
    if(!recipients?.length)fail('RECIPIENT_REQUIRED','Tanlangan sanatoriyalarda faol xodim yo‘q',422);
    const ids=await this.recipients(actor,recipients);
    if(new Set(i.questions.map(q=>q.id)).size!==i.questions.length)fail('QUESTION_ID_DUPLICATE','Savol IDlari takrorlanmasin',422);
    return this.db.atomic(async tx=>{await lock(tx,`survey:${actor.id}:${i.title}`);const previous=await tx.survey.findFirst({where:{createdBy:actor.id,title:i.title},orderBy:{version:'desc'}});const s=await tx.survey.create({data:{title:i.title,createdBy:actor.id,questions:i.questions,recipientIds:ids,version:(previous?.version??0)+1}});await emit(tx,'survey.created',{survey_id:s.id,recipient_ids:ids});await audit(tx,actor.id,'survey.created',s.id,undefined,undefined,{sanatorium_ids:i.sanatorium_ids,recipient_count:ids.length});return s;});
  }
  async surveys(actor:Actor){
    const surveys=await this.db.survey.findMany({where:actor.kind==='SUPERADMIN'?{}:{recipientIds:{has:actor.id}},take:100,orderBy:{createdAt:'desc'}});
    const responses=await this.db.surveyResponse.findMany({where:{surveyId:{in:surveys.map(s=>s.id)},...(actor.kind==='SUPERADMIN'?{}:{userId:actor.id})}});
    return surveys.map(s=>{const response=responses.find(r=>r.surveyId===s.id&&r.userId===actor.id&&r.surveyVersion===s.version);return {...s,answered:!!response,response:response?{answers:response.answers,createdAt:response.createdAt}:null,...(actor.kind==='SUPERADMIN'?{response_count:responses.filter(r=>r.surveyId===s.id&&r.surveyVersion===s.version).length}:{})};});
  }
  async answer(actor:Actor,id:string,body:unknown){parse(uuid,id);const i=parse(z.object({version,answers:z.record(z.string(),z.union([z.string().max(5000),z.boolean(),z.number()]))}).strict(),body);const s=await this.db.survey.findUnique({where:{id}});if(!s||!s.recipientIds.includes(actor.id))fail('NOT_FOUND','Anketa topilmadi',404);if(s.version!==i.version)fail('VERSION_CONFLICT','Anketa versiyasi mos emas');const questions=s.questions as {id:string;type:string;required:boolean}[];for(const q of questions){const value=i.answers[q.id];if(q.required&&(value===undefined||value===''))fail('ANSWER_REQUIRED',`${q.id} savoliga javob kerak`,422);if(value!==undefined&&typeof value!=={TEXT:'string',BOOLEAN:'boolean',NUMBER:'number'}[q.type])fail('ANSWER_TYPE_INVALID',`${q.id} javob turini tekshiring`,422);}if(Object.keys(i.answers).some(k=>!questions.some(q=>q.id===k)))fail('ANSWER_UNKNOWN','Noma’lum savolga javob bor',422);return this.db.atomic(async tx=>{await lock(tx,`survey-response:${id}:${actor.id}`);const saved=await tx.surveyResponse.findUnique({where:{surveyId_userId:{surveyId:id,userId:actor.id}}});if(saved){if(saved.surveyVersion===i.version&&bodyHash(saved.answers)===bodyHash(i.answers))return saved;fail('ANSWER_ALREADY_SAVED','Bu anketaga javob berilgan');}return tx.surveyResponse.create({data:{surveyId:id,userId:actor.id,surveyVersion:s.version,answers:i.answers}});});}
  async review(actor:Actor,body:unknown){const i=parse(z.object({booking_id:uuid,rating:z.number().int().min(1).max(5),text:z.string().trim().min(3).max(3000)}).strict(),body);const b=await this.db.booking.findUnique({where:{id:i.booking_id}});if(!b||b.userId!==actor.id||b.status!=='CHECKED_OUT')fail('REVIEW_NOT_ALLOWED','Faqat o‘z yakunlangan yashashingiz uchun sharh yozing',403);return this.db.review.create({data:{bookingId:b.id,sanatoriumId:b.sanatoriumId,userId:actor.id,rating:i.rating,text:i.text}});}
  async reviewList(actor:Actor,query:unknown){const i=parse(pageQuery.extend({sanatorium_id:uuid.optional()}).strict(),query);if(i.sanatorium_id)scope(actor,i.sanatorium_id,'reviews.reply');const ids=tenantIds(actor,'reviews.reply');const where={...(ids?{sanatoriumId:{in:ids}}:{}),...(i.sanatorium_id?{sanatoriumId:i.sanatorium_id}:{})};const [data,total]=await Promise.all([this.db.review.findMany({where,take:i.limit,skip:(i.page-1)*i.limit,orderBy:{createdAt:'desc'}}),this.db.review.count({where})]);return paged(data,total,i.page,i.limit);}
  async reviewReply(actor:Actor,id:string,body:unknown){parse(uuid,id);const i=parse(z.object({reply:z.string().trim().min(3).max(3000)}).strict(),body);const r=await this.db.review.findUnique({where:{id}});if(!r)fail('NOT_FOUND','Sharh topilmadi',404);scope(actor,r.sanatoriumId,'reviews.reply');return this.db.atomic(async tx=>{const result=await tx.review.update({where:{id},data:{reply:i.reply}});await audit(tx,actor.id,'review.replied',id,r.sanatoriumId);return result;});}
  async moderateReview(actor:Actor,id:string,body:unknown){requirePlatform(actor,'reviews.moderate');parse(uuid,id);const i=parse(z.object({status:z.enum(['PUBLISHED','HIDDEN']),reason}).strict(),body);return this.db.atomic(async tx=>{const r=await tx.review.update({where:{id},data:{status:i.status,moderationReason:i.reason}});await audit(tx,actor.id,'review.moderated',id,r.sanatoriumId,undefined,i);return r;});}
  async supportRecipients(actor: Actor) {
    const [sanatoriums, memberships, superadmins] = await Promise.all([
      this.db.sanatorium?.findMany
        ? this.db.sanatorium.findMany({
            where: { status: { not: 'ARCHIVED' } },
            select: { id: true, name: true, status: true },
            orderBy: { name: 'asc' },
            take: 200,
          })
        : [],
      this.db.membership?.findMany
        ? this.db.membership.findMany({
            where: { status: 'ACTIVE' },
            select: { id: true, userId: true, sanatoriumId: true, role: true },
            take: 500,
          })
        : [],
      this.db.user?.findMany
        ? this.db.user.findMany({
            where: { kind: 'SUPERADMIN', status: 'ACTIVE' },
            select: { id: true, name: true, avatarUrl: true },
            take: 20,
          })
        : [],
    ]);
    const sanMap = new Map(sanatoriums.map(s => [s.id, s.name]));
    const staffUserIds = [...new Set(memberships.map(m => m.userId))];
    const staffUsers = staffUserIds.length && this.db.user?.findMany
      ? await this.db.user.findMany({
          where: { id: { in: staffUserIds }, status: 'ACTIVE', kind: 'STAFF' },
          select: { id: true, name: true, phone: true, login: true, email: true, avatarUrl: true },
        })
      : [];
    const staffUserMap = new Map(staffUsers.map(u => [u.id, u]));
    const roleLabelMap: Record<string, string> = {
      RECEPTION: 'Resepshn',
      DIRECTOR: 'Direktor',
      ACCOUNTANT: 'Hisobchi',
    };
    const staff = memberships
      .map(m => {
        const u = staffUserMap.get(m.userId);
        if (!u || !sanMap.has(m.sanatoriumId)) return null;
        return {
          id: u.id,
          name: u.name,
          phone: u.phone,
          login: u.login,
          email: u.email ?? (u.login?.includes('@') ? u.login : null),
          avatarUrl: u.avatarUrl ?? null,
          role: m.role,
          roleLabel: roleLabelMap[m.role] ?? m.role,
          sanatoriumId: m.sanatoriumId,
          sanatoriumName: sanMap.get(m.sanatoriumId) ?? 'Sanatoriya',
        };
      })
      .filter(Boolean);

    const customers = actor.kind === 'SUPERADMIN' && this.db.user?.findMany
      ? await this.db.user.findMany({
          where: { kind: 'CUSTOMER', status: 'ACTIVE' },
          select: { id: true, name: true, phone: true, login: true, email: true, avatarUrl: true },
          orderBy: { createdAt: 'desc' },
          take: 200,
        })
      : [];

    return {
      sanatoriums,
      staff,
      superadmins: superadmins.map(a => ({
        id: a.id,
        name: a.name || 'Superadmin',
        avatarUrl: a.avatarUrl ?? null,
        role: 'SUPERADMIN',
        roleLabel: 'Platforma Admin',
      })),
      customers,
    };
  }
  async ticket(actor:Actor,body:unknown,key?:string){
    const i=parse(z.object({
      title:z.string().trim().min(2).max(150),
      text:z.string().max(5000).default(''),
      imageUrl:z.string().max(10_000_000).nullish(),
      booking_id:uuid.nullish(),
      sanatorium_id:uuid.nullish(),
      target_user_id:uuid.nullish(),
      target_role:z.enum(['RECEPTION','DIRECTOR','ACCOUNTANT']).nullish()
    }).strict(),body);
    const defaultPlaceholder = i.imageUrl?.startsWith('data:video/')
      ? '🎬 Video'
      : (i.imageUrl?.startsWith('data:image/') ? '📷 Rasm' : (i.imageUrl ? '📎 Fayl' : ''));
    const msgText = i.text.trim() || defaultPlaceholder;
    if (!msgText) fail('VALIDATION_ERROR', 'Xabar matni yoki biriktirilgan fayl kiritilishi shart', 422);
    let tenant=i.sanatorium_id ?? undefined;
    let resolvedTargetUserId = i.target_user_id ?? undefined;
    if(i.booking_id){
      const b=await this.db.booking.findUnique({where:{id:i.booking_id}});
      if(!b)fail('NOT_FOUND','Bron topilmadi',404);
      if(actor.kind==='CUSTOMER'){
        if(b.userId!==actor.id)fail('NOT_FOUND','Bron topilmadi',404);
      }else scope(actor,b.sanatoriumId,'support.read');
      tenant=b.sanatoriumId;
    }
    if(resolvedTargetUserId && this.db.user?.findUnique){
      const targetUser = await this.db.user.findUnique({where:{id:resolvedTargetUserId},select:{id:true,kind:true,status:true}});
      if(!targetUser) fail('NOT_FOUND','Qabul qiluvchi topilmadi',404);
      if(!tenant && targetUser.kind === 'STAFF' && this.db.membership?.findFirst){
        const m = await this.db.membership.findFirst({where:{userId:targetUser.id,status:'ACTIVE'},select:{sanatoriumId:true}});
        if(m) tenant = m.sanatoriumId;
      }
    }
    if(!resolvedTargetUserId && i.target_role && tenant && this.db.membership?.findFirst){
      const roleMember = await this.db.membership.findFirst({
        where:{sanatoriumId:tenant,role:i.target_role,status:'ACTIVE'},
        select:{userId:true}
      });
      if(roleMember) resolvedTargetUserId = roleMember.userId;
    }
    if(!tenant && actor.kind === 'STAFF' && resolvedTargetUserId){
      const ownTenants = tenantIds(actor,'support.read') ?? [];
      if(ownTenants.length) tenant = ownTenants[0];
    }
    let createdInThisCall = false;
    const run=async(tx:Tx)=>{
      const ticketUserId = (actor.kind !== 'CUSTOMER' && resolvedTargetUserId) ? resolvedTargetUserId : actor.id;
      const t=await tx.supportTicket.create({data:{userId:ticketUserId,sanatoriumId:tenant,bookingId:i.booking_id??undefined,title:i.title}});
      await tx.supportMessage.create({data:{ticketId:t.id,userId:actor.id,text:msgText,imageUrl:i.imageUrl??null}});
      await audit(tx,actor.id,'support.opened',t.id,tenant);
      const admins=await tx.user.findMany({where:{kind:'SUPERADMIN',status:'ACTIVE'},select:{id:true}});
      const staffRecipients = tenant && tx.membership?.findMany
        ? await tx.membership.findMany({
            where:{
              sanatoriumId:tenant,
              status:'ACTIVE',
              ...(i.target_role ? {role:i.target_role} : {role:{in:['RECEPTION','DIRECTOR']}})
            },
            select:{userId:true}
          })
        : [];
      const recipients=[...new Set([
        ...admins.map(a=>a.id),
        ...(ticketUserId!==actor.id?[ticketUserId]:[]),
        ...(resolvedTargetUserId&&resolvedTargetUserId!==actor.id?[resolvedTargetUserId]:[]),
        ...staffRecipients.map(s=>s.userId).filter(uid=>uid!==actor.id)
      ])];
      await emit(tx,'support.opened',{
        ticket_id:t.id,
        title:t.title,
        text:msgText,
        sanatorium_id:tenant??null,
        target_user_id:resolvedTargetUserId??null,
        target_role:i.target_role??null,
        recipient_ids:recipients
      });
      createdInThisCall = true;
      return t;
    };
    const ticket = await (key?this.db.idempotent(actor.id,'support.open',key,i,run):this.db.atomic(run));
    const notifyTargetId = resolvedTargetUserId && resolvedTargetUserId !== actor.id ? resolvedTargetUserId : (ticket.userId !== actor.id ? ticket.userId : null);
    if (createdInThisCall && notifyTargetId) {
      const targetUser = await this.db.user.findUnique({
        where: { id: notifyTargetId },
        select: { id: true, name: true, login: true, email: true },
      });
      await this.notifyUserSupportReply({
        id: ticket.id,
        email: targetUser?.email ?? targetUser?.login,
        recipientName: targetUser?.name,
        ticketTitle: ticket.title,
        messageText: msgText,
        hasAttachment: Boolean(i.imageUrl),
      });
    }
    return ticket;
  }
  async tickets(actor:Actor){
    const ids=tenantIds(actor,'support.read');
    const authoredRows = actor.kind !== 'SUPERADMIN' && this.db.supportMessage?.findMany
      ? await this.db.supportMessage.findMany({
          where: { userId: actor.id },
          select: { ticketId: true },
          take: 200,
        })
      : [];
    const authoredIds = [...new Set(authoredRows.map(r => r.ticketId))];
    const tickets = await this.db.supportTicket.findMany({
      where:actor.kind==='SUPERADMIN'
        ? {}
        : actor.kind==='CUSTOMER'
          ? (authoredIds.length ? {OR:[{userId:actor.id},{id:{in:authoredIds}}]} : {userId:actor.id})
          : {OR:[{userId:actor.id},{sanatoriumId:{in:ids??[]}},...(authoredIds.length?[{id:{in:authoredIds}}]:[])]},
      take:200,
      orderBy:{createdAt:'desc'}
    });
    if(!tickets.length) return [];
    const userIds = [...new Set(tickets.map(t => t.userId))];
    const sanatoriumIds = [...new Set(tickets.map(t => t.sanatoriumId).filter(Boolean) as string[])];
    const bookingIds = [...new Set(tickets.map(t => t.bookingId).filter(Boolean) as string[])];
    const ticketIds = tickets.map(t => t.id);

    const isSuperAdmin = actor.kind === 'SUPERADMIN';
    const now = new Date();
    const onlineCutoff = new Date(now.getTime() - 180_000);
    const superadminUser = !isSuperAdmin && this.db.user.findFirst
      ? await this.db.user.findFirst({ where: { kind: 'SUPERADMIN', status: 'ACTIVE' }, select: { id: true, name: true, avatarUrl: true } })
      : null;

    const [sanatoriums, bookings, messages, sanatoriumStaffMembers] = await Promise.all([
      sanatoriumIds.length ? this.db.sanatorium.findMany({
        where: { id: { in: sanatoriumIds } },
        select: { id: true, name: true }
      }) : [],
      bookingIds.length ? this.db.booking.findMany({
        where: { id: { in: bookingIds } },
        select: { id: true, reference: true, checkIn: true, checkOut: true, status: true }
      }) : [],
      this.db.supportMessage.findMany({
        where: { ticketId: { in: ticketIds }, ...(isSuperAdmin ? {} : { deletedForUser: false }) },
        orderBy: { createdAt: 'desc' },
      }),
      sanatoriumIds.length && this.db.membership?.findMany ? this.db.membership.findMany({
        where: { sanatoriumId: { in: sanatoriumIds }, status: 'ACTIVE' },
        select: { userId: true, sanatoriumId: true, role: true },
      }) : [],
    ]);

    const allUserIds = [...new Set([
      ...userIds,
      ...messages.map(m => m.userId),
      ...sanatoriumStaffMembers.map(m => m.userId),
      ...(superadminUser ? [superadminUser.id] : []),
    ])];

    const [users, activeSessions] = await Promise.all([
      allUserIds.length ? this.db.user.findMany({
        where: { id: { in: allUserIds } },
        select: { id: true, name: true, phone: true, login: true, email: true, avatarUrl: true, kind: true, status: true }
      }) : [],
      allUserIds.length && this.db.session?.findMany ? this.db.session.findMany({
        where: {
          userId: { in: allUserIds },
          revokedAt: null,
          refreshExpiresAt: { gt: now },
          lastActivityAt: { gt: onlineCutoff },
        },
        orderBy: { lastActivityAt: 'desc' },
        select: { userId: true, lastActivityAt: true, channel: true },
      }) : []
    ]);

    const userMap = new Map(users.map(u => [u.id, u]));
    const sanatoriumMap = new Map(sanatoriums.map(s => [s.id, s.name]));
    const bookingMap = new Map(bookings.map(b => [b.id, b]));
    const onlineMap = new Map<string, { isOnline: boolean; lastSeenAt: Date }>();
    for (const s of activeSessions as Array<{ userId: string; lastActivityAt: Date }>) {
      if (!onlineMap.has(s.userId)) {
        onlineMap.set(s.userId, { isOnline: true, lastSeenAt: s.lastActivityAt });
      }
    }
    const lastMsgMap = new Map<string, string>();
    const ticketMsgsMap = new Map<string, typeof messages>();
    for (const m of messages) {
      if (!lastMsgMap.has(m.ticketId)) {
        lastMsgMap.set(m.ticketId, m.text);
      }
      const arr = ticketMsgsMap.get(m.ticketId) ?? [];
      arr.push(m);
      ticketMsgsMap.set(m.ticketId, arr);
    }

    const defaultSuperadminPeer = !isSuperAdmin ? {
      id: superadminUser?.id ?? null,
      name: 'Superadmin',
      kind: 'SUPERADMIN',
      avatarUrl: superadminUser?.avatarUrl ?? null,
      isOnline: superadminUser ? (onlineMap.get(superadminUser.id)?.isOnline ?? false) : false,
    } : null;

    const roleLabelMap: Record<string, string> = {
      RECEPTION: 'Resepshn',
      DIRECTOR: 'Direktor',
      ACCOUNTANT: 'Hisobchi',
    };

    return tickets.map(t => {
      const tMsgs = ticketMsgsMap.get(t.id) ?? [];
      const firstAuthorId = tMsgs.length ? tMsgs[tMsgs.length - 1].userId : t.userId;
      const otherPartyId = t.userId === actor.id && firstAuthorId !== actor.id ? firstAuthorId : t.userId;
      const u = userMap.get(otherPartyId) ?? userMap.get(t.userId);
      const isEmail = Boolean(u?.email || u?.login?.includes('@'));
      const email = u?.email ?? (isEmail ? u?.login ?? null : null);
      const realName = u?.name && u.name !== 'Mijoz' && u.name !== 'User' ? u.name : null;
      const display = realName || u?.phone || email || u?.login || (u?.kind === 'CUSTOMER' ? 'Mobil mijoz' : 'Murojaat');
      const presence = u ? onlineMap.get(u.id) : undefined;
      const sanName = t.sanatoriumId ? sanatoriumMap.get(t.sanatoriumId) ?? null : null;

      let ticketPeer: any = defaultSuperadminPeer;
      if (!isSuperAdmin && actor.kind === 'CUSTOMER' && t.sanatoriumId) {
        const staffReply = tMsgs.find(m => m.userId !== actor.id && userMap.get(m.userId)?.kind === 'STAFF');
        const fallbackMember = sanatoriumStaffMembers.find(m => m.sanatoriumId === t.sanatoriumId && m.role === 'RECEPTION')
          ?? sanatoriumStaffMembers.find(m => m.sanatoriumId === t.sanatoriumId);
        const staffUser = staffReply ? userMap.get(staffReply.userId) : (fallbackMember ? userMap.get(fallbackMember.userId) : null);
        const staffMemberRecord = staffUser
          ? sanatoriumStaffMembers.find(m => m.sanatoriumId === t.sanatoriumId && m.userId === staffUser.id)
          : fallbackMember;
        const roleLabel = staffMemberRecord ? (roleLabelMap[staffMemberRecord.role] ?? staffMemberRecord.role) : 'Resepshn';
        ticketPeer = {
          id: staffUser?.id ?? null,
          name: staffUser?.name ? `${staffUser.name} · ${roleLabel}` : `${sanName ?? 'Sanatoriya'} · ${roleLabel}`,
          kind: 'STAFF',
          role: staffMemberRecord?.role ?? 'RECEPTION',
          roleLabel,
          sanatoriumName: sanName,
          avatarUrl: staffUser?.avatarUrl ?? null,
          isOnline: staffUser ? (onlineMap.get(staffUser.id)?.isOnline ?? false) : false,
        };
      }

      return {
        ...t,
        sender: u ? {
          id: u.id,
          name: u.name,
          phone: u.phone,
          login: u.login,
          email,
          avatarUrl: u.avatarUrl ?? null,
          isOnline: presence?.isOnline ?? false,
          lastSeenAt: presence?.lastSeenAt ?? null,
          kind: u.kind,
          status: u.status,
          displayName: display,
        } : null,
        senderDisplay: display,
        peer: ticketPeer,
        sanatoriumName: sanName,
        booking: t.bookingId ? bookingMap.get(t.bookingId) ?? null : null,
        lastMessage: lastMsgMap.get(t.id) ?? null,
      };
    });
  }
  async ticketGet(actor:Actor,id:string){
    parse(uuid,id);
    const t=await this.db.supportTicket.findUnique({where:{id}});
    if(!t)fail('NOT_FOUND','Murojaat topilmadi',404);
    const rawMessages = await this.db.supportMessage.findMany({where:{ticketId:id},orderBy:{createdAt:'asc'}});
    const hasAuthoredMessage = rawMessages.some(m => m.userId === actor.id);
    if(actor.kind==='CUSTOMER'){
      if(t.userId!==actor.id && !hasAuthoredMessage)fail('NOT_FOUND','Murojaat topilmadi',404);
    }else if(t.userId!==actor.id && !hasAuthoredMessage && actor.kind!=='SUPERADMIN'){
      if(!t.sanatoriumId)fail('NOT_FOUND','Murojaat topilmadi',404);
      scope(actor,t.sanatoriumId,'support.read');
    }
    const isSuperAdmin = actor.kind === 'SUPERADMIN';
    const messages = isSuperAdmin ? rawMessages : rawMessages.filter(m => !m.deletedForUser);
    const sanatoriumStaffMembers = t.sanatoriumId && this.db.membership?.findMany
      ? await this.db.membership.findMany({
          where: { sanatoriumId: t.sanatoriumId, status: 'ACTIVE' },
          select: { userId: true, sanatoriumId: true, role: true },
        })
      : [];
    const userIds = [...new Set([t.userId, ...messages.map(m => m.userId), ...sanatoriumStaffMembers.map(m => m.userId)])];
    const now = new Date();
    const onlineCutoff = new Date(now.getTime() - 180_000);
    const superadminUser = !isSuperAdmin && this.db.user.findFirst
      ? await this.db.user.findFirst({ where: { kind: 'SUPERADMIN', status: 'ACTIVE' }, select: { id: true, name: true, avatarUrl: true } })
      : null;
    const onlineTargetIds = [...new Set([...userIds, ...(superadminUser ? [superadminUser.id] : [])])];

    const [users, sanatorium, booking, activeSessions] = await Promise.all([
      this.db.user.findMany({
        where: { id: { in: userIds } },
        select: { id: true, name: true, phone: true, login: true, email: true, avatarUrl: true, kind: true, status: true }
      }),
      t.sanatoriumId ? this.db.sanatorium.findUnique({ where: { id: t.sanatoriumId }, select: { id: true, name: true } }) : null,
      t.bookingId ? this.db.booking.findUnique({ where: { id: t.bookingId }, select: { id: true, reference: true, checkIn: true, checkOut: true, status: true } }) : null,
      onlineTargetIds.length && this.db.session?.findMany ? this.db.session.findMany({
        where: {
          userId: { in: onlineTargetIds },
          revokedAt: null,
          refreshExpiresAt: { gt: now },
          lastActivityAt: { gt: onlineCutoff },
        },
        orderBy: { lastActivityAt: 'desc' },
        select: { userId: true, lastActivityAt: true, channel: true },
      }) : []
    ]);
    const userMap = new Map(users.map(u => [u.id, u]));
    const onlineMap = new Map<string, { isOnline: boolean; lastSeenAt: Date }>();
    for (const s of activeSessions as Array<{ userId: string; lastActivityAt: Date }>) {
      if (!onlineMap.has(s.userId)) {
        onlineMap.set(s.userId, { isOnline: true, lastSeenAt: s.lastActivityAt });
      }
    }
    const firstAuthorId = messages.length ? messages[0].userId : t.userId;
    const otherPartyId = t.userId === actor.id && firstAuthorId !== actor.id ? firstAuthorId : t.userId;
    const senderUser = userMap.get(otherPartyId) ?? userMap.get(t.userId) ?? null;
    const isEmail = Boolean(senderUser?.email || senderUser?.login?.includes('@'));
    const senderEmail = senderUser?.email ?? (isEmail ? senderUser?.login ?? null : null);
    const realName = senderUser?.name && senderUser.name !== 'Mijoz' ? senderUser.name : null;
    const display = realName || senderUser?.phone || senderEmail || senderUser?.login || (senderUser?.kind === 'CUSTOMER' ? 'Mobil mijoz' : 'Murojaat');
    const senderPresence = senderUser ? onlineMap.get(senderUser.id) : undefined;

    const sender = senderUser ? {
      id: senderUser.id,
      name: senderUser.name,
      phone: senderUser.phone,
      login: senderUser.login,
      email: senderEmail,
      avatarUrl: senderUser.avatarUrl ?? null,
      isOnline: senderPresence?.isOnline ?? false,
      lastSeenAt: senderPresence?.lastSeenAt ?? null,
      kind: senderUser.kind,
      status: senderUser.status,
      displayName: display,
    } : null;

    const roleLabelMap: Record<string, string> = {
      RECEPTION: 'Resepshn',
      DIRECTOR: 'Direktor',
      ACCOUNTANT: 'Hisobchi',
    };

    let peer: any = !isSuperAdmin ? {
      id: superadminUser?.id ?? null,
      name: 'Superadmin',
      kind: 'SUPERADMIN',
      avatarUrl: superadminUser?.avatarUrl ?? null,
      isOnline: superadminUser ? (onlineMap.get(superadminUser.id)?.isOnline ?? false) : false,
    } : null;

    if (!isSuperAdmin && actor.kind === 'CUSTOMER' && t.sanatoriumId) {
      const staffReply = [...messages].reverse().find(m => m.userId !== actor.id && userMap.get(m.userId)?.kind === 'STAFF');
      const fallbackMember = sanatoriumStaffMembers.find(m => m.role === 'RECEPTION') ?? sanatoriumStaffMembers[0];
      const staffUser = staffReply ? userMap.get(staffReply.userId) : (fallbackMember ? userMap.get(fallbackMember.userId) : null);
      const staffMemberRecord = staffUser
        ? sanatoriumStaffMembers.find(m => m.userId === staffUser.id)
        : fallbackMember;
      const roleLabel = staffMemberRecord ? (roleLabelMap[staffMemberRecord.role] ?? staffMemberRecord.role) : 'Resepshn';
      const sanName = sanatorium?.name ?? 'Sanatoriya';
      peer = {
        id: staffUser?.id ?? null,
        name: staffUser?.name ? `${staffUser.name} · ${roleLabel}` : `${sanName} · ${roleLabel}`,
        kind: 'STAFF',
        role: staffMemberRecord?.role ?? 'RECEPTION',
        roleLabel,
        sanatoriumName: sanName,
        avatarUrl: staffUser?.avatarUrl ?? null,
        isOnline: staffUser ? (onlineMap.get(staffUser.id)?.isOnline ?? false) : false,
      };
    }

    return {
      ...t,
      sender,
      senderDisplay: display,
      peer,
      sanatoriumName: sanatorium?.name ?? null,
      booking,
      messages: messages.map(m => {
        const u = userMap.get(m.userId);
        const isSender = m.userId === t.userId;
        const uEmail = u?.email ?? (u?.login?.includes('@') ? u.login : (isSender ? senderEmail : null));
        const uPhone = u?.phone ?? (isSender ? sender?.phone : null);
        const uLogin = u?.login ?? (isSender ? sender?.login : null);
        const uRealName = u?.name && u.name !== 'Mijoz' && u.name !== 'User' ? u.name : null;
        const memberRole = u?.kind === 'STAFF' ? sanatoriumStaffMembers.find(sm => sm.userId === u.id)?.role : undefined;
        const roleSuffix = memberRole ? ` (${roleLabelMap[memberRole] ?? memberRole})` : '';
        const msgDisplay = u?.kind === 'SUPERADMIN' && !isSuperAdmin
          ? 'Superadmin'
          : ((uRealName ? `${uRealName}${roleSuffix}` : null) || uPhone || uEmail || uLogin || (u?.name !== 'Mijoz' && u?.name !== 'User' ? u?.name : null) || (isSender ? (sender?.name !== 'Mijoz' && sender?.name !== 'User' ? sender?.name : null) || sender?.phone || senderEmail || sender?.login || 'Mobil mijoz' : 'Xodim'));
        return {
          ...m,
          isMe: m.userId === actor.id,
          userName: msgDisplay,
          rawName: u?.name ?? (isSender ? (sender?.name || 'Mijoz') : 'Xodim'),
          userPhone: uPhone ?? null,
          userLogin: uLogin ?? null,
          userEmail: uEmail ?? null,
          userAvatarUrl: u?.avatarUrl ?? null,
          userIsOnline: onlineMap.get(m.userId)?.isOnline ?? false,
          userKind: u?.kind ?? (isSender ? 'CUSTOMER' : 'STAFF'),
          isEdited: m.isEdited ?? false,
          isDeleted: m.deletedForUser ?? false,
          imageUrl: m.imageUrl ?? null,
        };
      })
    };
  }
  async ticketReply(actor:Actor,id:string,body:unknown,key?:string){
    const i=parse(z.object({
      text:z.string().max(5000).default(''),
      imageUrl:z.string().max(10_000_000).nullish(),
      close:z.boolean().default(false)
    }).strict(),body);
    if(!i.text.trim() && !i.imageUrl) fail('VALIDATION_ERROR','Xabar matni yoki rasm kiritilishi shart',422);
    const t=await this.ticketGet(actor,id);
    if(i.close&&actor.kind!=='SUPERADMIN'&&!(actor.kind==='STAFF'&&t.sanatoriumId&&(tenantIds(actor,'support.read')??[]).includes(t.sanatoriumId)))fail('PERMISSION_DENIED','Murojaatni support yopadi',403);
    const defaultPlaceholder = i.imageUrl?.startsWith('data:video/')
      ? '🎬 Video'
      : (i.imageUrl?.startsWith('data:image/') ? '📷 Rasm' : (i.imageUrl ? '📎 Fayl' : ''));
    const msgText = i.text.trim() || defaultPlaceholder;
    let createdInThisCall = false;
    const run=async(tx:Tx)=>{
      const m=await tx.supportMessage.create({
        data:{
          ticketId:id,
          userId:actor.id,
          text:msgText,
          imageUrl:i.imageUrl??null
        }
      });
      if(i.close)await tx.supportTicket.update({where:{id},data:{status:'CLOSED'}});
      const admins=await tx.user.findMany({where:{kind:'SUPERADMIN',status:'ACTIVE'},select:{id:true}});
      const staffRecipients = t.sanatoriumId && tx.membership?.findMany
        ? await tx.membership.findMany({
            where:{sanatoriumId:t.sanatoriumId,status:'ACTIVE',role:{in:['RECEPTION','DIRECTOR']}},
            select:{userId:true}
          })
        : [];
      const participantIds = (t.messages ?? []).map((msg: any) => msg.userId).filter(Boolean);
      const recipientIds = [...new Set([
        ...(t.userId !== actor.id ? [t.userId] : []),
        ...participantIds.filter((uid: string) => uid !== actor.id),
        ...staffRecipients.map(s => s.userId).filter(uid => uid !== actor.id),
        ...(actor.kind === 'SUPERADMIN' ? [] : admins.map(a => a.id)),
      ])];
      await emit(tx,'support.replied',{
        recipient_ids:recipientIds,
        ticket_id:id,
        title:t.title,
        text:msgText,
        sanatorium_id:t.sanatoriumId??null
      });
      createdInThisCall = true;
      return m;
    };
    const msg = await (key?this.db.idempotent(actor.id,'support.reply',key,{id,...i},run):this.db.atomic(run));
    if (createdInThisCall && actor.kind !== 'CUSTOMER' && t.userId !== actor.id) {
      await this.notifyUserSupportReply({
        id: msg.id,
        email: t.sender?.email ?? t.sender?.login,
        recipientName: t.sender?.name,
        ticketTitle: t.title,
        messageText: msgText,
        hasAttachment: Boolean(i.imageUrl),
      });
    }
    return msg;
  }
  async ticketMessageEdit(actor:Actor,ticketId:string,messageId:string,body:unknown){
    parse(uuid,ticketId);
    parse(uuid,messageId);
    const i=parse(z.object({text:z.string().min(1).max(5000)}).strict(),body);
    await this.ticketGet(actor,ticketId);
    const msg=await this.db.supportMessage.findUnique({where:{id:messageId}});
    if(!msg||msg.ticketId!==ticketId)fail('NOT_FOUND','Xabar topilmadi',404);
    if(msg.userId!==actor.id&&actor.kind!=='SUPERADMIN')fail('PERMISSION_DENIED','Faqat o‘zingiz yozgan xabarni tahrirlashingiz mumkin',403);
    if(msg.deletedForUser)fail('CANNOT_EDIT_DELETED','O‘chirilgan xabarni tahrirlab bo‘lmaydi',400);
    const updated=await this.db.supportMessage.update({where:{id:messageId},data:{text:i.text,isEdited:true}});
    return {id:updated.id,text:updated.text,isEdited:true,imageUrl:updated.imageUrl,createdAt:updated.createdAt};
  }
  async ticketMessageDelete(actor:Actor,ticketId:string,messageId:string){
    parse(uuid,ticketId);
    parse(uuid,messageId);
    await this.ticketGet(actor,ticketId);
    const msg=await this.db.supportMessage.findUnique({where:{id:messageId}});
    if(!msg||msg.ticketId!==ticketId)fail('NOT_FOUND','Xabar topilmadi',404);
    if(msg.userId!==actor.id&&actor.kind!=='SUPERADMIN')fail('PERMISSION_DENIED','Faqat o‘zingiz yozgan xabarni o‘chirishingiz mumkin',403);
    if(actor.kind==='SUPERADMIN'){
      await this.db.supportMessage.delete({where:{id:messageId}});
      return {success:true,messageId,deleted:true};
    }
    // Foydalanuvchi/xodim xabarni o‘chirsa, bu foydalanuvchilar uchun yashiriladi (deletedForUser=true),
    // ammo superadmin uchun audit va dalil sifatida o‘chmasdan saqlanib qoladi.
    await this.db.supportMessage.update({where:{id:messageId},data:{deletedForUser:true}});
    return {success:true,messageId,deleted:false};
  }
  async ticketImageUpload(actor:Actor,body:unknown){
    const i=parse(z.object({base64:z.string().min(10).max(15_000_000),mime:z.string().max(100)}).strict(),body);
    return {url:`data:${i.mime};base64,${i.base64}`};
  }
  async notifications(actor:Actor, appBuildHeader?: string){
    const rawRows = await this.db.notificationDelivery.findMany({where:{userId:actor.id,channel:'IN_APP'},take:100,orderBy:{id:'desc'}});
    const clientBuild = typeof appBuildHeader === 'string' && /^\d{1,9}$/.test(appBuildHeader.trim()) ? Number(appBuildHeader.trim()) : null;
    const rows = clientBuild && clientBuild > 0
      ? rawRows.filter(r => {
          const p = (r.payload ?? {}) as Record<string, any>;
          if (p.topic !== 'app.update') return true;
          const targetBuild = Number(p.target_build ?? p.build_number ?? 0);
          return !Number.isFinite(targetBuild) || targetBuild > clientBuild;
        })
      : rawRows;
    if (!rows.length) return [];

    const bookingIds = new Set<string>();
    const messageIds = new Set<string>();
    const ticketIds = new Set<string>();
    const sanatoriumIds = new Set<string>();
    const revisionIds = new Set<string>();
    const membershipIds = new Set<string>();

    for (const r of rows) {
      const p = (r.payload ?? {}) as Record<string, any>;
      if (typeof p.booking_id === 'string') bookingIds.add(p.booking_id);
      if (typeof p.message_id === 'string') messageIds.add(p.message_id);
      if (typeof p.ticket_id === 'string') ticketIds.add(p.ticket_id);
      if (typeof p.sanatorium_id === 'string') sanatoriumIds.add(p.sanatorium_id);
      if (typeof p.revision_id === 'string') revisionIds.add(p.revision_id);
      if (typeof p.membership_id === 'string') membershipIds.add(p.membership_id);
    }

    const [bookings, messages, tickets, ticketMessages, revisions, memberships] = await Promise.all([
      bookingIds.size && this.db.booking?.findMany
        ? this.db.booking.findMany({
            where: { id: { in: [...bookingIds] } },
            select: { id: true, reference: true, sanatoriumId: true, checkIn: true, checkOut: true, amount: true, status: true, guest: true, source: true },
          })
        : [],
      messageIds.size && this.db.message?.findMany
        ? this.db.message.findMany({
            where: { id: { in: [...messageIds] } },
            select: { id: true, title: true, body: true, kind: true, senderId: true, createdAt: true },
          })
        : [],
      ticketIds.size && this.db.supportTicket?.findMany
        ? this.db.supportTicket.findMany({
            where: { id: { in: [...ticketIds] } },
            select: { id: true, title: true, status: true, sanatoriumId: true, userId: true },
          })
        : [],
      ticketIds.size && this.db.supportMessage?.findMany
        ? this.db.supportMessage.findMany({
            where: { ticketId: { in: [...ticketIds] } },
            orderBy: { createdAt: 'desc' },
            select: { id: true, ticketId: true, text: true, userId: true, createdAt: true },
          })
        : [],
      revisionIds.size && this.db.sanatoriumRevision?.findMany
        ? this.db.sanatoriumRevision.findMany({
            where: { id: { in: [...revisionIds] } },
            select: { id: true, sanatoriumId: true, status: true, reason: true },
          })
        : [],
      membershipIds.size && this.db.membership?.findMany
        ? this.db.membership.findMany({
            where: { id: { in: [...membershipIds] } },
            select: { id: true, userId: true, sanatoriumId: true, role: true, status: true },
          })
        : [],
    ]);

    for (const b of bookings) if (b.sanatoriumId) sanatoriumIds.add(b.sanatoriumId);
    for (const t of tickets) if (t.sanatoriumId) sanatoriumIds.add(t.sanatoriumId);
    for (const rev of revisions) if (rev.sanatoriumId) sanatoriumIds.add(rev.sanatoriumId);
    for (const m of memberships) if (m.sanatoriumId) sanatoriumIds.add(m.sanatoriumId);

    const sanatoriums = sanatoriumIds.size && this.db.sanatorium?.findMany
      ? await this.db.sanatorium.findMany({
          where: { id: { in: [...sanatoriumIds] } },
          select: { id: true, name: true },
        })
      : [];

    const bookingMap = new Map(bookings.map(b => [b.id, b]));
    const msgMap = new Map(messages.map(m => [m.id, m]));
    const ticketMap = new Map(tickets.map(t => [t.id, t]));
    const latestTicketMsgMap = new Map<string, { text: string; createdAt: Date }>();
    for (const tm of ticketMessages) {
      if (!latestTicketMsgMap.has(tm.ticketId)) latestTicketMsgMap.set(tm.ticketId, tm);
    }
    const revMap = new Map(revisions.map(r => [r.id, r]));
    const memMap = new Map(memberships.map(m => [m.id, m]));
    const sanMap = new Map(sanatoriums.map(s => [s.id, s.name]));

    const formatUzs = (tiyin: unknown): string => {
      if (tiyin === undefined || tiyin === null) return '';
      const num = Math.round(Number(tiyin) / 100);
      return Number.isFinite(num) ? `${num.toLocaleString('uz-UZ')} so‘m` : '';
    };
    const formatDateShort = (d: unknown): string => {
      if (!d) return '';
      const dt = d instanceof Date ? d : new Date(String(d));
      return Number.isNaN(dt.getTime()) ? String(d) : dt.toISOString().slice(0, 10);
    };

    const topicTitles: Record<string, string> = {
      'payment.succeeded': 'To‘lov muvaffaqiyatli amalga oshirildi va bron tasdiqlandi',
      'booking.created': 'Yangi bron tasdiqlandi',
      'booking.confirmed': 'Bron tasdiqlandi',
      'booking.checked_in': 'Mehmon sanatoriyaga joylashdi (Check-in)',
      'booking.checked_out': 'Yashash yakunlandi (Check-out)',
      'booking.cancelled': 'Bron bekor qilindi',
      'booking.no_show': 'Mehmon kelmadi (No-show)',
      'payment.exception': 'To‘lov bo‘yicha tekshiruv talab etiladi',
      'refund.requested': 'Pulni qaytarish (refund) so‘rovi yuborildi',
      'refund.succeeded': 'To‘lov mablag‘i qaytarildi (Refund)',
      'message.created': 'Yangi e’lon va xabar',
      'support.opened': 'Yordam xizmatida yangi murojaat ochildi',
      'support.replied': 'Murojaatingizga yangi javob keldi',
      'sanatorium.submitted': 'Sanatoriya anketasi moderatsiyaga yuborildi',
      'sanatorium.moderated': 'Sanatoriya anketasi ko‘rib chiqildi',
      'staff.invited': 'Yangi xodim tasdiqlashni kutmoqda',
      'task.assigned': 'Sizga yangi vazifa biriktirildi',
      'survey.created': 'Yangi so‘rovnoma (anketa) yuborildi',
      'ad.requested': 'Yangi reklama arizasi kelib tushdi',
      'subscription.status_changed': 'Obuna holati o‘zgardi',
      'bank.change_requested': 'Bank rekvizitlarini yangilash so‘rovi',
      'partner.password_reset_requested': 'Hamkor parolni tiklashni so‘radi',
      'auth.bruteforce_alert': 'Xavfsizlik ogohlantirishi: ko‘p martalik xato parol urinishi',
      'telegram.linked': 'Telegram bot hisobingizga ulandi',
      'app.update': 'Ilovaning yangi versiyasi mavjud',
    };

    return rows.map(r => {
      const p = ((r.payload ?? {}) as Record<string, any>);
      const topic = String(p.topic || 'notification');
      const b = typeof p.booking_id === 'string' ? bookingMap.get(p.booking_id) : undefined;
      const m = typeof p.message_id === 'string' ? msgMap.get(p.message_id) : undefined;
      const t = typeof p.ticket_id === 'string' ? ticketMap.get(p.ticket_id) : undefined;
      const tm = typeof p.ticket_id === 'string' ? latestTicketMsgMap.get(p.ticket_id) : undefined;
      const rev = typeof p.revision_id === 'string' ? revMap.get(p.revision_id) : undefined;
      const mem = typeof p.membership_id === 'string' ? memMap.get(p.membership_id) : undefined;

      const sanatoriumId = b?.sanatoriumId ?? t?.sanatoriumId ?? rev?.sanatoriumId ?? mem?.sanatoriumId ?? p.sanatorium_id;
      const sanatoriumName = (sanatoriumId ? sanMap.get(sanatoriumId) : undefined) ?? p.sanatorium_name ?? null;
      const guestObj = (b?.guest ?? {}) as Record<string, any>;
      const guestName = [guestObj.first_name, guestObj.last_name].filter(Boolean).join(' ').trim() || null;
      const guestPhone = guestObj.phone || null;

      let title = p.title || m?.title || t?.title || topicTitles[topic] || 'Tizim bildirishnomasi';
      if (topic === 'message.created' && m?.title) {
        title = m.kind === 'WARNING' ? `⚠️ Muhim e’lon: ${m.title}` : `📢 E’lon: ${m.title}`;
      } else if ((topic === 'support.opened' || topic === 'support.replied') && (p.title || t?.title)) {
        title = `${topic === 'support.opened' ? 'Yangi murojaat' : 'Yangi xabar'}: ${p.title || t?.title}`;
      } else if ((topic === 'payment.succeeded' || topic.startsWith('booking.')) && b?.reference) {
        title = `${topicTitles[topic] || 'Bron xabarnomasi'} (#${b.reference})`;
      }

      const details: Array<{ label: string; value: string }> = [];
      if (sanatoriumName) details.push({ label: 'Sanatoriya', value: String(sanatoriumName) });
      if (b) {
        details.push({ label: 'Bron raqami', value: `#${b.reference}` });
        if (guestName) details.push({ label: 'Mehmon', value: guestName });
        if (guestPhone) details.push({ label: 'Telefon', value: String(guestPhone) });
        details.push({ label: 'Kelish va ketish', value: `${formatDateShort(b.checkIn)} — ${formatDateShort(b.checkOut)}` });
        const amountStr = formatUzs(b.amount);
        if (amountStr) details.push({ label: 'Summa', value: amountStr });
        details.push({ label: 'Bron holati', value: String(b.status) });
      }
      if (m) {
        details.push({ label: 'Xabar turi', value: m.kind === 'WARNING' ? 'Ogohlantirish / Muhim' : 'Axborot e’loni' });
        details.push({ label: 'Sarlavha', value: m.title });
      }
      if (t) {
        details.push({ label: 'Murojaat mavzusi', value: t.title });
        details.push({ label: 'Holati', value: t.status === 'OPEN' ? 'Ochiq' : 'Yopilgan' });
      }
      if (rev) {
        details.push({ label: 'Holati', value: String(rev.status) });
        if (rev.reason) details.push({ label: 'Izoh / Sabab', value: rev.reason });
      }
      if (mem) {
        details.push({ label: 'Lavozim', value: mem.role === 'RECEPTION' ? 'Resepshn' : mem.role === 'DIRECTOR' ? 'Direktor' : mem.role === 'ACCOUNTANT' ? 'Hisobchi' : mem.role });
      }
      if (p.attempted_login) details.push({ label: 'Login', value: `@${p.attempted_login}` });
      if (p.contact_phone || p.user_phone) details.push({ label: 'Aloqa telefoni', value: String(p.contact_phone || p.user_phone) });
      if (p.reason) details.push({ label: 'Sabab / Izoh', value: String(p.reason) });
      if (topic === 'app.update') {
        if (p.target_version || p.version) details.push({ label: 'Yangi versiya', value: `v${p.target_version || p.version}` });
        if (p.target_build || p.build_number) details.push({ label: 'Build raqami', value: String(p.target_build || p.build_number) });
      }

      let bodyText = p.body || m?.body || p.text || tm?.text || '';
      if (!bodyText) {
        if (b) {
          bodyText = `${sanatoriumName ? `${sanatoriumName} sanatoriyasida ` : ''}#${b.reference} raqamli bron (${formatDateShort(b.checkIn)} — ${formatDateShort(b.checkOut)})${formatUzs(b.amount) ? `, summasi: ${formatUzs(b.amount)}` : ''}.`;
        } else if (rev) {
          bodyText = `${sanatoriumName || 'Sanatoriya'} profili bo‘yicha anketa holati: ${rev.status}${rev.reason ? `. Sabab: ${rev.reason}` : ''}.`;
        } else if (p.note) {
          bodyText = String(p.note);
        } else {
          bodyText = topicTitles[topic] || 'Batafsil ma’lumot quyida keltirilgan.';
        }
      }

      const summary = bodyText.length > 140 ? `${bodyText.slice(0, 137)}...` : bodyText;

      return {
        ...r,
        payload: {
          ...p,
          title,
          summary,
          body: bodyText,
          sanatorium_name: sanatoriumName,
          booking_reference: b?.reference ?? null,
          details,
        },
      };
    });
  }
  async notificationReadAll(actor:Actor){await this.db.notificationDelivery.updateMany({where:{userId:actor.id,channel:'IN_APP',readAt:null},data:{readAt:new Date()}});return {success:true};}
  async notificationRead(actor:Actor,id:string){parse(uuid,id);const r=await this.db.notificationDelivery.updateMany({where:{id,userId:actor.id},data:{readAt:new Date()}});if(!r.count)fail('NOT_FOUND','Bildirishnoma topilmadi',404);return {success:true};}
}
