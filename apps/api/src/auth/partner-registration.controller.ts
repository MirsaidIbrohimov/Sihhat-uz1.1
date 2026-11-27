import { Body, Controller, Get, Inject, Param, Post, Query, Req } from '@nestjs/common';
import { ApiBody, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { CurrentActor, Public, Roles } from './guard';
import type { Actor } from './permissions';
import { apiSchema } from './auth.controller';
import { extractRequestMeta, resolveAuditIp } from '../common/request-meta';
import {
  PartnerRegistrationService,
  partnerApproveInput,
  partnerRegistrationInput,
  partnerRejectInput,
} from './partner-registration.service';

@ApiTags('Hamkor ro‘yxatdan o‘tish')
@Controller()
export class PartnerRegistrationController {
  constructor(
    @Inject(PartnerRegistrationService)
    private readonly service: PartnerRegistrationService,
  ) {}

  @Public()
  @Get('auth/partner-register/availability')
  @ApiOperation({ summary: 'Yangi hamkor hisobi uchun username va emailni baza bilan jonli tekshirish' })
  availability(@Query() q: unknown, @Req() req: Request) {
    return this.service.checkAvailability(q, resolveAuditIp(req));
  }

  @Public()
  @Post('auth/partner-register')
  @ApiOperation({ summary: 'Hamkorlar panelidan yangi sanatoriya va hisob ochish arizasini yuborish' })
  @ApiBody({ schema: apiSchema(partnerRegistrationInput) })
  submit(@Body() body: unknown, @Req() req: Request) {
    return this.service.submit(body, extractRequestMeta(req, 'WEB'));
  }

  @Get('superadmin/partner-registrations')
  @Roles('SUPERADMIN')
  @ApiOperation({ summary: 'Superadmin uchun hamkor arizalari ro‘yxati' })
  list(@CurrentActor() actor: Actor, @Query() q: unknown) {
    return this.service.list(actor, q);
  }

  @Get('superadmin/partner-registrations/:id')
  @Roles('SUPERADMIN')
  @ApiOperation({ summary: 'Hamkor arizasi tafsilotlari' })
  get(@CurrentActor() actor: Actor, @Param('id') id: string) {
    return this.service.get(actor, id);
  }

  @Post('superadmin/partner-registrations/:id/approve')
  @Roles('SUPERADMIN')
  @ApiOperation({ summary: 'Hamkor arizasini tasdiqlash: hisob ochish, sanatoriyani katalogga chiqarish va email yuborish' })
  @ApiBody({ schema: apiSchema(partnerApproveInput) })
  approve(@CurrentActor() actor: Actor, @Param('id') id: string, @Body() body: unknown) {
    return this.service.approve(actor, id, body);
  }

  @Post('superadmin/partner-registrations/:id/reject')
  @Roles('SUPERADMIN')
  @ApiOperation({ summary: 'Hamkor arizasini rad etish va sababini emailga yuborish' })
  @ApiBody({ schema: apiSchema(partnerRejectInput) })
  reject(@CurrentActor() actor: Actor, @Param('id') id: string, @Body() body: unknown) {
    return this.service.reject(actor, id, body);
  }
}
