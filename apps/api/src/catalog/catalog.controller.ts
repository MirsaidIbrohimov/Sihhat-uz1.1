import { Body,Controller,Get,Inject,Param,Post,Query,Req } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { z } from 'zod';
import { CurrentActor,Public,Roles } from '../auth/guard';
import { type Actor,requirePlatform } from '../auth/permissions';
import { parse,uuid } from '../common/errors';
import { Db,audit } from '../common/db';
import { CatalogService } from './catalog.service';
import { AiService } from '../ai/ai.service';
@ApiTags('Katalog va AI') @Controller()
export class CatalogController{
  constructor(@Inject(CatalogService) private readonly s:CatalogService,@Inject(AiService) private readonly ai:AiService,@Inject(Db) private readonly db:Db){}
  @Public() @Get('catalog/sanatoriums') list(@Query() q:unknown){return this.s.list(q);}
  @Public() @Get('catalog/sanatoriums/:id') get(@Param('id') id:string){return this.s.get(id);}
  @Public() @Get('catalog/entries') entries(){return this.s.entries();}
  @Public() @Get('catalog/ads') ads(){return this.s.ads();}
  @Public() @Post('catalog/ads/:id/events') event(@Param('id') id:string,@Body() b:unknown,@Req() r:Request){return this.s.adEvent(id,b,r.ip??'unknown');}
  @Public() @Get('catalog/compare') async compare(@Query('ids') ids:string){return Promise.all(parse(z.array(uuid).min(1).max(3),ids?.split(',')).map(id=>this.s.get(id)));}
  @Get('customer/favorites') @Roles('CUSTOMER') favorites(@CurrentActor() a:Actor){return this.s.favorites(a);}
  @Post('customer/favorites/:id') @Roles('CUSTOMER') favorite(@CurrentActor() a:Actor,@Param('id') id:string,@Body() b:unknown){return this.s.favorite(a,id,b);}
  @Post('ai/messages') @Roles('CUSTOMER') message(@CurrentActor() a:Actor,@Body() b:unknown){return this.ai.message(a,b);}
  @Post('superadmin/catalog/entries') @Roles('SUPERADMIN') async entry(@CurrentActor() a:Actor,@Body() b:unknown){requirePlatform(a,'catalog.manage');const i=parse(z.object({kind:z.enum(['REGION','AMENITY','SERVICE']),name:z.string().min(2).max(100),code:z.string().regex(/^[a-z0-9_-]{2,60}$/)}).strict(),b);return this.db.atomic(async tx=>{const e=await tx.catalogEntry.create({data:i});await audit(tx,a.id,'catalog.entry_created',e.id);return e;});}
}
