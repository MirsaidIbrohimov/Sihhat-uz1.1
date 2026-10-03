import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app';
import { TelegramService } from '../src/telegram/telegram.service';
import { TelegramClient, TelegramError } from '../src/telegram/client';

async function main() {
  const app = await NestFactory.createApplicationContext(AppModule, { logger: false });
  try {
    const bot = app.get(TelegramService), client = app.get(TelegramClient);
    const info = process.argv.includes('--check') ? await bot.identity() : await bot.configure();
    const webhook = await client.call<{ url: string; pending_update_count?: number }>('getWebhookInfo');
    console.log(JSON.stringify({ connected: true, bot_id: info.id, username: info.username, webhook_configured: !!webhook.url, pending_updates: Number(webhook.pending_update_count || 0), metadata_configured: !process.argv.includes('--check') }));
  } finally { await app.close(); }
}
main().catch(error => {
  const hint = error instanceof TelegramError ? ` Telegram holati: ${error.status}.` : '';
  console.error(`Telegram sozlanmadi.${hint} Token, tarmoq va migratsiyalarni tekshiring. Maxfiy qiymatlar chiqarilmadi.`);
  process.exitCode = 1;
});
