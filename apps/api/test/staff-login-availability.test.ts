import assert from 'node:assert/strict';
import test from 'node:test';
import { HttpException } from '@nestjs/common';
import { AuthService } from '../src/auth/auth.service';
import { DIRECTOR } from '../src/auth/permissions';
import { StaffService } from '../src/auth/staff.service';
import { enrichOpenApi } from '../src/common/openapi';

type UserRecord = {
  id: string;
  kind: 'SUPERADMIN' | 'STAFF' | 'CUSTOMER';
  status: string;
  name: string;
  login: string | null;
  phone: string | null;
  avatarUrl: string | null;
  passwordHash: string | null;
  mustChangePassword: boolean;
  createdAt: Date;
};

type MembershipRecord = {
  id: string;
  userId: string;
  sanatoriumId: string;
  role: 'DIRECTOR' | 'RECEPTION' | 'ACCOUNTANT';
  status: 'ACTIVE' | 'PENDING_APPROVAL' | 'REVOKED' | 'BLOCKED';
  ceiling: string[];
  grants: string[];
  denies: string[];
  adminDenies: string[];
  invitedBy: string | null;
  version: number;
};

const SANATORIUM_A = '11111111-1111-4111-8111-111111111111';
const SANATORIUM_B = '22222222-2222-4222-8222-222222222222';
const ADMIN_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const DIR_A_ID = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const REC_A_ID = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
const CUSTOMER_ID = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd';

