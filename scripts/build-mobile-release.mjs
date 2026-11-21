import {copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {isAbsolute, join, resolve} from 'node:path';
import {buildTool, flutter, mobile, mobileEnv, root, runTool} from './mobile-tools.mjs';

const apiUrl = process.argv[2] ?? process.env.SIHHAT_RELEASE_API_URL;
if (!apiUrl) throw new Error('HTTPS API manzili kerak: npm run mobile:release -- https://api.example.uz');
const url = new URL(apiUrl);
if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash || /["%&|<>^!\s]/.test(apiUrl)) {
  throw new Error('Release API oddiy HTTPS manzili bo‘lishi kerak; login, query va fragment kiritmang.');
}
const baseUrl = url.href.replace(/\/$/, '');
const demo = process.argv.includes('--demo');
const skipBuild = process.argv.includes('--skip-build');
const version = /^version:\s*(\d+\.\d+\.\d+)\+(\d+)\s*$/m.exec(readFileSync(join(mobile, 'pubspec.yaml'), 'utf8'));
if (!version) throw new Error('pubspec.yaml da versiya va build raqami kerak.');
const apkName = demo ? `Sihhat-uz-demo-${version[1]}.apk` : 'sihhat-uz-release.apk';
if (demo && !['/demo-api', '/api', '', '/'].includes(url.pathname)) throw new Error('Demo release uchun alohida HTTPS /demo-api, /api yoki to‘g‘ridan-to‘g‘ri API manzili kerak.');
const keyPropsPath = join(mobile, 'android/key.properties');
if (!existsSync(keyPropsPath)) throw new Error('Avval npm run mobile:signing:init buyrug‘ini bajaring yoki mavjud key.properties ni sozlang.');
// Flutter must regenerate native plugin registration for this build mode.
// --no-pub can retain the integration_test registrant from a debug build.
const apk = join(mobile, 'build/app/outputs/flutter-apk/app-release.apk');
if (!skipBuild || !existsSync(apk)) {
  runTool(flutter, [
    'build', 'apk', '--release',
    '--target=lib/main.dart',
    '--target-platform=android-arm,android-arm64,android-x64',
    `--dart-define=API_BASE_URL=${baseUrl}`,
    ...(demo ? ['--dart-define=DEMO_OTP_ENABLED=true'] : []),
  ]);
}
const keyProps = Object.fromEntries(
  readFileSync(keyPropsPath, 'utf8')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('#') && line.includes('='))
    .map((line) => {
      const idx = line.indexOf('=');
      return [line.slice(0, idx).trim(), line.slice(idx + 1).trim()];
    }),
);
const storeFileRaw = (keyProps.storeFile ?? '').replace(/\\:/g, ':').replace(/\\\\/g, '\\');
const storeFilePath = isAbsolute(storeFileRaw) ? storeFileRaw : resolve(join(mobile, 'android'), storeFileRaw);
const apksignerPath = buildTool('apksigner');
runTool(
  apksignerPath,
  [
    'sign',
    '--min-sdk-version', '21',
    '--ks', storeFilePath,
    '--ks-key-alias', keyProps.keyAlias,
    '--ks-pass', 'env:SIHHAT_KS_PASS',
    '--key-pass', 'env:SIHHAT_KEY_PASS',
    '--v1-signing-enabled', 'true',
    '--v2-signing-enabled', 'true',
    '--v3-signing-enabled', 'true',
    apk,
  ],
  {
    env: {
      ...mobileEnv,
      SIHHAT_KS_PASS: keyProps.storePassword,
      SIHHAT_KEY_PASS: keyProps.keyPassword,
    },
  },
);
const signature = runTool(apksignerPath, ['verify', '--min-sdk-version', '21', '--verbose', '--print-certs', apk], {capture: true, includeStderr: true});
const certificate = /(?:Signer #\d+|V[\d.]+ Signer:)\s*certificate SHA-256 digest:\s*([0-9a-f]{64})/i.exec(signature)?.[1]
  ?? /certificate SHA-256 digest:\s*([0-9a-f]{64})/i.exec(signature)?.[1];
if (!certificate || /Android Debug/i.test(signature)) {
  const summary = signature.split(/\r?\n/).slice(0, 15).join('\n');
  throw new Error(`APK release kaliti bilan imzolanmagan (${apksignerPath}).\n${summary}`.trim());
}
if (!/Verified using v1 scheme \(JAR signing\):\s*true/i.test(signature) || !/Verified using v2 scheme \(APK Signature Scheme v2\):\s*true/i.test(signature)) {
  throw new Error(`APK universal v1+v2 imzo tekshiruvidan o‘tmadi.\n${signature}`.trim());
}
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
const sha256 = createHash('sha256').update(readFileSync(destination)).digest('hex');
if (!demo) {
  copyFileSync(apk, join(directory, 'sihhat-uz.apk'));
  writeFileSync(join(directory, 'SHA256SUMS.txt'), `${sha256}  sihhat-uz.apk\n`);
  if (!url.hostname.endsWith('.invalid')) {
    const songgiDir = join(root, 'ilova/Songgi UI');
    mkdirSync(songgiDir, {recursive: true});
    copyFileSync(apk, join(songgiDir, 'yangi versiya.apk'));
  }
}
const evidence = {
  created_at: new Date().toISOString(), api_base_url: baseUrl,
  api_endpoint_verified: false,
  version_name: version[1], version_code: Number(version[2]),
  pilot_placeholder: url.hostname.endsWith('.invalid'),
  apk: `.local/releases/${demo ? 'sihhat-uz-demo' : 'sihhat-uz-release'}.apk`, demo_otp: demo,
  apk_sha256: sha256,
  certificate_sha256: certificate,
  signature_verified: true, debuggable: false, cleartext_allowed: false,
};
writeFileSync(join(directory, demo ? 'android-demo-release.json' : 'android-release.json'), JSON.stringify(evidence, null, 2) + '\n');
if (demo) {
  const output = join(root, 'ilova');
  mkdirSync(output, {recursive: true});
  copyFileSync(apk, join(output, apkName));
  writeFileSync(join(output, 'SHA256SUMS.txt'), `${evidence.apk_sha256}  ${apkName}\n`);
} else if (!url.hostname.endsWith('.invalid')) {
  const output = join(root, 'ilova');
  mkdirSync(output, {recursive: true});
  writeFileSync(join(output, 'SHA256SUMS.txt'), `${evidence.apk_sha256}  sihhat-uz.apk\n`);
}
writeFileSync(join(directory, 'apksigner-verify.txt'), signature);
console.log(demo ? `Imzolangan demo APK: ilova/${apkName}` : 'Imzolangan release APK: .local/releases/sihhat-uz-release.apk');
console.log(`Imzo tekshirildi; HTTPS manzil: ${baseUrl}${evidence.pilot_placeholder ? ' (pilot placeholder; haqiqiy server hali belgilanmagan)' : ''}`);
