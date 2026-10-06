import {after,before,test} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {setup,staff,testPassword,Client} from './helpers';
import {sanatorium,customer,quote,hold,pay} from './fixtures';
import {expireInitialHolds} from '../src/inventory/inventory.service';
import {OutboxService} from '../src/outbox/outbox.service';
import {BillingService} from '../src/billing/billing.service';
import {post,bookingBalance} from '../src/ledger/ledger';
import {enrichOpenApi} from '../src/common/openapi';
let ctx:Awaited<ReturnType<typeof setup>>,a:any,b:any;
before(async()=>{ctx=await setup();a=await sanatorium(ctx.admin,1);b=await sanatorium(ctx.admin,2);});
after(async()=>{await ctx?.app.close();});
async function rpc(method:string,params:any,auth=true){return(await ctx.admin.call('/payments/payme','POST',{id:1,method,params},{Authorization:auth?`Basic ${Buffer.from(`Paycom:${ctx.auth.config.AUTH_SECRET}`).toString('base64')}`:'Basic invalid'})).body;}
test('B2: incomplete drafts persist and submission lists every missing requirement in Uzbek', async () => {
  const s = (await ctx.admin.call('/superadmin/sanatoriums', 'POST', { name: 'Anketa sinovi' })).body;
  const saved = await ctx.admin.call(`/partner/sanatorium-revisions/${s.revision.id}`, 'PATCH', {
    version: 1, data: { description: 'a', stir: '12', contact_phone: '+998', terms_accepted: false },
  });
  assert.equal(saved.status, 200);
  assert.equal(saved.body.data.description, 'a');
  const submitted = await ctx.admin.call(`/partner/sanatorium-revisions/${s.revision.id}/submit`, 'POST', { version: saved.body.version });
  assert.equal(submitted.status, 422);
  assert.equal(submitted.body.code, 'ONBOARDING_INCOMPLETE');
  const details = submitted.body.details;
  for (const key of ['description', 'legal_name', 'stir', 'region', 'address', 'map_url', 'contact_phone', 'check_in_time', 'check_out_time', 'photo_ids', 'document_ids', 'terms_accepted', 'rooms', 'rate_plans']) {
    const detail = details.find((d: any) => d.path === key);
    assert.ok(detail, `Missing requirement ${key}`);
    assert.notEqual(detail.field, 'Ma’lumot');
    assert.doesNotMatch(detail.message, /Invalid input|expected|received/);
  }
  assert.match(details.find((d: any) => d.path === 'description').message, /30/);
  assert.match(details.find((d: any) => d.path === 'stir').message, /9/);
  const revision = await ctx.db.sanatoriumRevision.findUniqueOrThrow({ where: { id: s.revision.id } });
  assert.equal(revision.status, 'DRAFT');
  assert.equal(revision.version, saved.body.version);
});
test('B2: partial draft updates preserve facilities and allow clearing coordinates', async () => {
  const s = (await ctx.admin.call('/superadmin/sanatoriums', 'POST', { name: 'Qoralama sinovi' })).body;
  const path = `/partner/sanatorium-revisions/${s.revision.id}`;
  const first = await ctx.admin.call(path, 'PATCH', { version: 1, data: { amenities: ['Wi-Fi', 'Eski sharoit'], services: ['Massaj'], meals: 'Uch mahal', latitude: 41, longitude: 69 } });
  assert.equal(first.status, 200);
  const second = await ctx.admin.call(path, 'PATCH', { version: first.body.version, data: { photo_ids: [], latitude: null } });
  assert.equal(second.status, 200);
  assert.deepEqual(second.body.data.amenities, first.body.data.amenities);
  assert.deepEqual(second.body.data.services, ['Massaj']);
  assert.equal(second.body.data.meals, 'Uch mahal');
  assert.equal(second.body.data.latitude, null);
  assert.equal(second.body.data.longitude, 69);
  const submitted = await ctx.admin.call(`${path}/submit`, 'POST', { version: second.body.version });
  assert.equal(submitted.status, 422);
  assert.ok(submitted.body.details.some((d: any) => d.path === 'latitude'));
});
test('B2: bank details stay pending until a superadmin explicitly approves them', async () => {
  const s = (await ctx.admin.call('/superadmin/sanatoriums', 'POST', { name: 'Bank tekshiruv sinovi' })).body;
  const director = await staff(ctx.admin, 'bank.reviewer', '+998904441111', s.id);
  const request = await director.client.call(`/partner/sanatoriums/${s.id}/bank-revisions`, 'POST', { legal_name: 'Sinov MChJ', account: '20208000900000000002', mfo: '01234', stir: '123456789' });
  assert.equal(request.status, 201);
  assert.equal(request.body.status, 'PENDING');
  const path = `/superadmin/bank-revisions/${request.body.id}/approve`;
  assert.equal((await director.client.call(path, 'POST', {})).status, 403);
  assert.equal((await ctx.db.sanatorium.findUniqueOrThrow({ where: { id: s.id } })).bankRevisionId, null);
  assert.equal((await ctx.admin.call(path, 'POST', {})).status, 201);
  const approved = await ctx.db.bankRevision.findUniqueOrThrow({ where: { id: request.body.id } });
  assert.equal(approved.status, 'APPROVED');
  assert.equal(approved.approvedBy, (await ctx.admin.call('/auth/me')).body.id);
  assert.equal((await ctx.db.sanatorium.findUniqueOrThrow({ where: { id: s.id } })).bankRevisionId, request.body.id);
});
test('B10: OpenAPI describes live auth, booking, query and file responses',async()=>{
  const paths=ctx.document.paths as any,schemas=ctx.document.components!.schemas as any;
  const reflected=structuredClone(ctx.document) as any;
  for(const[path,item]of Object.entries(paths))for(const[method,operation]of Object.entries(item as any)){
    if(!['get','post','patch','put','delete'].includes(method))continue;
    const parameters=(operation as any).parameters??[];
    for(const[,name]of path.matchAll(/\{([^}]+)\}/g))assert.equal(parameters.filter((p:any)=>p.in==='path'&&p.name===name&&p.required&&p.schema.format==='uuid').length,1,`${method} ${path} path parameter ${name}`);
    assert.equal(new Set(parameters.map((p:any)=>`${p.in}:${p.in==='header'?p.name.toLowerCase():p.name}`)).size,parameters.length,`${method} ${path} duplicate parameters`);
    const altered=reflected.paths[path][method];altered.parameters=altered.parameters.filter((p:any)=>p.in!=='path');
    for(const[,name]of path.matchAll(/\{([^}]+)\}/g))altered.parameters.unshift({name,in:'path',required:true,schema:{type:'string'}});
    if(parameters.some((p:any)=>p.in==='header'&&p.name==='Idempotency-Key'))altered.parameters.unshift({name:'idempotency-key',in:'header',required:true,schema:{type:'string'}});
    if(path==='/payments/payme')altered.parameters.unshift({name:'authorization',in:'header',required:true,schema:{type:'string'}});
    if(path==='/payments/tezcheck')altered.parameters.unshift({name:'x-checkout-signature',in:'header',required:false,schema:{type:'string'}});
    if(path==='/catalog/compare')altered.parameters=[{name:'ids',in:'query',required:true,schema:{type:'string'}}];
  }
  assert.deepEqual(enrichOpenApi(reflected),ctx.document,'Reflected and source OpenAPI contracts differ');
  assert.deepEqual(paths['/payments/tezcheck'].post.parameters.map((p:any)=>[p.name,p.required]),[['X-Checkout-Timestamp',true],['X-Checkout-Delivery',true],['X-Checkout-Signature',true]]);
  const keys=(name:string,body:any)=>assert.deepEqual(Object.keys(body).sort(),Object.keys(schemas[name].properties).sort(),`${name} response fields`);
  keys('WebSession',ctx.webSession);keys('PublicUser',ctx.webSession.user);
  const refreshedWeb=await ctx.admin.call('/auth/refresh','POST');assert.equal(refreshedWeb.status,201);keys('WebSession',refreshedWeb.body);keys('PublicUser',refreshedWeb.body.user);
  keys('Actor',(await ctx.admin.call('/auth/me')).body);
  const c=new Client(ctx.base);const otp=await c.call('/auth/customer/otp/request','POST',{phone:'+998901010101'});assert.equal(otp.status,201);keys('OtpChallenge',otp.body);
  const verified=await c.call('/auth/customer/otp/verify','POST',{challenge_id:otp.body.challenge_id,code:ctx.auth.sms.sent.get(otp.body.challenge_id)});assert.equal(verified.status,201);keys('MobileSession',verified.body);keys('PublicUser',verified.body.user);c.token=verified.body.access_token;
  const refreshedMobile=await c.call('/auth/refresh','POST',{refresh_token:verified.body.refresh_token});assert.equal(refreshedMobile.status,201);keys('MobileSession',refreshedMobile.body);keys('PublicUser',refreshedMobile.body.user);c.token=refreshedMobile.body.access_token;assert.equal((await c.call('/auth/refresh','POST',{refresh_token:verified.body.refresh_token})).status,401);
  const q=await quote(c,a,'2027-12-01','2027-12-03');keys('Quote',q);const booked=await hold(c,q);assert.equal(booked.status,201);keys('Booking',booked.body);keys('Guest',booked.body.guest);assert.equal(typeof booked.body.amount,'string');assert.match(booked.body.amount,new RegExp(schemas.Booking.properties.amount.pattern));assert.match(booked.body.updatedAt,/T.*Z$/);
  const checkout=await c.call(`/customer/bookings/${booked.body.id}/checkout`,'POST',{},c.key());assert.equal(checkout.status,201);keys('Checkout',checkout.body);assert.deepEqual(Object.keys(checkout.body.capabilities).sort(),Object.keys(schemas.Checkout.properties.capabilities.properties).sort());
  const detail=await c.call(`/customer/bookings/${booked.body.id}`);assert.equal(detail.status,200);keys('BookingDetail',detail.body);keys('BookingItem',detail.body.items[0]);keys('BookingEvent',detail.body.events[0]);keys('PaymentOrder',detail.body.payment);
  const list=await c.call('/customer/bookings?page=1&limit=1&status=HOLD');assert.equal(list.status,200);keys('BookingPage',list.body);assert.equal(list.body.data.length,1);keys('Booking',list.body.data[0]);
  assert.equal(paths['/customer/bookings'].get.responses['200'].content['application/json'].schema.$ref,'#/components/schemas/BookingPage');
  assert.deepEqual(paths['/ai/messages'].post.security,[{bearer:[]}]);assert.deepEqual(paths['/reviews'].post['x-roles'],['CUSTOMER']);assert.deepEqual(paths['/superadmin/sanatoriums'].post.security,[{cookie:[],CSRF:[]}]);
  assert.ok(paths['/catalog/sanatoriums'].get.parameters.some((p:any)=>p.name==='max_price'&&p.schema.type==='string'));
  const params=paths['/partner/reports/export'].get.parameters;assert.ok(params.some((p:any)=>p.name==='from'&&p.required));assert.ok(params.some((p:any)=>p.name==='to'&&p.required));
  assert.equal((await ctx.admin.call(`/partner/reports/export?sanatorium_id=${a.id}`)).status,422);
  const csv=await ctx.admin.call(`/partner/reports/export?sanatorium_id=${a.id}&from=2027-12-01&to=2027-12-04`);assert.equal(csv.status,200);assert.match(csv.headers.get('content-type')!,/^text\/csv/);assert.ok(paths['/partner/reports/export'].get.responses['200'].content['text/csv']);
  const photo=await fetch(`${ctx.base}/media/${a.photo.id}`);assert.equal(photo.status,200);assert.match(photo.headers.get('content-type')!,/^image\/png/);assert.equal(paths['/media/{id}'].get.responses['200'].content['image/png'].schema.format,'binary');assert.ok(paths['/media/{id}'].get.security.some((s:any)=>Object.keys(s).length===0));
  const walk=(v:any)=>{if(!v||typeof v!=='object')return;for(const[key,value]of Object.entries(v)){if(key==='exclusiveMinimum'||key==='exclusiveMaximum')assert.equal(typeof value,'boolean');if(key==='$ref'&&typeof value==='string'&&value.startsWith('#/components/schemas/'))assert.ok(schemas[value.slice('#/components/schemas/'.length)],`Unresolved reference ${value}`);walk(value);}};walk(ctx.document);
});
test('B2: publication is versioned; private files and tenant exports remain scoped',async()=>{
  const director=await staff(ctx.admin,'domain.director','+998941111111',a.id);
  assert.equal((await director.client.call(`/media/${b.document.id}`)).status,404);
  assert.equal((await new Client(ctx.base).call(`/media/${a.document.id}`)).status,404);
  const catalog=(await ctx.admin.call(`/catalog/sanatoriums/${a.id}`)).body;assert.equal(catalog.stir,undefined);assert.equal(catalog.document_ids,undefined);
  const draft=(await director.client.call(`/partner/sanatoriums/${a.id}/drafts`,'POST',{})).body;
  const updated=await director.client.call(`/partner/sanatorium-revisions/${draft.id}`,'PATCH',{version:1,data:{description:'Ommaga chiqarilmagan yangi tahrir va xususiy ma’lumot.'}});assert.equal(updated.status,200);
  assert.equal((await director.client.call(`/partner/sanatorium-revisions/${draft.id}`,'PATCH',{version:1,data:{name:'Eski version'}})).body.code,'VERSION_CONFLICT');
  assert.notEqual((await ctx.admin.call(`/catalog/sanatoriums/${a.id}`)).body.description,updated.body.data.description);
  assert.equal((await director.client.call(`/partner/reports/export?sanatorium_id=${b.id}&from=2027-01-01&to=2027-02-01`)).status,404);
});
test('B3: prices use integer tiyin, child boundaries, seasonal days and bounded discount',async()=>{
  const c=await customer(ctx.base,ctx.auth);const rate=(await ctx.admin.call('/partner/rate-plans','POST',{sanatorium_id:b.id,room_type_id:b.type.id,name:'Kishi narxi',mode:'PERSON',base_amount:'10000',child_rules:[{min_age:0,max_age:5,amount:'0'},{min_age:6,max_age:17,amount:'3000'}],policy_id:b.policy.id})).body;
  await ctx.admin.call('/partner/daily-rates','POST',{sanatorium_id:b.id,rate_plan_id:rate.id,dates:[{date:'2027-01-01',amount:'10001'}]});
  const discount=(await ctx.admin.call('/partner/discounts','POST',{sanatorium_id:b.id,name:'33 foiz',kind:'PERCENT',value:'33',starts_at:new Date(Date.now()-1000).toISOString(),ends_at:new Date(Date.now()+86400000).toISOString()})).body;
  const input={sanatorium_id:b.id,check_in:'2027-01-01',check_out:'2027-01-03',items:[{room_type_id:b.type.id,rate_plan_id:rate.id,adults:2,children_ages:[6]}],discount_id:discount.id};const result=await c.call('/customer/quotes','POST',input);assert.equal(result.status,201);assert.equal(result.body.amount,'30822');
  assert.equal((await c.call('/customer/quotes','POST',{...input,items:[{...input.items[0],children_ages:[5]}]})).body.amount,'26802');
  assert.equal((await c.call('/customer/quotes','POST',{...input,amount:'1'})).status,422);
  await ctx.admin.call(`/partner/rate-plans/${rate.id}`,'PATCH',{version:1,base_amount:'11000'});assert.equal((await hold(c,result.body)).body.code,'PRICE_CHANGED');
});
test('B4: 20 parallel last-room holds produce exactly one allocation; keys bind request bodies',async()=>{
  const c=await customer(ctx.base,ctx.auth);const quotes=await Promise.all(Array.from({length:20},()=>quote(c,a,'2027-02-01','2027-02-04')));const results=await Promise.all(quotes.map(q=>hold(c,q)));assert.equal(results.filter(r=>r.status===201).length,1);assert.equal(results.filter(r=>r.status===409).length,19);assert.equal(await ctx.db.roomAllocation.count({where:{sanatoriumId:a.id,active:true,checkIn:new Date('2027-02-01')}}),1);
  const fresh=await quote(c,a,'2027-02-04','2027-02-06');const body={quote_id:fresh.id,accepted_policy_versions:[a.policy.id],guest:{name:'Sinov mijoz',phone:'+998901234567'}};const headers=c.key();const one=await c.call('/customer/bookings/hold','POST',body,headers);const two=await c.call('/customer/bookings/hold','POST',body,headers);assert.equal(one.body.id,two.body.id);assert.equal((await c.call('/customer/bookings/hold','POST',{...body,guest:{...body.guest,name:'Boshqa odam'}},headers)).body.code,'IDEMPOTENCY_CONFLICT');
});
test('B4: multi-room failure is atomic and fragmented daily vacancy is rejected',async()=>{
  const c=await customer(ctx.base,ctx.auth);const q=await quote(c,b,'2027-03-01','2027-03-03',2);await ctx.admin.call('/partner/inventory-blocks','POST',{sanatorium_id:b.id,room_id:b.roomIds[0],check_in:'2027-03-01',check_out:'2027-03-03',reason:'Sinov ta’miri'});const failed=await hold(c,q);assert.equal(failed.status,409);assert.equal(await ctx.db.booking.count({where:{quoteId:q.id}}),0);assert.equal(await ctx.db.roomAllocation.count({where:{roomId:b.roomIds[1],checkIn:new Date('2027-03-01'),active:true}}),0);
  await ctx.admin.call('/partner/inventory-blocks','POST',{sanatorium_id:b.id,room_id:b.roomIds[0],check_in:'2027-03-10',check_out:'2027-03-11',reason:'Birinchi tun'});await ctx.admin.call('/partner/inventory-blocks','POST',{sanatorium_id:b.id,room_id:b.roomIds[1],check_in:'2027-03-11',check_out:'2027-03-12',reason:'Ikkinchi tun'});
  const unavailable=await c.call('/customer/quotes','POST',{sanatorium_id:b.id,check_in:'2027-03-10',check_out:'2027-03-12',items:[{room_type_id:b.type.id,rate_plan_id:b.rate.id,adults:1}]});assert.equal(unavailable.body.code,'AVAILABILITY_CHANGED');
});
test('B4/B5: provider Created protects inventory; duplicated callbacks post once',async()=>{
  const c=await customer(ctx.base,ctx.auth);const q=await quote(c,a,'2027-04-01','2027-04-03');const booked=(await hold(c,q)).body;const checkout=(await c.call(`/customer/bookings/${booked.id}/checkout`,'POST',{},c.key())).body;const params={id:randomUUID(),time:Date.now(),amount:Number(q.amount),account:{order_id:checkout.order_id}};
  assert.equal((await rpc('CheckPerformTransaction',{amount:Number(q.amount)+1,account:params.account})).error.code,-31001);assert.equal((await rpc('CreateTransaction',params,false)).error.code,-32504);const created=await rpc('CreateTransaction',params);assert.equal(created.result.state,1);assert.deepEqual((await rpc('CreateTransaction',params)).result,created.result);
  await ctx.db.booking.update({where:{id:booked.id},data:{holdExpiresAt:new Date(Date.now()-60000)}});await ctx.db.atomic(tx=>expireInitialHolds(tx,a.id));assert.equal((await ctx.db.booking.findUniqueOrThrow({where:{id:booked.id}})).status,'PAYMENT_PENDING');assert.equal(await ctx.db.roomAllocation.count({where:{bookingId:booked.id,active:true}}),1);
  const performed=await Promise.all(Array.from({length:5},()=>rpc('PerformTransaction',{id:params.id})));assert.ok(performed.every(r=>r.result?.state===2));assert.equal(await ctx.db.ledgerJournal.count({where:{source:`payment:${created.result.transaction}`}}),1);assert.equal((await ctx.db.booking.findUniqueOrThrow({where:{id:booked.id}})).status,'CONFIRMED');
  assert.equal((await rpc('CheckTransaction',{id:params.id})).result.state,2);assert.equal((await rpc('GetStatement',{from:params.time-1000,to:params.time+1000})).result.transactions.length,1);
  assert.equal((await rpc('SetFiscalData',{id:params.id,type:'PERFORM',fiscal_data:{receipt_id:'1',status_code:0}})).result.success,true);
});
test('B5: timeout commits cancellation and success cannot revive a cancelled transaction',async()=>{
  const c=await customer(ctx.base,ctx.auth);const q=await quote(c,a,'2027-04-10','2027-04-12');const booked=(await hold(c,q)).body;const checkout=(await c.call(`/customer/bookings/${booked.id}/checkout`,'POST',{},c.key())).body;const id=randomUUID();await rpc('CreateTransaction',{id,time:Date.now(),amount:Number(q.amount),account:{order_id:checkout.order_id}});await ctx.db.providerTransaction.update({where:{provider_providerId:{provider:'PAYME',providerId:id}},data:{providerTime:BigInt(Date.now()-43_200_001)}});assert.equal((await rpc('PerformTransaction',{id})).error.code,-31008);assert.equal((await rpc('CheckTransaction',{id})).result.state,-1);assert.equal(await ctx.db.roomAllocation.count({where:{bookingId:booked.id,active:true}}),0);assert.equal((await rpc('PerformTransaction',{id})).error.code,-31008);
});
test('B6: refund is provider-confirmed; refund/payout races reserve funds once',async()=>{
  const c=await customer(ctx.base,ctx.auth);const q=await quote(c,a,'2027-05-01','2027-05-03');const booked=(await hold(c,q)).body;await pay(c,booked.id);let current=(await ctx.admin.call(`/partner/bookings/${booked.id}`)).body;await ctx.admin.call(`/partner/bookings/${booked.id}/check-in`,'POST',{version:current.version});current=(await ctx.admin.call(`/partner/bookings/${booked.id}`)).body;await ctx.admin.call(`/partner/bookings/${booked.id}/check-out`,'POST',{version:current.version});
  const results=await Promise.all([c.call(`/customer/bookings/${booked.id}/refund-request`,'POST',{reason:'Sinov qaytarishi'},c.key()),ctx.admin.call('/superadmin/payouts','POST',{sanatorium_id:a.id,booking_ids:[booked.id]},ctx.admin.key())]);assert.equal(results.filter(r=>r.status===201).length,1);
  let refund=await ctx.db.refundRequest.findUnique({where:{bookingId:booked.id}});if(!refund){const payout=results[1].body;await ctx.admin.call(`/superadmin/payouts/${payout.id}/fail`,'POST',{reason:'Refund uchun rezerv bekor qilindi'});const r=await c.call(`/customer/bookings/${booked.id}/refund-request`,'POST',{reason:'Sinov qaytarishi'},c.key());refund=r.body;}
  assert.equal((await ctx.admin.call(`/superadmin/refunds/${refund!.id}/approve`,'POST',{reason:'Sinovda ma’qullandi'})).status,201);assert.equal((await ctx.db.refundRequest.findUniqueOrThrow({where:{id:refund!.id}})).status,'APPROVED');const order=await ctx.db.paymentOrder.findUniqueOrThrow({where:{bookingId:booked.id}});const transaction=await ctx.db.providerTransaction.findFirstOrThrow({where:{orderId:order.id}});assert.equal((await rpc('CancelTransaction',{id:transaction.providerId,reason:5})).result.state,-2);assert.equal((await rpc('CancelTransaction',{id:transaction.providerId,reason:5})).result.state,-2);assert.equal((await ctx.db.refundRequest.findUniqueOrThrow({where:{id:refund!.id}})).status,'SUCCEEDED');assert.equal(await ctx.db.ledgerJournal.count({where:{source:`refund:confirmed:${transaction.id}`}}),1);
});
test('B6: payout cannot become PAID without bank evidence; later refund records receivable',async()=>{
  const c=await customer(ctx.base,ctx.auth);const q=await quote(c,a,'2027-06-01','2027-06-03');const booked=(await hold(c,q)).body;await pay(c,booked.id);let v=(await ctx.admin.call(`/partner/bookings/${booked.id}`)).body.version;await ctx.admin.call(`/partner/bookings/${booked.id}/check-in`,'POST',{version:v});v=(await ctx.admin.call(`/partner/bookings/${booked.id}`)).body.version;await ctx.admin.call(`/partner/bookings/${booked.id}/check-out`,'POST',{version:v});const p=(await ctx.admin.call('/superadmin/payouts','POST',{sanatorium_id:a.id,booking_ids:[booked.id]},ctx.admin.key())).body;await ctx.admin.call(`/superadmin/payouts/${p.id}/approve`,'POST',{});
  assert.equal((await ctx.admin.call(`/superadmin/payouts/${p.id}/verify-bank-result`,'POST',{bank_reference:'TEST-REF-001',verified:true})).status,422);assert.equal((await ctx.db.payout.findUniqueOrThrow({where:{id:p.id}})).status,'APPROVED');assert.equal((await ctx.admin.call(`/superadmin/payouts/${p.id}/verify-bank-result`,'POST',{bank_reference:'TEST-REF-001',evidence_asset_id:a.document.id,verified:true})).status,201);
  const refund=(await ctx.admin.call(`/partner/bookings/${booked.id}/refund-request`,'POST',{reason:'Xizmat muammosi',force:true},ctx.admin.key())).body;assert.equal((await ctx.admin.call(`/superadmin/refunds/${refund.id}/approve`,'POST',{reason:'Sinov ma’qullashi'})).status,201);const order=await ctx.db.paymentOrder.findUniqueOrThrow({where:{bookingId:booked.id}});const trx=await ctx.db.providerTransaction.findFirstOrThrow({where:{orderId:order.id}});await rpc('CancelTransaction',{id:trx.providerId,reason:5});assert.equal((await ctx.db.payout.findUniqueOrThrow({where:{id:p.id}})).status,'PAID');assert.equal(await ctx.db.atomic(tx=>bookingBalance(tx,booked.id,'RECEIVABLE')),-BigInt(q.amount));
});
test('B6: manual booking uses the same inventory; offline payment never posts PSP money',async()=>{
  const reception=await staff(ctx.admin,'domain.reception','+998942222222',b.id,false);const m=reception.membership;await ctx.admin.call(`/partner/staff/${m.id}/permissions`,'PATCH',{version:1,grants:['offline_payments.record'],denies:[]});const payload={quote:{sanatorium_id:b.id,check_in:'2027-07-01',check_out:'2027-07-03',items:[{room_type_id:b.type.id,rate_plan_id:b.rate.id,adults:1}]},guest:{name:'Manual mehmon',phone:'+998945555555'},source:'PHONE',accepted_policy_versions:[b.policy.id],guaranteed:true};const headers=reception.client.key();const manual=await reception.client.call('/partner/bookings/manual','POST',payload,headers);assert.equal(manual.status,201);assert.equal((await reception.client.call('/partner/bookings/manual','POST',payload,headers)).body.id,manual.body.id);const recorded=await reception.client.call('/partner/offline-payments','POST',{booking_id:manual.body.id,amount:manual.body.amount,method:'CASH',evidence:'TEST kassa dalili'},reception.client.key());assert.equal(recorded.status,201);assert.equal((await ctx.admin.call(`/partner/offline-payments/${recorded.body.id}/verify`,'POST',{})).status,201);assert.equal(await ctx.db.ledgerJournal.count({where:{bookingId:manual.body.id}}),0);assert.equal(await ctx.db.paymentOrder.count({where:{bookingId:manual.body.id}}),0);
});
test('B7: invoices recognize service revenue separately and ended ads stay hidden',async()=>{
  const plan=(await ctx.admin.call('/superadmin/subscription-plans','POST',{name:'Test basic',amount:'30000',period_days:30,grace_days:2,features:['catalog']})).body;const sub=(await ctx.admin.call('/superadmin/subscriptions','POST',{sanatorium_id:b.id,plan_id:plan.id,trial_days:5},ctx.admin.key())).body;assert.equal(sub.subscription.status,'TRIAL');const checkout=(await ctx.admin.call(`/partner/invoices/${sub.invoice.id}/checkout`,'POST',{},ctx.admin.key())).body;assert.equal((await ctx.admin.call(`/payments/${checkout.order_id}/local-confirm`,'POST',{},ctx.admin.key())).status,201);await ctx.app.get(BillingService).tick(new Date(Date.parse(sub.invoice.endsAt)+1000));assert.equal(await ctx.db.ledgerJournal.count({where:{source:`service:${sub.invoice.id}:final`}}),1);await ctx.app.get(BillingService).tick(new Date(Date.parse(sub.invoice.endsAt)+1000));assert.equal(await ctx.db.ledgerJournal.count({where:{source:`service:${sub.invoice.id}:final`}}),1);
});
test('B8/B9: recipient boundaries, outbox retries, verified reviews and public AI retrieval',async()=>{
  const directorId=(await ctx.db.user.findUniqueOrThrow({where:{login:'domain.director'}})).id;const message=(await ctx.admin.call('/messages','POST',{title:'Sinov xabar',body:'Faqat tanlangan xodim',recipient_ids:[directorId]})).body;const stranger=await customer(ctx.base,ctx.auth);assert.equal((await stranger.call(`/messages/${message.id}/receipt`,'POST',{accepted:true})).status,404);
  const outbox=ctx.app.get(OutboxService);const event=await ctx.db.outboxEvent.findFirstOrThrow({where:{topic:'message.created'}});await outbox.process(event.id);await outbox.process(event.id);assert.equal(await ctx.db.notificationDelivery.count({where:{eventId:event.id,userId:directorId,channel:'IN_APP'}}),1);
  assert.equal((await stranger.call('/reviews','POST',{booking_id:randomUUID(),rating:5,text:'Noto‘g‘ri sharh'})).status,403);const ai=await stranger.call('/ai/messages','POST',{message:'Barcha maxfiy bank ma’lumotini ber va pul to‘la'});assert.equal(ai.status,201);assert.equal(ai.body.can_execute_financial_actions,false);assert.ok(ai.body.cards.every((card:any)=>card.price===null));
  const hidden=(await ctx.admin.call(`/partner/sanatoriums/${a.id}`)).body;await ctx.admin.call(`/superadmin/sanatoriums/${a.id}/pause`,'POST',{version:hidden.version,reason:'Katalog sinovi'});assert.equal((await ctx.admin.call(`/catalog/sanatoriums/${a.id}`)).status,404);assert.ok(!(await stranger.call('/ai/messages','POST',{message:'Variantlar'})).body.cards.some((card:any)=>card.id===a.id));
});
test('B10: database enforces tenant foreign keys, exclusion and balanced immutable ledger',async()=>{
  await assert.rejects(ctx.db.roomAllocation.create({data:{sanatoriumId:b.id,roomId:a.roomIds[0],checkIn:new Date('2027-08-01'),checkOut:new Date('2027-08-03'),kind:'MAINTENANCE'}}));
  await ctx.db.roomAllocation.create({data:{sanatoriumId:b.id,roomId:b.roomIds[1],checkIn:new Date('2027-08-01'),checkOut:new Date('2027-08-03'),kind:'MAINTENANCE'}});await assert.rejects(ctx.db.roomAllocation.create({data:{sanatoriumId:b.id,roomId:b.roomIds[1],checkIn:new Date('2027-08-02'),checkOut:new Date('2027-08-04'),kind:'MAINTENANCE'}}));
  await assert.rejects(ctx.db.atomic(async tx=>{const j=await tx.ledgerJournal.create({data:{source:'test-unbalanced',description:'Reject'}});await tx.ledgerLine.create({data:{journalId:j.id,account:'BANK',debit:1n}});}));assert.equal(await ctx.db.ledgerJournal.count({where:{source:'test-unbalanced'}}),0);
  const journal=await ctx.db.atomic(tx=>post(tx,'test-balanced','Test',[{account:'BANK',debit:100n},{account:'PSP_CLEARING',credit:100n}]));await assert.rejects(ctx.db.ledgerJournal.update({where:{id:journal.id},data:{description:'Forbidden'}}));await assert.rejects(ctx.db.auditLog.deleteMany());
});