function makeMockDb() {
  let seq = 1;
  const users: UserRecord[] = [
    {
      id: ADMIN_ID,
      kind: 'SUPERADMIN',
      status: 'ACTIVE',
      name: 'Super Admin',
      login: 'super.admin',
      phone: '+998901000001',
      avatarUrl: null,
      passwordHash: 'hash-admin',
      mustChangePassword: false,
      createdAt: new Date(),
    },
    {
      id: DIR_A_ID,
      kind: 'STAFF',
      status: 'ACTIVE',
      name: 'Director A',
      login: 'director.a',
      phone: '+998901000002',
      avatarUrl: null,
      passwordHash: 'hash-dir-a',
      mustChangePassword: false,
      createdAt: new Date(),
    },
    {
      id: REC_A_ID,
      kind: 'STAFF',
      status: 'ACTIVE',
      name: 'Reception A',
      login: 'reception.a',
      phone: '+998901000003',
      avatarUrl: null,
      passwordHash: 'hash-rec-a',
      mustChangePassword: false,
      createdAt: new Date(),
    },
    {
      id: CUSTOMER_ID,
      kind: 'CUSTOMER',
      status: 'ACTIVE',
      name: 'Customer One',
      login: 'customer.one',
      phone: '+998901000004',
      avatarUrl: null,
      passwordHash: null,
      mustChangePassword: false,
      createdAt: new Date(),
    },
  ];

  const memberships: MembershipRecord[] = [
    {
      id: 'e1111111-1111-4111-8111-111111111111',
      userId: DIR_A_ID,
      sanatoriumId: SANATORIUM_A,
      role: 'DIRECTOR',
      status: 'ACTIVE',
      ceiling: [...DIRECTOR],
      grants: [],
      denies: [],
      adminDenies: [],
      invitedBy: ADMIN_ID,
      version: 1,
    },
    {
      id: 'e2222222-2222-4222-8222-222222222222',
      userId: REC_A_ID,
      sanatoriumId: SANATORIUM_A,
      role: 'RECEPTION',
      status: 'ACTIVE',
      ceiling: ['bookings.read'],
      grants: [],
      denies: [],
      adminDenies: [],
      invitedBy: DIR_A_ID,
      version: 1,
    },
  ];

  const matchesLogin = (candidate: string | null, cond: unknown) => {
    if (!cond || candidate === null) return false;
    if (typeof cond === 'string') return candidate === cond;
    const obj = cond as { equals?: string; mode?: string };
    if (typeof obj.equals !== 'string') return false;
    return obj.mode === 'insensitive'
      ? candidate.toLowerCase() === obj.equals.toLowerCase()
      : candidate === obj.equals;
  };

  const matchUser = (u: UserRecord, where: Record<string, any> = {}) => {
    if (where.id?.not && u.id === where.id.not) return false;
    if (typeof where.id === 'string' && u.id !== where.id) return false;
    if (where.login && !matchesLogin(u.login, where.login)) return false;
    if (where.phone && u.phone !== where.phone) return false;
    if (where.kind && u.kind !== where.kind) return false;
    if (where.status && u.status !== where.status) return false;
    return true;
  };

  const db: any = {
    users,
    memberships,
    atomic: async (fn: (tx: any) => Promise<any>) => fn(db),
    $executeRaw: async () => 0,
    sanatorium: {
      findUnique: async ({ where }: any) =>
        where.id === SANATORIUM_A || where.id === SANATORIUM_B
          ? { id: where.id }
          : null,
    },
    session: {
      updateMany: async () => ({ count: 0 }),
    },
    auditLog: {
      create: async ({ data }: any) => ({ id: `audit-${seq++}`, ...data }),
    },
    outboxEvent: {
      create: async ({ data }: any) => ({ id: `outbox-${seq++}`, ...data }),
    },
    user: {
      findFirst: async ({ where }: any) => {
        const found = users.find((u) => matchUser(u, where));
        return found ? { ...found } : null;
      },
      findMany: async ({ where }: any) =>
        users.filter((u) => matchUser(u, where)).map((u) => ({ ...u })),
      create: async ({ data }: any) => {
        const created: UserRecord = {
          id: `00000000-0000-4000-8000-${String(seq++).padStart(12, '0')}`,
          kind: data.kind,
          status: data.status ?? 'ACTIVE',
          name: data.name,
          login: data.login ?? null,
          phone: data.phone ?? null,
          avatarUrl: data.avatarUrl ?? null,
          passwordHash: data.passwordHash ?? null,
          mustChangePassword: Boolean(data.mustChangePassword),
          createdAt: new Date(),
        };
        users.push(created);
        return { ...created };
      },
      update: async ({ where, data }: any) => {
        const idx = users.findIndex((u) => u.id === where.id);
        if (idx === -1) throw new Error('User not found');
        users[idx] = { ...users[idx], ...data };
        return { ...users[idx] };
      },
    },
    membership: {
      findUnique: async ({ where }: any) => {
        if (where.userId_sanatoriumId) {
          const m = memberships.find(
            (x) =>
              x.userId === where.userId_sanatoriumId.userId &&
              x.sanatoriumId === where.userId_sanatoriumId.sanatoriumId,
          );
          return m ? { ...m } : null;
        }
        const m = memberships.find((x) => x.id === where.id);
        return m ? { ...m } : null;
      },
      findMany: async ({ where }: any) =>
        memberships
          .filter(
            (m) =>
              (!where.sanatoriumId || m.sanatoriumId === where.sanatoriumId) &&
              (!where.role || m.role === where.role) &&
              (!where.status || m.status === where.status),
          )
          .map((m) => ({ ...m })),
      updateMany: async () => ({ count: 0 }),
      update: async ({ where, data }: any) => {
        const idx = memberships.findIndex((m) => m.id === where.id);
        if (idx === -1) throw new Error('Membership not found');
        const nextVersion =
          data.version?.increment !== undefined
            ? memberships[idx].version + data.version.increment
            : memberships[idx].version;
        memberships[idx] = {
          ...memberships[idx],
          ...data,
          version: nextVersion,
        };
        return { ...memberships[idx] };
      },
      create: async ({ data }: any) => {
        const created: MembershipRecord = {
          id: `m0000000-0000-4000-8000-${String(seq++).padStart(12, '0')}`,
          userId: data.userId,
          sanatoriumId: data.sanatoriumId,
          role: data.role,
          status: data.status,
          ceiling: data.ceiling ?? [],
          grants: data.grants ?? [],
          denies: data.denies ?? [],
          adminDenies: data.adminDenies ?? [],
          invitedBy: data.invitedBy ?? null,
          version: 1,
        };
        memberships.push(created);
        return { ...created };
      },
    },
  };
  return db;
}

