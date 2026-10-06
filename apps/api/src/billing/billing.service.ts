import { Inject,Injectable } from '@nestjs/common';
import { z } from 'zod';
import { Db,audit,emit,lock,type Tx } from '../common/db';
import { parse,uuid,positiveMoney,fail,reason,pageQuery,paged } from '../common/errors';
import { Actor,scope,requirePlatform,tenantIds } from '../auth/permissions';
import { PaymentService,financialLock } from '../payments/payment.service';
import { post } from '../ledger/ledger';
import { adInput } from './ad-input';

@Injectable()
export class BillingService{
  constructor(@Inject(Db) readonly db:Db,@Inject(PaymentService) readonly payments:PaymentService){}
  async plans(actor:Actor){requirePlatform(actor,'billing.manage');return this.db.subscriptionPlan.findMany();}
  async plan(actor:Actor,body:unknown){requirePlatform(actor,'billing.manage');const i=parse(z.object({name:z.string().min(2).max(80),amount:positiveMoney,period_days:z.number().int().min(1).max(366),grace_days:z.number().int().min(0).max(30),features:z.array(z.string().max(80)).max(30)}).strict(),body);return this.db.atomic(async tx=>{const p=await tx.subscriptionPlan.create({data:{name:i.name,amount:BigInt(i.amount),periodDays:i.period_days,graceDays:i.grace_days,features:i.features}});await audit(tx,actor.id,'billing.plan_created',p.id);return p;});}
  async subscribe(actor:Actor,body:unknown,key?:string){requirePlatform(actor,'billing.manage');const i=parse(z.object({sanatorium_id:uuid,plan_id:uuid,trial_days:z.number().int().min(0).max(30).default(0)}).strict(),body);return this.db.idempotent(actor.id,'subscription.create',key,i,async tx=>{await financialLock(tx,i.sanatorium_id);const plan=await tx.subscriptionPlan.findFirst({where:{id:i.plan_id,active:true}});if(!plan)fail('NOT_FOUND','Tarif topilmadi',404);const now=new Date();const end=new Date(now.getTime()+i.trial_days*86400000);const sub=await tx.subscription.create({data:{sanatoriumId:i.sanatorium_id,planId:plan.id,status:i.trial_days?'TRIAL':'SUSPENDED',startsAt:now,endsAt:end,graceEndsAt:new Date(end.getTime()+plan.graceDays*86400000)}});await tx.sanatorium.update({where:{id:i.sanatorium_id},data:{subscriptionRequired:true}});const invoice=await this.subscriptionInvoice(tx,sub.sanatoriumId,plan,end);await audit(tx,actor.id,'billing.subscription_created',sub.id,sub.sanatoriumId);return {subscription:sub,invoice};});}
  private async subscriptionInvoice(tx:Tx,sanatoriumId:string,plan:{id:string;amount:bigint;periodDays:number;graceDays:number;features:string[]},start:Date){const end=new Date(start.getTime()+plan.periodDays*86400000);const sourceKey=`subscription:${sanatoriumId}:${start.toISOString()}`;return tx.invoice.upsert({where:{sourceKey},create:{sanatoriumId,purpose:'SUBSCRIPTION',sourceKey,amount:plan.amount,startsAt:start,endsAt:end,data:{plan_id:plan.id,grace_days:plan.graceDays,features:plan.features}},update:{}});}
  async renew(actor:Actor,id:string,key?:string){requirePlatform(actor,'billing.manage');parse(uuid,id);return this.db.idempotent(actor.id,'subscription.renew',key,{id},async tx=>{const sub=await tx.subscription.findUnique({where:{id}});if(!sub)fail('NOT_FOUND','Abonent topilmadi',404);await financialLock(tx,sub.sanatoriumId);const plan=await tx.subscriptionPlan.findUniqueOrThrow({where:{id:sub.planId}});return this.subscriptionInvoice(tx,sub.sanatoriumId,plan,sub.endsAt);});}
  async subscriptions(actor:Actor){requirePlatform(actor,'billing.manage');return this.db.subscription.findMany();}
  async invoices(actor:Actor,query:unknown){const i=parse(pageQuery.extend({sanatorium_id:uuid.optional()}).strict(),query);if(i.sanatorium_id)scope(actor,i.sanatorium_id,'invoices.read');const ids=tenantIds(actor,'invoices.read');const where=ids?{sanatoriumId:{in:i.sanatorium_id?[i.sanatorium_id]:ids}}:i.sanatorium_id?{sanatoriumId:i.sanatorium_id}:{};const[data,total]=await Promise.all([this.db.invoice.findMany({where,take:i.limit,skip:(i.page-1)*i.limit,orderBy:{createdAt:'desc'}}),this.db.invoice.count({where})]);return paged(data,total,i.page,i.limit);}
  async invoiceCheckout(actor:Actor,id:string,key?:string){parse(uuid,id);return this.db.idempotent(actor.id,'invoice.checkout',key,{id},async tx=>{const invoice=await tx.invoice.findUnique({where:{id}});if(!invoice)fail('NOT_FOUND','Invoice topilmadi',404);scope(actor,invoice.sanatoriumId,'invoices.pay');await financialLock(tx,invoice.sanatoriumId);if(invoice.status!=='UNPAID')fail('STATE_CONFLICT','Invoice allaqachon to‘langan');const order=await tx.paymentOrder.upsert({where:{invoiceId:id},create:{invoiceId:id,sanatoriumId:invoice.sanatoriumId,userId:actor.id,purpose:invoice.purpose,amount:invoice.amount},update:{}});return this.payments.checkoutResult(order);});}
  async adRequest(actor:Actor,body:unknown,key?:string){
    const i=parse(adInput,body);scope(actor,i.sanatorium_id,'ads.request');
    const create=async(tx:Tx)=>{
      const image=await tx.mediaAsset.findFirst({where:{id:i.image_asset_id,sanatoriumId:i.sanatorium_id,visibility:'PUBLIC',mime:{startsWith:'image/'}}});
      if(!image)fail('NOT_FOUND','Reklama rasmi topilmadi',404);
      const targetId=i.target_sanatorium_id??i.sanatorium_id;
      if(i.target_kind==='SANATORIUM'&&!await tx.sanatorium.findFirst({where:{id:targetId,status:'ACTIVE',publicRevisionId:{not:null}}}))
        fail('SANATORIUM_NOT_PUBLIC','Reklama ochadigan sanatoriya faol va tasdiqlangan bo‘lsin.',422);
      const ad=await tx.adCampaign.create({data:{sanatoriumId:i.sanatorium_id,title:i.title,placement:i.placement,startsAt:new Date(i.starts_at),endsAt:new Date(i.ends_at),amount:0n,data:{
        image_asset_id:i.image_asset_id,text:i.text,target_kind:i.target_kind,
        ...(i.target_kind==='URL'?{target_url:i.target_url!}:{target_sanatorium_id:targetId}),
        has_discount:i.has_discount,...(i.has_discount?{...(i.discount_percent?{discount_percent:i.discount_percent}:{}),...(i.discount_text?{discount_text:i.discount_text}:{})}:{}),
      }}});
      await audit(tx,actor.id,'ad.requested',ad.id,i.sanatorium_id);return ad;
    };
    return key?this.db.idempotent(actor.id,'ad.request',key,i,create):this.db.atomic(create);
  }
  async archiveAd(actor:Actor,id:string){
    parse(uuid,id);
    return this.db.atomic(async tx=>{
      const ad=await tx.adCampaign.findUnique({where:{id}});
      if(!ad)fail('NOT_FOUND','Reklama topilmadi',404);
      scope(actor,ad.sanatoriumId,'ads.request');
      await financialLock(tx,ad.sanatoriumId);
      const current=await tx.adCampaign.findUniqueOrThrow({where:{id}});
      if(current.status==='ARCHIVED')return current;
      const changed=await tx.adCampaign.update({where:{id},data:{status:'ARCHIVED'}});
      await audit(tx,actor.id,'ad.archived',id,ad.sanatoriumId);return changed;
    });
  }
  async adDecision(actor: Actor, id: string, approve: boolean, body: unknown) {
    requirePlatform(actor, 'billing.manage'); parse(uuid, id);
    const input = parse(z.object({ reason: reason.optional() }).strict(), body);
    if (!approve && !input.reason) fail('REASON_REQUIRED', 'Sababni yozing', 422);
    return this.db.atomic(async tx => {
      const ad = await tx.adCampaign.findUnique({ where: { id } });
      if (!ad) fail('NOT_FOUND', 'Reklama topilmadi', 404);
      await financialLock(tx, ad.sanatoriumId);
      const current = await tx.adCampaign.findUniqueOrThrow({ where: { id } });
      if (current.status !== 'PENDING' && !(approve && current.status === 'APPROVED')) fail('STATE_CONFLICT', 'Reklama holati o‘zgargan');
      if (approve) {
        const s = await tx.sanatorium.findUniqueOrThrow({ where: { id: ad.sanatoriumId } });
        if (!s.publicRevisionId || s.status !== 'ACTIVE') fail('SANATORIUM_NOT_PUBLIC', 'Tasdiqlangan faol sanatoriya kerak');
        if (current.invoiceId) {
          const invoice = await tx.invoice.findUniqueOrThrow({ where: { id: current.invoiceId } });
          if (invoice.status === 'PAID') return current; // Historical paid invoices and ledger remain intact.
          const order = await tx.paymentOrder.findUnique({ where: { invoiceId: invoice.id } });
          const bill = order ? await tx.tezcheckBill.findUnique({ where: { orderId: order.id } }) : null;
          if (order && (['PENDING', 'SUCCEEDED'].includes(order.status) || bill && !['CANCELLED', 'TEST'].includes(bill.state) || await tx.providerTransaction.findFirst({ where: { orderId: order.id, state: { in: [1, 2] } } })))
            fail('PAYMENT_RECONCILIATION_REQUIRED', 'Reklama to‘lovining holatini avval tekshiring.');
          if (invoice.status === 'UNPAID') await tx.invoice.update({ where: { id: invoice.id }, data: { status: 'VOID' } });
          if (order?.status === 'CREATED') await tx.paymentOrder.update({ where: { id: order.id }, data: { status: 'CANCELLED' } });
        }
      }
      const changed = await tx.adCampaign.update({ where: { id }, data: {
        status: approve ? 'APPROVED' : 'REJECTED', invoiceId: null, amount: 0n,
        data: { ...(current.data as object), free: approve }, reason: input.reason,
      } });
      await audit(tx, actor.id, approve ? 'ad.free_published' : 'ad.rejected', id, ad.sanatoriumId, undefined, input);
      return changed;
    });
  }
  async ads(actor: Actor) {
    const ids = tenantIds(actor, 'ads.request');
    const ads = await this.db.adCampaign.findMany({ where: ids ? { sanatoriumId: { in: ids } } : {}, orderBy: { startsAt: 'desc' } });
    const invoices = await this.db.invoice.findMany({ where: { id: { in: ads.flatMap(a => a.invoiceId ? [a.invoiceId] : []) } } });
    const sanatoriums = await this.db.sanatorium.findMany({ where: { id: { in: ads.map(a => a.sanatoriumId) } } });
    const now = new Date();
    return ads.map(ad => ({ ...ad, publication_status: ['REJECTED','ARCHIVED'].includes(ad.status) ? ad.status : ad.status !== 'APPROVED' ? 'WAITING_APPROVAL'
      : ad.endsAt <= now ? 'EXPIRED' : ad.startsAt > now ? 'SCHEDULED'
      : !sanatoriums.some(s => s.id === ad.sanatoriumId && s.status === 'ACTIVE' && s.publicRevisionId) ? 'SANATORIUM_HIDDEN'
      : ad.invoiceId && !invoices.some(i => i.id === ad.invoiceId && i.status === 'PAID') ? 'WAITING_FREE_PUBLICATION'
      : 'LIVE' }));
  }
  async tick(now=new Date()){
    const subs=await this.db.subscription.findMany({where:{status:{in:['ACTIVE','TRIAL','PAST_DUE']},endsAt:{lte:now}}});for(const sub of subs)await this.db.atomic(async tx=>{await financialLock(tx,sub.sanatoriumId);const current=await tx.subscription.findUniqueOrThrow({where:{id:sub.id}});if(current.endsAt>now)return;const status=current.graceEndsAt>now?'PAST_DUE':'SUSPENDED';if(current.status!==status){await tx.subscription.update({where:{id:sub.id},data:{status}});const staff=await tx.membership.findMany({where:{sanatoriumId:sub.sanatoriumId,status:'ACTIVE'},select:{userId:true}});await emit(tx,'subscription.status_changed',{recipient_ids:staff.map(s=>s.userId),status,sanatorium_id:sub.sanatoriumId});}});
    const invoices=await this.db.invoice.findMany({where:{status:'PAID',startsAt:{lt:now}},take:1000});for(const invoice of invoices)await this.db.atomic(async tx=>{await financialLock(tx,invoice.sanatoriumId);const duration=invoice.endsAt.getTime()-invoice.startsAt.getTime();const elapsed=Math.min(duration,Math.max(0,Math.floor((now.getTime()-invoice.startsAt.getTime())/86400000)*86400000));const full=now>=invoice.endsAt;const target=full?invoice.amount:invoice.amount*BigInt(elapsed)/BigInt(duration);const journals=await tx.ledgerJournal.findMany({where:{source:{startsWith:`service:${invoice.id}:`}},select:{id:true}});const recognized=await tx.ledgerLine.aggregate({where:{journalId:{in:journals.map(j=>j.id)},account:{in:['AD_REVENUE','SUBSCRIPTION_REVENUE']}},_sum:{credit:true}});const difference=target-(recognized._sum.credit??0n);if(difference>0n)await post(tx,`service:${invoice.id}:${full?'final':Math.floor(elapsed/86400000)}`,'Xizmat davri bo‘yicha daromad',[{account:'DEFERRED_SERVICE_REVENUE',debit:difference},{account:invoice.purpose==='AD'?'AD_REVENUE':'SUBSCRIPTION_REVENUE',credit:difference}],invoice.sanatoriumId);});
  }
}
