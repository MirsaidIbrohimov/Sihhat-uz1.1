import { Inject,Injectable } from '@nestjs/common';
import { z } from 'zod';
import { timingSafeEqual,randomUUID } from 'node:crypto';
import { Db,lock,audit,emit,bodyHash,type Tx } from '../common/db';
import { fail,parse,uuid,json,pageQuery,paged } from '../common/errors';
import { CONFIG,type Config } from '../common/config';
import { Actor,scope,tenantIds } from '../auth/permissions';
import { post,bookingBalance } from '../ledger/ledger';

class RpcError extends Error{constructor(readonly code:number,message:string,readonly data?:string){super(message);}}
function rpcFail(code:number,message:string,data?:string):never{throw new RpcError(code,message,data);}
const providerId=z.string().min(8).max(64).regex(/^[a-zA-Z0-9_-]+$/);
const PROVIDER_TIMEOUT=43_200_000;
export async function financialLock(tx:Tx,sanatoriumId:string){await lock(tx,`inventory:${sanatoriumId}`);await lock(tx,`settlement:${sanatoriumId}`);}
export async function refundReserve(tx:Tx,refund:{id:string;bookingId:string;sanatoriumId:string;amount:bigint}){
  const item=await tx.payoutItem.findFirst({where:{bookingId:refund.bookingId,active:true}});let account='SANATORIUM_PAYABLE';
  if(item){const payout=await tx.payout.findUniqueOrThrow({where:{id:item.payoutId}});
    if(payout.status==='DRAFT'){await tx.payout.update({where:{id:payout.id},data:{status:'CANCELLED',reason:'Refund tufayli rezerv bekor qilindi'}});await tx.payoutItem.updateMany({where:{payoutId:payout.id},data:{active:false}});}
    else account='RECEIVABLE';
  }
  const balance=await bookingBalance(tx,refund.bookingId,'SANATORIUM_PAYABLE');if(balance<refund.amount)account='RECEIVABLE';
  await post(tx,`refund:reserve:${refund.id}`,'Refund uchun rezerv',[{account,debit:refund.amount},{account:'REFUND_PAYABLE',credit:refund.amount}],refund.sanatoriumId,refund.bookingId);
  await tx.refundRequest.update({where:{id:refund.id},data:{reserveAccount:account}});return account;
}
@Injectable()
export class PaymentService {
  constructor(@Inject(Db) readonly db:Db,@Inject(CONFIG) readonly config:Config){}
  async checkout(actor:Actor,bookingId:string,key:string|undefined){parse(uuid,bookingId);return this.db.idempotent(actor.id,'payment.checkout',key,{booking_id:bookingId},async tx=>{
    const b=await tx.booking.findUnique({where:{id:bookingId}});if(!b||b.userId!==actor.id)fail('NOT_FOUND','Bron topilmadi',404);await financialLock(tx,b.sanatoriumId);const current=await tx.booking.findUniqueOrThrow({where:{id:bookingId}});
    if(!['HOLD','PAYMENT_PENDING'].includes(current.status)||(current.status==='HOLD'&&current.holdExpiresAt!<=new Date()))fail('PAYMENT_UNAVAILABLE','Bron to‘lov uchun yaroqli emas');
    const order=await tx.paymentOrder.upsert({where:{bookingId},create:{bookingId,sanatoriumId:b.sanatoriumId,userId:actor.id,purpose:'BOOKING',amount:b.amount},update:{}});return this.checkoutResult(order);
  });}
  checkoutResult(order:{id:string;amount:bigint;purpose:string}){
    if(order.amount>BigInt(Number.MAX_SAFE_INTEGER))fail('PAYMENT_AMOUNT_LIMIT','Provayder ushbu summani qabul qila olmaydi',422);
    if(this.config.PAYMENT_MODE==='local')return {order_id:order.id,amount:order.amount.toString(),mode:'local',checkout_url:null,expires_at:null,capabilities:{full_refund:true,partial_refund:false,automatic_refund:false}};
    if(!this.config.PAYME_MERCHANT_ID||!this.config.PAYME_KEY)fail('PAYMENT_UNAVAILABLE','To‘lov rekvizitlari sozlanmagan',503);
    const params=`m=${this.config.PAYME_MERCHANT_ID};ac.order_id=${order.id};a=${order.amount};l=uz`;
    return {order_id:order.id,amount:order.amount.toString(),mode:'payme',checkout_url:`${this.config.PAYME_CHECKOUT_URL}/${Buffer.from(params).toString('base64')}`,expires_at:null,capabilities:{full_refund:true,partial_refund:false,automatic_refund:false}};
  }
  async list(actor:Actor,query:unknown){const i=parse(pageQuery.extend({sanatorium_id:uuid.optional()}).strict(),query);if(i.sanatorium_id)scope(actor,i.sanatorium_id,'payments.read');const ids=tenantIds(actor,'payments.read');const where=ids?{sanatoriumId:{in:i.sanatorium_id?[i.sanatorium_id]:ids}}:i.sanatorium_id?{sanatoriumId:i.sanatorium_id}:{};const[data,total]=await Promise.all([this.db.paymentOrder.findMany({where,take:i.limit,skip:(i.page-1)*i.limit,orderBy:{createdAt:'desc'}}),this.db.paymentOrder.count({where})]);return paged(data,total,i.page,i.limit);}
  async localConfirm(actor:Actor,id:string,key:string|undefined){parse(uuid,id);if(this.config.NODE_ENV==='production'||this.config.PAYMENT_MODE!=='local')fail('NOT_FOUND','Amal topilmadi',404);
    return this.db.idempotent(actor.id,'payment.local_confirm',key,{order_id:id},async tx=>{
      const order=await tx.paymentOrder.findUnique({where:{id}});if(!order||order.userId!==actor.id)fail('NOT_FOUND','To‘lov topilmadi',404);
      const pid=`local_${id}`;const prior=await tx.providerTransaction.findUnique({where:{provider_providerId:{provider:'PAYME',providerId:pid}}});const created=await this.createTransaction(tx,{id:pid,time:prior?Number(prior.providerTime):Date.now(),amount:Number(order.amount),account:{order_id:id}});if((created as any).rpc_error)return created;
      return this.perform(tx,pid);
    });
  }
  private authorize(header:string|undefined){const key=this.config.PAYMENT_MODE==='local'?this.config.AUTH_SECRET:this.config.PAYME_KEY;const expected=`Basic ${Buffer.from(`Paycom:${key}`).toString('base64')}`;const actual=Buffer.from(header??'');const target=Buffer.from(expected);if(!key||actual.length!==target.length||!timingSafeEqual(actual,target))rpcFail(-32504,'Avtorizatsiya xatosi');}
  async rpc(body:unknown,authorization?:string){let request:any;let outcome:any;
    try{request=parse(z.object({id:z.union([z.number(),z.string(),z.null()]).optional(),jsonrpc:z.literal('2.0').optional(),method:z.string().max(64),params:z.record(z.string(),z.unknown())}).strict(),body);this.authorize(authorization);
      const result=await this.db.atomic(async tx=>{
        switch(request.method){
          case 'CheckPerformTransaction':return this.checkPerform(tx,request.params);
          case 'CreateTransaction':return this.createTransaction(tx,request.params);
          case 'PerformTransaction':return this.perform(tx,parse(z.object({id:providerId}).strict(),request.params).id);
          case 'CancelTransaction':{const p=parse(z.object({id:providerId,reason:z.number().int().min(1).max(10)}).strict(),request.params);return this.cancel(tx,p.id,p.reason);}
          case 'CheckTransaction':return this.checkTransaction(tx,parse(z.object({id:providerId}).strict(),request.params).id);
          case 'GetStatement':return this.statement(tx,request.params);
          case 'SetFiscalData':return this.fiscal(tx,request.params);
          default:rpcFail(-32601,'Metod topilmadi');
        }
      });
      outcome=(result as any)?.rpc_error?{error:(result as any).rpc_error}:{result:json(result)};
    }catch(error:any){const code=error instanceof RpcError?error.code:error?.name==='ZodError'?-32602:error?.code==='P2002'?-31099:-32400;outcome={error:{code,message:{uz:error instanceof RpcError?error.message:'So‘rov bajarilmadi',ru:'Запрос не выполнен',en:'Request failed'},...(error instanceof RpcError&&error.data?{data:error.data}:{})}};}
    if(request&&outcome?.error?.code!==-32504){await this.db.paymentEvent.create({data:{providerId:typeof request.params?.id==='string'?request.params.id:null,method:request.method,payloadHash:bodyHash(request.params),outcome:json(outcome)}});}
    return {jsonrpc:'2.0',id:request?.id??null,...outcome};
  }
  private async order(tx:Tx,params:any){const p=parse(z.object({amount:z.number().int().positive().safe(),account:z.object({order_id:uuid}).strict()}).passthrough(),params);const order=await tx.paymentOrder.findUnique({where:{id:p.account.order_id}});if(!order)rpcFail(-31050,'Buyurtma topilmadi','order_id');await financialLock(tx,order.sanatoriumId);const current=await tx.paymentOrder.findUniqueOrThrow({where:{id:order.id}});if(current.amount!==BigInt(p.amount))rpcFail(-31001,'Summa noto‘g‘ri');return current;}
  private async checkPerform(tx:Tx,params:any){const order=await this.order(tx,params);if(await tx.tezcheckBill.findUnique({where:{orderId:order.id}}))rpcFail(-31008,'Buyurtma boshqa provayder orqali to‘lanmoqda');if(!['CREATED','PENDING'].includes(order.status))rpcFail(-31008,'Buyurtmani to‘lab bo‘lmaydi');if(order.bookingId){const b=await tx.booking.findUniqueOrThrow({where:{id:order.bookingId}});if(!['HOLD','PAYMENT_PENDING'].includes(b.status)||(b.status==='HOLD'&&b.holdExpiresAt!<=new Date()))rpcFail(-31008,'Bron muddati tugagan');}else{const invoice=await tx.invoice.findUniqueOrThrow({where:{id:order.invoiceId!}});if(invoice.status!=='UNPAID')rpcFail(-31008,'Invoice to‘lanmaydigan holatda');}return {allow:true};}
  async createTransaction(tx:Tx,params:any){const p=parse(z.object({id:providerId,time:z.number().int().positive().safe(),amount:z.number().int().positive().safe(),account:z.object({order_id:uuid}).strict()}).strict(),params);const order=await this.order(tx,p);await lock(tx,`provider:${p.id}`);
    const prior=await tx.providerTransaction.findUnique({where:{provider_providerId:{provider:'PAYME',providerId:p.id}}});if(prior){if(prior.orderId!==order.id||prior.amount!==BigInt(p.amount)||prior.providerTime!==BigInt(p.time))rpcFail(-31008,'Tranzaksiya ma’lumoti mos emas');if(prior.state<0)rpcFail(-31008,'Tranzaksiya bekor qilingan');if(prior.state===1&&Number(prior.providerTime)+PROVIDER_TIMEOUT<=Date.now()){await this.cancel(tx,p.id,4);return {rpc_error:{code:-31008,message:{uz:'Tranzaksiya muddati tugagan',ru:'Истек срок',en:'Expired'}}};}return {create_time:Number(prior.createTime),transaction:prior.id,state:prior.state};}
    await this.checkPerform(tx,p);if(p.time>Date.now()+300000||p.time+PROVIDER_TIMEOUT<=Date.now())rpcFail(-31008,'Tranzaksiya vaqti yaroqsiz');if(await tx.providerTransaction.findFirst({where:{orderId:order.id,state:{in:[1,2]}}}))rpcFail(-31099,'Buyurtma uchun faol tranzaksiya mavjud','order_id');
    const now=BigInt(Date.now());const transaction=await tx.providerTransaction.create({data:{providerId:p.id,orderId:order.id,amount:order.amount,providerTime:BigInt(p.time),createTime:now}});await tx.paymentOrder.update({where:{id:order.id},data:{status:'PENDING'}});
    if(order.bookingId){await tx.booking.update({where:{id:order.bookingId},data:{status:'PAYMENT_PENDING',providerExpiresAt:new Date(p.time+PROVIDER_TIMEOUT),version:{increment:1}}});await tx.roomAllocation.updateMany({where:{bookingId:order.bookingId,active:true},data:{kind:'PAYMENT_PENDING'}});await tx.bookingEvent.create({data:{bookingId:order.bookingId,status:'PAYMENT_PENDING'}});}
    return {create_time:Number(now),transaction:transaction.id,state:1};
  }
  private async transaction(tx:Tx,id:string,provider='PAYME'){const p=await tx.providerTransaction.findUnique({where:{provider_providerId:{provider,providerId:id}}});if(!p)rpcFail(-31003,'Tranzaksiya topilmadi');const order=await tx.paymentOrder.findUniqueOrThrow({where:{id:p.orderId}});await financialLock(tx,order.sanatoriumId);await lock(tx,provider==='PAYME'?`provider:${id}`:`provider:${provider}:${id}`);return {p:await tx.providerTransaction.findUniqueOrThrow({where:{id:p.id}}),order:await tx.paymentOrder.findUniqueOrThrow({where:{id:order.id}})};}
  async perform(tx:Tx,id:string,provider='PAYME',fee=0n){const {p,order}=await this.transaction(tx,id,provider);if(p.state===2)return {transaction:p.id,perform_time:Number(p.performTime),state:2};if(p.state!==1)rpcFail(-31008,'Tranzaksiya bajarib bo‘lmaydigan holatda');if(provider==='PAYME'&&Number(p.providerTime)+PROVIDER_TIMEOUT<=Date.now()){await this.cancel(tx,id,4);return {rpc_error:{code:-31008,message:{uz:'Tranzaksiya muddati tugagan',ru:'Истек срок',en:'Expired'}}};}if(fee<0n||fee>=order.amount)fail('PAYMENT_FEE_INVALID','Provayder komissiyasi noto‘g‘ri',422);
    const now=BigInt(Date.now());await tx.providerTransaction.update({where:{id:p.id},data:{state:2,performTime:now}});await tx.paymentOrder.update({where:{id:order.id},data:{status:'SUCCEEDED',paidAt:new Date()}});
    await post(tx,`payment:${p.id}`,'Provayder to‘lovi',[{account:'PSP_CLEARING',debit:order.amount-fee},...(fee>0n?[{account:'PROCESSING_EXPENSE',debit:fee}]:[]),{account:order.purpose==='BOOKING'?'SANATORIUM_PAYABLE':'DEFERRED_SERVICE_REVENUE',credit:order.amount}],order.sanatoriumId,order.bookingId??undefined);
    if(order.bookingId){const b=await tx.booking.findUniqueOrThrow({where:{id:order.bookingId}});const allocated=await tx.roomAllocation.count({where:{bookingId:b.id,active:true}});const needed=await tx.bookingItem.count({where:{bookingId:b.id}});const status=b.status==='PAYMENT_PENDING'&&allocated===needed&&needed>0?'CONFIRMED':'PAYMENT_EXCEPTION';await tx.booking.update({where:{id:b.id},data:{status,version:{increment:1}}});await tx.roomAllocation.updateMany({where:{bookingId:b.id,active:true},data:{kind:'BOOKING'}});await tx.bookingEvent.create({data:{bookingId:b.id,status}});
      if(status==='PAYMENT_EXCEPTION'){const refund=await tx.refundRequest.upsert({where:{bookingId:b.id},create:{bookingId:b.id,sanatoriumId:b.sanatoriumId,requestedBy:order.userId,amount:order.amount,reason:'To‘lov tasdiqlangan, inventar kafolati yo‘q'},update:{}});await emit(tx,'payment.exception',{booking_id:b.id,refund_id:refund.id,recipient_ids:await this.adminIds(tx)});}
    }else{const invoice=await tx.invoice.update({where:{id:order.invoiceId!},data:{status:'PAID'}});if(invoice.purpose==='SUBSCRIPTION'){const data=invoice.data as any;await tx.subscription.upsert({where:{sanatoriumId:invoice.sanatoriumId},create:{sanatoriumId:invoice.sanatoriumId,planId:data.plan_id,status:'ACTIVE',startsAt:invoice.startsAt,endsAt:invoice.endsAt,graceEndsAt:new Date(invoice.endsAt.getTime()+data.grace_days*86400000)},update:{status:'ACTIVE',startsAt:invoice.startsAt,endsAt:invoice.endsAt,graceEndsAt:new Date(invoice.endsAt.getTime()+data.grace_days*86400000)}});}}
    await emit(tx,'payment.succeeded',{recipient_ids:[order.userId],order_id:order.id,booking_id:order.bookingId});await audit(tx,null,'payment.succeeded',order.id,order.sanatoriumId,undefined,{provider_id:id,amount:order.amount});return {transaction:p.id,perform_time:Number(now),state:2};
  }
  private async adminIds(tx:Tx){return(await tx.user.findMany({where:{kind:'SUPERADMIN',status:'ACTIVE'},select:{id:true}})).map(u=>u.id);}
  async cancel(tx:Tx,id:string,reason:number){const {p,order}=await this.transaction(tx,id);if(p.state<0)return {transaction:p.id,cancel_time:Number(p.cancelTime),state:p.state};const now=BigInt(Date.now());
    if(p.state===2){if(!order.bookingId)rpcFail(-31007,'Xizmat invoicei bo‘yicha supportga murojaat qiling');const b=await tx.booking.findUniqueOrThrow({where:{id:order.bookingId}});let refund=await tx.refundRequest.findUnique({where:{bookingId:b.id}});if(b.status==='CHECKED_OUT'&&!refund)rpcFail(-31007,'Xizmat to‘liq ko‘rsatilgan');if(refund?.status==='REJECTED')rpcFail(-31007,'Qaytarish rad etilgan');
      if(!refund){refund=await tx.refundRequest.create({data:{bookingId:b.id,sanatoriumId:b.sanatoriumId,requestedBy:order.userId,amount:order.amount,status:'PROCESSING',reason:'Merchant provayder tomonidan bekor qildi'}});await refundReserve(tx,refund);}
      else if(refund.status==='REQUESTED'){await refundReserve(tx,refund);await tx.refundRequest.update({where:{id:refund.id},data:{status:'PROCESSING'}});}
      await post(tx,`refund:confirmed:${p.id}`,'Provayder refundni tasdiqladi',[{account:'REFUND_PAYABLE',debit:order.amount},{account:'PSP_CLEARING',credit:order.amount}],order.sanatoriumId,b.id);await tx.refundRequest.update({where:{id:refund.id},data:{status:'SUCCEEDED',completedAt:new Date()}});await tx.booking.update({where:{id:b.id},data:{status:'CANCELLED',version:{increment:1}}});await tx.roomAllocation.updateMany({where:{bookingId:b.id,active:true},data:{active:false}});await tx.bookingEvent.create({data:{bookingId:b.id,status:'CANCELLED',reason:'Provayder to‘liq refundni tasdiqladi'}});await emit(tx,'refund.succeeded',{recipient_ids:[order.userId],booking_id:b.id});
    }else{await tx.paymentOrder.update({where:{id:order.id},data:{status:'CANCELLED'}});if(order.bookingId){await tx.booking.update({where:{id:order.bookingId},data:{status:reason===4?'EXPIRED':'CANCELLED',version:{increment:1}}});await tx.roomAllocation.updateMany({where:{bookingId:order.bookingId,active:true},data:{active:false}});await tx.bookingEvent.create({data:{bookingId:order.bookingId,status:reason===4?'EXPIRED':'CANCELLED'}});}}
    const state=p.state===2?-2:-1;await tx.providerTransaction.update({where:{id:p.id},data:{state,reason,cancelTime:now}});await audit(tx,null,'payment.cancelled',order.id,order.sanatoriumId,undefined,{provider_id:id,reason,state});return {transaction:p.id,cancel_time:Number(now),state};
  }
  private async checkTransaction(tx:Tx,id:string):Promise<any>{const{p}=await this.transaction(tx,id);if(p.state===1&&Number(p.providerTime)+PROVIDER_TIMEOUT<=Date.now()){await this.cancel(tx,id,4);return this.checkTransaction(tx,id);}return {create_time:Number(p.createTime),perform_time:Number(p.performTime),cancel_time:Number(p.cancelTime),transaction:p.id,state:p.state,reason:p.reason};}
  private async statement(tx:Tx,params:any){const i=parse(z.object({from:z.number().int().nonnegative().safe(),to:z.number().int().nonnegative().safe()}).strict(),params);if(i.to<i.from||i.to-i.from>31*86400000)rpcFail(-32602,'Hisobot davri 31 kundan oshmasin');const rows=await tx.providerTransaction.findMany({where:{provider:'PAYME',providerTime:{gte:BigInt(i.from),lte:BigInt(i.to)}},orderBy:{providerTime:'asc'},take:10000});return {transactions:rows.map(p=>({id:p.providerId,time:Number(p.providerTime),amount:Number(p.amount),account:{order_id:p.orderId},create_time:Number(p.createTime),perform_time:Number(p.performTime),cancel_time:Number(p.cancelTime),transaction:p.id,state:p.state,reason:p.reason}))};}
  private async fiscal(tx:Tx,params:any){const i=parse(z.object({id:providerId,type:z.enum(['PERFORM','CANCEL']),fiscal_data:z.record(z.string(),z.unknown())}).strict(),params);const{p}=await this.transaction(tx,i.id);await tx.providerTransaction.update({where:{id:p.id},data:{fiscalData:json({...p.fiscalData as object,[i.type]:i.fiscal_data})}});return {success:true};}
  async expireProvider(){const rows=await this.db.providerTransaction.findMany({where:{provider:'PAYME',state:1,providerTime:{lte:BigInt(Date.now()-PROVIDER_TIMEOUT)}},take:100});for(const p of rows)await this.db.atomic(tx=>this.cancel(tx,p.providerId,4));}
}
