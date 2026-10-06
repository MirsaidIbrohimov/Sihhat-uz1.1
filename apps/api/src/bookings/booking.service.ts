import { Inject,Injectable } from '@nestjs/common';
import { z } from 'zod';
import { randomBytes } from 'node:crypto';
import { Db,audit,emit,lock,type Tx } from '../common/db';
import { fail,parse,uuid,version,reason,pageQuery,paged,json,money } from '../common/errors';
import { CONFIG,type Config } from '../common/config';
import { Actor,scope,tenantIds } from '../auth/permissions';
import { phoneSchema } from '../auth/auth.service';
import { PricingService,quoteInput,saleReady,availableRooms } from '../pricing/pricing.service';
import { expireInitialHolds } from '../inventory/inventory.service';

export const guestInput=z.object({name:z.string().trim().min(2).max(120),phone:phoneSchema}).strict();
export const holdInput=z.object({quote_id:uuid,accepted_policy_versions:z.array(uuid).min(1).max(10),guest:guestInput}).strict();
@Injectable()
export class BookingService {
  constructor(@Inject(Db) readonly db:Db,@Inject(PricingService) readonly pricing:PricingService,@Inject(CONFIG) readonly config:Config){}
  async hold(actor:Actor,body:unknown,key:string|undefined){const i=parse(holdInput,body);return this.db.idempotent(actor.id,'booking.hold',key,i,tx=>this.allocate(tx,actor,i,false));}
  async allocate(tx:Tx,actor:Actor,i:z.infer<typeof holdInput>,manual:boolean,source='APP'){
    const q=await tx.quote.findUnique({where:{id:i.quote_id}});if(!q||q.userId!==actor.id)fail('NOT_FOUND','Narx taklifi topilmadi',404);
    await lock(tx,`inventory:${q.sanatoriumId}`);await expireInitialHolds(tx,q.sanatoriumId);const s=await saleReady(tx,q.sanatoriumId,manual);
    const snapshot=q.data as any;
    if(q.expiresAt<=new Date()||s.pricingVersion!==q.pricingVersion)fail('PRICE_CHANGED','Narx taklifi eskirgan. Yangisini oling');
    const accepted=[...new Set(i.accepted_policy_versions)].sort();const expected=snapshot.policies.map((p:any)=>p.id).sort();if(JSON.stringify(accepted)!==JSON.stringify(expected))fail('POLICY_NOT_ACCEPTED','Barcha qaytarish shartlarini qabul qiling',422);
    if(await tx.booking.findUnique({where:{quoteId:q.id}}))fail('QUOTE_ALREADY_USED','Bu taklif asosida bron yaratilgan');
    if(!manual&&await tx.booking.count({where:{userId:actor.id,status:{in:['HOLD','PAYMENT_PENDING']}}})>=3)fail('HOLD_LIMIT','Avval mavjud to‘lovsiz bronlarni yakunlang',429);
    const req=parse(quoteInput,snapshot.request);const picked:any[]=[];const used=new Set<string>();
    for(const item of req.items){const rooms=await availableRooms(tx,s.id,item.room_type_id,new Date(req.check_in),new Date(req.check_out));const room=rooms.find(r=>!used.has(r.id));if(!room)fail('AVAILABILITY_CHANGED','Tanlangan xonalardan biri butun davr uchun band');used.add(room.id);picked.push(room);}
    const booking=await tx.booking.create({data:{reference:`SH-${randomBytes(6).toString('hex').toUpperCase()}`,sanatoriumId:s.id,userId:manual?null:actor.id,quoteId:q.id,status:manual?'CONFIRMED':'HOLD',source,checkIn:new Date(req.check_in),checkOut:new Date(req.check_out),amount:q.amount,snapshot:json(q.data),guest:i.guest,holdExpiresAt:manual?null:new Date(Date.now()+this.config.HOLD_MINUTES*60000)}});
    // Allocate the discount to items, with the final item retaining the exact remainder.
    let remaining=q.amount;const subtotal=BigInt(snapshot.subtotal_amount);
    for(let index=0;index<req.items.length;index++){const item=req.items[index];const amount=index===req.items.length-1?remaining:BigInt(snapshot.items[index].amount)*q.amount/subtotal;remaining-=amount;
      await tx.bookingItem.create({data:{sanatoriumId:s.id,bookingId:booking.id,roomId:picked[index].id,roomTypeId:item.room_type_id,ratePlanId:item.rate_plan_id,adults:item.adults,childrenAges:item.children_ages,amount}});
      await tx.roomAllocation.create({data:{sanatoriumId:s.id,bookingId:booking.id,roomId:picked[index].id,checkIn:booking.checkIn,checkOut:booking.checkOut,kind:manual?'BOOKING':'HOLD'}});
    }
    await tx.bookingEvent.create({data:{bookingId:booking.id,actorId:actor.id,status:booking.status}});await audit(tx,actor.id,manual?'booking.manual_created':'booking.hold_created',booking.id,s.id);
    await emit(tx,'booking.created',{booking_id:booking.id,recipient_ids:[actor.id]});return json(booking);
  }
  async manual(actor:Actor,body:unknown,key:string|undefined){
    const i=parse(z.object({quote:quoteInput,guest:guestInput,source:z.enum(['PHONE','WALK_IN','PARTNER_MANUAL']),accepted_policy_versions:z.array(uuid).min(1),guaranteed:z.literal(true),quoted_amount:money.optional()}).strict(),body);
    scope(actor,i.quote.sanatorium_id,'bookings.create_manual');scope(actor,i.quote.sanatorium_id,'bookings.guarantee');
    return this.db.idempotent(actor.id,'booking.manual',key,i,async tx=>{const q=await this.pricing.createQuote(tx,actor,i.quote,true);if(i.quoted_amount!==undefined&&q.amount!==BigInt(i.quoted_amount))fail('PRICE_CHANGED','Narx o‘zgargan. Hisobni qayta oling.');return this.allocate(tx,actor,{quote_id:q.id,guest:i.guest,accepted_policy_versions:i.accepted_policy_versions},true,i.source);});
  }
  async get(actor:Actor,id:string){parse(uuid,id);const b=await this.db.booking.findUnique({where:{id}});if(!b)fail('NOT_FOUND','Bron topilmadi',404);if(actor.kind==='CUSTOMER'){if(b.userId!==actor.id)fail('NOT_FOUND','Bron topilmadi',404);}else scope(actor,b.sanatoriumId,'bookings.read');
    const [items,events,payment,refund,offline]=await Promise.all([this.db.bookingItem.findMany({where:{bookingId:id}}),this.db.bookingEvent.findMany({where:{bookingId:id},orderBy:{createdAt:'asc'}}),this.db.paymentOrder.findUnique({where:{bookingId:id}}),this.db.refundRequest.findUnique({where:{bookingId:id}}),this.db.offlinePayment.findMany({where:{bookingId:id}})]);
    return {...b,items,events,payment,refund,offline_payments:offline};
  }
  async list(actor:Actor,query:unknown){const i=parse(pageQuery.extend({sanatorium_id:uuid.optional(),status:z.string().max(30).optional()}).strict(),query);if(i.sanatorium_id&&actor.kind!=='CUSTOMER')scope(actor,i.sanatorium_id,'bookings.read');const ids=tenantIds(actor,'bookings.read');const where:any=actor.kind==='CUSTOMER'?{userId:actor.id}:{...(ids?{sanatoriumId:{in:ids}}:{})};if(i.sanatorium_id)where.sanatoriumId=i.sanatorium_id;if(i.status)where.status=i.status;
    if (actor.kind === 'CUSTOMER') {
      const hidden = await this.db.$queryRaw<{ id: string }[]>`
        SELECT b.id FROM "Booking" b LEFT JOIN "PaymentOrder" p ON p."bookingId" = b.id
        WHERE b."userId" = ${actor.id}::uuid AND b."createdAt" <= ${new Date(Date.now() - 2 * 3600000)}
          AND b.status IN ('HOLD', 'PAYMENT_PENDING', 'EXPIRED', 'CANCELLED')
          AND COALESCE(p.status, 'CREATED') NOT IN ('SUCCEEDED', 'REFUNDED')
          AND NOT EXISTS (SELECT 1 FROM "ProviderTransaction" t WHERE t."orderId" = p.id AND t.state = 2)`;
      // Hide unpaid history only. Provider polling, inventory, ledger and staff history retain the records.
      where.NOT = { id: { in: hidden.map(b => b.id) }, status: { in: ['HOLD', 'PAYMENT_PENDING', 'EXPIRED', 'CANCELLED'] } };
    }
    const[data,total]=await Promise.all([this.db.booking.findMany({where,take:i.limit,skip:(i.page-1)*i.limit,orderBy:{createdAt:'desc'}}),this.db.booking.count({where})]);return paged(data,total,i.page,i.limit);}
  async transition(actor:Actor,id:string,target:'CHECKED_IN'|'CHECKED_OUT'|'NO_SHOW',body:unknown){parse(uuid,id);const i=parse(z.object({version,reason:reason.optional()}).strict(),body);
    return this.db.atomic(async tx=>{const b=await tx.booking.findUnique({where:{id}});if(!b)fail('NOT_FOUND','Bron topilmadi',404);scope(actor,b.sanatoriumId,target==='CHECKED_IN'?'bookings.check_in':'bookings.check_out');await lock(tx,`inventory:${b.sanatoriumId}`);
      const current=await tx.booking.findUniqueOrThrow({where:{id}});const from=target==='CHECKED_OUT'?'CHECKED_IN':'CONFIRMED';if(current.version!==i.version||current.status!==from)fail('STATE_CONFLICT','Bron holati o‘zgargan');
      if(target==='NO_SHOW'&&!i.reason)fail('REASON_REQUIRED','Sababni yozing',422);
      const changed=await tx.booking.update({where:{id},data:{status:target,version:{increment:1}}});if(target==='NO_SHOW')await tx.roomAllocation.updateMany({where:{bookingId:id,active:true},data:{active:false}});
      await tx.bookingEvent.create({data:{bookingId:id,actorId:actor.id,status:target,reason:i.reason}});await audit(tx,actor.id,`booking.${target.toLowerCase()}`,id,b.sanatoriumId);await emit(tx,`booking.${target.toLowerCase()}`,{booking_id:id,recipient_ids:b.userId?[b.userId]:[]});return changed;});
  }
  async move(actor:Actor,id:string,body:unknown){parse(uuid,id);const i=parse(z.object({item_id:uuid,room_id:uuid,version,reason}).strict(),body);
    return this.db.atomic(async tx=>{const b=await tx.booking.findUnique({where:{id}});if(!b)fail('NOT_FOUND','Bron topilmadi',404);scope(actor,b.sanatoriumId,'inventory.manage');await lock(tx,`inventory:${b.sanatoriumId}`);const current=await tx.booking.findUniqueOrThrow({where:{id}});if(current.version!==i.version||!['CONFIRMED','CHECKED_IN'].includes(current.status))fail('STATE_CONFLICT','Bron ko‘chirib bo‘lmaydigan holatda');
      const item=await tx.bookingItem.findFirst({where:{id:i.item_id,bookingId:id}});if(!item)fail('NOT_FOUND','Bron xonasi topilmadi',404);const room=await tx.room.findFirst({where:{id:i.room_id,sanatoriumId:b.sanatoriumId,roomTypeId:item.roomTypeId,active:true}});if(!room)fail('ROOM_INCOMPATIBLE','Mos xona tanlang',422);
      if(await tx.roomAllocation.findFirst({where:{roomId:room.id,active:true,checkIn:{lt:b.checkOut},checkOut:{gt:b.checkIn},NOT:{bookingId:id}}}))fail('AVAILABILITY_CHANGED','Yangi xona band');
      if(await tx.bookingItem.findFirst({where:{bookingId:id,roomId:room.id,NOT:{id:item.id}}}))fail('ROOM_INCOMPATIBLE','Xona shu bronning boshqa itemida',422);
      await tx.roomAllocation.updateMany({where:{bookingId:id,roomId:item.roomId,active:true},data:{active:false}});await tx.bookingItem.update({where:{id:item.id},data:{roomId:room.id}});await tx.roomAllocation.create({data:{sanatoriumId:b.sanatoriumId,bookingId:id,roomId:room.id,checkIn:b.checkIn,checkOut:b.checkOut,kind:'BOOKING'}});await tx.booking.update({where:{id},data:{version:{increment:1}}});await audit(tx,actor.id,'booking.room_moved',id,b.sanatoriumId,{room:item.roomId},{room:room.id,reason:i.reason});return {success:true};});
  }
}
