import { Body,Controller,Get,Headers,HttpCode,Inject,Param,Post,Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CurrentActor,Public,Roles } from '../auth/guard';
import type { Actor } from '../auth/permissions';
import { PaymentService } from './payment.service';
@ApiTags('To‘lov') @Controller()
export class PaymentController{
  constructor(@Inject(PaymentService) private readonly service:PaymentService){}
  @Post('customer/bookings/:id/checkout') @Roles('CUSTOMER') checkout(@CurrentActor() a:Actor,@Param('id') id:string,@Headers('idempotency-key') k?:string){return this.service.checkout(a,id,k);}
  @Post('payments/:id/local-confirm') local(@CurrentActor() a:Actor,@Param('id') id:string,@Headers('idempotency-key') k?:string){return this.service.localConfirm(a,id,k);}
  @Public() @Post('payments/payme') @HttpCode(200) callback(@Body() b:unknown,@Headers('authorization') auth?:string){return this.service.rpc(b,auth);}
  @Get('partner/payments') @Roles('STAFF','SUPERADMIN') list(@CurrentActor() a:Actor,@Query() q:unknown){return this.service.list(a,q);}
  @Get('superadmin/payments') @Roles('SUPERADMIN') adminList(@CurrentActor() a:Actor,@Query() q:unknown){return this.service.list(a,q);}
}
