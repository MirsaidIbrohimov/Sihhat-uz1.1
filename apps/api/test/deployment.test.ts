import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { loadConfig, productionIssues } from '../src/common/config';

const env = (): NodeJS.ProcessEnv => ({
  NODE_ENV: 'production', PORT: '8080',
  DATABASE_URL: 'postgresql://example:example@postgres.railway.internal:5432/railway',
  REDIS_URL: 'redis://example:example@redis.railway.internal:6379',
  AUTH_SECRET: randomBytes(32).toString('hex'), MFA_ENCRYPTION_KEY: randomBytes(32).toString('hex'),
  CORS_ORIGINS: 'https://admin.example.com, https://partner.example.com',
  SMS_ADAPTER: 'eskiz', ESKIZ_TOKEN: 'example-provider-token', ESKIZ_OTP_APPROVED: 'true',
  PAYMENT_MODE: 'tezcheck', TEZCHECK_API_KEY: 'example-provider-key', TEZCHECK_CASH_DESK_CODE: 'example-cashdesk',
  STORAGE_ADAPTER: 's3', S3_ENDPOINT: 'https://storage.example.com',
  S3_BUCKET: 'example-media', S3_ACCESS_KEY: 'example-access-key', S3_SECRET_KEY: 'example-secret-key',
  WORKER_MODE: 'redis',
});

test('deployment: production accepts Railway private databases, HTTPS panels and an injected port', () => {
  const config = loadConfig({ ...env(), RAILWAY_ENVIRONMENT_ID: 'example-environment' });
  assert.equal(config.PORT, 8080);
  assert.equal(config.CORS_ORIGINS, 'https://admin.example.com,https://partner.example.com');
  assert.deepEqual(productionIssues(config), []);
});
test('deployment: a public Railway service cannot enable development adapters', () => {
  assert.throws(() => loadConfig({ ...env(), RAILWAY_ENVIRONMENT_ID: 'example-environment', NODE_ENV: 'development' }), /Railwayda NODE_ENV/);
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
