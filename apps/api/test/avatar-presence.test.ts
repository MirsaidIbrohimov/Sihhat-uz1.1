import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { loadConfig } from '../src/common/config';
import { AuthService } from '../src/auth/auth.service';
import { EmailService } from '../src/auth/email';
import { EngagementService } from '../src/engagement/engagement.service';
import type { Db } from '../src/common/db';
import type { Actor } from '../src/auth/permissions';

const env = (): NodeJS.ProcessEnv => ({
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
  STORAGE_ADAPTER: 's3',
  S3_ENDPOINT: 'https://storage.example.com',
  S3_BUCKET: 'example-media',
  S3_ACCESS_KEY: 'example-access-key',
  S3_SECRET_KEY: 'example-secret-key',
  BOOKING_SETTLEMENT_MODE: 'direct',
  WORKER_MODE: 'redis',
});

const ADMIN_ID = '11111111-1111-4111-8111-111111111111';
const DIRECTOR_ID = '22222222-2222-4222-8222-222222222222';
const CUSTOMER_ID = '33333333-3333-4333-8333-333333333333';
const SANATORIUM_ID = '44444444-4444-4444-8444-444444444444';
const TICKET_ID = '55555555-5555-4555-8555-555555555555';

function buildFixture() {
  const audits: any[] = [];
  const users = new Map<string, any>([
    [ADMIN_ID, { id: ADMIN_ID, name: 'Superadmin', login: 'mirsaid', phone: null, avatarUrl: null, kind: 'SUPERADMIN', status: 'ACTIVE', mustChangePassword: false }],
    [DIRECTOR_ID, { id: DIRECTOR_ID, name: 'Zomin Direktori', login: 'zomin.dir', phone: '+998901234567', avatarUrl: null, kind: 'STAFF', status: 'ACTIVE', mustChangePassword: false }],
    [CUSTOMER_ID, { id: CUSTOMER_ID, name: 'Xusanbek', login: 'xusan@example.com', phone: '+998907778899', avatarUrl: null, kind: 'CUSTOMER', status: 'ACTIVE', mustChangePassword: false }],
  ]);
  const memberships = [
    { id: 'm1', userId: DIRECTOR_ID, sanatoriumId: SANATORIUM_ID, role: 'DIRECTOR', status: 'ACTIVE', grants: [], denies: [], adminDenies: [], ceiling: [], version: 1 },
  ];
  const sessions = new Map<string, any>([
    ['sess-customer-mobile', { id: 'sess-customer-mobile', userId: CUSTOMER_ID, channel: 'MOBILE', revokedAt: null, lastActivityAt: new Date(Date.now() - 40_000), refreshExpiresAt: new Date(Date.now() + 86_400_000) }],
    ['sess-admin-web', { id: 'sess-admin-web', userId: ADMIN_ID, channel: 'WEB', revokedAt: null, lastActivityAt: new Date(Date.now() - 15_000), refreshExpiresAt: new Date(Date.now() + 86_400_000) }],
    ['sess-director-stale', { id: 'sess-director-stale', userId: DIRECTOR_ID, channel: 'WEB', revokedAt: null, lastActivityAt: new Date(Date.now() - 600_000), refreshExpiresAt: new Date(Date.now() + 86_400_000) }],
  ]);
  const tickets = [
    { id: TICKET_ID, userId: DIRECTOR_ID, sanatoriumId: SANATORIUM_ID, bookingId: null, title: 'dd', status: 'OPEN', createdAt: new Date() },
  ];
  const messages = [
    { id: '66666666-6666-4666-8666-666666666601', ticketId: TICKET_ID, userId: DIRECTOR_ID, text: 'k', imageUrl: null, isEdited: false, deletedForUser: false, createdAt: new Date() },
  ];

  const tx: any = {
    user: {
      findUnique: async ({ where }: any) => users.get(where.id) ?? null,
      findFirst: async ({ where }: any) => {
        if (where?.kind) return [...users.values()].find((u) => u.kind === where.kind && u.status === (where.status ?? u.status)) ?? null;
        return null;
      },
      findMany: async ({ where }: any) => (where?.id?.in ?? []).map((id: string) => users.get(id)).filter(Boolean),
      update: async ({ where, data }: any) => {
        const u = users.get(where.id);
        Object.assign(u, data);
        return u;
      },
    },
    membership: {
      findMany: async ({ where }: any) => memberships.filter((m) => m.userId === where.userId),
    },
    sanatorium: {
      findUnique: async ({ where }: any) => (where.id === SANATORIUM_ID ? { id: SANATORIUM_ID, name: 'Zomin Sanatoriyasi' } : null),
      findMany: async ({ where }: any) => ((where?.id?.in ?? []).includes(SANATORIUM_ID) ? [{ id: SANATORIUM_ID, name: 'Zomin Sanatoriyasi' }] : []),
    },
    supportTicket: {
      findUnique: async ({ where }: any) => tickets.find((t) => t.id === where.id) ?? null,
      findMany: async ({ where }: any) => tickets.filter((t) => !where?.userId || t.userId === where.userId),
    },
    supportMessage: {
      findMany: async ({ where }: any) =>
        messages.filter((m) => (where.ticketId?.in ? where.ticketId.in.includes(m.ticketId) : m.ticketId === where.ticketId)),
    },
    session: {
      findUnique: async ({ where }: any) => sessions.get(where.id) ?? null,
      findMany: async ({ where }: any) => {
        const now = Date.now();
        return [...sessions.values()].filter(
          (s) =>
            (!where?.userId?.in || where.userId.in.includes(s.userId)) &&
            s.revokedAt === null &&
            (!where?.refreshExpiresAt?.gt || s.refreshExpiresAt.getTime() > where.refreshExpiresAt.gt.getTime()) &&
            (!where?.lastActivityAt?.gt || s.lastActivityAt.getTime() > where.lastActivityAt.gt.getTime()) &&
            now > 0,
        );
      },
      updateMany: async ({ where, data }: any) => {
        const s = sessions.get(where.id);
        if (!s || s.revokedAt) return { count: 0 };
        Object.assign(s, data);
        return { count: 1 };
      },
    },
    auditLog: {
      create: async ({ data }: any) => {
        audits.push(data);
        return data;
      },
    },
  };

  const mockDb = {
    ...tx,
    atomic: async (fn: (t: any) => Promise<any>) => fn(tx),
  } as unknown as Db;

  const config = loadConfig(env());
  const email = new EmailService(config);
  const auth = new AuthService(mockDb, config, { assertReady: () => {} } as any, email);
  const engagement = new EngagementService(mockDb, email);
  return { auth, engagement, audits, users, sessions };
}

