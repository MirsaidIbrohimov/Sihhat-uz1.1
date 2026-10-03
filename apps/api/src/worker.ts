import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { Queue,Worker } from 'bullmq';
import { AppModule } from './app';
import { CONFIG,type Config } from './common/config';
import { Db } from './common/db';
import { OutboxService } from './outbox/outbox.service';
import { PaymentService } from './payments/payment.service';
import { BillingService } from './billing/billing.service';
import { expireInitialHolds } from './inventory/inventory.service';

async function main(){
  const app=await NestFactory.createApplicationContext(AppModule,{logger:['warn','error']});const config=app.get<Config>(CONFIG);const db=app.get(Db);const outbox=app.get(OutboxService);const payments=app.get(PaymentService);const billing=app.get(BillingService);let stopping=false;let queue:Queue|undefined;let worker:Worker|undefined;
  if(config.WORKER_MODE==='redis'){const url=new URL(config.REDIS_URL);const connection={host:url.hostname,port:Number(url.port||6379),...(url.password?{password:decodeURIComponent(url.password)}:{}),...(url.username?{username:decodeURIComponent(url.username)}:{}),...(url.protocol==='rediss:'?{tls:{}}:{})};queue=new Queue('sihhat-outbox',{connection});worker=new Worker('sihhat-outbox',job=>outbox.process(job.data.id),{connection,concurrency:5});worker.on('error',()=>console.error('Queue ulanishi xatosi'));}
  const shutdown=async()=>{stopping=true;await worker?.close();await queue?.close();await app.close();};process.once('SIGINT',()=>void shutdown());process.once('SIGTERM',()=>void shutdown());console.log(`Sihhat worker ishga tushdi (${config.WORKER_MODE}).`);let maintenance=0;
  while(!stopping){try{if(Date.now()-maintenance>60000){const tenants=await db.booking.findMany({where:{status:'HOLD',holdExpiresAt:{lte:new Date()}},select:{sanatoriumId:true},distinct:['sanatoriumId']});for(const tenant of tenants)await db.atomic(tx=>expireInitialHolds(tx,tenant.sanatoriumId));await payments.expireProvider();await billing.tick();maintenance=Date.now();}
    if(config.TELEGRAM_MODE!=='disabled'){const botId=config.TELEGRAM_BOT_TOKEN.split(':')[0];await db.telegramBotState.upsert({where:{botId},create:{botId,workerHeartbeatAt:new Date()},update:{workerHeartbeatAt:new Date()}});}
    if(queue){for(const id of await outbox.claim())await queue.add('dispatch',{id},{jobId:id,attempts:5,backoff:{type:'exponential',delay:2000},removeOnComplete:true,removeOnFail:true});await outbox.push();}else await outbox.tick();
  }catch{console.error('Worker operatsiyasi bajarilmadi; keyingi davrda qayta urinadi.');}await new Promise(resolve=>setTimeout(resolve,2000));}
}
main().catch(()=>{console.error('Worker ishga tushmadi. Muhit va bazani tekshiring.');process.exitCode=1;});
