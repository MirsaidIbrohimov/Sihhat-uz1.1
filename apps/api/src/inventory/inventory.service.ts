import { Inject, Injectable } from '@nestjs/common';
import { z } from 'zod';
import { Db, audit, lock, type Tx } from '../common/db';
import { fail, parse, uuid, positiveMoney, money, version, reason } from '../common/errors';
import { Actor, scope, requirePlatform } from '../auth/permissions';

export const date = z.iso.date();
export const roomTypeInput = z.object({ sanatorium_id: uuid, name: z.string().min(2).max(120), max_guests: z.number().int().min(1).max(20), max_adults: z.number().int().min(1).max(20), max_children: z.number().int().min(0).max(10), data: z.record(z.string(),z.unknown()).default({}) }).strict().refine(i=>i.max_adults<=i.max_guests && i.max_children<=i.max_guests);
export const childRule = z.object({ min_age: z.number().int().min(0).max(17), max_age: z.number().int().min(0).max(17), amount: money }).strict().refine(i=>i.min_age<=i.max_age);
export const rateInput = z.object({ sanatorium_id: uuid, room_type_id: uuid, name: z.string().min(2).max(120), mode: z.enum(['ROOM','PERSON']), base_amount: positiveMoney, child_rules: z.array(childRule).max(18).default([]), min_nights: z.number().int().min(1).max(90).default(1), max_nights: z.number().int().min(1).max(90).default(90), package_details: z.record(z.string(),z.unknown()).default({}), policy_id: uuid }).strict().refine(i=>i.min_nights<=i.max_nights);
export async function expireInitialHolds(tx: Tx, sanatoriumId?: string) {
  const holds = await tx.booking.findMany({ where: { ...(sanatoriumId ? { sanatoriumId } : {}), status:'HOLD', holdExpiresAt:{lte:new Date()} }, select:{id:true,sanatoriumId:true} });
  for (const b of holds) {
    await lock(tx, `inventory:${b.sanatoriumId}`);
    const changed = await tx.booking.updateMany({ where:{id:b.id,status:'HOLD',holdExpiresAt:{lte:new Date()}}, data:{status:'EXPIRED',version:{increment:1}} });
    if (changed.count) {
      await tx.roomAllocation.updateMany({ where:{bookingId:b.id,active:true},data:{active:false} });
      await tx.bookingEvent.create({data:{bookingId:b.id,status:'EXPIRED',reason:'Dastlabki hold muddati tugadi'}});
    }
  }
}
@Injectable()
export class InventoryService {
  constructor(@Inject(Db) readonly db:Db) {}
  async list(actor:Actor,id:string) {
    parse(uuid,id);scope(actor,id,'bookings.read');
    const [types,rooms,rates,daily_rates,discounts,allocations,policies]=await Promise.all([
      this.db.roomType.findMany({where:{sanatoriumId:id}}),this.db.room.findMany({where:{sanatoriumId:id},orderBy:{code:'asc'}}),
      this.db.ratePlan.findMany({where:{sanatoriumId:id}}),this.db.dailyRate.findMany({where:{sanatoriumId:id},orderBy:{date:'asc'},take:500}),
      this.db.discount.findMany({where:{sanatoriumId:id}}),this.db.roomAllocation.findMany({where:{sanatoriumId:id,active:true},take:500}),this.db.refundPolicy.findMany({where:{active:true}}),
    ]);return {types,rooms,rates,daily_rates,discounts,allocations,policies};
  }
  async roomType(actor:Actor,body:unknown) {
    const i=parse(roomTypeInput,body);scope(actor,i.sanatorium_id,'inventory.manage');
    return this.db.atomic(async tx=>{await lock(tx,`inventory:${i.sanatorium_id}`);
      const r=await tx.roomType.create({data:{sanatoriumId:i.sanatorium_id,name:i.name,maxGuests:i.max_guests,maxAdults:i.max_adults,maxChildren:i.max_children,data:i.data as any}});
      await audit(tx,actor.id,'inventory.type_created',r.id,i.sanatorium_id);return r;});
  }
  async room(actor:Actor,body:unknown) {
    const i=parse(z.object({sanatorium_id:uuid,room_type_id:uuid,code:z.string().trim().min(1).max(40)}).strict(),body);scope(actor,i.sanatorium_id,'inventory.manage');
    return this.db.atomic(async tx=>{await lock(tx,`inventory:${i.sanatorium_id}`);
      if(!await tx.roomType.findFirst({where:{id:i.room_type_id,sanatoriumId:i.sanatorium_id,active:true}}))fail('NOT_FOUND','Xona turi topilmadi',404);
      const r=await tx.room.create({data:{sanatoriumId:i.sanatorium_id,roomTypeId:i.room_type_id,code:i.code}});await audit(tx,actor.id,'inventory.room_created',r.id,i.sanatorium_id);return r;});
  }
  async policy(actor:Actor,body:unknown) {
    requirePlatform(actor,'billing.manage');const i=parse(z.object({name:z.string().min(2).max(150),kind:z.enum(['FULL_BEFORE_CUTOFF','NON_REFUNDABLE']),cutoff_hours:z.number().int().min(0).max(720)}).strict(),body);
    return this.db.atomic(async tx=>{const p=await tx.refundPolicy.create({data:{name:i.name,kind:i.kind,cutoffHours:i.cutoff_hours}});await audit(tx,actor.id,'policy.created',p.id,undefined,undefined,i);return p;});
  }
  async rate(actor:Actor,body:unknown) {
    const i=parse(rateInput,body);scope(actor,i.sanatorium_id,'pricing.manage');
    const ages=new Set<number>();for(const r of i.child_rules)for(let a=r.min_age;a<=r.max_age;a++){if(ages.has(a))fail('AGE_RULE_OVERLAP','Bolalar yosh oralig‘i kesishmasin',422);ages.add(a);}
    return this.db.atomic(async tx=>{await lock(tx,`inventory:${i.sanatorium_id}`);
      if(!await tx.roomType.findFirst({where:{id:i.room_type_id,sanatoriumId:i.sanatorium_id,active:true}})||!await tx.refundPolicy.findFirst({where:{id:i.policy_id,active:true}}))fail('NOT_FOUND','Xona turi yoki policy topilmadi',404);
      const r=await tx.ratePlan.create({data:{sanatoriumId:i.sanatorium_id,roomTypeId:i.room_type_id,name:i.name,mode:i.mode,baseAmount:BigInt(i.base_amount),childRules:i.child_rules, minNights:i.min_nights,maxNights:i.max_nights,packageDetails:i.package_details as any,policyId:i.policy_id}});
      await tx.sanatorium.update({where:{id:i.sanatorium_id},data:{pricingVersion:{increment:1}}});await audit(tx,actor.id,'pricing.rate_created',r.id,i.sanatorium_id);return r;});
  }
  async updateRate(actor:Actor,id:string,body:unknown) {
    parse(uuid,id);const i=parse(z.object({version,base_amount:positiveMoney,active:z.boolean().optional()}).strict(),body);
    return this.db.atomic(async tx=>{const r=await tx.ratePlan.findUnique({where:{id}});if(!r)fail('NOT_FOUND','Tarif topilmadi',404);scope(actor,r.sanatoriumId,'pricing.manage');await lock(tx,`inventory:${r.sanatoriumId}`);
      const changed=await tx.ratePlan.updateMany({where:{id,version:i.version},data:{baseAmount:BigInt(i.base_amount),active:i.active,version:{increment:1}}});if(!changed.count)fail('VERSION_CONFLICT','Tarif o‘zgargan');
      await tx.sanatorium.update({where:{id:r.sanatoriumId},data:{pricingVersion:{increment:1}}});await audit(tx,actor.id,'pricing.rate_updated',id,r.sanatoriumId,{amount:r.baseAmount},{amount:i.base_amount});return tx.ratePlan.findUniqueOrThrow({where:{id}});});
  }
  async daily(actor:Actor,body:unknown) {
    const i=parse(z.object({sanatorium_id:uuid,rate_plan_id:uuid,dates:z.array(z.object({date,amount:positiveMoney,closed:z.boolean().default(false)}).strict()).min(1).max(366)}).strict(),body);scope(actor,i.sanatorium_id,'pricing.manage');
    const today=new Date().toLocaleDateString('en-CA',{timeZone:'Asia/Tashkent'});if(i.dates.some(d=>d.date<today))fail('PAST_DATE','O‘tgan sana narxi o‘zgartirilmaydi',422);
    return this.db.atomic(async tx=>{await lock(tx,`inventory:${i.sanatorium_id}`);if(!await tx.ratePlan.findFirst({where:{id:i.rate_plan_id,sanatoriumId:i.sanatorium_id}}))fail('NOT_FOUND','Tarif topilmadi',404);
      for(const d of i.dates)await tx.dailyRate.upsert({where:{ratePlanId_date:{ratePlanId:i.rate_plan_id,date:new Date(`${d.date}T00:00:00Z`)}},create:{sanatoriumId:i.sanatorium_id,ratePlanId:i.rate_plan_id,date:new Date(`${d.date}T00:00:00Z`),amount:BigInt(d.amount),closed:d.closed},update:{amount:BigInt(d.amount),closed:d.closed}});
      await tx.sanatorium.update({where:{id:i.sanatorium_id},data:{pricingVersion:{increment:1}}});await audit(tx,actor.id,'pricing.daily_updated',i.rate_plan_id,i.sanatorium_id,undefined,i.dates);return {success:true};});
  }
  async discount(actor:Actor,body:unknown) {
    const i=parse(z.object({sanatorium_id:uuid,name:z.string().min(2).max(120),kind:z.enum(['PERCENT','FIXED']),value:positiveMoney,max_amount:positiveMoney.optional(),min_amount:money.default('0'),starts_at:z.iso.datetime(),ends_at:z.iso.datetime()}).strict(),body);scope(actor,i.sanatorium_id,'discounts.manage');
    if(i.ends_at<=i.starts_at||(i.kind==='PERCENT'&&BigInt(i.value)>100n))fail('DISCOUNT_INVALID','Chegirma shartlarini tekshiring',422);
    return this.db.atomic(async tx=>{await lock(tx,`inventory:${i.sanatorium_id}`);const r=await tx.discount.create({data:{sanatoriumId:i.sanatorium_id,name:i.name,kind:i.kind,value:BigInt(i.value),minAmount:BigInt(i.min_amount),maxAmount:i.max_amount?BigInt(i.max_amount):null,startsAt:new Date(i.starts_at),endsAt:new Date(i.ends_at)}});await tx.sanatorium.update({where:{id:i.sanatorium_id},data:{pricingVersion:{increment:1}}});await audit(tx,actor.id,'pricing.discount_created',r.id,i.sanatorium_id);return r;});
  }
  async block(actor:Actor,body:unknown) {
    const i=parse(z.object({sanatorium_id:uuid,room_id:uuid,check_in:date,check_out:date,reason}).strict(),body);scope(actor,i.sanatorium_id,'inventory.manage');if(i.check_out<=i.check_in)fail('DATE_RANGE_INVALID','Ketish sanasi kelishdan keyin bo‘lsin',422);
    return this.db.atomic(async tx=>{await lock(tx,`inventory:${i.sanatorium_id}`);await expireInitialHolds(tx,i.sanatorium_id);
      if(!await tx.room.findFirst({where:{id:i.room_id,sanatoriumId:i.sanatorium_id}}))fail('NOT_FOUND','Xona topilmadi',404);
      const checkIn=new Date(i.check_in),checkOut=new Date(i.check_out);if(await tx.roomAllocation.findFirst({where:{roomId:i.room_id,active:true,checkIn:{lt:checkOut},checkOut:{gt:checkIn}}}))fail('AVAILABILITY_CHANGED','Xona bu davrda band');
      const r=await tx.roomAllocation.create({data:{sanatoriumId:i.sanatorium_id,roomId:i.room_id,checkIn,checkOut,kind:'MAINTENANCE',reason:i.reason}});await audit(tx,actor.id,'inventory.maintenance_created',r.id,i.sanatorium_id);return r;});
  }
  async unblock(actor:Actor,id:string,body:unknown) {
    parse(uuid,id);const i=parse(z.object({reason}).strict(),body);return this.db.atomic(async tx=>{const r=await tx.roomAllocation.findUnique({where:{id}});if(!r||r.kind!=='MAINTENANCE')fail('NOT_FOUND','Ta’mir bloki topilmadi',404);scope(actor,r.sanatoriumId,'inventory.manage');await lock(tx,`inventory:${r.sanatoriumId}`);await tx.roomAllocation.update({where:{id},data:{active:false}});await audit(tx,actor.id,'inventory.maintenance_released',id,r.sanatoriumId,undefined,i);return {success:true};});
  }
}