test('profile avatar: supports <= 15 MB upload, removal, audit sanitization, and rejects > 15 MB', async () => {
  const { auth, audits } = buildFixture();
  const director: Actor = { kind: 'STAFF', id: DIRECTOR_ID, name: 'Zomin Direktori', sessionId: 'sess-director-stale', mustChangePassword: false, memberships: [] };
  const smallPng = 'data:image/png;base64,' + Buffer.from('89504e470d0a1a0a', 'hex').toString('base64');

  const updated = await auth.profile(director, { avatarUrl: smallPng });
  assert.equal(updated.avatarUrl, smallPng);
  assert.equal(audits.at(-1).after.avatarUpdated, true);
  assert.equal(JSON.stringify(audits.at(-1)).includes('data:image'), false);

  // Over 15 MB raw bytes (15 * 1024 * 1024 + 3 bytes) must be rejected with 422
  const oversized = 'data:image/jpeg;base64,' + Buffer.alloc(15 * 1024 * 1024 + 3, 1).toString('base64');
  await assert.rejects(
    () => auth.profile(director, { avatarUrl: oversized }),
    (err: any) => err?.status === 422 && /15 MB/i.test(err?.message ?? ''),
  );

  // SVG data URI blocked
  await assert.rejects(
    () => auth.profile(director, { avatarUrl: 'data:image/svg+xml;base64,PHN2Zz48L3N2Zz4=' }),
    (err: any) => err?.status === 422,
  );

  const cleared = await auth.profile(director, { avatarUrl: null });
  assert.equal(cleared.avatarUrl, null);
});

test('presence & chat avatars: live online indicator, sender avatarUrl, and Superadmin peer on partner tickets', async () => {
  const { auth, engagement } = buildFixture();
  const director: Actor = {
    kind: 'STAFF',
    id: DIRECTOR_ID,
    name: 'Zomin Direktori',
    sessionId: 'sess-director-stale',
    mustChangePassword: false,
    memberships: [{ id: 'm1', sanatoriumId: SANATORIUM_ID, role: 'DIRECTOR', status: 'ACTIVE', permissions: [], version: 1 }],
  };
  const admin: Actor = { kind: 'SUPERADMIN', id: ADMIN_ID, name: 'Superadmin', sessionId: 'sess-admin-web', mustChangePassword: false, memberships: [] };
  const customer: Actor = { kind: 'CUSTOMER', id: CUSTOMER_ID, name: 'Xusanbek', sessionId: 'sess-customer-mobile', mustChangePassword: false, memberships: [] };

  const adminPng = 'data:image/png;base64,' + Buffer.from('89504e470d0a1a0a', 'hex').toString('base64');
  const dirPng = 'data:image/png;base64,' + Buffer.from('ffd8ffe000104a46', 'hex').toString('base64');
  await auth.profile(admin, { avatarUrl: adminPng });
  await auth.profile(director, { avatarUrl: dirPng });

  // Customer mobile heartbeat updates online presence
  const hb = await auth.heartbeat(customer);
  assert.equal(hb.online, true);

  // Partner director lists tickets -> receives Superadmin peer avatar + live online=true
  const partnerTickets = await engagement.tickets(director);
  assert.equal(partnerTickets.length, 1);
  assert.equal(partnerTickets[0].peer?.name, 'Superadmin');
  assert.equal(partnerTickets[0].peer?.avatarUrl, adminPng);
  assert.equal(partnerTickets[0].peer?.isOnline, true);
  assert.equal(partnerTickets[0].sender?.avatarUrl, dirPng);
  assert.equal(partnerTickets[0].sender?.isOnline, false);

  // Director touches activity (becomes online) -> Superadmin ticketGet sees director online + avatarUrl
  await auth.heartbeat(customer); // still online
  const thread = await engagement.ticketGet(director, TICKET_ID);
  assert.equal(thread.peer?.name, 'Superadmin');
  assert.equal(thread.peer?.avatarUrl, adminPng);
  assert.equal(thread.messages[0].userAvatarUrl, dirPng);
});
