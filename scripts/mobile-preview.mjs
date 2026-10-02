import { copyFileSync, mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { root, mobile, flutter, adb, runTool } from './mobile-tools.mjs';

const serial = process.argv[2];
if (serial && !/^[A-Za-z0-9._:-]+$/.test(serial)) throw new Error('Android serial noto‘g‘ri.');
runTool(flutter, ['build', 'apk', '--debug', '--target=lib/main.dart', '--target-platform=android-arm64', '--dart-define=API_BASE_URL=http://127.0.0.1:4000']);
const apk = join(mobile, 'build/app/outputs/flutter-apk/app-debug.apk');
const folder = join(root, '.local/releases');
mkdirSync(folder, { recursive: true });
const output = join(folder, 'sihhat-uz-preview.apk');
copyFileSync(apk, output);
const report = { built_at: new Date().toISOString(), build: 'debug', api_url: 'http://127.0.0.1:4000', apk: '.local/releases/sihhat-uz-preview.apk', sha256: createHash('sha256').update(readFileSync(output)).digest('hex'), installed: false };
if (serial) {
  const device = (args) => runTool(adb, ['-s', serial, ...args], { timeout: 180000, capture: true });
  device(['reverse', 'tcp:4000', 'tcp:4000']);
  device(['install', '-r', apk]);
  device(['shell', 'am', 'force-stop', 'uz.sihhat.sihhat_mobile']);
  device(['shell', 'am', 'start', '-n', 'uz.sihhat.sihhat_mobile/.MainActivity']);
  report.installed = true;
}
writeFileSync(join(folder, 'android-preview.json'), JSON.stringify(report, null, 2));
console.log(JSON.stringify(report));
