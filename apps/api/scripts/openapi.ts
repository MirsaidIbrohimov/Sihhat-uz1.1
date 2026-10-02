import { writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createApp } from '../src/app';

async function main() {
  const { app, document } = await createApp({ quiet: true, swagger: false });
  await writeFile(resolve('../../docs/openapi.json'), JSON.stringify(document, null, 2));
  await app.close(); console.log('docs/openapi.json yaratildi');
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
