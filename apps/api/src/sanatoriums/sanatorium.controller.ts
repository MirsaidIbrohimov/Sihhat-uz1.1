import { Body, Controller, Get, Inject, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBody, ApiTags } from '@nestjs/swagger';
import { CurrentActor, Roles } from '../auth/guard';
import { type Actor } from '../auth/permissions';
import { apiSchema } from '../auth/auth.controller';
import { SanatoriumService, draftInput } from './sanatorium.service';
import { Db,audit } from '../common/db';
import { parse,uuid,version,fail } from '../common/errors';
import { z } from 'zod';
import { MerchantSetupService, merchantSetupInput } from './merchant-setup.service';

@ApiTags('Sanatoriya va moderatsiya') @Roles('STAFF','SUPERADMIN') @Controller()
export class SanatoriumController {
  constructor(@Inject(SanatoriumService) private readonly service: SanatoriumService,@Inject(Db) private readonly db:Db,@Inject(MerchantSetupService) private readonly merchant:MerchantSetupService) {}
  @Get('partner/sanatoriums/:id/merchant-setup') merchantGet(@CurrentActor() a:Actor,@Param('id') id:string){return this.merchant.get(a,id);}
  @Patch('partner/sanatoriums/:id/merchant-setup') @ApiBody({schema:apiSchema(merchantSetupInput)}) merchantSave(@CurrentActor() a:Actor,@Param('id') id:string,@Body() b:unknown){return this.merchant.save(a,id,b);}
  @Patch('superadmin/sanatoriums/:id/config') @Roles('SUPERADMIN') async config(@CurrentActor() a:Actor,@Param('id') id:string,@Body() b:unknown){parse(uuid,id);const i=parse(z.object({version,payment_ready:z.boolean(),subscription_required:z.boolean().optional()}).strict(),b);return this.db.atomic(async tx=>{const r=await tx.sanatorium.updateMany({where:{id,version:i.version},data:{paymentReady:i.payment_ready,subscriptionRequired:i.subscription_required,version:{increment:1}}});if(!r.count)fail('VERSION_CONFLICT','Sanatoriya holati o‘zgargan');await audit(tx,a.id,'sanatorium.config_updated',id,id,undefined,i);return tx.sanatorium.findUniqueOrThrow({where:{id}});});}
  @Post('superadmin/sanatoriums') @Roles('SUPERADMIN') create(@CurrentActor() a: Actor, @Body() b: unknown) { return this.service.create(a, b); }
  @Get('superadmin/sanatoriums') @Roles('SUPERADMIN') adminList(@CurrentActor() a: Actor, @Query() q: unknown) { return this.service.list(a, q); }
  @Get('partner/sanatoriums') list(@CurrentActor() a: Actor, @Query() q: unknown) { return this.service.list(a, q); }
  @Get('partner/sanatoriums/:id') get(@CurrentActor() a: Actor, @Param('id') id: string) { return this.service.get(a, id); }
  @Post('partner/sanatoriums/:id/drafts') draft(@CurrentActor() a: Actor, @Param('id') id: string) { return this.service.newDraft(a, id); }
  @Patch('partner/sanatorium-revisions/:id') @ApiBody({ schema: apiSchema(draftInput) }) save(@CurrentActor() a: Actor, @Param('id') id: string, @Body() b: unknown) { return this.service.save(a, id, b); }
  @Post('partner/sanatorium-revisions/:id/submit') submit(@CurrentActor() a: Actor, @Param('id') id: string, @Body() b: unknown) { return this.service.submit(a, id, b); }
  @Post('superadmin/moderation/:id/approve') @Roles('SUPERADMIN') approve(@CurrentActor() a: Actor, @Param('id') id: string, @Body() b: unknown) { return this.service.moderate(a, id, true, b); }
  @Post('superadmin/moderation/:id/request-changes') @Roles('SUPERADMIN') changes(@CurrentActor() a: Actor, @Param('id') id: string, @Body() b: unknown) { return this.service.moderate(a, id, false, b); }
  @Post('superadmin/sanatoriums/:id/pause') @Roles('SUPERADMIN') pause(@CurrentActor() a: Actor, @Param('id') id: string, @Body() b: unknown) { return this.service.state(a, id, 'PAUSED', b); }
  @Post('superadmin/sanatoriums/:id/archive') @Roles('SUPERADMIN') archive(@CurrentActor() a: Actor, @Param('id') id: string, @Body() b: unknown) { return this.service.state(a, id, 'ARCHIVED', b); }
  @Post('superadmin/sanatoriums/:id/reopen') @Roles('SUPERADMIN') reopen(@CurrentActor() a: Actor, @Param('id') id: string, @Body() b: unknown) { return this.service.state(a, id, 'ACTIVE', b); }
  @Post('partner/sanatoriums/:id/bank-revisions') bank(@CurrentActor() a: Actor, @Param('id') id: string, @Body() b: unknown) { return this.service.bankRequest(a, id, b); }
  @Get('partner/sanatoriums/:id/bank-revisions') banks(@CurrentActor() a: Actor, @Param('id') id: string) { return this.service.banks(a,id); }
  @Post('superadmin/bank-revisions/:id/approve') @Roles('SUPERADMIN') bankApprove(@CurrentActor() a: Actor, @Param('id') id: string) { return this.service.bankApprove(a, id); }
}
