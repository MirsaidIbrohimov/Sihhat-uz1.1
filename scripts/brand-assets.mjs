import { mkdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import sharp from 'sharp';

const root = resolve(import.meta.dirname, '..');
const source = join(root, 'assets/branding/sihhat-logo.jpg');
async function exportLogo(path, size, format = 'png') {
  const output = join(root, path);
  mkdirSync(dirname(output), { recursive: true });
  // Preserve the complete supplied artwork and its background; only resize/encode.
  await sharp(source).resize(size, size, { fit: 'contain' })
    .toFormat(format, format === 'jpeg' ? { quality: 90 } : {}).toFile(output);
}
await exportLogo('apps/mobile/assets/branding/sihhat-logo.jpg', 512, 'jpeg');
for (const app of ['superadmin-web', 'partner-web']) {
  await exportLogo(`apps/${app}/public/branding/sihhat-logo.jpg`, 512, 'jpeg');
  await exportLogo(`apps/${app}/public/favicon.png`, 64);
  await exportLogo(`apps/${app}/public/apple-touch-icon.png`, 180);
}
const resources = 'apps/mobile/android/app/src/main/res';
for (const [density, size] of Object.entries({mdpi: 48, hdpi: 72, xhdpi: 96, xxhdpi: 144, xxxhdpi: 192})) {
  await exportLogo(`${resources}/mipmap-${density}/ic_launcher.png`, size);
  await exportLogo(`${resources}/drawable-${density}/sihhat_logo.png`, size * 3);
}
console.log('Sihhat uz: web, Flutter va Android logo fayllari tayyorlandi.');