const adminActor: any = {
  id: ADMIN_ID,
  kind: 'SUPERADMIN',
  name: 'Super Admin',
  phone: '+998901000001',
  login: 'super.admin',
  sessionId: 'sess-admin',
  mustChangePassword: false,
  memberships: [],
};

const directorActor: any = {
  id: DIR_A_ID,
  kind: 'STAFF',
  name: 'Director A',
  phone: '+998901000002',
  login: 'director.a',
  sessionId: 'sess-dir',
  mustChangePassword: false,
  memberships: [
    {
      id: 'e1111111-1111-4111-8111-111111111111',
      sanatoriumId: SANATORIUM_A,
      sanatoriumName: 'Sanatorium A',
      role: 'DIRECTOR',
      status: 'ACTIVE',
      permissions: [...DIRECTOR],
      version: 1,
    },
  ],
};

const receptionActor: any = {
  id: REC_A_ID,
  kind: 'STAFF',
  name: 'Reception A',
  phone: '+998901000003',
  login: 'reception.a',
  sessionId: 'sess-rec',
  mustChangePassword: false,
  memberships: [
    {
      id: 'e2222222-2222-4222-8222-222222222222',
      sanatoriumId: SANATORIUM_A,
      sanatoriumName: 'Sanatorium A',
      role: 'RECEPTION',
      status: 'ACTIVE',
      permissions: ['bookings.read'],
      version: 1,
    },
  ],
};

function assertHttpCode(err: unknown, status: number, code: string) {
  assert.ok(err instanceof HttpException, 'Expected HttpException');
  assert.equal(err.getStatus(), status);
  assert.equal((err.getResponse() as { code?: string }).code, code);
}

test('enrichOpenApi defines query parameters idempotently for /partner/staff/login-availability', () => {
  const doc: any = {
    paths: {
      '/partner/staff/login-availability': {
        get: {
          parameters: [],
          responses: { '200': { description: 'OK' } },
        },
      },
    },
    components: { schemas: {} },
  };
  const enrichedOnce = enrichOpenApi(structuredClone(doc)) as any;
  const enrichedTwice = enrichOpenApi(structuredClone(enrichedOnce)) as any;
  assert.deepEqual(enrichedTwice, enrichedOnce);
  const params =
    enrichedOnce.paths['/partner/staff/login-availability'].get.parameters ?? [];
  assert.deepEqual(
    params.map((p: any) => p.name),
    ['login', 'exclude_user_id'],
  );
  assert.deepEqual(
    enrichedOnce.paths['/partner/staff/login-availability'].get['x-roles'],
    ['STAFF', 'SUPERADMIN'],
  );
});

test('checkLoginAvailability checks database, format, case-insensitivity, and permissions', async () => {
  const db = makeMockDb();
  const service = new StaffService(db);

  await assert.rejects(
    () => service.checkLoginAvailability(receptionActor, { login: 'free.login' }),
    (err) => {
      assertHttpCode(err, 403, 'PERMISSION_DENIED');
      return true;
    },
  );

  assert.deepEqual(
    await service.checkLoginAvailability(directorActor, { login: '' }),
    { login: '', valid: false, available: false, reason: 'EMPTY' },
  );

  assert.deepEqual(
    await service.checkLoginAvailability(directorActor, { login: 'ab' }),
    { login: 'ab', valid: false, available: false, reason: 'INVALID_FORMAT' },
  );

  assert.deepEqual(
    await service.checkLoginAvailability(directorActor, { login: 'bad user' }),
    {
      login: 'bad user',
      valid: false,
      available: false,
      reason: 'INVALID_FORMAT',
    },
  );

  assert.deepEqual(
    await service.checkLoginAvailability(directorActor, { login: '  Director.A  ' }),
    { login: 'director.a', valid: true, available: false, reason: 'TAKEN' },
  );

  assert.deepEqual(
    await service.checkLoginAvailability(adminActor, { login: 'customer.one' }),
    { login: 'customer.one', valid: true, available: false, reason: 'TAKEN' },
  );

  assert.deepEqual(
    await service.checkLoginAvailability(directorActor, { login: '  Yangi.Resepshn  ' }),
    { login: 'yangi.resepshn', valid: true, available: true, reason: null },
  );

  assert.deepEqual(
    await service.checkLoginAvailability(adminActor, {
      login: 'director.a',
      exclude_user_id: DIR_A_ID,
    }),
    { login: 'director.a', valid: true, available: true, reason: null },
  );
});

