import { Body,Controller,Get,Inject,Post,Query,Res } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { AccountantAccess,CurrentActor,Roles } from '../auth/guard';
import type { Actor } from '../auth/permissions';
import { ReportsService } from './reports.service';
import { AiUsageService } from '../ai/usage.service';
@ApiTags('Hisobot, audit va solishtirish') @Roles('STAFF','SUPERADMIN') @Controller()
export class ReportsController{
  constructor(@Inject(ReportsService) private readonly s:ReportsService,@Inject(AiUsageService) private readonly ai:AiUsageService){}
  @Get('superadmin/ai/usage') @Roles('SUPERADMIN') aiUsage(@CurrentActor() a:Actor,@Query() q:unknown){return this.ai.report(a,q);}
  @Get('partner/reports') @AccountantAccess() report(@CurrentActor() a:Actor,@Query() q:unknown,@Res({passthrough:true}) r:Response){r.setHeader('Cache-Control','private, no-store');return this.s.report(a,q);}
  @Get('superadmin/reports') @Roles('SUPERADMIN') global(@CurrentActor() a:Actor,@Query() q:unknown){return this.s.report(a,q,true);}
  @Get('partner/reports/export') @AccountantAccess() async export(@CurrentActor() a:Actor,@Query() q:any,@Res() r:Response){const csv=await this.s.export(a,q);r.setHeader('Content-Disposition',`attachment; filename="sihhat-report-${q.from}-${q.to}.csv"`);r.setHeader('Cache-Control','private, no-store');r.type('text/csv');return r.send('\uFEFF'+csv);}
  @Get('superadmin/audit') @Roles('SUPERADMIN') audit(@CurrentActor() a:Actor,@Query() q:unknown){return this.s.audit(a,q);}
  @Get('partner/reports/export.xlsx') @AccountantAccess() async xlsx(@CurrentActor() a:Actor,@Query() q:any,@Res() r:Response){const data=await this.s.export(a,q,'XLSX');r.setHeader('Content-Disposition',`attachment; filename="sihhat-report-${q.from}-${q.to}.xlsx"`);r.setHeader('Cache-Control','private, no-store');return r.type('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet').send(data);}
  @Get('partner/audit') auditPartner(@CurrentActor() a:Actor,@Query() q:unknown){return this.s.audit(a,q,true);}
  @Post('superadmin/reconciliation/imports') @Roles('SUPERADMIN') reconcile(@CurrentActor() a:Actor,@Body() b:unknown){return this.s.reconcile(a,b);}
  @Get('superadmin/reconciliation/differences') @Roles('SUPERADMIN') differences(@CurrentActor() a:Actor){return this.s.differences(a);}
}
