import { createApp } from './app';
import { registerAfterEmitCommit } from './common/db';
import { OutboxService } from './outbox/outbox.service';
import { TelegramService } from './telegram/telegram.service';
import { TelegramClient } from './telegram/client';
import { AppVersionService } from './catalog/app-version';

async function main() {
  const { app, config } = await createApp();
  await app.listen(config.PORT, '0.0.0.0');
  console.log(`Sihhat uz API: http://0.0.0.0:${config.PORT}; Swagger: /docs`);

  const outbox = app.get(OutboxService);
  const bot = app.get(TelegramService);
  const tgClient = app.get(TelegramClient);
  const appVersion = app.get(AppVersionService);

  let pumping = false;
  let pumpAgain = false;
  const pump = async () => {
    if (config.PUBLIC_DEMO_ENABLED) return;
    if (pumping) { pumpAgain = true; return; }
    pumping = true;
    try {
      do {
        pumpAgain = false;
        await outbox.tick();
        if (tgClient.enabled) await bot.flushNotifications();
      } while (pumpAgain);
    } catch {
      /* Durable OutboxEvent and NotificationDelivery rows retry on the next tick. */
    } finally {
      pumping = false;
    }
  };

  let pumpScheduled = false;
  const schedulePump = () => {
    if (pumpScheduled) return;
    pumpScheduled = true;
    setTimeout(() => {
      pumpScheduled = false;
      void pump();
    }, 30).unref();
  };

  if (!config.PUBLIC_DEMO_ENABLED && config.NODE_ENV !== 'test') {
    registerAfterEmitCommit(schedulePump);
    void bot.startupSync();
    let maintenanceAt = 0;
    const timer = setInterval(() => {
      void pump();
      if (Date.now() - maintenanceAt > 60_000) {
        maintenanceAt = Date.now();
        void appVersion.checkAndAnnounceNewRelease().catch(() => undefined);
        if (config.TELEGRAM_MODE === 'webhook' && tgClient.enabled) {
          void bot.heartbeat().then(() => bot.schedule()).then(() => bot.monitor()).catch(() => undefined);
        }
      }
    }, 10_000);
    timer.unref();
    const cleanup = () => {
      registerAfterEmitCommit(null);
      clearInterval(timer);
    };
    process.once('SIGINT', cleanup);
    process.once('SIGTERM', cleanup);
  }
}

main().catch(error => {
  console.error(error.message?.startsWith('Konfiguratsiya xatosi') || error.message?.startsWith('Production:') ? error.message : 'API ishga tushmadi. Konfiguratsiya va baza ulanishini tekshiring.');
  process.exitCode = 1;
});
