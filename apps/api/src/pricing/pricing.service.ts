import { Inject,Injectable } from '@nestjs/common';
import { z } from 'zod';
import { Db,lock,bodyHash,type Tx } from '../common/db';
import { fail,parse,uuid,json } from '../common/errors';
import { Actor,scope } from '../auth/permissions';
import { date,expireInitialHolds } from '../inventory/inventory.service';

export const quoteInput=z.object({sanatorium_id:uuid,check_in:date,check_out:date,items:z.array(z.object({room_type_id:uuid,rate_plan_id:uuid,adults:z.number().int().min(1).max(20),children_ages:z.array(z.number().int().min(0).max(17)).max(10).default([])}).strict()).min(1).max(10),discount_id:uuid.optional()}).strict();
export type QuoteInput=z.infer<typeof quoteInput>;
export function nights(checkIn:string,checkOut:string){
  const count=(Date.parse(checkOut)-Date.parse(checkIn))/86400000;
  if(!Number.isInteger(count)||count<1||count>90)fail('DATE_RANGE_INVALID','1–90 tun oralig‘ini tanlang',422);
  return Array.from({length:count},(_,i)=>new Date(Date.parse(checkIn)+i*86400000).toISOString().slice(0,10));
}
export async function saleReady(tx:Tx,sanatoriumId:string,manual=false){
  const s=await tx.sanatorium.findUnique({where:{id:sanatoriumId}});
  if(!s||s.status!=='ACTIVE'||(!manual&&!s.publicRevisionId))fail('NOT_FOUND','Sanatoriya mavjud emas',404);
  if(!manual&&!s.paymentReady)fail('ONLINE_BOOKING_UNAVAILABLE','Onlayn bron hozir mavjud emas');
  if(!manual&&s.subscriptionRequired){const sub=await tx.subscription.findUnique({where:{sanatoriumId}});if(!sub||!['ACTIVE','TRIAL','PAST_DUE'].includes(sub.status)||sub.graceEndsAt<new Date())fail('ONLINE_BOOKING_UNAVAILABLE','Onlayn bron vaqtincha yopilgan');}
  return s;
}
export async function availableRooms(tx:Tx,sanatoriumId:string,roomTypeId:string,checkIn:Date,checkOut:Date){
  const rooms=await tx.room.findMany({where:{sanatoriumId,roomTypeId,active:true},orderBy:{id:'asc'}});
  const busy=await tx.roomAllocation.findMany({where:{sanatoriumId,active:true,checkIn:{lt:checkOut},checkOut:{gt:checkIn}},select:{roomId:true}});
  const occupied=new Set(busy.map(b=>b.roomId));return rooms.filter(r=>!occupied.has(r.id));
}
@Injectable()
export class PricingService {
  constructor(@Inject(Db) readonly db:Db) {}
  async quote(actor:Actor,body:unknown,manual=false){
    const i=parse(quoteInput,body);if(manual)scope(actor,i.sanatorium_id,'bookings.create_manual');
    const today=new Date().toLocaleDateString('en-CA',{timeZone:'Asia/Tashkent'});if(i.check_in<today)fail('PAST_DATE','Kelish sanasi o‘tgan',422);
    return this.db.atomic(tx=>this.createQuote(tx,actor,i,manual));
  }
  async createQuote(tx:Tx,actor:Actor,i:QuoteInput,manual=false){
      const today=new Date().toLocaleDateString('en-CA',{timeZone:'Asia/Tashkent'});if(i.check_in<today)fail('PAST_DATE','Kelish sanasi o‘tgan',422);
      await lock(tx,`inventory:${i.sanatorium_id}`);await expireInitialHolds(tx,i.sanatorium_id);
      const s=await saleReady(tx,i.sanatorium_id,manual);const days=nights(i.check_in,i.check_out);const price=await this.calculate(tx,i,days);
      const demand=new Map<string,number>();for(const item of i.items)demand.set(item.room_type_id,(demand.get(item.room_type_id)??0)+1);
      for(const[type,count]of demand)if((await availableRooms(tx,i.sanatorium_id,type,new Date(i.check_in),new Date(i.check_out))).length<count)fail('AVAILABILITY_CHANGED','Butun davr uchun mos xona qolmadi');
      const data=json({request:i,nights:days.length,...price});
      const q=await tx.quote.create({data:{userId:actor.id,sanatoriumId:i.sanatorium_id,bodyHash:bodyHash(i),pricingVersion:s.pricingVersion,data,amount:BigInt(price.total_amount),expiresAt:new Date(Date.now()+10*60000)}});
      return {...q,data};
  }
  async calculate(tx:Tx,i:QuoteInput,days=nights(i.check_in,i.check_out)){
    const breakdown:any[]=[];const policies:any[]=[];let subtotal=0n;
    for(const item of i.items){
      const type=await tx.roomType.findFirst({where:{id:item.room_type_id,sanatoriumId:i.sanatorium_id,active:true}});
      const rate=await tx.ratePlan.findFirst({where:{id:item.rate_plan_id,roomTypeId:item.room_type_id,sanatoriumId:i.sanatorium_id,active:true}});
      if(!type||!rate)fail('RATE_UNAVAILABLE','Xona turi yoki tarif mavjud emas',422);
      if(item.adults>type.maxAdults||item.children_ages.length>type.maxChildren||item.adults+item.children_ages.length>type.maxGuests)fail('CAPACITY_EXCEEDED','Mehmonlar xona sig‘imidan ko‘p',422);
      if(days.length<rate.minNights||days.length>rate.maxNights)fail('STAY_LENGTH_INVALID',`Tarif ${rate.minNights}–${rate.maxNights} tun uchun`,422);
      const policy=await tx.refundPolicy.findUnique({where:{id:rate.policyId}});if(!policy||!policy.active)fail('POLICY_UNAVAILABLE','Qaytarish sharti mavjud emas');
      policies.push({id:policy.id,name:policy.name,kind:policy.kind,cutoff_hours:policy.cutoffHours,version:policy.version});
      const overrides=await tx.dailyRate.findMany({where:{ratePlanId:rate.id,date:{gte:new Date(i.check_in),lt:new Date(i.check_out)}}});
      const childRules=rate.childRules as {min_age:number;max_age:number;amount:string}[];const daily:any[]=[];let itemAmount=0n;
      for(const day of days){
        const override=overrides.find(o=>o.date.toISOString().slice(0,10)===day);if(override?.closed)fail('SALE_CLOSED','Tanlangan kun sotuvga yopilgan');
        const base=override?.amount??rate.baseAmount;let amount=base;
        if(rate.mode==='PERSON'){amount=base*BigInt(item.adults);for(const age of item.children_ages){const rule=childRules.find(r=>age>=r.min_age&&age<=r.max_age);if(!rule)fail('CHILD_RATE_UNAVAILABLE','Bola yoshi uchun tarif kiritilmagan',422);amount+=BigInt(rule.amount);}}
        itemAmount+=amount;daily.push({date:day,base_amount:base.toString(),amount:amount.toString()});
      }
      subtotal+=itemAmount;breakdown.push({...item,room_type_name:type.name,rate_name:rate.name,rate_version:rate.version,mode:rate.mode,package:rate.packageDetails,daily,amount:itemAmount.toString()});
    }
    let discount=0n;let discountInfo:any=null;
    if(i.discount_id){const d=await tx.discount.findFirst({where:{id:i.discount_id,sanatoriumId:i.sanatorium_id,active:true,startsAt:{lte:new Date()},endsAt:{gt:new Date()}}});if(!d||subtotal<d.minAmount)fail('DISCOUNT_UNAVAILABLE','Chegirma ushbu bron uchun qo‘llanmaydi',422);discount=d.kind==='PERCENT'?subtotal*d.value/100n:d.value;if(d.maxAmount!==null&&discount>d.maxAmount)discount=d.maxAmount;if(discount>subtotal)discount=subtotal;discountInfo={id:d.id,name:d.name,amount:discount.toString()};}
    const total=subtotal-discount;if(total<=0n||total>9_000_000_000_000_000_000n)fail('TOTAL_INVALID','Hisoblangan summa qo‘llab-quvvatlanmaydi',422);
    return {items:breakdown,policies:[...new Map(policies.map(p=>[p.id,p])).values()],subtotal_amount:subtotal.toString(),discount:discountInfo,total_amount:total.toString(),currency:'UZS',minor_unit:'tiyin'};
  }
}
