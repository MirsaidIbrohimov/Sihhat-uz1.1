import 'dotenv/config';
import { randomUUID } from 'node:crypto';
import { readdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { Client } from 'pg';

async function main() {
  const source = new URL(process.env.DATABASE_URL ?? '');
  if (process.env.NODE_ENV === 'production' || source.protocol !== 'postgresql:' || !['localhost', '127.0.0.1', '[::1]'].includes(source.hostname)) {
    throw new Error('Migration verification requires a local, non-production PostgreSQL connection');
  }
  const name = `sihhat_migration_check_${Date.now()}_${randomUUID().slice(0, 8)}`;
  if (!/^sihhat_migration_check_[0-9]+_[a-f0-9]{8}$/.test(name)) throw new Error('Unsafe migration verification database name');
  const adminUrl = new URL(source); adminUrl.pathname = '/postgres';
  const admin = new Client({ connectionString: adminUrl.toString() });
  await admin.connect();
  try { await admin.query(`CREATE DATABASE "${name}"`); } finally { await admin.end(); }

  const target = new URL(source); target.pathname = `/${name}`;
  const result = spawnSync(process.execPath, [resolve('../../node_modules/prisma/build/index.js'), 'migrate', 'deploy'], {
    env: { ...process.env, DATABASE_URL: target.toString() }, stdio: 'inherit', windowsHide: true,
  });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`Migration deployment failed in ${name}`);

  const expected = (await readdir(resolve('prisma/migrations'), { withFileTypes: true })).filter(entry => entry.isDirectory()).map(entry => entry.name).sort();
  const db = new Client({ connectionString: target.toString() });
  await db.connect();
  try {
    const applied = await db.query<{ migration_name: string }>('SELECT migration_name FROM "_prisma_migrations" WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL ORDER BY migration_name');
    if (JSON.stringify(applied.rows.map(row => row.migration_name)) !== JSON.stringify(expected)) throw new Error('Migration history differs from the source migrations');
    const exclusion = await db.query("SELECT count(*)::int AS count FROM pg_constraint WHERE contype='x' AND conrelid='\"RoomAllocation\"'::regclass");
    const triggers = await db.query<{ tgname: string }>("SELECT tgname FROM pg_trigger WHERE NOT tgisinternal AND tgrelid IN ('\"LedgerJournal\"'::regclass, '\"LedgerLine\"'::regclass) ORDER BY tgname");
    const expectedGuards = ['immutable_journal', 'immutable_line', 'journal_balance', 'line_balance'];
    if (exclusion.rows[0].count !== 1 || JSON.stringify(triggers.rows.map(row => row.tgname)) !== JSON.stringify(expectedGuards)) throw new Error('Inventory exclusion or ledger integrity guards are missing');
    console.log(`Clean database migrations verified: ${expected.length} migrations, inventory exclusion and ${triggers.rows.length} ledger guards. Evidence database: ${name}`);
  } finally { await db.end(); }
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
