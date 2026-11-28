import assert from 'node:assert/strict';
import test from 'node:test';
import { passwordHash } from '../src/common/crypto';
import type { Config } from '../src/common/config';
import { EmailService } from '../src/auth/email';
import type { Actor } from '../src/auth/permissions';
import { SanatoriumService, maskAdminEmail } from '../src/sanatoriums/sanatorium.service';

const SAN_ID = '11111111-1111-4111-8111-111111111111';
const ADMIN_ID = '22222222-2222-4222-8222-222222222222';
const STAFF_ID = '33333333-3333-4333-8333-333333333333';

const superadminActor: Actor = {
  id: ADMIN_ID,
  sessionId: '55555555-5555-4555-8555-555555555555',
  kind: 'SUPERADMIN',
  name: 'Bosh Admin',
  login: 'superadmin',
  email: 'admin@sihhat.uz',
  mustChangePassword: false,
  memberships: [],
};

const staffActor: Actor = {
  id: STAFF_ID,
  sessionId: '66666666-6666-4666-8666-666666666666',
  kind: 'STAFF',
  name: 'Direktor',
  login: 'director1',
  mustChangePassword: false,
  memberships: [
    {
      id: '44444444-4444-4444-8444-444444444444',
      sanatoriumId: SAN_ID,
      role: 'DIRECTOR',
      status: 'ACTIVE',
      permissions: ['sanatorium.profile.edit'],
      version: 1,
    },
  ],
};

