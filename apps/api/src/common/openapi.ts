import type {OpenAPIObject} from '@nestjs/swagger';
import {apiSchema} from '../auth/auth.controller';
import {staffInput} from '../auth/staff.service';
import {quoteInput} from '../pricing/pricing.service';
import {holdInput,guestInput} from '../bookings/booking.service';
import {rateInput,roomTypeInput} from '../inventory/inventory.service';
import {draftInput} from '../sanatoriums/sanatorium.service';
import { aiInput } from '../ai/ai.service';
import { articleInput, articleUpdate } from '../catalog/home.service';
import { updateInput } from '../telegram/types';

const str={type:'string'},id={type:'string',format:'uuid'},integer={type:'integer'},boolean={type:'boolean'},timestamp={type:'string',format:'date-time'},date={type:'string',format:'date'},money={type:'string',pattern:'^(0|[1-9][0-9]*)$',description:'UZS, tiyin. Integer string.'};
const array=(items:any)=>({type:'array',items});
const obj=(properties:Record<string,any>,required:string[]=Object.keys(properties))=>({type:'object',properties,required,additionalProperties:false});
const reason={...str,minLength:3,maxLength:2000};
const versionReason=obj({version:{...integer,minimum:1},reason},['version']);
const requiredReason=obj({reason});
const ref=(name:string)=>({$ref:`#/components/schemas/${name}`});
const page=(items:any)=>obj({data:array(items),total:integer,page:integer,limit:integer,pages:integer});
const query=(name:string,schema:any,required=false)=>({name,in:'query',required,schema});
const pagination=[query('page',{...integer,minimum:1,default:1}),query('limit',{...integer,minimum:1,maximum:100,default:20})];
const pagedPaths=['/partner/sanatoriums','/superadmin/sanatoriums','/partner/staff','/superadmin/staff','/partner/bookings','/customer/bookings','/superadmin/bookings','/catalog/sanatoriums','/partner/payments','/superadmin/payments','/superadmin/audit','/superadmin/refunds','/partner/payouts','/superadmin/payouts','/partner/invoices','/superadmin/invoices','/partner/reviews','/messages'];
const tenantFilteredPaths=['/partner/bookings','/customer/bookings','/superadmin/bookings','/partner/payments','/superadmin/payments','/partner/payouts','/superadmin/payouts','/partner/invoices','/superadmin/invoices','/partner/reviews'];
export function enrichOpenApi(document:OpenAPIObject){
  document.components??={};document.components.schemas??={};document.components.securitySchemes??={};
  document.components.securitySchemes.CSRF={type:'apiKey',in:'header',name:'X-CSRF-Token'};
  document.components.securitySchemes.refreshCookie={type:'apiKey',in:'cookie',name:'sihhat_refresh'};
  document.components.securitySchemes.PaymeAuth={type:'http',scheme:'basic',description:'Paycom: merchant key. Only provider calls this API.'};
  document.components.securitySchemes.TelegramWebhook={type:'apiKey',in:'header',name:'X-Telegram-Bot-Api-Secret-Token',description:'Server-only webhook secret; constant-time verification.'};
  const schemas=document.components.schemas;
  Object.assign(schemas,{
    QuoteRequest:apiSchema(quoteInput),HoldRequest:apiSchema(holdInput),StaffRequest:apiSchema(staffInput),RatePlanRequest:apiSchema(rateInput),RoomTypeRequest:apiSchema(roomTypeInput),DraftRequest:apiSchema(draftInput),Guest:apiSchema(guestInput),
    ApiError:obj({code:str,message:str,details:{nullable:true},request_id:{type:'string',format:'uuid'}},['code','message','request_id']),
    Booking:obj({id,reference:str,sanatoriumId:id,userId:{...id,nullable:true},quoteId:id,status:{type:'string',enum:['HOLD','PAYMENT_PENDING','CONFIRMED','CHECKED_IN','CHECKED_OUT','CANCELLED','EXPIRED','NO_SHOW','PAYMENT_EXCEPTION']},source:str,checkIn:timestamp,checkOut:timestamp,amount:money,snapshot:{type:'object',additionalProperties:true},guest:{$ref:'#/components/schemas/Guest'},holdExpiresAt:{...timestamp,nullable:true},providerExpiresAt:{...timestamp,nullable:true},version:integer,createdAt:timestamp,updatedAt:timestamp}),
    Quote:obj({id,userId:id,sanatoriumId:id,amount:money,pricingVersion:integer,bodyHash:str,data:{type:'object',description:'request, items, daily breakdown, policy snapshots, subtotal_amount, total_amount, discount, nights',additionalProperties:true},expiresAt:timestamp,createdAt:timestamp}),
    Page:obj({data:array({type:'object',additionalProperties:true}),total:integer,page:integer,limit:integer,pages:integer}),
    Checkout:obj({order_id:id,amount:money,mode:{type:'string',enum:['local','payme']},checkout_url:{...str,nullable:true},capabilities:obj({full_refund:boolean,partial_refund:boolean,automatic_refund:boolean})}),
    PublicUser:obj({id,kind:{...str,enum:['SUPERADMIN','STAFF','CUSTOMER']},name:str,phone:{...str,nullable:true},login:{...str,nullable:true},must_change_password:boolean}),
    WebSession:obj({user:ref('PublicUser'),expires_at:timestamp,csrf_token:str}),
    MobileSession:obj({user:ref('PublicUser'),access_token:str,refresh_token:str,csrf_token:str,expires_at:timestamp,refresh_expires_at:timestamp,session_id:id}),
    OtpChallenge:obj({challenge_id:id,expires_at:timestamp,resend_after:{...integer,description:'Seconds until another OTP may be requested.'}}),
    Actor:obj({id,kind:{...str,enum:['SUPERADMIN','STAFF','CUSTOMER']},name:str,phone:{...str,nullable:true},login:{...str,nullable:true},sessionId:id,mustChangePassword:boolean,memberships:array(obj({id,sanatoriumId:id,role:str,status:str,permissions:array(str),version:integer})),csrf_token:{...str,nullable:true}}),
    PaymentOrder:obj({id,sanatoriumId:id,userId:id,bookingId:{...id,nullable:true},invoiceId:{...id,nullable:true},purpose:{...str,enum:['BOOKING','SUBSCRIPTION','AD']},amount:money,status:{...str,enum:['CREATED','SUCCEEDED','CANCELLED']},paidAt:{...timestamp,nullable:true},createdAt:timestamp}),
    RefundRequest:obj({id,bookingId:id,sanatoriumId:id,requestedBy:id,amount:money,status:{...str,enum:['REQUESTED','APPROVED','REJECTED','PROCESSING','SUCCEEDED']},reason:str,decisionReason:{...str,nullable:true},reserveAccount:str,createdAt:timestamp,completedAt:{...timestamp,nullable:true}}),
    BookingItem:obj({id,sanatoriumId:id,bookingId:id,roomId:id,roomTypeId:id,ratePlanId:id,adults:integer,childrenAges:array(integer),amount:money}),
    BookingEvent:obj({id,bookingId:id,actorId:{...id,nullable:true},status:str,reason:{...str,nullable:true},createdAt:timestamp}),
    OfflinePayment:obj({id,sanatoriumId:id,bookingId:id,amount:money,method:{...str,enum:['CASH','TERMINAL']},evidence:str,status:{...str,enum:['UNVERIFIED','VERIFIED','CORRECTED']},recordedBy:id,verifiedBy:{...id,nullable:true},correctionOf:{...id,nullable:true},createdAt:timestamp}),
    Success:obj({success:{...boolean,enum:[true]}}),
    TelegramLink:obj({id,expires_at:timestamp,url:{...str,format:'uri',description:'One-time Telegram linking URL. Never log or share it.'}}),
    TelegramConnection:obj({enabled:boolean,bot_username:str,account:{type:'object',nullable:true,properties:{telegram_user_id:str,display_name:str,username:{...str,nullable:true},connected_at:timestamp,blocked:boolean}},link:{type:'object',nullable:true,properties:{id,expires_at:timestamp,claimed:boolean,telegram_user_id:{...str,nullable:true},display_name:{...str,nullable:true},username:{...str,nullable:true}}}}),
  });
  const bookingSchema=schemas.Booking as any;
  schemas.BookingDetail=obj({...bookingSchema.properties,items:array(ref('BookingItem')),events:array(ref('BookingEvent')),payment:{...schemas.PaymentOrder,nullable:true},refund:{...schemas.RefundRequest,nullable:true},offline_payments:array(ref('OfflinePayment'))});
  schemas.BookingPage=page(ref('Booking'));
  schemas.PaymentPage=page(ref('PaymentOrder'));
  schemas.RefundPage=page(ref('RefundRequest'));
  schemas.PublicArticle=obj({id,title:str,summary:str,body:str,kind:{...str,enum:['NEWS','TIP']},published_at:{...timestamp,nullable:true}});
  schemas.HomeFeed=obj({generated_at:timestamp,sanatorium_count:integer,featured:array({type:'object',additionalProperties:true}),regions:array(str),news:array(ref('PublicArticle')),tips:array({type:'object',additionalProperties:true})});
  schemas.AiReply=obj({message:str,cards:array({type:'object',additionalProperties:true}),faq:array({type:'object',additionalProperties:true}),fallback:boolean,provider_status:{...str,enum:['catalog','consent_required','connected','unavailable','daily_limit','medical_guidance']},provider_message_shared:boolean,actions:array(str),can_execute_financial_actions:{...boolean,enum:[false]}});
  const bodies:Record<string,any>={
    '/superadmin/sanatoriums':obj({name:str}),'/superadmin/sanatoriums/{id}/config':obj({version:integer,payment_ready:boolean,subscription_required:boolean},['version','payment_ready']),
    '/superadmin/director-assignments':{$ref:'#/components/schemas/StaffRequest'},'/partner/staff-invitations':{$ref:'#/components/schemas/StaffRequest'},
    '/partner/staff/{id}/permissions':obj({version:integer,grants:array(str),denies:array(str),ceiling:array(str)},['version','grants','denies']),
    '/partner/sanatorium-revisions/{id}':{$ref:'#/components/schemas/DraftRequest'},'/partner/sanatorium-revisions/{id}/submit':obj({version:integer}),
    '/partner/sanatoriums/{id}/bank-revisions':obj({legal_name:str,account:str,mfo:str,stir:str}),
    '/partner/room-types':{$ref:'#/components/schemas/RoomTypeRequest'},'/partner/rooms':obj({sanatorium_id:id,room_type_id:id,code:str}),
    '/superadmin/refund-policies':obj({name:str,kind:{type:'string',enum:['FULL_BEFORE_CUTOFF','NON_REFUNDABLE']},cutoff_hours:integer}),
    '/partner/rate-plans':{$ref:'#/components/schemas/RatePlanRequest'},'/partner/rate-plans/{id}':obj({version:integer,base_amount:money,active:boolean},['version','base_amount']),
    '/partner/daily-rates':obj({sanatorium_id:id,rate_plan_id:id,dates:array(obj({date,amount:money,closed:boolean},['date','amount']))}),
    '/partner/discounts':obj({sanatorium_id:id,name:str,kind:{type:'string',enum:['PERCENT','FIXED']},value:money,min_amount:money,max_amount:money,starts_at:timestamp,ends_at:timestamp},['sanatorium_id','name','kind','value','starts_at','ends_at']),
    '/partner/inventory-blocks':obj({sanatorium_id:id,room_id:id,check_in:date,check_out:date,reason:str}),'/partner/inventory-blocks/{id}/release':requiredReason,
    '/partner/media':obj({sanatorium_id:id,revision_id:id,visibility:{type:'string',enum:['PUBLIC','PRIVATE']},mime:{type:'string',enum:['image/png','image/jpeg','image/webp','application/pdf']},base64:{type:'string',format:'byte',maxLength:11184812}},['sanatorium_id','visibility','mime','base64']),
    '/customer/quotes':{$ref:'#/components/schemas/QuoteRequest'},'/partner/quotes':{$ref:'#/components/schemas/QuoteRequest'},'/customer/bookings/hold':{$ref:'#/components/schemas/HoldRequest'},
    '/partner/bookings/manual':obj({quote:{$ref:'#/components/schemas/QuoteRequest'},guest:{$ref:'#/components/schemas/Guest'},source:{type:'string',enum:['PHONE','WALK_IN','PARTNER_MANUAL']},accepted_policy_versions:array(id),guaranteed:{type:'boolean',enum:[true]},quoted_amount:money},['quote','guest','source','accepted_policy_versions','guaranteed']),
    '/partner/bookings/{id}/move-room':obj({item_id:id,room_id:id,version:integer,reason:str}),
    '/partner/offline-payments':obj({booking_id:id,amount:money,method:{type:'string',enum:['CASH','TERMINAL']},evidence:str,correction_of:id},['booking_id','amount','method','evidence']),
    '/superadmin/payouts':obj({sanatorium_id:id,booking_ids:array(id)}),'/superadmin/payouts/{id}/verify-bank-result':obj({bank_reference:str,evidence_asset_id:id,verified:{type:'boolean',enum:[true]}}),
    '/superadmin/subscription-plans':obj({name:str,amount:money,period_days:integer,grace_days:integer,features:array(str)}),
    '/superadmin/subscriptions':obj({sanatorium_id:id,plan_id:id,trial_days:integer},['sanatorium_id','plan_id']),
    '/partner/ad-campaigns':obj({sanatorium_id:id,title:str,placement:{type:'string',enum:['HOME','SEARCH']},starts_at:timestamp,ends_at:timestamp,image_asset_id:id,text:str}),
    '/superadmin/ad-campaigns/{id}/approve':obj({amount:money,reason:str},['amount']),'/superadmin/ad-campaigns/{id}/reject':requiredReason,
    '/messages':obj({title:str,body:str,kind:{type:'string',enum:['MESSAGE','WARNING']},asset_ids:array(id),recipient_ids:array(id)},['title','body','recipient_ids']),
    '/messages/{id}/receipt':obj({accepted:boolean},[]),'/superadmin/announcements':obj({sanatorium_ids:array(id),title:str,body:str,kind:{type:'string',enum:['MESSAGE','WARNING']},asset_ids:array(id)},['title','body','kind']),
    '/tasks':obj({sanatorium_id:id,assigned_to:id,title:str,body:str,due_at:timestamp}),'/tasks/{id}':obj({version:integer,status:{type:'string',enum:['ACCEPTED','COMPLETED']},reply:str},['version','status']),
    '/superadmin/surveys':obj({title:str,recipient_ids:array(id),questions:array(obj({id:str,label:str,type:{type:'string',enum:['TEXT','BOOLEAN','NUMBER']},required:boolean}))}),
    '/surveys/{id}/responses':obj({version:integer,answers:{type:'object',additionalProperties:{oneOf:[str,boolean,{type:'number'}]}}}),
    '/reviews':obj({booking_id:id,rating:{type:'integer',minimum:1,maximum:5},text:str}),'/partner/reviews/{id}/reply':obj({reply:str}),'/superadmin/reviews/{id}/moderate':obj({status:{type:'string',enum:['PUBLISHED','HIDDEN']},reason:str}),
    '/support/tickets':obj({title:str,text:str,booking_id:id,sanatorium_id:id},['title','text']),'/support/tickets/{id}/messages':obj({text:str,close:boolean},['text']),
    '/customer/favorites/{id}':obj({saved:boolean}),'/catalog/ads/{id}/events':obj({kind:{type:'string',enum:['IMPRESSION','CLICK']}}),
    '/ai/messages':apiSchema(aiInput),
    '/superadmin/articles':apiSchema(articleInput),'/superadmin/articles/{id}':apiSchema(articleUpdate),
    '/superadmin/catalog/entries':obj({kind:{type:'string',enum:['REGION','AMENITY','SERVICE']},name:str,code:str}),
    '/auth/customer/phone-change/request':obj({new_phone:str}),'/auth/customer/phone-change/confirm':obj({old_challenge_id:id,new_challenge_id:id,old_code:str,new_code:str}),
    '/auth/profile':obj({name:str,login:str},['name']),'/auth/refresh':obj({refresh_token:str},[]),
    '/superadmin/reconciliation/imports':obj({kind:{type:'string',enum:['PROVIDER','BANK']},evidence_asset_id:id,rows:array(obj({provider_id:str,order_id:id,amount:money,state:integer,bank_reference:str,fee:money},['provider_id','order_id','amount','state']))},['kind','rows']),
    '/payments/payme':obj({jsonrpc:{type:'string',enum:['2.0']},id:{oneOf:[str,{type:'number'}]},method:{type:'string',enum:['CheckPerformTransaction','CreateTransaction','PerformTransaction','CancelTransaction','CheckTransaction','GetStatement','SetFiscalData']},params:{type:'object',additionalProperties:true}},['method','params']),
    '/telegram/link':obj({}),'/telegram/disconnect':obj({}),'/telegram/link/{id}/confirm':obj({telegram_user_id:{...str,pattern:'^[1-9][0-9]{0,19}$'}}),'/telegram/webhook':apiSchema(updateInput),
  };
  for(const[path,item]of Object.entries(document.paths))for(const method of ['get','post','patch','put','delete'] as const){const operation=(item as any)[method];if(!operation)continue;
    const isPublic=path.startsWith('/health/')||path.startsWith('/catalog/')||['/auth/staff/login','/auth/customer/otp/request','/auth/customer/otp/verify','/telegram/webhook'].includes(path);
    const customerOnly=path.startsWith('/customer/')||path.startsWith('/auth/customer/phone')||['/ai/messages','/reviews'].includes(path);
    const staffOnly=path.startsWith('/partner/')||path.startsWith('/superadmin/')||(path.startsWith('/telegram/')&&path!=='/telegram/webhook')||(method==='post'&&['/messages','/tasks'].includes(path));
    const webSecurity={cookie:[],...(method==='get'?{}:{CSRF:[]})};
    operation.security=path==='/telegram/webhook'?[{TelegramWebhook:[]}]:path==='/payments/payme'?[{PaymeAuth:[]}]:isPublic?[]:customerOnly?[{bearer:[]}]:staffOnly?[webSecurity]:[webSecurity,{bearer:[]}];
    operation['x-roles']=isPublic||path==='/payments/payme'?[]:path.startsWith('/superadmin/')?['SUPERADMIN']:customerOnly?['CUSTOMER']:staffOnly?['STAFF','SUPERADMIN']:['SUPERADMIN','STAFF','CUSTOMER'];
    // tsx does not emit the same parameter reflection metadata as tsc.
    // Route templates and explicit contracts produce the same document in both.
    const parameterKey=(p:any)=>`${p.in}:${p.in==='header'?p.name.toLowerCase():p.name}`;
    const pathParameters=[...path.matchAll(/\{([^}]+)\}/g)].map(([,name])=>({name,in:'path',required:true,schema:id}));
    operation.parameters=[...pathParameters,...(operation.parameters??[]).filter((p:any)=>p.in!=='path'&&!(p.in==='header'&&['authorization','idempotency-key'].includes(p.name.toLowerCase())))];
    const addParameters=(parameters:any[])=>{const current=new Map((operation.parameters??[]).map((p:any)=>[parameterKey(p),p]));for(const p of parameters)current.set(parameterKey(p),p);operation.parameters=[...current.values()];};
    if(method==='get'){
      if(path==='/superadmin/articles')addParameters(pagination);
      if(pagedPaths.includes(path))addParameters(pagination);
      if(tenantFilteredPaths.includes(path))addParameters([query('sanatorium_id',id)]);
      if(['/partner/bookings','/customer/bookings','/superadmin/bookings'].includes(path))addParameters([query('status',{...str,maxLength:30})]);
      if(path==='/catalog/sanatoriums')addParameters([query('q',{...str,maxLength:100}),query('region',{...str,maxLength:80}),query('amenity',{...str,maxLength:80}),query('max_price',money),query('sort',{...str,enum:['NAME','PRICE'],default:'NAME'})]);
      if(path==='/catalog/compare')addParameters([query('ids',{...str,pattern:'^[0-9a-fA-F-]{36}(,[0-9a-fA-F-]{36}){0,2}$',description:'One to three comma-separated sanatorium UUIDs.'},true)]);
      if(['/partner/reports','/superadmin/reports','/partner/reports/export'].includes(path))addParameters([query('sanatorium_id',id),query('from',date,true),query('to',date,true),query('booking_basis',{...str,enum:['CREATED','PAYMENT','SERVICE'],default:'SERVICE'}),query('financial',{...str,enum:['true','false'],default:'false'})]);
    }
    if(path==='/auth/refresh'){
      operation.security=[{refreshCookie:[],CSRF:[]},{}];
      operation.description='WEB: sihhat_refresh cookie, X-CSRF-Token and allowed Origin; body may be empty. MOBILE: refresh_token body; no cookie. The result matches the session channel.';
      addParameters([{name:'Origin',in:'header',required:false,schema:str,description:'Required for WEB refresh and other cookie-authenticated mutations.'}]);
    }else if(!isPublic&&method!=='get'&&operation.security.some((s:any)=>s.cookie))addParameters([{name:'Origin',in:'header',required:staffOnly,schema:str,description:'Allowed WEB origin; required with cookie authentication.'}]);
    if(path==='/media/{id}'){
      operation.security=[{}, {cookie:[]}, {bearer:[]}];
      operation.description='Published public photos require no session. Other files require an authorized sanatorium staff session or an explicit message recipient session. S3 storage returns a short-lived redirect.';
      operation['x-roles']=[];
    }
    if(method!=='get'){
      let schema=bodies[path];if(!schema&&(/staff-approvals|moderation|check-in|check-out|no-show/.test(path)))schema=versionReason;
      if(!schema&&(/refund-request/.test(path)))schema=obj({reason:str,force:boolean},['reason']);
      if(!schema&&(/\/cancel$|\/refunds\/.*\/(approve|reject)$|\/payouts\/.*\/fail$/.test(path)))schema=requiredReason;
      if(!schema&&(/\/sanatoriums\/.*\/(pause|archive|reopen)$|\/staff\/.*\/block$/.test(path)))schema=obj({version:{...integer,minimum:1},reason});
      if(/\/no-show$|\/moderation\/.*\/request-changes$|\/staff-approvals\/.*\/reject$/.test(path))schema=obj({version:{...integer,minimum:1},reason});
      if(schema)operation.requestBody={required:path!=='/auth/refresh',content:{'application/json':{schema}}};
      else if(!operation.requestBody)delete operation.requestBody;
      if(/\/hold$|\/checkout$|local-confirm|\/manual$|refund-request|\/payouts$|offline-payments$|\/subscriptions$|\/subscriptions\/.*\/invoice$|\/cancel$/.test(path))addParameters([{name:'Idempotency-Key',in:'header',required:true,schema:{type:'string',minLength:8,maxLength:128},description:'Opaque key; same actor + endpoint + body returns the saved result.'}]);
    }
    const code=method==='post'&&path!=='/payments/payme'?'201':'200';const response:any={description:'Muvaffaqiyatli natija',content:{'application/json':{schema:{type:'object',additionalProperties:true}}}};
    if(path==='/catalog/home')response.content['application/json'].schema=ref('HomeFeed');
    if(path==='/telegram/account')response.content['application/json'].schema=ref('TelegramConnection');
    if(path==='/telegram/link')response.content['application/json'].schema=ref('TelegramLink');
    if(['/telegram/disconnect','/telegram/webhook','/telegram/link/{id}/confirm'].includes(path))response.content['application/json'].schema=ref('Success');
    if(path==='/catalog/news/{id}')response.content['application/json'].schema=ref('PublicArticle');
    if(path==='/ai/messages')response.content['application/json'].schema=ref('AiReply');
    if(path==='/superadmin/articles'&&method==='get')response.content['application/json'].schema=ref('Page');
    if(method==='get'&&['/catalog/entries','/catalog/ads','/catalog/compare','/customer/favorites','/tasks','/surveys','/support/tickets','/notifications','/superadmin/subscriptions','/superadmin/subscription-plans','/partner/ad-campaigns','/superadmin/ad-campaigns','/superadmin/reconciliation/differences'].includes(path))response.content['application/json'].schema=array({type:'object',additionalProperties:true});
    if(path==='/customer/quotes'||path==='/partner/quotes')response.content['application/json'].schema={$ref:'#/components/schemas/Quote'};
    else if(path.endsWith('/hold')||path.endsWith('/manual'))response.content['application/json'].schema={$ref:'#/components/schemas/Booking'};
    else if(path.endsWith('/checkout'))response.content['application/json'].schema={$ref:'#/components/schemas/Checkout'};
    else if(method==='get'&&pagedPaths.includes(path))response.content['application/json'].schema=ref(['/partner/bookings','/customer/bookings','/superadmin/bookings'].includes(path)?'BookingPage':['/partner/payments','/superadmin/payments'].includes(path)?'PaymentPage':path==='/superadmin/refunds'?'RefundPage':'Page');
    else if(method==='get'&&/^\/(customer|partner)\/bookings\/\{id\}$/.test(path))response.content['application/json'].schema=ref('BookingDetail');
    if(['/auth/staff/login','/auth/customer/otp/request','/auth/customer/otp/verify','/auth/me'].includes(path))response.content['application/json'].schema=ref({'/auth/staff/login':'WebSession','/auth/customer/otp/request':'OtpChallenge','/auth/customer/otp/verify':'MobileSession','/auth/me':'Actor'}[path]!);
    if(path==='/auth/refresh')response.content['application/json'].schema={oneOf:[ref('WebSession'),ref('MobileSession')]};
    if(method==='get'&&path==='/partner/reports/export')response.content={'text/csv':{schema:{type:'string'},example:'\uFEFFko‘rsatkich,qiymat\n"bookings","1"'}};
    if(method==='get'&&path==='/media/{id}'){
      response.content=Object.fromEntries(['image/png','image/jpeg','image/webp','application/pdf'].map(mime=>[mime,{schema:{type:'string',format:'binary'}}]));
      operation.responses['302']={description:'Short-lived S3 media URL',headers:{Location:{schema:{type:'string',format:'uri'}}}};
    }
    operation.responses={...operation.responses,[code]:response};for(const status of ['401','403','404','409','422','429','503'])operation.responses[status]={description:{'401':'Sessiya yaroqsiz','403':'Ruxsat yo‘q','404':'Topilmadi','409':'Holat yoki version konflikti','422':'Validatsiya xatosi','429':'Urinishlar limiti','503':'Tashqi xizmat mavjud emas'}[status],content:{'application/json':{schema:{$ref:'#/components/schemas/ApiError'}}}};
  }
  // Zod emits JSON Schema 2020; Nest's document uses OpenAPI 3.0 syntax.
  const normalize=(v:any):any=>{
    if(Array.isArray(v))return v.map(normalize);
    if(v&&typeof v==='object'){
      const result:any={};
      for(const[k,x]of Object.entries(v)){
        if(k==='$schema')continue;
        if(k==='const')result.enum=[x];
        else if((k==='exclusiveMinimum'||k==='exclusiveMaximum')&&typeof x==='number'){result[k==='exclusiveMinimum'?'minimum':'maximum']=x;result[k]=true;}
        else result[k]=normalize(x);
      }
      return result;
    }
    return v;
  };
  return normalize(document) as OpenAPIObject;
}
