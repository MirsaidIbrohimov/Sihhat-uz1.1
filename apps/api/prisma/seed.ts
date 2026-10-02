import 'dotenv/config';
import { randomBytes, randomUUID } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createApp } from '../src/app';
import { Db } from '../src/common/db';
import { AuthService } from '../src/auth/auth.service';
import { base32, totp } from '../src/common/crypto';

// Explicitly local demo data. Never bootstrap demo credentials in a deployed database.
async function main(){
const url=new URL(process.env.DATABASE_URL ?? '');
if(process.env.NODE_ENV==='production'||url.hostname!=='127.0.0.1'||url.port!=='55432'||url.pathname!=='/sihhat')throw new Error('Demo seed faqat loyihaning 127.0.0.1:55432/sihhat bazasiga ruxsat etilgan.');
const folder=resolve('../../.local');await mkdir(folder,{recursive:true});
const path=resolve(folder,'dev-access.json');
const password=()=>`Sihhat-7!${randomBytes(16).toString('hex')}`;
let access:any;try{access=JSON.parse(await readFile(path,'utf8'));}catch{access={admin:{login:'admin.local',password:password(),mfa_secret:base32(randomBytes(20))},director:{login:'director.local',password:password()},reception:{login:'reception.local',password:password()},complete:false};await writeFile(path,JSON.stringify(access,null,2),{mode:0o600});}
const {app}=await createApp({quiet:true,swagger:false});await app.listen(0,'127.0.0.1');
const db=app.get(Db),auth=app.get(AuthService),base=await app.getUrl();
class Client{
  cookies=new Map<string,string>();csrf='';token='';
  async call(endpoint:string,method='GET',body?:unknown){const r=await fetch(base+endpoint,{method,headers:{'Content-Type':'application/json',Origin:'http://localhost:3000','Idempotency-Key':randomUUID(),...(this.token?{Authorization:`Bearer ${this.token}`}:{Cookie:[...this.cookies].map(([k,v])=>`${k}=${v}`).join('; '),'X-CSRF-Token':this.csrf})},...(body===undefined?{}:{body:JSON.stringify(body)})});for(const cookie of r.headers.getSetCookie()){const [pair]=cookie.split(';');const at=pair.indexOf('=');this.cookies.set(pair.slice(0,at),pair.slice(at+1));}const result=await r.json() as any;if(!r.ok)throw new Error(`${method} ${endpoint}: ${result.code} ${result.message}`);if(result.csrf_token)this.csrf=result.csrf_token;return result;}
}
try{
  if(access.complete){console.log('Demo avval yaratilgan. Kirish ma’lumotlari: .local/dev-access.json');}
  else{
    if(!await db.user.findUnique({where:{login:access.admin.login}}))await auth.bootstrap(access.admin.login,access.admin.password,access.admin.mfa_secret);
    const admin=new Client();await admin.call('/auth/staff/login','POST',{login:access.admin.login,password:access.admin.password,mfa_code:totp(access.admin.mfa_secret)});
    let policy=await db.refundPolicy.findFirst({where:{name:'Demo: kelishdan 24 soat oldin to‘liq refund'}});
    if(!policy)policy=await admin.call('/superadmin/refund-policies','POST',{name:'Demo: kelishdan 24 soat oldin to‘liq refund',kind:'FULL_BEFORE_CUTOFF',cutoff_hours:24});
    const sanatoriums:any[]=[];
    for(const [index,name] of ['Chimyon — mahalliy demo','Zomin — mahalliy demo'].entries()){
      let s:any=await db.sanatorium.findFirst({where:{name}});if(!s)s=await admin.call('/superadmin/sanatoriums','POST',{name});
      let type=await db.roomType.findFirst({where:{sanatoriumId:s.id,name:'Standart'}});if(!type)type=await admin.call('/partner/room-types','POST',{sanatorium_id:s.id,name:'Standart',max_guests:4,max_adults:2,max_children:2});
      for(const code of ['101','102','103','104','105','106'])if(!await db.room.findFirst({where:{sanatoriumId:s.id,code}}))await admin.call('/partner/rooms','POST',{sanatorium_id:s.id,room_type_id:type!.id,code});
      let rate=await db.ratePlan.findFirst({where:{sanatoriumId:s.id,name:'Uch mahal ovqat bilan'}});if(!rate)rate=await admin.call('/partner/rate-plans','POST',{sanatorium_id:s.id,room_type_id:type!.id,name:'Uch mahal ovqat bilan',mode:'ROOM',base_amount:index?'52000000':'45000000',policy_id:policy!.id,package_details:{included:['Yashash','Uch mahal ovqat']}});
      if(!s.publicRevisionId){const draft=await admin.call(`/partner/sanatoriums/${s.id}/drafts`,'POST',{});const assets=await db.mediaAsset.findMany({where:{revisionId:draft.id}});let photo=assets.find(a=>a.visibility==='PUBLIC'),document=assets.find(a=>a.mime==='application/pdf');
        if(!photo)photo=await admin.call('/partner/media','POST',{sanatorium_id:s.id,revision_id:draft.id,visibility:'PUBLIC',mime:'image/png',base64:'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+j8XcAAAAASUVORK5CYII='});
        if(!document)document=await admin.call('/partner/media','POST',{sanatorium_id:s.id,revision_id:draft.id,visibility:'PRIVATE',mime:'application/pdf',base64:Buffer.from('%PDF-1.4\n% LOCAL DEMO ONLY — not a legal document\n%%EOF').toString('base64')});
        const data={name,description:'Mahalliy dastur namoyishi uchun yaratilgan demo sanatoriya. Bu ma’lumot real sanatoriya taklifi emas.',legal_name:'Demo MChJ',stir:`12345678${index}`,region:index?'Jizzax':'Toshkent viloyati',address:index?'Zomin tumani, demo manzil':'Bo‘stonliq tumani, demo manzil',latitude:index?39.9:41.6,longitude:index?68.4:69.9,contact_phone:`+99899100000${index}`,check_in_time:'14:00',check_out_time:'12:00',amenities:['Wi-Fi','Avtoturargoh','Sayr yo‘laklari'],services:['Yashash','Dam olish'],meals:'Uch mahal ovqat',child_rules:'Bolalar yoshini bron hisobida kiriting.',medical_requirements:'Tibbiy xizmat va hujjatlarni sanatoriya mutaxassisi bilan aniqlang.',directions:'Mahalliy demo manzil.',required_documents:'Shaxsni tasdiqlovchi hujjat',photo_ids:[photo!.id],document_ids:[document!.id],terms_accepted:true};
        const saved=await admin.call(`/partner/sanatorium-revisions/${draft.id}`,'PATCH',{version:draft.version,data});const submitted=await admin.call(`/partner/sanatorium-revisions/${draft.id}/submit`,'POST',{version:saved.version});await admin.call(`/superadmin/moderation/${draft.id}/approve`,'POST',{version:submitted.version});
      }
      s=await db.sanatorium.findUniqueOrThrow({where:{id:s.id}});if(!s.paymentReady)await admin.call(`/superadmin/sanatoriums/${s.id}/config`,'PATCH',{version:s.version,payment_ready:true});
      if(!s.bankRevisionId){const b=await admin.call(`/partner/sanatoriums/${s.id}/bank-revisions`,'POST',{legal_name:'Demo MChJ',account:`2020800090000000000${index}`,mfo:'01234',stir:`12345678${index}`});await admin.call(`/superadmin/bank-revisions/${b.id}/approve`,'POST',{});}
      sanatoriums.push({id:s.id,name,type_id:type!.id,rate_id:rate!.id,policy_id:policy!.id});
    }
    for(const [key,phone,name] of [['director','+998991111110','Demo direktor'],['reception','+998991111111','Demo resepshn']]){
      const entry=access[key];let user=await db.user.findUnique({where:{login:entry.login}});
      if(!user){const r=await admin.call(key==='director'?'/superadmin/director-assignments':'/partner/staff-invitations','POST',{sanatorium_id:sanatoriums[0].id,name,login:entry.login,phone,temporary_password:entry.password});entry.membership_id=r.membership.id;user=await db.user.findUniqueOrThrow({where:{login:entry.login}});}
      const client=new Client();await client.call('/auth/staff/login','POST',{login:entry.login,password:entry.password});
      if(user.mustChangePassword){entry.old_password=entry.password;entry.password=password();await writeFile(path,JSON.stringify(access,null,2),{mode:0o600});await client.call('/auth/change-password','POST',{current_password:entry.old_password,new_password:entry.password});delete entry.old_password;}
      entry.user_id=user.id;
    }
    const recipient=access.director.user_id;if(!await db.message.findFirst({where:{title:'Sihhat.uz mahalliy sinov muhiti'}}))await admin.call('/messages','POST',{title:'Sihhat.uz mahalliy sinov muhiti',body:'Bu muhitda demo sanatoriyalar va mahalliy to‘lov adapteri ishlaydi. Kirish ma’lumotlari serverning .local/dev-access.json faylida.',recipient_ids:[recipient,access.reception.user_id]});
    if(!await db.task.findFirst({where:{title:'Sanatoriya profilini tekshirish'}}))await admin.call('/tasks','POST',{sanatorium_id:sanatoriums[0].id,title:'Sanatoriya profilini tekshirish',body:'Xonalar, tariflar va kelish shartlarini tekshiring.',assigned_to:recipient,due_at:new Date(Date.now()+86400000).toISOString()});
    for(const region of ['Toshkent viloyati','Jizzax','Namangan'])await db.catalogEntry.upsert({where:{kind_code:{kind:'REGION',code:region}},create:{kind:'REGION',code:region,name:region},update:{}});
    access.sanatoriums=sanatoriums;access.complete=true;await writeFile(path,JSON.stringify(access,null,2),{mode:0o600});console.log('Mahalliy demo tayyor. Maxfiy kirish ma’lumotlari: .local/dev-access.json');
  }
}finally{await app.close();}
}
void main().catch(e=>{console.error(e.message);process.exitCode=1;});
