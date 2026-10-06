import {test,before,after} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {setup,staff} from './helpers';
import {sanatorium} from './fixtures';

let ctx:Awaited<ReturnType<typeof setup>>,s:Awaited<ReturnType<typeof sanatorium>>;
before(async()=>{ctx=await setup();s=await sanatorium(ctx.admin);});
after(async()=>ctx.app.close());
const payload=()=>({sanatorium_id:s.id,title:'Yangi taklif',placement:'HOME',starts_at:new Date(Date.now()-60000).toISOString(),ends_at:new Date(Date.now()+86400000).toISOString(),image_asset_id:s.photo.id,text:'Dam olish uchun taklif'});

test('ads: two placements, external link or sanatorium, discount and one campaign for repeated key',async()=>{
 const input={...payload(),placement:'POPUP',target_kind:'URL',target_url:'https://example.com/taklif',has_discount:true,discount_percent:15,discount_text:'Ish kunlari uchun'};
 const key=ctx.admin.key();
 const [one,two]=await Promise.all([ctx.admin.call('/partner/ad-campaigns','POST',input,key),ctx.admin.call('/partner/ad-campaigns','POST',input,key)]);
 assert.equal(one.status,201);assert.equal(two.body.id,one.body.id);
 assert.equal(await ctx.db.adCampaign.count({where:{id:one.body.id}}),1);
 assert.equal((await ctx.admin.call(`/superadmin/ad-campaigns/${one.body.id}/approve`,'POST',{})).status,201);
 const ad=(await ctx.admin.call('/catalog/ads')).body.find((a:any)=>a.id===one.body.id);
 assert.equal(ad.placement,'POPUP');assert.deepEqual(ad.target,{kind:'URL',url:input.target_url});assert.equal(ad.discount_percent,15);assert.equal(ad.has_discount,true);
 const second=await ctx.admin.call('/partner/ad-campaigns','POST',{...payload(),target_kind:'SANATORIUM',target_sanatorium_id:s.id});
 assert.equal(second.status,201);await ctx.admin.call(`/superadmin/ad-campaigns/${second.body.id}/approve`,'POST',{});
 const home=(await ctx.admin.call('/catalog/ads')).body.find((a:any)=>a.id===second.body.id);
 assert.equal(home.placement,'HOME');assert.deepEqual(home.target,{kind:'SANATORIUM',sanatorium_id:s.id});assert.equal(home.has_discount,false);
});

test('ads: uploaded advertisement image is private before approval and public only during publication',async()=>{
 const uploaded=await ctx.admin.call('/partner/media','POST',{sanatorium_id:s.id,visibility:'PUBLIC',mime:'image/png',base64:'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+j8XcAAAAASUVORK5CYII='});
 assert.equal(uploaded.status,201);
 const publicImage=()=>fetch(`${ctx.base}/media/${uploaded.body.id}`);
 assert.equal((await publicImage()).status,404);
 const created=await ctx.admin.call('/partner/ad-campaigns','POST',{...payload(),image_asset_id:uploaded.body.id});assert.equal(created.status,201);
 assert.equal((await publicImage()).status,404);
 await ctx.admin.call(`/superadmin/ad-campaigns/${created.body.id}/approve`,'POST',{});
 const image=await publicImage();assert.equal(image.status,200);assert.match(image.headers.get('content-type')??'',/image\/png/);
 const other=await sanatorium(ctx.admin);const director=await staff(ctx.admin,'ad.other','+998931445555',other.id);
 assert.equal((await director.client.call(`/partner/ad-campaigns/${created.body.id}/archive`,'POST',{})).status,404);
 assert.equal((await ctx.admin.call(`/partner/ad-campaigns/${created.body.id}/archive`,'POST',{})).status,201);
 assert.equal((await publicImage()).status,404);assert.ok(!(await ctx.admin.call('/catalog/ads')).body.some((a:any)=>a.id===created.body.id));
});

test('ads: missing target, unsafe links, missing discount and foreign image are rejected',async()=>{
 for(const extra of [{placement:'SEARCH'},{target_kind:'URL'},{target_kind:'URL',target_url:'javascript:alert(1)'},{target_kind:'URL',target_url:'https://user:pass@example.com'},{has_discount:true},{has_discount:true,discount_percent:101},{target_sanatorium_id:randomUUID()}]){
  const result=await ctx.admin.call('/partner/ad-campaigns','POST',{...payload(),...extra});assert.equal(result.status,422);
 }
 const other=await sanatorium(ctx.admin);
 assert.equal((await ctx.admin.call('/partner/ad-campaigns','POST',{...payload(),image_asset_id:other.photo.id})).status,404);
});
