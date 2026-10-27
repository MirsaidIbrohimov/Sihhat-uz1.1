import { spawn } from 'node:child_process';
import { resolve } from 'node:path';

// npm workspace commands run in the app directory.
const port = process.env.PORT ?? process.argv[2];
const host = process.env.SIHHAT_WEB_HOST ?? '127.0.0.1';
if (!/^\d+$/.test(port ?? '') || Number(port) < 1 || Number(port) > 65535) {
  console.error('Web: PORT 1–65535 oralig‘idagi butun son bo‘lishi kerak.');
  process.exit(1);
}
if (!['127.0.0.1', '0.0.0.0', '::'].includes(host)) {
  console.error('Web: SIHHAT_WEB_HOST 127.0.0.1, 0.0.0.0 yoki :: bo‘lishi kerak.');
  process.exit(1);
}
const next = resolve(import.meta.dirname, '../node_modules/next/dist/bin/next');
const nodeArgs = [
  '--max-old-space-size=256',
  '--optimize-for-size',
  next,
  'start',
  '--hostname',
  host,
  '--port',
  port,
];
const child = spawn(process.execPath, nodeArgs, {
  stdio: 'inherit',
  windowsHide: true,
});
for (const signal of ['SIGINT', 'SIGTERM']) process.once(signal, () => child.kill(signal));
child.once('error', () => { console.error('Web jarayoni ishga tushmadi. Build va dependencylarni tekshiring.'); process.exitCode = 1; });
child.once('exit', (code, signal) => { process.exitCode = code ?? (signal ? 0 : 1); });
