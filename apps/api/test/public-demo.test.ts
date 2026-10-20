import assert from 'node:assert/strict';
import { test } from 'node:test';
import { randomBytes } from 'node:crypto';
import { loadConfig } from '../src/common/config';

const demoEnv = () => ({
  NODE_ENV: 'test', PUBLIC_DEMO_ENABLED: 'true', DEMO_OTP_ENABLED: 'true',
  DATABASE_URL: 'postgresql://demo:example@localhost/sihhat_demo',
  CORS_ORIGINS: 'https://sihhat.uz', AUTH_SECRET: randomBytes(32).toString('hex'),
  MFA_ENCRYPTION_KEY: randomBytes(32).toString('hex'), SMS_ADAPTER: 'local',
  STORAGE_PATH: '/home/terminal/.sihhat/demo-media',
});

test('public demo requires an isolated database, private demo media and no real providers', () => {
  assert.equal(loadConfig(demoEnv()).PUBLIC_DEMO_ENABLED, true);
  for (const overrides of [
    { NODE_ENV: 'production' }, { DATABASE_URL: 'postgresql://demo:example@localhost/sihhat' },
    { DATABASE_URL: 'postgresql://demo:example@localhost/sihhat_test' },
    { DEMO_OTP_ENABLED: 'false' }, { SMS_ADAPTER: 'eskiz' }, { PAYMENT_MODE: 'tezcheck' },
    { GEMINI_API_KEY: 'example-private-provider-key' }, { TELEGRAM_MODE: 'polling' },
    { STORAGE_PATH: '/home/terminal/.sihhat/media' }, { CORS_ORIGINS: '*' },
    { TEZCHECK_API_KEY: 'example-private-provider-key' },
  ]) assert.throws(() => loadConfig({ ...demoEnv(), ...overrides }), /Public demo/);
});
