import {readFileSync, writeFileSync} from 'node:fs';
import {spawn} from 'node:child_process';
import {join} from 'node:path';
import {setTimeout as delay} from 'node:timers/promises';
import {adb, flutter, mobile, root, runTool} from './mobile-tools.mjs';

const serial = process.argv[2];
if (!serial || !/^[a-zA-Z0-9._:-]+$/.test(serial)) throw new Error('Android serial kerak: npm run mobile:test:recovery -- <serial>');
const appId = 'uz.sihhat.sihhat_mobile';
const adbRun = args => runTool(adb, ['-s', serial, ...args], {
  capture: true, timeout: args[0] === 'install' ? 180_000 : 30_000,
});
if (adbRun(['get-state']).trim() !== 'device') throw new Error('Android qurilma tayyor emas.');
const abi = adbRun(['shell', 'getprop', 'ro.product.cpu.abi']).trim();
const platform = {'arm64-v8a': 'android-arm64', 'armeabi-v7a': 'android-arm', 'x86_64': 'android-x64'}[abi];
if (!platform) throw new Error(`Qurilmaning Android ABI qo‘llab-quvvatlanmaydi: ${abi}`);
const ready = await fetch('http://127.0.0.1:4000/health/ready', {signal: AbortSignal.timeout(5_000)});
if (!ready.ok) throw new Error('Lokal API tayyor emas.');
try {
  await fetch('http://127.0.0.1:4001/fixture', {signal: AbortSignal.timeout(1_000)});
  throw new Error('4001 portdagi mavjud test bridge ni avval to‘xtating.');
} catch (error) {
  if (error.message.startsWith('4001')) throw error;
}
const bridgeProcess = spawn(process.execPath, [join(root, 'scripts/mobile-test-bridge.mjs')], {
  cwd: root, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'],
});
bridgeProcess.stdout.on('data', chunk => process.stdout.write(chunk));
bridgeProcess.stderr.on('data', () => {});
let bridgeFailure;
bridgeProcess.once('error', error => { bridgeFailure = error; });
let fixture, installed = false, evidence;
async function bridge(path, body) {
  const response = await fetch(`http://127.0.0.1:4001${path}`, {
    method: body ? 'POST' : 'GET', signal: AbortSignal.timeout(5_000),
    headers: {'Content-Type': 'application/json', 'X-Test-Key': fixture.key},
    ...(body ? {body: JSON.stringify(body)} : {}),
  });
  if (!response.ok) throw new Error('Mahalliy recovery bridge javobi noto‘g‘ri.');
  return response.json();
}
async function waitFor(event) {
  for (let n = 0; n < 180; n++) {
    const state = await bridge('/recovery');
    if (state.events.some(e => e.event === 'failed')) throw new Error(`Android ${state.phase} sinovi muvaffaqiyatsiz; qurilma test logini tekshiring.`);
    if (state.events.some(e => e.event === event)) return state;
    await delay(500);
  }
  throw new Error(`Android ${event} natijasi 90 soniyada kelmadi.`);
}
function pid() {
  const row = adbRun(['shell', 'ps', '-A', '-o', 'PID,NAME']).split(/\r?\n/)
    .map(line => line.trim().split(/\s+/)).find(parts => parts.at(-1) === appId);
  return row ? Number(row[0]) : null;
}
function launch(paymentReturn = false) {
  const args = paymentReturn
    ? ['shell', 'am', 'start', '-W', '-a', 'android.intent.action.VIEW', '-c', 'android.intent.category.BROWSABLE',
      '-d', 'sihhat://payment-return?status=success', '-p', appId]
    : ['shell', 'am', 'start', '-W', '-n', `${appId}/.MainActivity`];
  const output = adbRun(args);
  if (/Error:|Exception/.test(output)) throw new Error('Android activity ochilmadi.');
  const next = pid();
  if (!next) throw new Error('Android ilova jarayoni topilmadi.');
  return next;
}
async function forceStop() {
  const previous = pid();
  if (!previous) throw new Error('Force-stop oldidan ilova jarayoni topilmadi.');
  adbRun(['shell', 'am', 'force-stop', appId]);
  for (let n = 0; n < 20 && pid() !== null; n++) await delay(100);
  if (pid() !== null) throw new Error('Force-stop ilova jarayonini to‘xtatmadi.');
  return {previous_pid: previous, stopped_pid: null};
}
try {
  for (let n = 0; n < 60; n++) {
    if (bridgeFailure) throw bridgeFailure;
    if (bridgeProcess.exitCode !== null) throw new Error('Mahalliy test bridge ishga tushmadi.');
    try {
      fixture = JSON.parse(readFileSync(join(root, '.local/mobile-test.json'), 'utf8'));
      await bridge('/fixture');
      break;
    } catch {
      await delay(250);
    }
    if (n === 59) throw new Error('Mahalliy test bridge tayyor bo‘lmadi.');
  }
  for (const port of [4000, 4001]) adbRun(['reverse', `tcp:${port}`, `tcp:${port}`]);
  console.log('OS tiklanish sinovi uchun Android APK yaratilmoqda.');
  runTool(flutter, ['build', 'apk', '--debug', `--target-platform=${platform}`, '--target=integration_test/force_stop_flow_test.dart',
    '--dart-define=API_BASE_URL=http://127.0.0.1:4000', `--dart-define=TEST_BRIDGE_KEY=${fixture.key}`,
    '--dart-define=INTEGRATION_TEST_SHOULD_REPORT_RESULTS_TO_NATIVE=false']);
  installed = true;
  adbRun(['install', '-r', join(mobile, 'build/app/outputs/flutter-apk/app-debug.apk')]);
  adbRun(['shell', 'am', 'force-stop', appId]);
  launch();
  await waitFor('prepared');
  console.log('Ikki xonali PAYMENT_PENDING bron va sessiya secure storageda saqlandi.');
  const firstStop = await forceStop();
  await bridge('/recovery/phase', {phase: 'restore_payment'});
  firstStop.restarted_pid = launch(true);
  if (firstStop.previous_pid === firstStop.restarted_pid) throw new Error('Android yangi jarayon yaratmadi.');
  const confirmed = await waitFor('confirmed');
  if (!confirmed.events.some(e => e.event === 'restored' && e.session_restored && e.pending_restored && e.return_did_not_confirm)) {
    throw new Error('Sessiya, bron yoki payment return tekshiruvi tasdiqlanmadi.');
  }
  console.log('Force-stopdan sessiya/bron tiklandi; return URI to‘lovni tasdiqlamadi; lokal provayder to‘lovni tasdiqladi.');
  const secondStop = await forceStop();
  await bridge('/recovery/phase', {phase: 'restore_confirmed'});
  secondStop.restarted_pid = launch();
  if (secondStop.previous_pid === secondStop.restarted_pid) throw new Error('Android yangi jarayon yaratmadi.');
  const completed = await waitFor('completed');
  evidence = {
    created_at: new Date().toISOString(), success: true, serial,
    model: adbRun(['shell', 'getprop', 'ro.product.model']).trim(),
    android_version: adbRun(['shell', 'getprop', 'ro.build.version.release']).trim(),
    force_stops: [firstStop, secondStop], payment_return_opened_by_android: true,
    provider: 'local simulator; not official Payme sandbox',
    events: completed.events, normal_debug_apk_installed: false,
  };
  console.log('Ikkinchi force-stopdan keyin tasdiqlangan bron ro‘yxatdan ochildi; pending marker tozalangan.');
} finally {
  // Restore the ordinary app after the test target; keep the same secure store.
  try {
    if (installed) {
      console.log('Oddiy Android ilovasi qayta yig‘ilib o‘rnatilmoqda.');
      runTool(flutter, ['build', 'apk', '--debug', `--target-platform=${platform}`, '--target=lib/main.dart',
        '--dart-define=API_BASE_URL=http://127.0.0.1:4000']);
      adbRun(['install', '-r', join(mobile, 'build/app/outputs/flutter-apk/app-debug.apk')]);
      adbRun(['shell', 'am', 'force-stop', appId]);
      launch();
      if (evidence) evidence.normal_debug_apk_installed = true;
    }
  } finally {
    bridgeProcess.kill();
    try { adbRun(['reverse', '--remove', 'tcp:4001']); } catch {}
  }
}
writeFileSync(join(root, '.local/android-recovery.json'), JSON.stringify(evidence, null, 2) + '\n');
console.log('Android OS tiklanish sinovi o‘tdi: .local/android-recovery.json');
