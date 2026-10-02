import { Body,Controller,Get,Inject,Param,Patch,Post } from '@nestjs/common';
import { ApiBody,ApiTags } from '@nestjs/swagger';
import { CurrentActor,Roles } from '../auth/guard';
import type { Actor } from '../auth/permissions';
import { apiSchema } from '../auth/auth.controller';
import { InventoryService,rateInput,roomTypeInput } from './inventory.service';
@ApiTags('Xona va tariflar') @Roles('STAFF','SUPERADMIN') @Controller()
export class InventoryController {
  constructor(@Inject(InventoryService) private readonly service:InventoryService) {}
  @Get('partner/sanatoriums/:id/inventory') list(@CurrentActor() a:Actor,@Param('id') id:string){return this.service.list(a,id);}
  @Post('partner/room-types') @ApiBody({schema:apiSchema(roomTypeInput)}) type(@CurrentActor() a:Actor,@Body() b:unknown){return this.service.roomType(a,b);}
  @Post('partner/rooms') room(@CurrentActor() a:Actor,@Body() b:unknown){return this.service.room(a,b);}
  @Post('superadmin/refund-policies') @Roles('SUPERADMIN') policy(@CurrentActor() a:Actor,@Body() b:unknown){return this.service.policy(a,b);}
  @Post('partner/rate-plans') @ApiBody({schema:apiSchema(rateInput)}) rate(@CurrentActor() a:Actor,@Body() b:unknown){return this.service.rate(a,b);}
  @Patch('partner/rate-plans/:id') update(@CurrentActor() a:Actor,@Param('id') id:string,@Body() b:unknown){return this.service.updateRate(a,id,b);}
  @Post('partner/daily-rates') daily(@CurrentActor() a:Actor,@Body() b:unknown){return this.service.daily(a,b);}
  @Post('partner/discounts') discount(@CurrentActor() a:Actor,@Body() b:unknown){return this.service.discount(a,b);}
  @Post('partner/inventory-blocks') block(@CurrentActor() a:Actor,@Body() b:unknown){return this.service.block(a,b);}
  @Post('partner/inventory-blocks/:id/release') unblock(@CurrentActor() a:Actor,@Param('id') id:string,@Body() b:unknown){return this.service.unblock(a,id,b);}
}
