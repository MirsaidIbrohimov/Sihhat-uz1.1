import 'dotenv/config';
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
const url = process.env.TEST_DATABASE_URL;
if (!url || new URL(url).pathname !== '/sihhat_test') throw new Error('TEST_DATABASE_URL faqat sihhat_test bazasiga qarashi kerak');
const result = spawnSync(process.execPath, [resolve('../../node_modules/prisma/build/index.js'), 'migrate', 'deploy'], {
  env: { ...process.env, DATABASE_URL: url }, stdio: 'inherit', windowsHide: true,
});
if (result.error) throw result.error;
process.exitCode = result.status ?? 1;
