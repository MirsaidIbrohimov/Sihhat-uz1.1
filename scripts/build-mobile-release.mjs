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
const demo = process.argv.includes('--demo');
const version = /^version:\s*(\d+\.\d+\.\d+)\+(\d+)\s*$/m.exec(readFileSync(join(mobile, 'pubspec.yaml'), 'utf8'));
if (!version) throw new Error('pubspec.yaml da versiya va build raqami kerak.');
const apkName = demo ? `Sihhat-uz-demo-${version[1]}.apk` : 'sihhat-uz-release.apk';
if (demo && !['/demo-api', '/api'].includes(url.pathname)) throw new Error('Demo release uchun alohida HTTPS /demo-api yoki /api manzili kerak.');
if (!existsSync(join(mobile, 'android/key.properties'))) throw new Error('Avval npm run mobile:signing:init buyrug‘ini bajaring yoki mavjud key.properties ni sozlang.');
// Flutter must regenerate native plugin registration for this build mode.
// --no-pub can retain the integration_test registrant from a debug build.
runTool(flutter, ['build', 'apk', '--release', '--target=lib/main.dart', `--dart-define=API_BASE_URL=${baseUrl}`, ...(demo ? ['--dart-define=DEMO_OTP_ENABLED=true'] : [])]);
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
const badging = runTool(buildTool('aapt'), ['dump', 'badging', apk], {capture: true});
if (!badging.includes(`versionName='${version[1]}'`) || !badging.includes(`versionCode='${version[2]}'`)) {
  throw new Error('APK versiyasi pubspec.yaml bilan mos emas.');
}
const directory = join(root, '.local/releases');
mkdirSync(directory, {recursive: true});
const destination = join(directory, demo ? 'sihhat-uz-demo.apk' : 'sihhat-uz-release.apk');
copyFileSync(apk, destination);
const evidence = {
  created_at: new Date().toISOString(), api_base_url: baseUrl,
  api_endpoint_verified: false,
  version_name: version[1], version_code: Number(version[2]),
  pilot_placeholder: url.hostname.endsWith('.invalid'),
  apk: `.local/releases/${demo ? 'sihhat-uz-demo' : 'sihhat-uz-release'}.apk`, demo_otp: demo,
  apk_sha256: createHash('sha256').update(readFileSync(destination)).digest('hex'),
  certificate_sha256: certificate,
  signature_verified: true, debuggable: false, cleartext_allowed: false,
};
writeFileSync(join(directory, demo ? 'android-demo-release.json' : 'android-release.json'), JSON.stringify(evidence, null, 2) + '\n');
if (demo) {
  const output = join(root, 'ilova');
  mkdirSync(output, {recursive: true});
  copyFileSync(apk, join(output, apkName));
  writeFileSync(join(output, 'SHA256SUMS.txt'), `${evidence.apk_sha256}  ${apkName}\n`);
}
writeFileSync(join(directory, 'apksigner-verify.txt'), signature);
console.log(demo ? `Imzolangan demo APK: ilova/${apkName}` : 'Imzolangan release APK: .local/releases/sihhat-uz-release.apk');
console.log(`Imzo tekshirildi; HTTPS manzil: ${baseUrl}${evidence.pilot_placeholder ? ' (pilot placeholder; haqiqiy server hali belgilanmagan)' : ''}`);
