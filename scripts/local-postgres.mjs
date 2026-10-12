import { existsSync, mkdirSync, readFileSync, writeFileSync, openSync, closeSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { setTimeout as delay } from 'node:timers/promises';

const root = resolve(import.meta.dirname, '..');
const local = join(root, '.local');
const data = join(local, 'postgres');
const bin = process.env.SIHHAT_PG_BIN ?? 'C:/Program Files/PostgreSQL/18/bin';
const executable = (name) => join(bin, process.platform === 'win32' ? `${name}.exe` : name);
const run = (name, args, optional = false) => {
  const background = name === 'pg_ctl' && args.includes('start');
  const fd = background ? openSync(join(local, 'pg-control.log'), 'a') : null;
  const result = spawnSync(executable(name), args, { encoding: 'utf8', windowsHide: true, ...(fd !== null ? { stdio: ['ignore', fd, fd] } : {}), timeout: 60000 });
  if (fd !== null) closeSync(fd);
  if (result.error) throw result.error;
  if (result.status !== 0 && !optional) throw new Error(`${name}: ${result.stderr || result.stdout}`);
  return result;
};
mkdirSync(local, { recursive: true });
if (process.argv[2] === 'stop') {
  if (existsSync(join(data, 'postmaster.pid'))) run('pg_ctl', ['-D', data, 'stop', '-m', 'fast']);
  process.exit(0);
}
if (!existsSync(executable('initdb'))) throw new Error('PostgreSQL bin topilmadi. SIHHAT_PG_BINni belgilang yoki Docker Compose ishlating.');
if (!existsSync(join(data, 'PG_VERSION'))) {
  run('initdb', ['-D', data, '-U', 'sihhat_local', '-E', 'UTF8', '--locale=C', '--auth-local=trust', '--auth-host=trust']);
  writeFileSync(join(data, 'pg_hba.conf'), '# Faqat shu loyihaning loopback muhiti\nhost all all 127.0.0.1/32 trust\nhost all all ::1/128 trust\n');
}
if (run('pg_ctl', ['-D', data, 'status'], true).status !== 0) {
  // Recovery after an interrupted shutdown can outlast pg_ctl's default wait.
  // Start once, then wait for connections without interrupting WAL recovery.
  run('pg_ctl', ['-D', data, '-l', join(local, 'postgres.log'), '-o', '-h 127.0.0.1 -p 55432', '-W', 'start']);
}
const readyDeadline = Date.now() + 10 * 60_000;
let nextNotice = 0;
while (run('pg_isready', ['-h', '127.0.0.1', '-p', '55432', '-U', 'sihhat_local', '-d', 'postgres', '-t', '3'], true).status !== 0) {
  if (Date.now() >= readyDeadline) throw new Error('PostgreSQL 10 daqiqada tayyor bo‘lmadi. .local/postgres.logni tekshiring; tiklanayotgan server to‘xtatilmadi.');
  if (Date.now() >= nextNotice) {
    console.log('PostgreSQL ulanishga tayyor bo‘lishi kutilmoqda; uzilgan ishning tiklanishi davom etishi mumkin.');
    nextNotice = Date.now() + 30_000;
  }
  await delay(1000);
}
for (const dbName of ['sihhat', 'sihhat_test']) {
  const found = run('psql', ['-h', '127.0.0.1', '-p', '55432', '-U', 'sihhat_local', '-d', 'postgres', '-tAc', `SELECT 1 FROM pg_database WHERE datname='${dbName}'`]);
  if (found.stdout.trim() !== '1') run('createdb', ['-h', '127.0.0.1', '-p', '55432', '-U', 'sihhat_local', dbName]);
}
const envPath = join(root, 'apps', 'api', '.env');
if (!existsSync(envPath)) {
  const template = readFileSync(`${envPath}.example`, 'utf8')
    .replace('replace-with-random-32-byte-secret-before-starting', randomBytes(32).toString('hex'))
    .replace('replace-with-64-hex-characters', randomBytes(32).toString('hex'));
  writeFileSync(envPath, template, { mode: 0o600 });
}
console.log('Lokal PostgreSQL tayyor: 127.0.0.1:55432, bazalar: sihhat / sihhat_test. API .env mavjud (sirlar chiqarilmadi).');