function createTestHarness(opts?: { adminEmail?: string | null; adminPasswordHash?: string }) {
  const sanatoriums = new Map<string, any>([
    [
      SAN_ID,
      {
        id: SAN_ID,
        name: 'Zomin Shifo Sanatoriyasi',
        status: 'ACTIVE',
        publicRevisionId: 'rev-1',
        bankRevisionId: 'bank-1',
        version: 1,
      },
    ],
  ]);

  const users = new Map<string, any>([
    [
      ADMIN_ID,
      {
        id: ADMIN_ID,
        kind: 'SUPERADMIN',
        status: 'ACTIVE',
        name: 'Bosh Admin',
        login: 'superadmin',
        email: opts && 'adminEmail' in opts ? opts.adminEmail : 'admin@sihhat.uz',
        passwordHash: opts?.adminPasswordHash ?? null,
      },
    ],
    [
      STAFF_ID,
      {
        id: STAFF_ID,
        kind: 'STAFF',
        status: 'ACTIVE',
        name: 'Direktor',
        login: 'director1',
        email: null,
        passwordHash: null,
      },
    ],
  ]);

  const challenges: any[] = [];
  const audits: any[] = [];
  const sessions = [
    { id: 'sess-staff-1', userId: STAFF_ID, revokedAt: null as Date | null },
    { id: 'sess-admin-1', userId: ADMIN_ID, revokedAt: null as Date | null },
  ];
  let memberships = [{ id: 'm-1', userId: STAFF_ID, sanatoriumId: SAN_ID, status: 'ACTIVE' }];
  let roomsDeleted = false;
  let revisionsDeleted = false;
  let telegramUnlinked = false;

  const config = {
    NODE_ENV: 'test',
    AUTH_SECRET: 'test-secret-for-sanatorium-delete-verification-32chars',
    PUBLIC_DEMO_ENABLED: false,
    DEMO_OTP_ENABLED: false,
    OTP_MAX_ATTEMPTS: 5,
    SMTP_HOST: '',
    SMTP_PORT: 587,
    SMTP_USER: '',
    SMTP_PASS: '',
    SMTP_FROM: 'Sihhat uz <no-reply@sihhat.uz>',
    SMTP_SECURE: false,
    RESEND_API_KEY: '',
  } as unknown as Config;

  const db: any = {
    $executeRaw: async () => 1,
    user: {
      findUnique: async ({ where }: any) => users.get(where.id) ?? null,
      findMany: async () => [...users.values()].filter(u => u.kind === 'SUPERADMIN' && u.status === 'ACTIVE'),
    },
    sanatorium: {
      findUnique: async ({ where }: any) => sanatoriums.get(where.id) ?? null,
      update: async ({ where, data }: any) => {
        const cur = sanatoriums.get(where.id);
        if (!cur) throw new Error('Not found');
        const next = { ...cur, ...data };
        sanatoriums.set(where.id, next);
        return next;
      },
      delete: async ({ where }: any) => {
        const cur = sanatoriums.get(where.id);
        sanatoriums.delete(where.id);
        return cur;
      },
    },
    otpChallenge: {
      findFirst: async ({ where }: any) => {
        const filtered = challenges
          .filter(c => c.phone === where.phone && c.purpose === where.purpose)
          .filter(c => (where.actorId ? c.actorId === where.actorId : true))
          .filter(c => ('consumedAt' in where ? c.consumedAt === where.consumedAt : true))
          .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
        return filtered[0] ?? null;
      },
      updateMany: async ({ where, data }: any) => {
        let count = 0;
        for (const c of challenges) {
          const idOk = where.id ? c.id === where.id : true;
          const phoneOk = where.phone ? c.phone === where.phone : true;
          const purposeOk = where.purpose ? c.purpose === where.purpose : true;
          const consumedOk = 'consumedAt' in where ? c.consumedAt === where.consumedAt : true;
          if (idOk && phoneOk && purposeOk && consumedOk) {
            Object.assign(c, data);
            count++;
          }
        }
        return { count };
      },
      create: async ({ data }: any) => {
        const row = { attempts: 0, consumedAt: null, createdAt: new Date(), ...data };
        challenges.push(row);
        return row;
      },
      update: async ({ where, data }: any) => {
        const found = challenges.find(c => c.id === where.id);
        if (!found) throw new Error('Challenge not found');
        if (data.attempts?.increment) found.attempts += data.attempts.increment;
        Object.assign(found, Object.fromEntries(Object.entries(data).filter(([k]) => k !== 'attempts')));
        return found;
      },
    },
    telegramAccount: {
      updateMany: async () => {
        telegramUnlinked = true;
        return { count: 1 };
      },
    },
    room: {
      deleteMany: async () => {
        roomsDeleted = true;
        return { count: 2 };
      },
    },
    sanatoriumRevision: {
      deleteMany: async () => {
        revisionsDeleted = true;
        return { count: 1 };
      },
    },
    membership: {
      findMany: async ({ where }: any) => {
        if (where.sanatoriumId) return memberships.filter(m => m.sanatoriumId === where.sanatoriumId);
        if (where.userId?.in) return memberships.filter(m => where.userId.in.includes(m.userId) && m.status === 'ACTIVE');
        return [];
      },
      deleteMany: async ({ where }: any) => {
        const before = memberships.length;
        memberships = memberships.filter(m => m.sanatoriumId !== where.sanatoriumId);
        return { count: before - memberships.length };
      },
    },
    session: {
      updateMany: async ({ where, data }: any) => {
        let count = 0;
        for (const s of sessions) {
          if (where.userId.in.includes(s.userId) && s.revokedAt === null) {
            s.revokedAt = data.revokedAt;
            count++;
          }
        }
        return { count };
      },
    },
    auditLog: {
      create: async ({ data }: any) => {
        audits.push(data);
        return data;
      },
    },
    atomic: async (fn: (tx: any) => Promise<any>) => fn(db),
  };

  const email = new EmailService(config);
  const service = new SanatoriumService(db, config, email);

  return {
    service,
    email,
    sanatoriums,
    sessions,
    audits,
    getFlags: () => ({ roomsDeleted, revisionsDeleted, telegramUnlinked }),
  };
}

test('maskAdminEmail masks local part while preserving domain', () => {
  assert.equal(maskAdminEmail('mirsaid@sihhat.uz'), 'mi***d@sihhat.uz');
  assert.equal(maskAdminEmail('ab@sihhat.uz'), 'ab***@sihhat.uz');
});

