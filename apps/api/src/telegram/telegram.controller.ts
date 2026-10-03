import { Body, Controller, Get, Headers, Inject, Param, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CurrentActor, Public, Roles } from '../auth/guard';
import type { Actor } from '../auth/permissions';
import { TelegramLinkService } from './link.service';
import { TelegramService } from './telegram.service';

@ApiTags('Telegram xodim boti') @Controller('telegram') @Roles('STAFF', 'SUPERADMIN')
export class TelegramController {
  constructor(@Inject(TelegramLinkService) readonly links: TelegramLinkService, @Inject(TelegramService) readonly bot: TelegramService) {}
  @Get('account') status(@CurrentActor() actor: Actor) { return this.links.status(actor); }
  @Post('link') start(@CurrentActor() actor: Actor) { return this.links.start(actor); }
  @Post('link/:id/confirm') confirm(@CurrentActor() actor: Actor, @Param('id') id: string, @Body() body: unknown) { return this.links.confirm(actor, id, body); }
  @Post('disconnect') disconnect(@CurrentActor() actor: Actor) { return this.links.disconnect(actor); }
  @Public() @Post('webhook') webhook(@Headers('x-telegram-bot-api-secret-token') secret: string | undefined, @Body() body: unknown) { return this.bot.webhook(secret, body); }
}
