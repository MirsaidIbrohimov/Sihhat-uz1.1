import { Body,Controller,Get,Headers,Inject,Param,Post,Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CurrentActor,Roles } from '../auth/guard';
import type { Actor } from '../auth/permissions';
import { FinanceService } from './finance.service';
@ApiTags('Refund, payout va joyida to‘lov') @Controller()
export class FinanceController{
  constructor(@Inject(FinanceService) private readonly s:FinanceService){}
  @Post('customer/bookings/:id/refund-request') @Roles('CUSTOMER') request(@CurrentActor() a:Actor,@Param('id') id:string,@Body() b:unknown,@Headers('idempotency-key') k?:string){return this.s.refundRequest(a,id,b,k);}
  @Post('partner/bookings/:id/refund-request') @Roles('STAFF','SUPERADMIN') partnerRequest(@CurrentActor() a:Actor,@Param('id') id:string,@Body() b:unknown,@Headers('idempotency-key') k?:string){return this.s.refundRequest(a,id,b,k);}
  @Post('customer/bookings/:id/cancel') @Roles('CUSTOMER') cancel(@CurrentActor() a:Actor,@Param('id') id:string,@Body() b:unknown,@Headers('idempotency-key') k?:string){return this.s.cancelUnpaid(a,id,b,k);}
  @Get('superadmin/refunds') @Roles('SUPERADMIN') refunds(@CurrentActor() a:Actor,@Query() q:unknown){return this.s.refunds(a,q);}
  @Post('superadmin/refunds/:id/approve') @Roles('SUPERADMIN') approve(@CurrentActor() a:Actor,@Param('id') id:string,@Body() b:unknown){return this.s.refundDecision(a,id,true,b);}
  @Post('superadmin/refunds/:id/reject') @Roles('SUPERADMIN') reject(@CurrentActor() a:Actor,@Param('id') id:string,@Body() b:unknown){return this.s.refundDecision(a,id,false,b);}
  @Post('superadmin/refunds/:id/process') @Roles('SUPERADMIN') process(@CurrentActor() a:Actor,@Param('id') id:string){return this.s.refundProcess(a,id);}
  @Post('superadmin/payouts') @Roles('SUPERADMIN') payout(@CurrentActor() a:Actor,@Body() b:unknown,@Headers('idempotency-key') k?:string){return this.s.payoutCreate(a,b,k);}
  @Get('superadmin/payouts') @Roles('SUPERADMIN') payouts(@CurrentActor() a:Actor,@Query() q:unknown){return this.s.payouts(a,q);}
  @Get('partner/payouts') @Roles('STAFF','SUPERADMIN') partnerPayouts(@CurrentActor() a:Actor,@Query() q:unknown){return this.s.payouts(a,q);}
  @Post('superadmin/payouts/:id/approve') @Roles('SUPERADMIN') payoutApprove(@CurrentActor() a:Actor,@Param('id') id:string){return this.s.payoutApprove(a,id);}
  @Post('superadmin/payouts/:id/verify-bank-result') @Roles('SUPERADMIN') verify(@CurrentActor() a:Actor,@Param('id') id:string,@Body() b:unknown){return this.s.payoutVerify(a,id,b);}
  @Post('superadmin/payouts/:id/fail') @Roles('SUPERADMIN') payoutFail(@CurrentActor() a:Actor,@Param('id') id:string,@Body() b:unknown){return this.s.payoutFail(a,id,b);}
  @Post('partner/offline-payments') @Roles('STAFF','SUPERADMIN') offline(@CurrentActor() a:Actor,@Body() b:unknown,@Headers('idempotency-key') k?:string){return this.s.offline(a,b,k);}
  @Post('partner/offline-payments/:id/verify') @Roles('STAFF','SUPERADMIN') offlineVerify(@CurrentActor() a:Actor,@Param('id') id:string){return this.s.offlineVerify(a,id);}
}
