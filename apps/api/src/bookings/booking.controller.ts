import { Body,Controller,Get,Headers,Inject,Param,Post,Query } from '@nestjs/common';
import { ApiBody,ApiTags } from '@nestjs/swagger';
import { CurrentActor,Roles } from '../auth/guard';
import type { Actor } from '../auth/permissions';
import { apiSchema } from '../auth/auth.controller';
import { PricingService,quoteInput } from '../pricing/pricing.service';
import { BookingService,holdInput } from './booking.service';
@ApiTags('Narx va bron') @Controller()
export class BookingController {
  constructor(@Inject(BookingService) private readonly service:BookingService,@Inject(PricingService) private readonly pricing:PricingService){}
  @Post('customer/quotes') @Roles('CUSTOMER') @ApiBody({schema:apiSchema(quoteInput)}) quote(@CurrentActor() a:Actor,@Body() b:unknown){return this.pricing.quote(a,b);}
  @Post('partner/quotes') @Roles('STAFF','SUPERADMIN') @ApiBody({schema:apiSchema(quoteInput)}) manualQuote(@CurrentActor() a:Actor,@Body() b:unknown){return this.pricing.quote(a,b,true);}
  @Post('customer/bookings/hold') @Roles('CUSTOMER') @ApiBody({schema:apiSchema(holdInput)}) hold(@CurrentActor() a:Actor,@Body() b:unknown,@Headers('idempotency-key') k?:string){return this.service.hold(a,b,k);}
  @Get('customer/bookings') @Roles('CUSTOMER') customerList(@CurrentActor() a:Actor,@Query() q:unknown){return this.service.list(a,q);}
  @Get('customer/bookings/:id') @Roles('CUSTOMER') customerGet(@CurrentActor() a:Actor,@Param('id') id:string){return this.service.get(a,id);}
  @Get('partner/bookings') @Roles('STAFF','SUPERADMIN') list(@CurrentActor() a:Actor,@Query() q:unknown){return this.service.list(a,q);}
  @Get('superadmin/bookings') @Roles('SUPERADMIN') adminList(@CurrentActor() a:Actor,@Query() q:unknown){return this.service.list(a,q);}
  @Get('partner/bookings/:id') @Roles('STAFF','SUPERADMIN') get(@CurrentActor() a:Actor,@Param('id') id:string){return this.service.get(a,id);}
  @Post('partner/bookings/manual') @Roles('STAFF','SUPERADMIN') manual(@CurrentActor() a:Actor,@Body() b:unknown,@Headers('idempotency-key') k?:string){return this.service.manual(a,b,k);}
  @Post('partner/bookings/:id/check-in') @Roles('STAFF','SUPERADMIN') checkin(@CurrentActor() a:Actor,@Param('id') id:string,@Body() b:unknown){return this.service.transition(a,id,'CHECKED_IN',b);}
  @Post('partner/bookings/:id/check-out') @Roles('STAFF','SUPERADMIN') checkout(@CurrentActor() a:Actor,@Param('id') id:string,@Body() b:unknown){return this.service.transition(a,id,'CHECKED_OUT',b);}
  @Post('partner/bookings/:id/no-show') @Roles('STAFF','SUPERADMIN') noshow(@CurrentActor() a:Actor,@Param('id') id:string,@Body() b:unknown){return this.service.transition(a,id,'NO_SHOW',b);}
  @Post('partner/bookings/:id/move-room') @Roles('STAFF','SUPERADMIN') move(@CurrentActor() a:Actor,@Param('id') id:string,@Body() b:unknown){return this.service.move(a,id,b);}
}
