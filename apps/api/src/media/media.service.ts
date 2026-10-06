import { Inject,Injectable } from '@nestjs/common';
import { z } from 'zod';
import { randomUUID } from 'node:crypto';
import { mkdir,readFile,writeFile } from 'node:fs/promises';
import { dirname,resolve,sep } from 'node:path';
import { S3Client,PutObjectCommand,GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { CONFIG,type Config } from '../common/config';
import { Db,audit } from '../common/db';
import { parse,uuid,fail } from '../common/errors';
import { type Actor,scope } from '../auth/permissions';
import { AuthService } from '../auth/auth.service';

@Injectable()
export class MediaService {
  constructor(@Inject(Db) readonly db:Db,@Inject(CONFIG) readonly config:Config,@Inject(AuthService) readonly auth:AuthService){}
  private s3(){return new S3Client({endpoint:this.config.S3_ENDPOINT||undefined,region:this.config.S3_REGION,forcePathStyle:!!this.config.S3_ENDPOINT,credentials:{accessKeyId:this.config.S3_ACCESS_KEY,secretAccessKey:this.config.S3_SECRET_KEY}});}
  private path(key:string){const root=resolve(this.config.STORAGE_PATH);const target=resolve(root,key);if(!target.startsWith(root+sep))throw new Error('Storage path escaped');return target;}
  async upload(actor:Actor,body:unknown){
    const i=parse(z.object({sanatorium_id:uuid,revision_id:uuid.optional(),visibility:z.enum(['PUBLIC','PRIVATE']),mime:z.enum(['image/png','image/jpeg','image/webp','application/pdf']),base64:z.string().min(8).max(11_184_812)}).strict(),body);scope(actor,i.sanatorium_id,'sanatorium.profile.edit');await this.auth.limit(`media:${actor.id}`,40,3600);
    const bytes=Buffer.from(i.base64,'base64');if(bytes.length>8*1024*1024||bytes.length<8)fail('FILE_SIZE_INVALID','Fayl 8 MBdan oshmasin',422);
    const valid=i.mime==='image/png'?bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])):i.mime==='image/jpeg'?bytes[0]===255&&bytes[1]===216&&bytes[2]===255:i.mime==='image/webp'?bytes.subarray(0,4).toString()==='RIFF'&&bytes.subarray(8,12).toString()==='WEBP':bytes.subarray(0,5).toString()==='%PDF-';
    if(!valid||(i.mime==='application/pdf'&&i.visibility==='PUBLIC'))fail('FILE_TYPE_INVALID','Fayl turi yoki ko‘rinish darajasi noto‘g‘ri',422);
    if(i.revision_id){const r=await this.db.sanatoriumRevision.findFirst({where:{id:i.revision_id,sanatoriumId:i.sanatorium_id,status:{in:['DRAFT','CHANGES_REQUESTED']}}});if(!r)fail('NOT_FOUND','Tahrir topilmadi',404);}
    const id=randomUUID();const key=`${i.sanatorium_id}/${id}`;
    if(this.config.STORAGE_ADAPTER==='s3'){const s3=this.s3();try{await s3.send(new PutObjectCommand({Bucket:this.config.S3_BUCKET,Key:key,Body:bytes,ContentType:i.mime}));}finally{s3.destroy();}}
    else{const path=this.path(key);await mkdir(dirname(path),{recursive:true});await writeFile(path,bytes,{mode:0o600});}
    return this.db.atomic(async tx=>{const asset=await tx.mediaAsset.create({data:{id,sanatoriumId:i.sanatorium_id,revisionId:i.revision_id,key,mime:i.mime,size:bytes.length,visibility:i.visibility,uploadedBy:actor.id}});await audit(tx,actor.id,'media.uploaded',id,i.sanatorium_id,undefined,{mime:i.mime,size:bytes.length,visibility:i.visibility});return {id:asset.id,url:`/media/${asset.id}`,mime:asset.mime,size:asset.size};});
  }
  async fetch(id:string,token?:string,channel:'WEB'|'MOBILE'='WEB'){
    parse(uuid,id);const asset=await this.db.mediaAsset.findUnique({where:{id}});if(!asset)fail('NOT_FOUND','Fayl topilmadi',404);
    let isPublic=false;
    if(asset.visibility==='PUBLIC'){const s=await this.db.sanatorium.findUnique({where:{id:asset.sanatoriumId}});if(s?.status==='ACTIVE'&&s.publicRevisionId){const r=await this.db.sanatoriumRevision.findUnique({where:{id:s.publicRevisionId}});isPublic=!!(r?.data as any)?.photo_ids?.includes(id);}}
    if(!isPublic&&asset.visibility==='PUBLIC'&&asset.mime.startsWith('image/')){
      const s=await this.db.sanatorium.findFirst({where:{id:asset.sanatoriumId,status:'ACTIVE',publicRevisionId:{not:null}}});
      if(s){
        const ads=await this.db.adCampaign.findMany({where:{sanatoriumId:asset.sanatoriumId,status:'APPROVED',startsAt:{lte:new Date()},endsAt:{gt:new Date()},data:{path:['image_asset_id'],equals:id}}});
        for(const ad of ads){
          if(ad.amount===0n&&(ad.data as any).free===true&&!ad.invoiceId||ad.invoiceId&&await this.db.invoice.findFirst({where:{id:ad.invoiceId,status:'PAID'}})){isPublic=true;break;}
        }
      }
    }
    if(!isPublic){if(!token)fail('NOT_FOUND','Fayl topilmadi',404);const actor=await this.auth.authenticate(token,channel);const recipients=await this.db.messageRecipient.findMany({where:{userId:actor.id},select:{messageId:true}});const shared=await this.db.message.findFirst({where:{id:{in:recipients.map(r=>r.messageId)},assetIds:{has:asset.id}}});if(!shared)scope(actor,asset.sanatoriumId,asset.visibility==='PRIVATE'&&!asset.revisionId?'reports.financial.read':'sanatorium.profile.edit');}
    if(this.config.STORAGE_ADAPTER==='s3'){const s3=this.s3();try{return {mime:asset.mime,url:await getSignedUrl(s3,new GetObjectCommand({Bucket:this.config.S3_BUCKET,Key:asset.key,ResponseContentType:asset.mime}),{expiresIn:60}),public:isPublic};}finally{s3.destroy();}}
    return {mime:asset.mime,bytes:await readFile(this.path(asset.key)),public:isPublic};
  }
}
