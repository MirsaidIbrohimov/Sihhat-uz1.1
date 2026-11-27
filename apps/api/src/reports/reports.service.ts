import { Inject,Injectable } from '@nestjs/common';
import { z } from 'zod';
import { Db,audit,bodyHash,type Tx } from '../common/db';
import { parse,uuid,positiveMoney,money,fail,pageQuery,paged,reason } from '../common/errors';
import { Actor,scope,requirePlatform } from '../auth/permissions';
import { post } from '../ledger/ledger';
import { financialLock } from '../payments/payment.service';
import { buildReport, reportCsv, reportInput } from './report-data';
import { dateFilter } from '../bookings/search';
import { resolveUserPublicId } from '../auth/public-id.util';
import { reportXlsx } from './report-xlsx';

@Injectable()
export class ReportsService{
  constructor(@Inject(Db) readonly db:Db){}
  async report(actor: Actor, query: unknown, global = false) { return this.db.$transaction(tx => buildReport(tx, actor, query, global), {isolationLevel: 'RepeatableRead', timeout: 30000}); }
  async export(actor: Actor, query: unknown, format: 'CSV' | 'XLSX' = 'CSV') {
    const q = parse(reportInput, query);
    const id = q.sanatorium_id ?? actor.memberships.find(m => m.status === 'ACTIVE')?.sanatoriumId;
    if (id) scope(actor, id, 'reports.export'); else requirePlatform(actor, 'platform.reports');
    const report = await this.report(actor, q, actor.kind === 'SUPERADMIN' && !id);
    await this.db.atomic(tx => audit(tx, actor.id, 'report.exported', id ?? 'platform', id, undefined, {from: q.from, to: q.to, financial: q.financial === 'true', format}));
    return format === 'XLSX' ? reportXlsx(report) : reportCsv(report);
  }
  async audit(actor:Actor,query:unknown,partner=false){
    const i=parse(pageQuery.extend({sanatorium_id:uuid.optional(),from:z.iso.date().optional(),to:z.iso.date().optional(),action:z.string().trim().max(100).optional(),q:z.string().trim().max(120).optional()}).strict(),query);
    let tenant=i.sanatorium_id;
    if(!partner)requirePlatform(actor,'audit.read');
    else{
      tenant??=actor.memberships.find(m=>m.status==='ACTIVE'&&m.role==='DIRECTOR')?.sanatoriumId;
      if(!tenant)fail('PERMISSION_DENIED','Bu sahifa uchun direktor vakolati kerak',403);
      scope(actor,tenant,'audit.read');
      if(actor.kind!=='SUPERADMIN'&&!actor.memberships.some(m=>m.sanatoriumId===tenant&&m.status==='ACTIVE'&&m.role==='DIRECTOR'))fail('PERMISSION_DENIED','Bu sahifa uchun direktor vakolati kerak',403);
    }
    const andClauses: Record<string, any>[]=[];
    let tenantStaffIds: string[]=[];
    if(tenant){
      const tenantMembers=typeof (this.db as any).membership?.findMany==='function'
        ? await this.db.membership.findMany({where:{sanatoriumId:tenant},select:{userId:true}})
        : [];
      tenantStaffIds=[...new Set(tenantMembers.map(m=>m.userId))];
      andClauses.push({
        OR:[
          {sanatoriumId:tenant},
          ...(tenantStaffIds.length?[{actorId:{in:tenantStaffIds},sanatoriumId:null}]:[]),
        ],
      });
    }
    if(i.q){
      const cleanDigits=i.q.replace(/^#+/,'').trim();
      const numericId=/^\d{5,8}$/.test(cleanDigits)?Number(cleanDigits):null;
      const matchedActors=typeof (this.db as any).user?.findMany==='function'
        ? await this.db.user.findMany({
            where:{
              OR:[
                {name:{contains:i.q,mode:'insensitive'}},
                {login:{contains:i.q,mode:'insensitive'}},
                {email:{contains:i.q,mode:'insensitive'}},
                ...(numericId!==null?[{publicId:numericId}]:[]),
              ],
            },
            select:{id:true},
            take:100,
          })
        : [];
      andClauses.push({
        OR:[
          {action:{contains:i.q,mode:'insensitive'}},
          {entityId:{contains:i.q,mode:'insensitive'}},
          {note:{contains:i.q,mode:'insensitive'}},
          ...(matchedActors.length?[{actorId:{in:matchedActors.map(u=>u.id)}}]:[]),
        ],
      });
    }
    const where: Record<string, any>={
      ...(i.action?{action:i.action}:{}),
      ...((i.from||i.to)?{createdAt:dateFilter(i.from,i.to,true)}:{}),
      ...(andClauses.length?{AND:andClauses}:{}),
    };
    const[data,total]=await Promise.all([
      this.db.auditLog.findMany({where,take:i.limit,skip:(i.page-1)*i.limit,orderBy:{createdAt:'desc'}}),
      this.db.auditLog.count({where}),
    ]);
    const actorIds=[...new Set(data.map(r=>r.actorId).filter((id):id is string=>!!id))];
    const actorMemberships=actorIds.length&&typeof (this.db as any).membership?.findMany==='function'
      ? await this.db.membership.findMany({where:{userId:{in:actorIds},status:'ACTIVE'},orderBy:{createdAt:'asc'},select:{userId:true,sanatoriumId:true}})
      : [];
    const actorSanMap=new Map<string,string>();
    for(const m of actorMemberships){
      if(!actorSanMap.has(m.userId))actorSanMap.set(m.userId,m.sanatoriumId);
    }
    const sanIds=[...new Set([
      ...data.map(r=>r.sanatoriumId).filter((id):id is string=>!!id),
      ...(tenant?[tenant]:[]),
      ...actorSanMap.values(),
    ])];
    const[users,sanatoriums]=await Promise.all([
      actorIds.length
        ? this.db.user.findMany({where:{id:{in:actorIds}},select:{id:true,name:true,login:true,publicId:true,kind:true}})
        : [],
      sanIds.length && typeof (this.db as any).sanatorium?.findMany === 'function'
        ? this.db.sanatorium.findMany({where:{id:{in:sanIds}},select:{id:true,name:true}})
        : [],
    ]);
    const userMap=new Map(users.map(u=>[u.id,u]));
    const sanMap=new Map(sanatoriums.map(s=>[s.id,s.name]));
    return paged(
      data.map(r=>{
        const u=r.actorId?userMap.get(r.actorId):undefined;
        const resolvedSanId=r.sanatoriumId??(partner?tenant:(u?.kind==='STAFF'&&r.actorId?actorSanMap.get(r.actorId):undefined));
        return {
          ...r,
          actor_name:u?.name??null,
          actor_login:u?.login??null,
          actor_public_id:u?resolveUserPublicId(u):null,
          actor_kind:u?.kind??null,
          sanatorium_name:resolvedSanId?(sanMap.get(resolvedSanId)??null):null,
        };
      }),
      total,
      i.page,
      i.limit,
    );
  }
  async reconcile(actor:Actor,body:unknown){requirePlatform(actor,'reconciliation.manage');const i=parse(z.object({kind:z.enum(['PROVIDER','BANK']),evidence_asset_id:uuid.optional(),rows:z.array(z.object({provider:z.enum(['PAYME','TEZCHECK']).default('PAYME'),provider_id:z.string().min(8).max(64),order_id:uuid,amount:positiveMoney,state:z.number().int().refine(n=>[1,2,-1,-2].includes(n)),bank_reference:z.string().min(5).max(150).optional(),fee:money.default('0')}).strict()).min(1).max(5000)}).strict(),body);if(i.kind==='BANK'&&!i.evidence_asset_id)fail('BANK_EVIDENCE_REQUIRED','Bank reestri dalili kerak',422);if(i.evidence_asset_id&&!await this.db.mediaAsset.findFirst({where:{id:i.evidence_asset_id,visibility:'PRIVATE'}}))fail('NOT_FOUND','Dalil topilmadi',404);
    return this.db.atomic(async tx=>{const digest=bodyHash(i);const old=await tx.reconciliationImport.findUnique({where:{hash:digest}});if(old)return old;const record=await tx.reconciliationImport.create({data:{hash:digest,kind:i.kind,importedBy:actor.id,data:i}});
      for(const row of i.rows){const p=await tx.providerTransaction.findUnique({where:{provider_providerId:{provider:row.provider,providerId:row.provider_id}}});if(!p||p.orderId!==row.order_id||p.amount!==BigInt(row.amount)||p.state!==row.state){await tx.reconciliationDifference.create({data:{importId:record.id,orderId:p?.orderId,data:{...row,reason:'AMOUNT_STATE_OR_ORDER_MISMATCH'}}});continue;}
        if(i.kind==='BANK'){const order=await tx.paymentOrder.findUniqueOrThrow({where:{id:p.orderId}});await financialLock(tx,order.sanatoriumId);const fee=BigInt(row.fee);const bookedFee=p.provider==='TEZCHECK'?BigInt((p.fiscalData as any)?.fee_minor??0):0n;if(p.provider==='TEZCHECK'&&fee!==bookedFee)fail('BANK_FEE_MISMATCH','Tezcheck komissiyasi provayder yozuvi bilan mos emas',422);if(!row.bank_reference||row.state!==2||fee>=p.amount)fail('BANK_ROW_INVALID','Bank satrining summa va referenceini tekshiring',422);const source=`bank:${row.bank_reference}:${p.id}`;const existing=await tx.ledgerJournal.findUnique({where:{source}});if(existing){const line=await tx.ledgerLine.findFirst({where:{journalId:existing.id,account:'BANK'}});if(line?.debit!==p.amount-fee)fail('IDEMPOTENCY_CONFLICT','Bank reference boshqa summa bilan ishlatilgan');}else await post(tx,source,'Provayderdan bankka hisob-kitob',[{account:'BANK',debit:p.amount-fee},...(fee>0n&&p.provider!=='TEZCHECK'?[{account:'PROCESSING_EXPENSE',debit:fee}]:[]),{account:'PSP_CLEARING',credit:p.amount-bookedFee}],order.sanatoriumId,order.bookingId??undefined);}
      }await audit(tx,actor.id,'reconciliation.imported',record.id);return record;});
  }
  async differences(actor:Actor){requirePlatform(actor,'reconciliation.manage');return this.db.reconciliationDifference.findMany({take:200});}
}
