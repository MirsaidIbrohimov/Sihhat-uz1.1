import {copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {join} from 'node:path';
import {buildTool, flutter, mobile, root, runTool} from './mobile-tools.mjs';

const apiUrl = process.argv[2] ?? process.env.SIHHAT_RELEASE_API_URL;
if (!apiUrl) throw new Error('HTTPS API manzili kerak: npm run mobile:release -- https://api.example.uz');
const url = new URL(apiUrl);
if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash || /["%&|<>^!\s]/.test(apiUrl)) {
  throw new Error('Release API oddiy HTTPS manzili bo‘lishi kerak; login, query va fragment kiritmang.');
}
const baseUrl = url.href.replace(/\/$/, '');
if (!existsSync(join(mobile, 'android/key.properties'))) throw new Error('Avval npm run mobile:signing:init buyrug‘ini bajaring yoki mavjud key.properties ni sozlang.');
// Flutter must regenerate native plugin registration for this build mode.
// --no-pub can retain the integration_test registrant from a debug build.
runTool(flutter, ['build', 'apk', '--release', '--target=lib/main.dart', `--dart-define=API_BASE_URL=${baseUrl}`]);
const apk = join(mobile, 'build/app/outputs/flutter-apk/app-release.apk');
const signature = runTool(buildTool('apksigner'), ['verify', '--verbose', '--print-certs', apk], {capture: true});
const certificate = /Signer #1 certificate SHA-256 digest:\s*(\S+)/.exec(signature)?.[1];
if (!certificate || /Android Debug/i.test(signature)) throw new Error('APK release kaliti bilan imzolanmagan.');
const manifest = runTool(buildTool('aapt'), ['dump', 'xmltree', apk, 'AndroidManifest.xml'], {capture: true});
const debuggable = /android:debuggable[^\n]*\(type 0x12\)(0x[0-9a-f]+)/i.exec(manifest)?.[1];
const cleartext = /android:usesCleartextTraffic[^\n]*\(type 0x12\)(0x[0-9a-f]+)/i.exec(manifest)?.[1];
if (!manifest.includes('uz.sihhat.sihhat_mobile') || (debuggable && Number(debuggable) !== 0) || cleartext === undefined || Number(cleartext) !== 0) {
  throw new Error('Release manifesti debuggable yoki ochiq HTTPga ruxsat bergan.');
}
const directory = join(root, '.local/releases');
mkdirSync(directory, {recursive: true});
const destination = join(directory, 'sihhat-uz-release.apk');
copyFileSync(apk, destination);
const evidence = {
  created_at: new Date().toISOString(), api_base_url: baseUrl,
  api_endpoint_verified: false,
  pilot_placeholder: url.hostname.endsWith('.invalid'),
  apk: '.local/releases/sihhat-uz-release.apk',
  apk_sha256: createHash('sha256').update(readFileSync(destination)).digest('hex'),
  certificate_sha256: certificate,
  signature_verified: true, debuggable: false, cleartext_allowed: false,
};
writeFileSync(join(directory, 'android-release.json'), JSON.stringify(evidence, null, 2) + '\n');
writeFileSync(join(directory, 'apksigner-verify.txt'), signature);
console.log('Imzolangan release APK: .local/releases/sihhat-uz-release.apk');
console.log(`Imzo tekshirildi; HTTPS manzil: ${baseUrl}${evidence.pilot_placeholder ? ' (pilot placeholder; haqiqiy server hali belgilanmagan)' : ''}`);