test('non-superadmin staff cannot request delete code or delete sanatorium', async () => {
  const { service } = createTestHarness();
  await assert.rejects(
    () => service.requestDeleteCode(staffActor, SAN_ID),
    (err: any) => err?.status === 403,
  );
  await assert.rejects(
    () => service.remove(staffActor, SAN_ID, { method: 'PASSWORD', password: 'Password123' }),
    (err: any) => err?.status === 403,
  );
});

test('superadmin can delete sanatorium with valid admin password and wrong password is rejected', async () => {
  const hashed = await passwordHash('StrongAdminPass99');
  const { service, sanatoriums, sessions, audits, getFlags } = createTestHarness({
    adminPasswordHash: hashed,
  });

  await assert.rejects(
    () => service.remove(superadminActor, SAN_ID, { method: 'PASSWORD', password: 'WrongPassword11' }),
    (err: any) => err?.code === 'INVALID_ADMIN_PASSWORD' && err?.status === 422,
  );
  assert.equal(sanatoriums.has(SAN_ID), true);

  const res = await service.remove(superadminActor, SAN_ID, {
    method: 'PASSWORD',
    password: 'StrongAdminPass99',
    reason: 'Sinov sanatoriyasi o‘chirildi',
  });
  assert.equal(res.success, true);
  assert.equal(res.deleted_id, SAN_ID);
  assert.equal(sanatoriums.has(SAN_ID), false);
  assert.equal(getFlags().roomsDeleted, true);
  assert.equal(getFlags().revisionsDeleted, true);
  assert.equal(getFlags().telegramUnlinked, true);
  assert.notEqual(sessions.find(s => s.id === 'sess-staff-1')?.revokedAt, null);
  assert.equal(sessions.find(s => s.id === 'sess-admin-1')?.revokedAt, null);
  assert.equal(audits.some(a => a.action === 'sanatorium.deleted' && a.entityId === SAN_ID), true);
});

test('superadmin can delete sanatorium via 6-digit email verification code and code cannot be reused', async () => {
  const { service, email, sanatoriums } = createTestHarness({
    adminEmail: 'superadmin@sihhat.uz',
  });

  const requested = await service.requestDeleteCode(superadminActor, SAN_ID);
  assert.equal(requested.sent, true);
  assert.equal(requested.masked_email, 'su***n@sihhat.uz');
  assert.equal(email.sentDeleteCodes.length, 1);
  const sentCode = email.sentDeleteCodes[0].code;
  assert.match(sentCode, /^\d{6}$/);

  const wrongCode = sentCode === '000000' ? '111111' : '000000';
  await assert.rejects(
    () => service.remove(superadminActor, SAN_ID, { method: 'EMAIL_CODE', email_code: wrongCode }),
    (err: any) => err?.code === 'OTP_INVALID' && err?.status === 422,
  );
  assert.equal(sanatoriums.has(SAN_ID), true);

  const deleted = await service.remove(superadminActor, SAN_ID, {
    method: 'EMAIL_CODE',
    email_code: sentCode,
  });
  assert.equal(deleted.success, true);
  assert.equal(sanatoriums.has(SAN_ID), false);

  sanatoriums.set(SAN_ID, { id: SAN_ID, name: 'Qayta urinish', status: 'ACTIVE', version: 1 });
  await assert.rejects(
    () => service.remove(superadminActor, SAN_ID, { method: 'EMAIL_CODE', email_code: sentCode }),
    (err: any) => err?.code === 'OTP_INVALID' && err?.status === 422,
  );
});

test('requestDeleteCode returns clear 422 error when no admin email is configured', async () => {
  const { service } = createTestHarness({ adminEmail: null });
  await assert.rejects(
    () => service.requestDeleteCode(superadminActor, SAN_ID),
    (err: any) => err?.code === 'ADMIN_EMAIL_MISSING' && err?.status === 422,
  );
});
