import { Inject,Injectable } from '@nestjs/common';
import { Db,lock,type Tx } from '../common/db';
import { CONFIG,type Config } from '../common/config';

@Injectable()
export class OutboxService{
  constructor(@Inject(Db) readonly db:Db,@Inject(CONFIG) readonly config:Config){}
  async claim(){return this.db.atomic(async tx=>{const rows=await tx.$queryRaw<{id:string}[]>`SELECT id FROM "OutboxEvent" WHERE "processedAt" IS NULL AND "availableAt"<=now() AND ("leaseUntil" IS NULL OR "leaseUntil"<=now()) ORDER BY "createdAt" LIMIT 100 FOR UPDATE SKIP LOCKED`;const leaseUntil=new Date(Date.now()+60000);await tx.outboxEvent.updateMany({where:{id:{in:rows.map(r=>r.id)}},data:{leaseUntil}});return rows.map(r=>r.id);});}
  async process(id:string){try{await this.db.atomic(async tx=>{await lock(tx,`outbox:${id}`);const event=await tx.outboxEvent.findUniqueOrThrow({where:{id}});if(event.processedAt)return;const payload=event.payload as any;let ids:string[]=payload.recipient_ids??[];
      if(!ids.length&&['payment.exception','refund.requested'].includes(event.topic))ids=(await tx.user.findMany({where:{kind:'SUPERADMIN',status:'ACTIVE'},select:{id:true}})).map(u=>u.id);
      if(payload.booking_id){const b=await tx.booking.findUnique({where:{id:payload.booking_id}});if(b){const staff=await tx.membership.findMany({where:{sanatoriumId:b.sanatoriumId,status:'ACTIVE'},select:{userId:true}});ids.push(...staff.map(s=>s.userId));}}
      for(const userId of new Set(ids)){const exists=await tx.user.findUnique({where:{id:userId}});if(!exists)continue;await tx.notificationDelivery.upsert({where:{eventId_userId_channel:{eventId:event.id,userId,channel:'IN_APP'}},create:{eventId:event.id,userId,channel:'IN_APP',payload:{topic:event.topic,...payload},status:'SENT',sentAt:new Date()},update:{}});
        if(this.config.PUSH_ADAPTER==='http'&&exists.kind==='CUSTOMER')await tx.notificationDelivery.upsert({where:{eventId_userId_channel:{eventId:event.id,userId,channel:'PUSH'}},create:{eventId:event.id,userId,channel:'PUSH',payload:{topic:event.topic,booking_id:payload.booking_id??null}},update:{}});
      }
      await tx.outboxEvent.update({where:{id},data:{processedAt:new Date(),leaseUntil:null,lastError:null}});
    });}catch{await this.db.outboxEvent.update({where:{id},data:{attempts:{increment:1},leaseUntil:null,availableAt:new Date(Date.now()+30000),lastError:'DISPATCH_FAILED'}});throw new Error('Outbox dispatch failed');}}
  async push(){if(this.config.PUSH_ADAPTER!=='http')return;const rows=await this.db.notificationDelivery.findMany({where:{channel:'PUSH',status:'PENDING'},take:100});for(const row of rows){try{const res=await fetch(this.config.PUSH_HTTP_URL,{method:'POST',signal:AbortSignal.timeout(8000),headers:{'Content-Type':'application/json',Authorization:`Bearer ${this.config.PUSH_HTTP_TOKEN}`,'Idempotency-Key':row.id},body:JSON.stringify({user_id:row.userId,event:row.payload})});if(!res.ok)throw new Error();await this.db.notificationDelivery.update({where:{id:row.id},data:{status:'SENT',sentAt:new Date()}});}catch{/* Durable PENDING delivery remains available to the next worker pass. */}}}
  async tick(){const ids=await this.claim();for(const id of ids)try{await this.process(id);}catch{/* A persisted retry is scheduled by process. */}await this.push();return ids.length;}
}
