import { randomInt, randomUUID } from 'node:crypto';
import { writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { loadConfig } from '../src/common/config';

// One message to the recipient explicitly supplied by the user. No automatic
// retries and no printing of the recipient, OTP, credentials or provider token.
async function main() {
  const phone = process.argv[2];
  if (!/^\+998\d{9}$/.test(phone ?? '')) throw new Error('A valid recipient is required');
  const config = loadConfig();
  const auth = new FormData(); auth.set('email', config.ESKIZ_EMAIL); auth.set('password', config.ESKIZ_PASSWORD);
  const login = await fetch('https://notify.eskiz.uz/api/auth/login', { method: 'POST', body: auth, signal: AbortSignal.timeout(10000), redirect: 'error' });
  if (!login.ok) throw new Error('Eskiz authentication failed');
  const token = ((await login.json()) as any)?.data?.token;
  if (typeof token !== 'string') throw new Error('Eskiz token missing');
  const form = new FormData();
  form.set('mobile_phone', phone.substring(1));
  const standardTest = process.argv.includes('--standard-test');
  form.set('message', standardTest ? 'Bu Eskiz dan test' : config.ESKIZ_OTP_TEMPLATE.replaceAll('{code}', randomInt(100000, 1000000).toString()));
  form.set('from', config.ESKIZ_SENDER);
  const response = await fetch('https://notify.eskiz.uz/api/message/sms/send', { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Idempotency-Key': randomUUID() }, body: form, signal: AbortSignal.timeout(10000), redirect: 'error' });
  const body = await response.json() as any;
  const redact = (value: string) => [config.ESKIZ_EMAIL, config.ESKIZ_PASSWORD, token, phone, phone.substring(1)].reduce((s, secret) => s.replaceAll(secret, '[private]'), value).replace(/\b\d{6}\b/g, '[code]').slice(0, 250);
  const report = { checked_at: new Date().toISOString(), mode: standardTest ? 'standard_test' : 'otp_test', http_status: response.status, accepted: response.ok && body?.status === 'waiting', provider_status: body?.status ?? null, reason: !response.ok ? redact(typeof body?.message === 'string' ? body.message : typeof body?.data?.message === 'string' ? body.data.message : 'SMS_REJECTED') : null, delivery_confirmed: false };
  await writeFile(resolve(`../../.local/eskiz-${standardTest ? 'standard-sms' : 'sms'}-test.json`), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report));
}
void main().catch(() => { console.error('SMS connection test failed; sensitive data not logged.'); process.exitCode = 1; });
