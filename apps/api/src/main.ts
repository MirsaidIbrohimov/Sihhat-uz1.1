import { createApp } from './app';

async function main() {
  const { app, config } = await createApp();
  await app.listen(config.PORT, config.NODE_ENV === 'production' ? '0.0.0.0' : '127.0.0.1');
  console.log(`Sihhat uz API: http://127.0.0.1:${config.PORT}; Swagger: /docs`);
}
main().catch(error => { console.error(error.message?.startsWith('Konfiguratsiya xatosi')||error.message?.startsWith('Production:')?error.message:'API ishga tushmadi. Konfiguratsiya va baza ulanishini tekshiring.'); process.exitCode = 1; });
