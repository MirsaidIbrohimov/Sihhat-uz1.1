import { Body,Controller,Get,Headers,Inject,Param,Post,Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CurrentActor,Roles } from '../auth/guard';
import type { Actor } from '../auth/permissions';
import { BillingService } from './billing.service';
import { TezcheckService } from '../payments/tezcheck.service';
@ApiTags('Abonent va reklama') @Roles('STAFF','SUPERADMIN') @Controller()
export class BillingController{
  constructor(@Inject(BillingService) private readonly s:BillingService,@Inject(TezcheckService) private readonly tez:TezcheckService){}
  @Get('superadmin/subscription-plans') @Roles('SUPERADMIN') plans(@CurrentActor() a:Actor){return this.s.plans(a);}
  @Post('superadmin/subscription-plans') @Roles('SUPERADMIN') plan(@CurrentActor() a:Actor,@Body() b:unknown){return this.s.plan(a,b);}
  @Get('superadmin/subscriptions') @Roles('SUPERADMIN') subscriptions(@CurrentActor() a:Actor){return this.s.subscriptions(a);}
  @Post('superadmin/subscriptions') @Roles('SUPERADMIN') subscribe(@CurrentActor() a:Actor,@Body() b:unknown,@Headers('idempotency-key') k?:string){return this.s.subscribe(a,b,k);}
  @Post('superadmin/subscriptions/:id/invoice') @Roles('SUPERADMIN') renew(@CurrentActor() a:Actor,@Param('id') id:string,@Headers('idempotency-key') k?:string){return this.s.renew(a,id,k);}
  @Get('partner/invoices') invoices(@CurrentActor() a:Actor,@Query() q:unknown){return this.s.invoices(a,q);}
  @Get('superadmin/invoices') @Roles('SUPERADMIN') adminInvoices(@CurrentActor() a:Actor,@Query() q:unknown){return this.s.invoices(a,q);}
  @Post('partner/invoices/:id/checkout') checkout(@CurrentActor() a:Actor,@Param('id') id:string,@Headers('idempotency-key') k?:string){return this.s.payments.config.PAYMENT_MODE==='tezcheck'?this.tez.checkout(a,id,k,true):this.s.invoiceCheckout(a,id,k);}
  @Get('partner/ad-campaigns') ads(@CurrentActor() a:Actor){return this.s.ads(a);}
  @Get('superadmin/ad-campaigns') @Roles('SUPERADMIN') adminAds(@CurrentActor() a:Actor){return this.s.ads(a);}
  @Post('partner/ad-campaigns') request(@CurrentActor() a:Actor,@Body() b:unknown,@Headers('idempotency-key') k?:string){return this.s.adRequest(a,b,k);}
  @Post('partner/ad-campaigns/:id/archive') archive(@CurrentActor() a:Actor,@Param('id') id:string){return this.s.archiveAd(a,id);}
  @Post('superadmin/ad-campaigns/:id/approve') @Roles('SUPERADMIN') approve(@CurrentActor() a:Actor,@Param('id') id:string,@Body() b:unknown){return this.s.adDecision(a,id,true,b);}
  @Post('superadmin/ad-campaigns/:id/reject') @Roles('SUPERADMIN') reject(@CurrentActor() a:Actor,@Param('id') id:string,@Body() b:unknown){return this.s.adDecision(a,id,false,b);}
}
