import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomBytes } from 'node:crypto';
import { loadConfig } from '../src/common/config';
import { AuthService } from '../src/auth/auth.service';
import { MediaService } from '../src/media/media.service';
import { EmailService } from '../src/auth/email';
import { Sms } from '../src/auth/sms';
import type { Db } from '../src/common/db';
import type { Actor } from '../src/auth/permissions';

const ACTOR_ID = '11111111-1111-4111-8111-111111111111';
const SANATORIUM_ID = '22222222-2222-4222-8222-222222222222';

function makeConfig(storagePath: string) {
  return loadConfig({
    NODE_ENV: 'production',
    PORT: '8080',
    DATABASE_URL: 'postgresql://example:example@db.example.internal:5432/sihhat',
    REDIS_URL: 'redis://example:example@redis.example.internal:6379',
    AUTH_SECRET: randomBytes(32).toString('hex'),
    MFA_ENCRYPTION_KEY: randomBytes(32).toString('hex'),
    CORS_ORIGINS: 'https://admin.example.com,https://partner.example.com',
    SMS_ADAPTER: 'disabled',
    SMTP_HOST: 'smtp.example.com',
    PAYMENT_MODE: 'tezcheck',
    TEZCHECK_API_KEY: 'example-provider-key',
    TEZCHECK_CASH_DESK_CODE: 'example-cashdesk',
    STORAGE_ADAPTER: 'local',
    STORAGE_PATH: storagePath,
    BOOKING_SETTLEMENT_MODE: 'direct',
    WORKER_MODE: 'redis',
  });
}

test('AuthService.onModuleInit adds avatarUrl column safely and profile accepts avatar_url/image/jpg/extra keys', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'sihhat-auth-test-'));
  try {
    const ddlCalls: string[] = [];
    let savedAvatar: string | null = null;
    const db = {
      $executeRawUnsafe: async (sql: string) => {
        ddlCalls.push(sql);
        return 0;
      },
      $queryRaw: async () => [{ count: 1 }],
      atomic: async (fn: (tx: any) => Promise<any>) =>
        fn({
          $executeRaw: async () => 1,
          auditLog: { create: async () => ({}) },
          user: {
            findUniqueOrThrow: async () => ({
              id: ACTOR_ID,
              kind: 'SUPERADMIN',
              name: 'Admin',
              phone: null,
              login: 'mirsaid',
              avatarUrl: savedAvatar,
              mustChangePassword: false,
            }),
            update: async ({ data }: any) => {
              if (data.avatarUrl !== undefined) savedAvatar = data.avatarUrl;
              return {
                id: ACTOR_ID,
                kind: 'SUPERADMIN',
                name: data.name ?? 'Admin',
                phone: null,
                login: 'mirsaid',
                avatarUrl: savedAvatar,
                mustChangePassword: false,
              };
            },
          },
        }),
    } as unknown as Db;

    const config = makeConfig(dir);
    const auth = new AuthService(db, config, new Sms(config, db), new EmailService(config));
    await auth.onModuleInit();
    assert.equal(ddlCalls.length, 1);
    assert.match(ddlCalls[0], /ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "avatarUrl" TEXT/);

    // Safe no-op when mock DB lacks $executeRawUnsafe
    const authMinimal = new AuthService({} as Db, config, new Sms(config, {} as Db), new EmailService(config));
    await authMinimal.onModuleInit();

    const actor: Actor = {
      id: ACTOR_ID,
      kind: 'SUPERADMIN',
      name: 'Admin',
      phone: null,
      login: 'mirsaid',
      avatarUrl: null,
      sessionId: '33333333-3333-4333-8333-333333333333',
      idleTimeoutSeconds: 7200,
      lastActivityAt: new Date().toISOString(),
      mustChangePassword: false,
      memberships: [],
    };

    const jpegB64 = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46]).toString('base64');
    const updated = await auth.profile(actor, {
      id: ACTOR_ID,
      kind: 'SUPERADMIN',
      email: '',
      phone: '',
      login: '',
      avatar_url: `data:image/jpg;charset=utf-8;base64,${jpegB64}`,
    });
    assert.equal(updated.avatarUrl, `data:image/jpeg;base64,${jpegB64}`);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('MediaService.upload normalizes image/jpg, supports GIF, strips data URI prefix, and reports FILE_SIZE_INVALID above 8MB', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'sihhat-media-test-'));
  try {
    const config = makeConfig(dir);
    const db = {
      $queryRaw: async () => [{ count: 1 }],
      atomic: async (fn: (tx: any) => Promise<any>) =>
        fn({
          mediaAsset: { create: async ({ data }: any) => ({ ...data }) },
          auditLog: { create: async () => ({}) },
        }),
    } as unknown as Db;

    const auth = new AuthService(db, config, new Sms(config, db), new EmailService(config));
    const media = new MediaService(db, config, auth);
    const actor: Actor = {
      id: ACTOR_ID,
      kind: 'SUPERADMIN',
      name: 'Admin',
      phone: null,
      login: 'mirsaid',
      avatarUrl: null,
      sessionId: '33333333-3333-4333-8333-333333333333',
      idleTimeoutSeconds: 7200,
      lastActivityAt: new Date().toISOString(),
      mustChangePassword: false,
      memberships: [],
    };

    const jpegB64 = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46]).toString('base64');
    const jpegRes = await media.upload(actor, {
      sanatorium_id: SANATORIUM_ID,
      revision_id: '',
      visibility: 'PUBLIC',
      mime: 'image/jpg',
      base64: `data:image/jpeg;base64,${jpegB64}`,
    });
    assert.equal(jpegRes.mime, 'image/jpeg');

    const gifB64 = Buffer.concat([Buffer.from('GIF89a'), Buffer.from([1, 0, 1, 0])]).toString('base64');
    const gifRes = await media.upload(actor, {
      sanatorium_id: SANATORIUM_ID,
      visibility: 'PUBLIC',
      mime: 'image/gif',
      base64: gifB64,
    });
    assert.equal(gifRes.mime, 'image/gif');

    const oversizeB64 = Buffer.alloc(8 * 1024 * 1024 + 32, 0xff).toString('base64');
    await assert.rejects(
      () =>
        media.upload(actor, {
          sanatorium_id: SANATORIUM_ID,
          visibility: 'PUBLIC',
          mime: 'image/jpeg',
          base64: oversizeB64,
        }),
      (err: any) => err?.code === 'FILE_SIZE_INVALID',
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
