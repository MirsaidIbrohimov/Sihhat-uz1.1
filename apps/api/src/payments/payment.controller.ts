import { Body,Controller,Get,Headers,HttpCode,Inject,Param,Post,Query,Req } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CurrentActor,Public,Roles } from '../auth/guard';
import type { Actor } from '../auth/permissions';
import { PaymentService } from './payment.service';
import { TezcheckService } from './tezcheck.service';
import type { Request } from 'express';
@ApiTags('To‘lov') @Controller()
export class PaymentController{
  constructor(@Inject(PaymentService) private readonly service:PaymentService,@Inject(TezcheckService) private readonly tez:TezcheckService){}
  @Post('customer/bookings/:id/checkout') @Roles('CUSTOMER') checkout(@CurrentActor() a:Actor,@Param('id') id:string,@Headers('idempotency-key') k?:string){return this.service.config.PAYMENT_MODE==='tezcheck'?this.tez.checkout(a,id,k):this.service.checkout(a,id,k);}
  @Post('payments/:id/refresh') refresh(@CurrentActor() a:Actor,@Param('id') id:string){return this.tez.refresh(a,id);}
  @Get('superadmin/integrations/tezcheck') @Roles('SUPERADMIN') tezcheck(@CurrentActor() a:Actor){return this.tez.overview(a);}
  @Public() @Post('payments/tezcheck') @HttpCode(200) webhook(@Req() r:Request&{rawBody?:Buffer},@Headers('x-checkout-timestamp') t?:string,@Headers('x-checkout-delivery') d?:string,@Headers('x-checkout-signature') s?:string){return this.tez.webhook(r.rawBody??Buffer.alloc(0),t,d,s);}
  @Post('payments/:id/local-confirm') local(@CurrentActor() a:Actor,@Param('id') id:string,@Headers('idempotency-key') k?:string){return this.service.localConfirm(a,id,k);}
  @Public() @Post('payments/payme') @HttpCode(200) callback(@Body() b:unknown,@Headers('authorization') auth?:string){return this.service.rpc(b,auth);}
  @Get('partner/payments') @Roles('STAFF','SUPERADMIN') list(@CurrentActor() a:Actor,@Query() q:unknown){return this.service.list(a,q);}
  @Get('superadmin/payments') @Roles('SUPERADMIN') adminList(@CurrentActor() a:Actor,@Query() q:unknown){return this.service.list(a,q);}
}