test('invite rejects existing login/phone cleanly without overwriting users', async () => {
  const db = makeMockDb();
  const service = new StaffService(db);
  const originalReception = { ...db.users.find((u: UserRecord) => u.id === REC_A_ID) };

  await assert.rejects(
    () =>
      service.invite(directorActor, {
        sanatorium_id: SANATORIUM_A,
        name: 'Hijack Attempt',
        login: 'Reception.A',
        phone: '+998909998877',
        role: 'RECEPTION',
      }),
    (err) => {
      assertHttpCode(err, 409, 'LOGIN_IN_USE');
      return true;
    },
  );

  await assert.rejects(
    () =>
      service.invite(adminActor, {
        sanatorium_id: SANATORIUM_A,
        name: 'Customer Takeover',
        login: 'fresh.reception',
        phone: '+998901000004',
        role: 'RECEPTION',
      }),
    (err) => {
      assertHttpCode(err, 409, 'PHONE_IN_USE');
      return true;
    },
  );

  const unchanged = db.users.find((u: UserRecord) => u.id === REC_A_ID);
  assert.deepEqual(unchanged, originalReception);

  const ok = await service.invite(directorActor, {
    sanatorium_id: SANATORIUM_A,
    name: 'New Reception',
    login: 'new.reception',
    phone: '+998909991122',
    role: 'RECEPTION',
  });
  assert.equal(ok.membership.role, 'RECEPTION');
  assert.ok(db.users.some((u: UserRecord) => u.login === 'new.reception'));
});

test('assignDirector rejects foreign taken logins while preserving same-sanatorium promotion', async () => {
  const db = makeMockDb();
  const service = new StaffService(db);

  await assert.rejects(
    () =>
      service.assignDirector(adminActor, {
        sanatorium_id: SANATORIUM_B,
        name: 'Cross Tenant Hijack',
        login: 'reception.a',
        phone: '+998901000003',
      }),
    (err) => {
      assertHttpCode(err, 409, 'LOGIN_IN_USE');
      return true;
    },
  );

  await assert.rejects(
    () =>
      service.assignDirector(adminActor, {
        sanatorium_id: SANATORIUM_B,
        name: 'Customer Director Hijack',
        login: 'customer.one',
        phone: '+998901000004',
      }),
    (err) => {
      assertHttpCode(err, 409, 'LOGIN_IN_USE');
      return true;
    },
  );

  const promoted = await service.assignDirector(adminActor, {
    sanatorium_id: SANATORIUM_A,
    name: 'Reception A',
    login: 'reception.a',
    phone: '+998901000003',
  });
  assert.equal(promoted.membership.role, 'DIRECTOR');
  assert.equal(promoted.membership.userId, REC_A_ID);

  const newDirector = await service.assignDirector(adminActor, {
    sanatorium_id: SANATORIUM_B,
    name: 'Director B',
    login: 'director.b',
    phone: '+998907778899',
  });
  assert.equal(newDirector.membership.role, 'DIRECTOR');
  assert.ok(db.users.some((u: UserRecord) => u.login === 'director.b'));
});

test('AuthService.profile rejects updating login or phone to another existing user', async () => {
  const db = makeMockDb();
  const auth = new AuthService(
    db,
    { isProduction: false } as any,
    {} as any,
    {} as any,
  );

  await assert.rejects(
    () => auth.profile(directorActor, { login: 'SUPER.ADMIN' }),
    (err) => {
      assertHttpCode(err, 409, 'LOGIN_IN_USE');
      return true;
    },
  );

  await assert.rejects(
    () => auth.profile(directorActor, { phone: '+998901000003' }),
    (err) => {
      assertHttpCode(err, 409, 'PHONE_IN_USE');
      return true;
    },
  );

  const updated = await auth.profile(directorActor, {
    name: 'Director A Updated',
    login: 'director.a',
  });
  assert.equal(updated.name, 'Director A Updated');
  assert.equal(updated.login, 'director.a');
});
