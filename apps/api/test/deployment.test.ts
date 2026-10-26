import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { loadConfig, productionIssues } from '../src/common/config';
import { AuthService } from '../src/auth/auth.service';
import { Sms } from '../src/auth/sms';
import { EmailService } from '../src/auth/email';
import { AppError } from '../src/common/errors';
import type { Db } from '../src/common/db';
import type { Actor } from '../src/auth/permissions';

const env = (): NodeJS.ProcessEnv => ({
  NODE_ENV: 'production', PORT: '8080',
  DATABASE_URL: 'postgresql://example:example@db.example.internal:5432/sihhat',
  REDIS_URL: 'redis://example:example@redis.example.internal:6379',
  AUTH_SECRET: randomBytes(32).toString('hex'), MFA_ENCRYPTION_KEY: randomBytes(32).toString('hex'),
  CORS_ORIGINS: 'https://admin.example.com, https://partner.example.com',
  SMS_ADAPTER: 'eskiz', ESKIZ_TOKEN: 'example-provider-token', ESKIZ_OTP_APPROVED: 'true',
  PAYMENT_MODE: 'tezcheck', TEZCHECK_API_KEY: 'example-provider-key', TEZCHECK_CASH_DESK_CODE: 'example-cashdesk',
  STORAGE_ADAPTER: 's3', S3_ENDPOINT: 'https://storage.example.com',
  S3_BUCKET: 'example-media', S3_ACCESS_KEY: 'example-access-key', S3_SECRET_KEY: 'example-secret-key',
  WORKER_MODE: 'redis',
});

test('deployment: production accepts remote private databases, HTTPS panels and an injected port', () => {
  const config = loadConfig(env());
  assert.equal(config.PORT, 8080);
  assert.equal(config.CORS_ORIGINS, 'https://admin.example.com,https://partner.example.com');
  assert.deepEqual(productionIssues(config), []);
});
test('deployment: loopback database/Redis/S3 endpoints cannot reach production', () => {
  for (const [key, value] of [
    ['DATABASE_URL', 'postgresql://example@127.0.0.1:55432/sihhat'],
    ['REDIS_URL', 'redis://localhost:6379'],
    ['REDIS_URL', 'https://redis.example.com'],
    ['S3_ENDPOINT', 'http://storage.example.com'],
    ['S3_ENDPOINT', 'https://localhost:9000'],
  ]) assert.throws(() => loadConfig({ ...env(), [key]: value }), /Production:/);
});
test('deployment: malformed and non-origin CORS values fail without disclosing their values', () => {
  for (const CORS_ORIGINS of ['https://', 'https://localhost', 'https://admin.example.com/path', 'https://admin.example.com,', 'https://user:private@example.com']) {
    assert.throws(() => loadConfig({ ...env(), CORS_ORIGINS }), (error: unknown) => error instanceof Error && error.message.includes('CORS_ORIGINS') && !error.message.includes(CORS_ORIGINS));
  }
});
test('deployment: production requires approved OTP and an actual cashdesk configuration', () => {
  assert.throws(() => loadConfig({ ...env(), ESKIZ_OTP_APPROVED: 'false' }), /Eskiz OTP/);
  assert.throws(() => loadConfig({ ...env(), TEZCHECK_CASH_DESK_CODE: '' }), /TEZCHECK_CASH_DESK_CODE/);
  assert.throws(() => loadConfig({ ...env(), DEMO_OTP_ENABLED: 'true' }), /Demo OTP/);
  assert.throws(() => loadConfig({ ...env(), PUSH_ADAPTER: 'http' }), /push HTTP/);
  assert.throws(() => loadConfig({ ...env(), AI_ADAPTER: 'http' }), /AI HTTP/);
});
test('deployment: diagnostics identify missing services without echoing credentials', () => {
  const supplied = env();
  const config = loadConfig({ ...supplied, NODE_ENV: 'development', DATABASE_URL: 'postgresql://private:private@127.0.0.1/sihhat', REDIS_URL: 'redis://private:private@localhost:6379', STORAGE_ADAPTER: 'local' });
  const issues = productionIssues(config).join('; ');
  assert.match(issues, /PostgreSQL/); assert.match(issues, /Redis/); assert.match(issues, /S3/);
  assert.equal(issues.includes('private:private'), false);
  assert.equal(issues.includes(supplied.AUTH_SECRET!), false);
});

test('deployment: Hostra private sockets require the explicit platform and an authenticated account database', () => {
  const supplied = { ...env(), DEPLOYMENT_PLATFORM: 'hostra',
    DATABASE_URL: 'postgresql://mirsaid2028:example-provider-password@localhost/mirsaid2028_sihhat?host=/run/postgresql',
    REDIS_URL: 'redis://127.0.0.1:6379', REDIS_SOCKET_PATH: '/run/redis/redis.sock' };
  assert.deepEqual(productionIssues(loadConfig(supplied)), []);
  assert.throws(() => loadConfig({ ...supplied, DEPLOYMENT_PLATFORM: 'generic' }), /Production:/);
  for (const DATABASE_URL of [
    'postgresql://mirsaid2028:example-provider-password@localhost/mirsaid2028_sihhat',
    'postgresql://mirsaid2028@localhost/mirsaid2028_sihhat?host=/run/postgresql',
    'postgresql://mirsaid2028:example-provider-password@localhost/another_account?host=/run/postgresql',
    'postgresql://mirsaid2028:example-provider-password@localhost/mirsaid2028_sihhat?host=/tmp/postgresql',
    'postgresql://mirsaid2028:example-provider-password@localhost/mirsaid2028_sihhat?host=/run/postgresql&host=/tmp/postgresql',
    'postgresql://example:example@postgres.example.com/db?host=/tmp/postgresql',
  ]) assert.throws(() => loadConfig({ ...supplied, DATABASE_URL }), /Production:/);
  assert.throws(() => loadConfig({ ...supplied, REDIS_SOCKET_PATH: '' }), /Redis/);
  assert.throws(() => loadConfig({ ...supplied, REDIS_SOCKET_PATH: '/tmp/redis.sock' }), /REDIS_SOCKET_PATH/);
});

