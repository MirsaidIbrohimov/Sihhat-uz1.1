import assert from 'node:assert/strict';
import test from 'node:test';
import { randomBytes } from 'node:crypto';
import { loadConfig } from '../src/common/config';
import type { Db } from '../src/common/db';
import type { Actor } from '../src/auth/permissions';
import { AppError } from '../src/common/errors';
import { TelegramClient } from '../src/telegram/client';
import { TelegramLinkService } from '../src/telegram/link.service';

const ADMIN_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const SESSION_ID = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const adminActor: Actor = {
  id: ADMIN_ID,
  kind: 'SUPERADMIN',
  name: 'Admin',
  mustChangePassword: false,
  sessionId: SESSION_ID,
  memberships: [],
};

function makeBaseEnv(overrides: Record<string, string> = {}) {
  return {
    NODE_ENV: 'test',
    DATABASE_URL: 'postgresql://user:pass@localhost:5432/sihhat_test',
    CORS_ORIGINS: 'http://localhost:3000',
    AUTH_SECRET: randomBytes(32).toString('hex'),
    MFA_ENCRYPTION_KEY: randomBytes(32).toString('hex'),
    TELEGRAM_MODE: 'disabled',
    TELEGRAM_BOT_TOKEN: '',
    TELEGRAM_BOT_USERNAME: '',
    ...overrides,
  };
}

function makeMockDb(botStates: Array<{ botId: string; username: string | null; lastPollAt: Date | null; workerHeartbeatAt: Date | null }> = []) {
  const createdRequests: any[] = [];
  const db = {
    user: {
      findUnique: async ({ where }: any) => (where.id === ADMIN_ID ? { id: ADMIN_ID, status: 'ACTIVE', kind: 'SUPERADMIN' } : null),
    },
    membership: {
      findFirst: async () => null,
      findMany: async () => [],
    },
    telegramAccount: {
      findUnique: async () => null,
    },
    telegramLinkRequest: {
      findFirst: async () => null,
      updateMany: async () => ({ count: 0 }),
      create: async ({ data }: any) => {
        const record = { id: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc', ...data };
        createdRequests.push(record);
        return record;
      },
    },
    telegramBotState: {
      findUnique: async ({ where }: any) => botStates.find(s => s.botId === where.botId) ?? null,
      findFirst: async ({ where }: any) => {
        const thresholdPoll = where?.OR?.find((o: any) => o.lastPollAt?.gt)?.lastPollAt?.gt as Date | undefined;
        const thresholdWorker = where?.OR?.find((o: any) => o.workerHeartbeatAt?.gt)?.workerHeartbeatAt?.gt as Date | undefined;
        return (
          botStates.find(s => {
            if (where?.username?.not === null && !s.username) return false;
            const pollOk = thresholdPoll ? Boolean(s.lastPollAt && s.lastPollAt > thresholdPoll) : false;
            const workerOk = thresholdWorker ? Boolean(s.workerHeartbeatAt && s.workerHeartbeatAt > thresholdWorker) : false;
            return pollOk || workerOk;
          }) ?? null
        );
      },
      upsert: async () => ({}),
    },
    auditLog: {
      create: async () => ({}),
    },
    $executeRaw: async () => 1,
    atomic: async (fn: any) => fn(db),
  };
  return { db: db as unknown as Db, createdRequests };
}

test('Telegram availability: direct polling config reports enabled and creates link', async () => {
  const config = loadConfig(makeBaseEnv({
    TELEGRAM_MODE: 'polling',
    TELEGRAM_BOT_TOKEN: '8276436518:' + 'A'.repeat(35),
    TELEGRAM_BOT_USERNAME: 'sihhat_admins_bot',
  }));
  const { db, createdRequests } = makeMockDb();
  const service = new TelegramLinkService(db, config, new TelegramClient(config));

  const status = await service.status(adminActor);
  assert.equal(status.enabled, true);
  assert.equal(status.bot_username, 'sihhat_admins_bot');

  const started = await service.start(adminActor);
  assert.match(started.url, /^https:\/\/t\.me\/sihhat_admins_bot\?start=/);
  assert.equal(createdRequests.length, 1);
});

test('Telegram availability: disabled API process falls back to active TelegramBotState worker heartbeat in DB', async () => {
  const config = loadConfig(makeBaseEnv());
  const { db } = makeMockDb([
    {
      botId: '8276436518',
      username: 'sihhat_admins_bot',
      lastPollAt: new Date(Date.now() - 15_000),
      workerHeartbeatAt: null,
    },
  ]);
  const service = new TelegramLinkService(db, config, new TelegramClient(config));

  const status = await service.status(adminActor);
  assert.equal(status.enabled, true);
  assert.equal(status.bot_username, 'sihhat_admins_bot');

  const started = await service.start(adminActor);
  assert.match(started.url, /^https:\/\/t\.me\/sihhat_admins_bot\?start=/);
});

test('Telegram availability: stale bot state with disabled config still reports disabled', async () => {
  const config = loadConfig(makeBaseEnv());
  const { db } = makeMockDb([
    {
      botId: '8276436518',
      username: 'sihhat_admins_bot',
      lastPollAt: new Date(Date.now() - 30 * 60_000),
      workerHeartbeatAt: new Date(Date.now() - 30 * 60_000),
    },
  ]);
  const service = new TelegramLinkService(db, config, new TelegramClient(config));

  const status = await service.status(adminActor);
  assert.equal(status.enabled, false);
  await assert.rejects(
    () => service.start(adminActor),
    (err: unknown) => err instanceof AppError && err.code === 'TELEGRAM_DISABLED' && err.getStatus() === 503,
  );
});

test('Telegram availability: public demo stays disabled even when DB has an active bot row', async () => {
  const config = loadConfig({
    ...makeBaseEnv(),
    PUBLIC_DEMO_ENABLED: 'true',
    DEMO_OTP_ENABLED: 'true',
    PAYMENT_MODE: 'local',
    DATABASE_URL: 'postgresql://demo:example@localhost/sihhat_demo',
    STORAGE_PATH: '/home/terminal/.sihhat/demo-media',
    CORS_ORIGINS: 'https://sihhat.uz',
  });
  const { db } = makeMockDb([
    {
      botId: '8276436518',
      username: 'sihhat_admins_bot',
      lastPollAt: new Date(),
      workerHeartbeatAt: new Date(),
    },
  ]);
  const service = new TelegramLinkService(db, config, new TelegramClient(config));

  const status = await service.status(adminActor);
  assert.equal(status.enabled, false);
  assert.equal(status.bot_username, '');
});
