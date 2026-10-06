import 'dotenv/config';
import { randomUUID } from 'node:crypto';
import { createApp } from '../src/app';
import { Db } from '../src/common/db';
import { AuthService } from '../src/auth/auth.service';
import { base32, totp } from '../src/common/crypto';

export const testPassword = 'Test-Sihhat-2026!';
export async function setup(options:{port?:number}={}) {
  const url = process.env.TEST_DATABASE_URL;
  if (!url || new URL(url).pathname !== '/sihhat_test') throw new Error('Sinov faqat sihhat_testda bajariladi');
  process.env.NODE_ENV = 'test'; process.env.DATABASE_URL = url;
  process.env.SMS_ADAPTER = 'local'; process.env.AI_ADAPTER = 'catalog';
  process.env.DEMO_OTP_ENABLED = 'false';
  process.env.PUSH_ADAPTER = 'local'; process.env.PAYMENT_MODE = 'local';
  process.env.TELEGRAM_MODE = 'disabled'; process.env.TELEGRAM_BOT_TOKEN = '';
  process.env.TEZCHECK_API_KEY = ''; process.env.TEZCHECK_CASH_DESK_CODE = ''; process.env.TEZCHECK_WEBHOOK_SECRET = '';
  const { app, document } = await createApp({ quiet: true, swagger: false });
  await app.listen(options.port??0, '127.0.0.1');
  const db = app.get(Db);
  const tables = await db.$queryRaw<{ tablename: string }[]>`SELECT tablename FROM pg_tables WHERE schemaname='public' AND tablename<>'_prisma_migrations'`;
  await db.$executeRawUnsafe(`TRUNCATE ${tables.map(t => '"'+t.tablename.replace(/"/g,'""')+'"').join(',')} CASCADE`);
  const auth = app.get(AuthService); const secret = base32(Buffer.from('12345678901234567890'));
  await auth.bootstrap('admin.test', testPassword, secret);
  const admin = new Client(await app.getUrl());
  const mfaCode = totp(secret);
  const login = await admin.call('/auth/staff/login', 'POST', { login: 'admin.test', password: testPassword, mfa_code: mfaCode });
  if (login.status !== 201) throw new Error(`Admin login ${login.status}: ${JSON.stringify(login.body)}`);
  return { app, document, db, auth, admin, base: await app.getUrl(), secret, mfaCode, webSession: login.body };
}
export class Client {
  cookies = new Map<string,string>(); csrf = ''; token = '';
  constructor(readonly base: string) {}
  async call(path: string, method = 'GET', body?: unknown, headers: Record<string,string> = {}) {
    const response = await fetch(`${this.base}${path}`, {
      method, headers: { 'Content-Type': 'application/json', Origin: 'http://localhost:3000',
        ...(this.token ? { Authorization: `Bearer ${this.token}` } : {}),
        ...(this.cookies.size ? { Cookie: [...this.cookies].map(([k,v]) => `${k}=${v}`).join('; ') } : {}),
        ...(this.csrf ? { 'X-CSRF-Token': this.csrf } : {}), ...headers },
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    });
    for (const cookie of response.headers.getSetCookie()) { const pair = cookie.split(';')[0]; const at = pair.indexOf('='); this.cookies.set(pair.slice(0,at), pair.slice(at+1)); }
    const text = await response.text(); let result: any; try { result = JSON.parse(text); } catch { result = text; }
    if (result?.csrf_token) this.csrf = result.csrf_token;
    return { status: response.status, body: result, headers: response.headers };
  }
  key() { return { 'Idempotency-Key': randomUUID() }; }
}
export async function staff(client: Client, name: string, phone: string, sanatoriumId: string, director = true) {
  const res = await client.call(director ? '/superadmin/director-assignments' : '/partner/staff-invitations', 'POST', { sanatorium_id: sanatoriumId, name, login: name.toLowerCase(), phone, temporary_password: testPassword });
  if (res.status !== 201) throw new Error(`Create staff: ${JSON.stringify(res.body)}`);
  const instance = new Client(client.base);
  const login = await instance.call('/auth/staff/login', 'POST', { login: name.toLowerCase(), password: testPassword });
  if (login.status !== 201) throw new Error(`Staff login ${login.status}`);
  await instance.call('/auth/change-password', 'POST', { current_password: testPassword, new_password: `${testPassword}Changed` });
  return { client: instance, membership: res.body.membership };
}
