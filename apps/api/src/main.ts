import { createApp } from './app';

async function main() {
  const { app, config } = await createApp();
  await app.listen(config.PORT, '0.0.0.0');
  console.log(`Sihhat uz API: http://0.0.0.0:${config.PORT}; Swagger: /docs`);
}
main().catch(error => { console.error(error.message?.startsWith('Konfiguratsiya xatosi')||error.message?.startsWith('Production:')?error.message:'API ishga tushmadi. Konfiguratsiya va baza ulanishini tekshiring.'); process.exitCode = 1; });
