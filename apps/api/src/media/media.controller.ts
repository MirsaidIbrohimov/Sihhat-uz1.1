import { Body, Controller, Get, Inject, Param, Post, Req, Res } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { CurrentActor, Public, Roles } from '../auth/guard';
import type { Actor } from '../auth/permissions';
import { MediaService } from './media.service';

@ApiTags('Fayllar')
@Controller()
export class MediaController {
  constructor(@Inject(MediaService) private readonly media: MediaService) {}

  @Post('partner/media')
  @Roles('STAFF', 'SUPERADMIN')
  upload(@CurrentActor() a: Actor, @Body() b: unknown) {
    return this.media.upload(a, b);
  }

  @Public()
  @Get('media/:id')
  async get(@Param('id') id: string, @Req() req: Request, @Res() res: Response) {
    const bearer = req.headers.authorization?.startsWith('Bearer ')
      ? req.headers.authorization.slice(7)
      : undefined;
    const file = await this.media.fetch(
      id,
      bearer ?? req.cookies?.sihhat_access,
      bearer ? 'MOBILE' : 'WEB',
      req.query?.w,
    );
    const cacheHeader = !file.public
      ? 'private, no-store'
      : file.sanatoriumPublic && file.widthBucket
        ? 'public, max-age=604800, stale-while-revalidate=2592000, immutable'
        : file.sanatoriumPublic
          ? 'public, max-age=3600, stale-while-revalidate=86400'
          : 'public, max-age=60, stale-while-revalidate=300';
    res.setHeader('Cache-Control', cacheHeader);
    res.setHeader('X-Content-Type-Options', 'nosniff');
    if (file.etag) {
      res.setHeader('ETag', file.etag);
      if (file.public && req.headers['if-none-match'] === file.etag) {
        return res.status(304).end();
      }
    }
    if (file.url) return res.redirect(file.url);
    res.type(file.mime);
    if (file.mime === 'application/pdf') {
      res.setHeader('Content-Disposition', 'attachment; filename="document.pdf"');
    }
    return res.send(file.bytes);
  }
}
