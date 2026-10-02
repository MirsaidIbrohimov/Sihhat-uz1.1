import { Body, Controller, Get, Inject, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CurrentActor, Public, Roles } from '../auth/guard';
import type { Actor } from '../auth/permissions';
import { HomeService } from './home.service';

@ApiTags('Bosh sahifa va yangiliklar') @Controller()
export class HomeController {
  constructor(@Inject(HomeService) readonly service: HomeService) {}
  @Public() @Get('catalog/home') home() { return this.service.home(); }
  @Public() @Get('catalog/news/:id') article(@Param('id') id: string) { return this.service.article(id); }
  @Roles('SUPERADMIN') @Get('superadmin/articles') list(@CurrentActor() actor: Actor, @Query() query: unknown) { return this.service.list(actor, query); }
  @Roles('SUPERADMIN') @Post('superadmin/articles') create(@CurrentActor() actor: Actor, @Body() body: unknown) { return this.service.create(actor, body); }
  @Roles('SUPERADMIN') @Patch('superadmin/articles/:id') update(@CurrentActor() actor: Actor, @Param('id') id: string, @Body() body: unknown) { return this.service.update(actor, id, body); }
}
