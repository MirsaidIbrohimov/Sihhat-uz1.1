import {before,after,test} from 'node:test';
import assert from 'node:assert/strict';
import {setup,staff,Client} from './helpers';
import {sanatorium,customer,quote,hold,pay} from './fixtures';
import {OutboxService} from '../src/outbox/outbox.service';
let ctx:Awaited<ReturnType<typeof setup>>,s:any,d:any;
before(async()=>{ctx=await setup();s=await sanatorium(ctx.admin,2);d=await staff(ctx.admin,'extended.director','+998951111111',s.id);});
after(async()=>{await ctx?.app.close();});
test('B0/B1: database sessions use UTC; phone change requires old and new ownership',async()=>{
  assert.equal((await ctx.db.$queryRaw<{TimeZone:string}[]>`SHOW TIME ZONE`)[0].TimeZone,'UTC');const c=await customer(ctx.base,ctx.auth);const request=await c.call('/auth/customer/phone-change/request','POST',{new_phone:'+998952222222'});assert.equal(request.status,201);const i=request.body;const codes={old_challenge_id:i.old_challenge_id,new_challenge_id:i.new_challenge_id,old_code:ctx.auth.sms.sent.get(i.old_challenge_id),new_code:ctx.auth.sms.sent.get(i.new_challenge_id)};assert.equal((await c.call('/auth/customer/phone-change/confirm','POST',{...codes,new_code:'abcdef'})).status,422);const confirmed=await c.call('/auth/customer/phone-change/confirm','POST',codes);assert.equal(confirmed.status,201);assert.equal(confirmed.body.phone,'+998952222222');assert.equal((await c.call('/auth/customer/phone-change/confirm','POST',codes)).status,401);
});
test('B1: admin deny cannot be removed by a director; revocation is immediate',async()=>{
  const r=await staff(ctx.admin,'extended.reception','+998953333333',s.id,false);assert.equal((await r.client.call(`/partner/sanatoriums/${s.id}/inventory`)).status,200);await ctx.admin.call(`/partner/staff/${r.membership.id}/permissions`,'PATCH',{version:1,grants:[],denies:['bookings.read']});assert.equal((await r.client.call(`/partner/sanatoriums/${s.id}/inventory`)).status,403);const escalation=await d.client.call(`/partner/staff/${r.membership.id}/permissions`,'PATCH',{version:2,grants:['bookings.read'],denies:[]});assert.equal(escalation.body.code,'DELEGATION_DENIED');
});
test('B1: a director can revoke and restore their own delegated permission',async()=>{
  const r=await staff(ctx.admin,'regrant.reception','+998956666666',s.id,false);
  const removed=await d.client.call(`/partner/staff/${r.membership.id}/permissions`,'PATCH',{version:1,grants:[],denies:['bookings.read']});
  assert.equal(removed.status,200);
  assert.equal((await r.client.call(`/partner/sanatoriums/${s.id}/inventory`)).status,403);
  const restored=await d.client.call(`/partner/staff/${r.membership.id}/permissions`,'PATCH',{version:2,grants:[],denies:[]});
  assert.equal(restored.status,200);
  assert.equal((await r.client.call(`/partner/sanatoriums/${s.id}/inventory`)).status,200);
});
test('B7: admin-approved ads publish free, events deduplicate and expired ads disappear', async () => {
  const requested = await ctx.admin.call('/partner/ad-campaigns', 'POST', { sanatorium_id: s.id, title: 'Sinov reklama', placement: 'HOME', starts_at: new Date(Date.now() - 1000).toISOString(), ends_at: new Date(Date.now() + 600000).toISOString(), image_asset_id: s.photo.id, text: 'Sinov taklifi' });
  assert.equal(requested.status, 201); const ad = requested.body;
  assert.equal((await ctx.admin.call('/catalog/ads')).body.length, 0);
  assert.equal((await d.client.call(`/superadmin/ad-campaigns/${ad.id}/approve`, 'POST', {})).status, 403);
  const approved = await ctx.admin.call(`/superadmin/ad-campaigns/${ad.id}/approve`, 'POST', {});
  assert.equal(approved.status, 201); assert.equal(approved.body.invoiceId, null); assert.equal(approved.body.amount, '0');
  assert.equal(await ctx.db.invoice.count({ where: { purpose: 'AD' } }), 0);
  const active = (await ctx.admin.call('/catalog/ads')).body;
  assert.equal(active.length, 1); assert.equal(active[0].label, 'Reklama');
  await ctx.admin.call(`/catalog/ads/${ad.id}/events`, 'POST', { kind: 'CLICK' });
  await ctx.admin.call(`/catalog/ads/${ad.id}/events`, 'POST', { kind: 'CLICK' });
  assert.equal(await ctx.db.adEvent.count({ where: { campaignId: ad.id } }), 1);
  await ctx.db.adCampaign.update({ where: { id: ad.id }, data: { endsAt: new Date(Date.now() - 1) } });
  assert.equal((await ctx.admin.call('/catalog/ads')).body.length, 0);
});
test('B8: survey versions, answer types and task state transitions are enforced',async()=>{
  const id=(await ctx.db.user.findUniqueOrThrow({where:{login:'extended.director'}})).id;const survey=(await ctx.admin.call('/superadmin/surveys','POST',{title:'Xizmat anketa',recipient_ids:[id],questions:[{id:'ready',label:'Tayyormi?',type:'BOOLEAN',required:true}]})).body;assert.equal((await d.client.call(`/surveys/${survey.id}/responses`,'POST',{version:1,answers:{ready:'yes'}})).status,422);assert.equal((await d.client.call(`/surveys/${survey.id}/responses`,'POST',{version:1,answers:{ready:false}})).status,201);const task=(await ctx.admin.call('/tasks','POST',{sanatorium_id:s.id,assigned_to:id,title:'Sinov vazifa',body:'Qabulni tekshiring',due_at:new Date(Date.now()+600000).toISOString()})).body;assert.equal((await d.client.call(`/tasks/${task.id}`,'PATCH',{version:1,status:'COMPLETED'})).status,409);assert.equal((await d.client.call(`/tasks/${task.id}`,'PATCH',{version:1,status:'ACCEPTED'})).status,200);assert.equal((await d.client.call(`/tasks/${task.id}`,'PATCH',{version:2,status:'COMPLETED',reply:'Bajarildi'})).status,200);
});
test('B8: an abandoned outbox lease is reclaimed without duplicate delivery',async()=>{
  const id=(await ctx.db.user.findUniqueOrThrow({where:{login:'extended.director'}})).id;const event=await ctx.db.outboxEvent.create({data:{topic:'test.lease',payload:{recipient_ids:[id]},leaseUntil:new Date(Date.now()-1000)}});const service=ctx.app.get(OutboxService);assert.ok((await service.claim()).includes(event.id));await ctx.db.outboxEvent.update({where:{id:event.id},data:{leaseUntil:new Date(Date.now()-1000)}});assert.ok((await service.claim()).includes(event.id));await service.process(event.id);await service.process(event.id);assert.equal(await ctx.db.notificationDelivery.count({where:{eventId:event.id}}),1);
});
test('B9: month boundaries split room/guest nights; financial data is permission-scoped',async()=>{
  const payload={quote:{sanatorium_id:s.id,check_in:'2027-08-30',check_out:'2027-09-02',items:[{room_type_id:s.type.id,rate_plan_id:s.rate.id,adults:1,children_ages:[8]}]},guest:{name:'Oy chegarasi',phone:'+998954444444'},source:'PHONE',accepted_policy_versions:[s.policy.id],guaranteed:true};assert.equal((await ctx.admin.call('/partner/bookings/manual','POST',payload,ctx.admin.key())).status,201);const august=(await d.client.call(`/partner/reports?sanatorium_id=${s.id}&from=2027-08-01&to=2027-09-01`)).body;const september=(await d.client.call(`/partner/reports?sanatorium_id=${s.id}&from=2027-09-01&to=2027-10-01`)).body;assert.equal(august.room_nights,2);assert.equal(august.guest_nights,4);assert.equal(september.room_nights,1);assert.equal(september.guest_nights,2);assert.equal(august.gmv,undefined);assert.equal(august.platform_revenue,undefined);const financial=(await d.client.call(`/partner/reports?sanatorium_id=${s.id}&from=2026-10-01&to=2026-11-01&financial=true`)).body;assert.equal(financial.platform_revenue,undefined);
});
test('B9: provider reconciliation records mismatches instead of changing payment success',async()=>{
  const c=await customer(ctx.base,ctx.auth);const q=await quote(c,s,'2027-10-01','2027-10-03');const booking=(await hold(c,q)).body;const orderId=await pay(c,booking.id);const p=await ctx.db.providerTransaction.findFirstOrThrow({where:{orderId}});const imported=await ctx.admin.call('/superadmin/reconciliation/imports','POST',{kind:'PROVIDER',rows:[{provider_id:p.providerId,order_id:orderId,amount:(p.amount+1n).toString(),state:2}]});assert.equal(imported.status,201);assert.equal(await ctx.db.reconciliationDifference.count({where:{importId:imported.body.id}}),1);assert.equal((await ctx.db.paymentOrder.findUniqueOrThrow({where:{id:orderId}})).status,'SUCCEEDED');
});