test('deployment: Hostra local media requires the explicit private persistent directory', () => {
  const supplied = { ...env(), DEPLOYMENT_PLATFORM: 'hostra', STORAGE_ADAPTER: 'local',
    STORAGE_PATH: '/home/terminal/.sihhat/media', S3_ENDPOINT: '', S3_ACCESS_KEY: '', S3_SECRET_KEY: '' };
  assert.deepEqual(productionIssues(loadConfig(supplied)), []);
  assert.throws(() => loadConfig({ ...supplied, DEPLOYMENT_PLATFORM: 'generic' }), /S3/);
  for (const STORAGE_PATH of ['../../.local/uploads', '/tmp/media', '/home/terminal/public_html/media',
    '/home/terminal/sihhat-mirsaid2028.wwwz.uz/media', '/home/terminal/.sihhat/media/../public',
    '/home/terminal/.sihhat/media-other']) {
    assert.throws(() => loadConfig({ ...supplied, STORAGE_PATH }), /persistent media/);
  }
});

test('deployment: disabled customer SMS cannot issue or verify OTPs or change phones', async () => {
  const config = loadConfig({ ...env(), SMS_ADAPTER: 'disabled' });
  assert.deepEqual(productionIssues(config), []);
  let databaseCalls = 0;
  const db = new Proxy({}, { get() { databaseCalls++; throw new Error('Database must not be used while SMS is disabled'); } }) as Db;
  const sms = new Sms(config);
  const email = new EmailService(config);
  const auth = new AuthService(db, config, sms, email);
  const id = '7c387e01-0842-40a3-850d-86a55b4f0a3d';
  const customer = { kind: 'CUSTOMER', id } as Actor;
  const unavailable = (error: unknown) => error instanceof AppError && error.code === 'SMS_DISABLED' && error.getStatus() === 503;
  await assert.rejects(() => auth.requestOtp({ phone: '+998951231233' }, '198.51.100.20'), unavailable);
  await assert.rejects(() => auth.verifyOtp({ challenge_id: id, code: '123456' }, '198.51.100.20'), unavailable);
  await assert.rejects(() => auth.phoneChangeRequest(customer, { new_phone: '+998951231234' }), unavailable);
  await assert.rejects(() => auth.phoneChangeConfirm(customer, { old_challenge_id: id, new_challenge_id: id, old_code: '123456', new_code: '123456' }), unavailable);
  await assert.rejects(() => sms.send(id, '+998951231233', '123456', new Date(Date.now() + 60000)), unavailable);
  assert.equal(databaseCalls, 0);
  assert.equal(sms.sent.size, 0);
  await assert.rejects(() => auth.phoneChangeRequest({ kind: 'STAFF' } as Actor, {}), (error: unknown) => error instanceof AppError && error.code === 'PERMISSION_DENIED');
  assert.throws(() => loadConfig({ ...env(), SMS_ADAPTER: 'disabled', DEMO_OTP_ENABLED: 'true' }), /Demo OTP/);
});

test('deployment: email OTP issues challenge and dispatches email', async () => {
  const config = loadConfig({ ...env(), SMS_ADAPTER: 'disabled', SMTP_HOST: 'smtp.example.com' });
  const sms = new Sms(config);
  const email = new EmailService(config);
  (email as any).transporter = { sendMail: async () => ({}) };
  let challengeCreated: any = null;
  const mockDb = {
    atomic: async (fn: any) => fn({
      $executeRaw: async () => 1,
      otpChallenge: {
        findFirst: async () => null,
        updateMany: async () => ({ count: 0 }),
        create: async ({ data }: any) => { challengeCreated = { purpose: 'LOGIN', attempts: 0, consumedAt: null, ...data }; return challengeCreated; },
        findUnique: async () => challengeCreated,
        update: async ({ data }: any) => { Object.assign(challengeCreated, data); return challengeCreated; },
      },
      user: {
        findFirst: async () => null,
        create: async ({ data }: any) => ({ id: '11111111-1111-1111-1111-111111111111', ...data, status: 'ACTIVE', mustChangePassword: false }),
      },
      booking: { updateMany: async () => ({ count: 0 }) },
      session: { create: async ({ data }: any) => ({ id: '22222222-2222-2222-2222-222222222222', ...data }) },
      auditLog: { create: async () => ({}) },
    }),
    $queryRaw: async () => [{ count: 1 }],
  } as unknown as Db;
  const auth = new AuthService(mockDb, config, sms, email);
  const req = await auth.requestOtp({ email: 'test@example.com' }, '127.0.0.1');
  assert.ok(req.challenge_id);
  const code = email.sent.get(req.challenge_id)!;
  assert.match(code, /^\d{6}$/);
  const ver = await auth.verifyOtp({ challenge_id: req.challenge_id, code }, '127.0.0.1');
  assert.equal(ver.user.login, 'test@example.com');
  assert.equal(ver.user.kind, 'CUSTOMER');
  assert.ok(ver.access_token);
});
