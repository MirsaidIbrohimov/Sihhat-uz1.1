import { Body,Controller,Get,Inject,Param,Post,Req,Res } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { Request,Response } from 'express';
import { CurrentActor,Public,Roles } from '../auth/guard';
import type { Actor } from '../auth/permissions';
import { MediaService } from './media.service';
@ApiTags('Fayllar') @Controller()
export class MediaController {
  constructor(@Inject(MediaService) private readonly media:MediaService){}
  @Post('partner/media') @Roles('STAFF','SUPERADMIN') upload(@CurrentActor() a:Actor,@Body() b:unknown){return this.media.upload(a,b);}
  @Public() @Get('media/:id') async get(@Param('id') id:string,@Req() req:Request,@Res() res:Response){const bearer=req.headers.authorization?.startsWith('Bearer ')?req.headers.authorization.slice(7):undefined;const file=await this.media.fetch(id,bearer??req.cookies?.sihhat_access,bearer?'MOBILE':'WEB');res.setHeader('Cache-Control',file.public?'public, max-age=60':'private, no-store');res.setHeader('X-Content-Type-Options','nosniff');if(file.url)return res.redirect(file.url);res.type(file.mime);if(file.mime==='application/pdf')res.setHeader('Content-Disposition','attachment; filename="document.pdf"');return res.send(file.bytes);}
}
