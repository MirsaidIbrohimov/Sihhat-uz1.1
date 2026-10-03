import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { existsSync, readFileSync, writeFileSync, unlinkSync } from 'node:fs';
import { resolve } from 'node:path';
import { AppModule } from './app';
import { CONFIG, type Config } from './common/config';
import { Db } from './common/db';
import { OutboxService } from './outbox/outbox.service';
import { TelegramClient, TelegramError } from './telegram/client';
import { TelegramService } from './telegram/telegram.service';

async function main() {
  const app = await NestFactory.createApplicationContext(AppModule, { logger: false });
  const config = app.get<Config>(CONFIG), bot = app.get(TelegramService), client = app.get(TelegramClient), db = app.get(Db), outbox = app.get(OutboxService);
  if (!client.enabled) { console.error('Telegram bot yoqilmagan. TELEGRAM_MODE va server tokenini sozlang.'); await app.close(); process.exitCode = 1; return; }
  const lockPath = resolve('../../.local/telegram-worker.lock');
  if (config.NODE_ENV !== 'production') {
    if (existsSync(lockPath)) {
      let alive = false;
      try { const old = JSON.parse(readFileSync(lockPath, 'utf8')); process.kill(old.pid, 0); alive = true; } catch { /* Stale local process marker. */ }
      if (alive) { console.error('Lokal Telegram worker allaqachon ishlayapti.'); await app.close(); process.exitCode = 1; return; }
      unlinkSync(lockPath);
    }
    writeFileSync(lockPath, JSON.stringify({ pid: process.pid, started_at: new Date().toISOString() }), { flag: 'wx', mode: 0o600 });
  }
  let stopping = false, poll: Promise<void> | undefined, maintenance = 0, failures = 0, nextPollAt = 0;
  const stop = () => { stopping = true; };
  process.once('SIGINT', stop); process.once('SIGTERM', stop);
  try {
    const info = await bot.identity();
    if (config.TELEGRAM_MODE === 'polling') {
      const hook = await client.call<{ url: string }>('getWebhookInfo');
      if (hook.url) throw new Error('Webhook exists');
    }
    console.log(`Sihhat Telegram worker: @${info.username} (${config.TELEGRAM_MODE}).`);
    while (!stopping) {
      try {
        if (config.TELEGRAM_MODE === 'polling' && !poll && Date.now() >= nextPollAt) {
          poll = (async () => {
            const state = await db.telegramBotState.findUnique({ where: { botId: client.botId } });
            const updates = await client.call<any[]>('getUpdates', { offset: Number(state?.offset || 0), timeout: 25, limit: 50, allowed_updates: ['message', 'callback_query'] });
            await bot.enqueue(updates, true);
            failures = 0;
          })().catch(error => {
            failures++; nextPollAt = Date.now() + Math.min(60000, 1000 * 2 ** Math.min(failures, 6));
            if (error instanceof TelegramError && [401, 409].includes(error.status)) {
              console.error('Telegram tokeni yoki polling jarayoni mos emas. Sozlamani tekshiring.'); stopping = true; process.exitCode = 1;
            } else if (failures === 1 || failures % 30 === 0) console.error('Telegram yangilanishlari olinmadi; xavfsiz qayta urinish davom etadi.');
          }).finally(() => { poll = undefined; });
        }
        await bot.runPending();
        // This process can dispatch notifications even while the API is offline.
        for (const id of await outbox.claim()) try { await outbox.process(id); } catch { /* Persisted outbox retries remain scheduled. */ }
        if (Date.now() - maintenance > 60000) { await bot.schedule(); await bot.monitor(); maintenance = Date.now(); }
        await bot.flushNotifications();
      } catch { console.error('Telegram worker davri bajarilmadi; keyingi davrda qayta urinadi.'); }
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    await poll;
  } finally {
    if (config.NODE_ENV !== 'production' && existsSync(lockPath)) {
      try { if (JSON.parse(readFileSync(lockPath, 'utf8')).pid === process.pid) unlinkSync(lockPath); } catch { /* Do not remove another worker's marker. */ }
    }
    await app.close();
  }
}
main().catch(() => { console.error('Telegram worker ishga tushmadi. Token, tarmoq, webhook rejimi va bazani tekshiring.'); process.exitCode = 1; });
