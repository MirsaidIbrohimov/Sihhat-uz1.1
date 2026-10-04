import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parse } from 'dotenv';

const root = resolve(import.meta.dirname, '..');
const files = [...new Set(execFileSync('git', ['ls-files', '--cached', '--others', '--exclude-standard', '-z'], { cwd: root, encoding: 'utf8' }).split('\0').filter(Boolean))];
const values = new Set();
for (const source of ['.local/secrets/providers.env', 'apps/api/.env', 'apps/mobile/android/key.properties', '.local/android-signing/key.properties']) {
  const path = resolve(root, source);
  if (!existsSync(path)) continue;
  for (const [name, value] of Object.entries(parse(readFileSync(path, 'utf8')))) {
    if (/(?:KEY|TOKEN|SECRET|PASSWORD|EMAIL)$/i.test(name) && value.length >= 12 && !value.startsWith('replace-')) values.add(value);
  }
}
function collectAccess(value) {
  if (!value || typeof value !== 'object') return;
  for (const [name, item] of Object.entries(value)) {
    if (/^(?:password|old_password|mfa_secret)$/i.test(name) && typeof item === 'string' && item.length >= 12) values.add(item);
    else if (item && typeof item === 'object') collectAccess(item);
  }
}
for (const source of ['.local/dev-access.json', '.local/superadmin-access.json']) {
  const path = resolve(root, source);
  if (existsSync(path)) collectAccess(JSON.parse(readFileSync(path, 'utf8')));
}
const patterns = [...values].flatMap(value => [Buffer.from(value), Buffer.from(value, 'utf16le'), Buffer.from(Buffer.from(value).toString('base64'))]);
const matches = [];
for (const path of files) {
  const normalized = path.replaceAll('\\', '/');
  const basename = normalized.split('/').at(-1);
  if (/(^|\/)(?:\.local|node_modules|\.next|\.gradle|\.dart_tool|build|dist)(\/|$)/.test(normalized)
      || (/^\.env(?:\.|$)/.test(basename) && !['.env.example', '.env.test.example'].includes(basename))
      || basename === 'key.properties' || /\.(?:jks|keystore|p12|apk|aab|tsbuildinfo)$/i.test(basename)) {
    matches.push({ path, issue: 'private_or_generated_file' });
    continue;
  }
  const data = readFileSync(resolve(root, path));
  if (patterns.some(pattern => data.includes(pattern))) matches.push({ path, issue: 'private_value' });
  if (/\b\d{5,20}:[A-Za-z0-9_-]{30,60}\b/.test(data.toString('utf8'))) matches.push({ path, issue: 'telegram_bot_token' });
  if (/\baps_[A-Za-z0-9]{30,}\b/.test(data.toString('utf8'))) matches.push({ path, issue: 'tezcheck_api_key' });
  if (/-----BEGIN (?:RSA |EC |OPENSSH |ENCRYPTED )?PRIVATE KEY-----/.test(data.toString('utf8'))) matches.push({ path, issue: 'private_key' });
}
const report = { checked_at: new Date().toISOString(), files_checked: files.length, private_values_checked: values.size, matches };
mkdirSync(resolve(root, '.local'), { recursive: true });
writeFileSync(resolve(root, '.local/source-secrets.json'), JSON.stringify(report, null, 2));
// Never print a matched credential, even on failure.
console.log(JSON.stringify(report));
if (matches.length) process.exitCode = 1;
