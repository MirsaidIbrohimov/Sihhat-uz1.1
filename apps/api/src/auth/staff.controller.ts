import { Body, Controller, Get, Inject, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBody, ApiTags } from '@nestjs/swagger';
import { CurrentActor, Roles } from './guard';
import { type Actor } from './permissions';
import { StaffService, staffInput } from './staff.service';
import { apiSchema } from './auth.controller';

@ApiTags('Xodimlar va ruxsatlar') @Roles('SUPERADMIN','STAFF') @Controller()
export class StaffController {
  constructor(@Inject(StaffService) private readonly staff: StaffService) {}
  @Get('partner/staff') list(@CurrentActor() a: Actor, @Query() q: unknown) { return this.staff.list(a, q); }
  @Get('superadmin/staff') @Roles('SUPERADMIN') adminList(@CurrentActor() a: Actor, @Query() q: unknown) { return this.staff.list(a, q); }
  @Post('superadmin/director-assignments') @Roles('SUPERADMIN') @ApiBody({ schema: apiSchema(staffInput) })
  assign(@CurrentActor() a: Actor, @Body() b: unknown) { return this.staff.assignDirector(a, b); }
  @Post('partner/staff-invitations') @ApiBody({ schema: apiSchema(staffInput) })
  invite(@CurrentActor() a: Actor, @Body() b: unknown) { return this.staff.invite(a, b); }
  @Post('superadmin/staff-approvals/:id/approve') @Roles('SUPERADMIN') approve(@CurrentActor() a: Actor, @Param('id') id: string, @Body() b: unknown) { return this.staff.decision(a, id, true, b); }
  @Post('superadmin/staff-approvals/:id/reject') @Roles('SUPERADMIN') reject(@CurrentActor() a: Actor, @Param('id') id: string, @Body() b: unknown) { return this.staff.decision(a, id, false, b); }
  @Patch('partner/staff/:id/permissions') permissions(@CurrentActor() a: Actor, @Param('id') id: string, @Body() b: unknown) { return this.staff.permissions(a, id, b); }
  @Post('superadmin/staff/:id/block') @Roles('SUPERADMIN') block(@CurrentActor() a: Actor, @Param('id') id: string, @Body() b: unknown) { return this.staff.block(a, id, b); }
  @Post('superadmin/staff/:id/reset-password') @Roles('SUPERADMIN') reset(@CurrentActor() a: Actor, @Param('id') id: string) { return this.staff.reset(a, id); }
}
