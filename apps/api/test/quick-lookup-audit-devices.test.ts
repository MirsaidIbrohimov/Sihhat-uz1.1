import assert from 'node:assert/strict';
import test from 'node:test';
import { AuthService } from '../src/auth/auth.service';
import { DIRECTOR, type Actor } from '../src/auth/permissions';
import { StaffService } from '../src/auth/staff.service';
import { ReportsService } from '../src/reports/reports.service';
import { describeDeviceMeta, detectDeviceLabel, isGenericDeviceLabel } from '../src/common/request-meta';

const SAN_A = '11111111-1111-4111-8111-111111111111';
const SAN_B = '22222222-2222-4222-8222-222222222222';
const ADMIN_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const DIR_A_ID = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const DIR_B_ID = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
const CUST_1_ID = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd';
const CUST_2_ID = 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee';

const adminActor: Actor = {
  id: ADMIN_ID,
  publicId: 100100,
  kind: 'SUPERADMIN',
  name: 'Super Admin',
  login: 'super.admin',
  sessionId: '00000000-0000-4000-8000-000000000001',
  mustChangePassword: false,
  memberships: [],
};

const dirAActor: Actor = {
  id: DIR_A_ID,
  publicId: 654321,
  kind: 'STAFF',
  name: 'Zomin Direktori',
  login: 'zomin.dir',
  sessionId: '00000000-0000-4000-8000-000000000002',
  mustChangePassword: false,
  memberships: [
    {
      id: '99999999-9999-4999-8999-999999999901',
      sanatoriumId: SAN_A,
      role: 'DIRECTOR',
      status: 'ACTIVE',
      permissions: DIRECTOR,
      version: 1,
    },
  ],
};

test('describeDeviceMeta extracts full Uzbek device type, OS, browser/app version, and summary', () => {
  assert.equal(isGenericDeviceLabel('Noma’lum qurilma'), true);
  assert.equal(isGenericDeviceLabel('Brauzer · Noma’lum qurilma'), true);
  assert.equal(isGenericDeviceLabel('Chrome · Windows'), false);

  const webWin = describeDeviceMeta(
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/131.0.0.0 Safari/537.36',
    'WEB',
    'Noma’lum qurilma',
  );
  assert.equal(webWin.deviceType, 'DESKTOP');
  assert.equal(webWin.deviceTypeLabel, 'Kompyuter');
  assert.match(webWin.browser, /Google Chrome 131/);
  assert.match(webWin.os, /Windows 10\/11/);
  assert.equal(webWin.channelLabel, 'Veb boshqaruv paneli');
  assert.match(webWin.summary, /Kompyuter · Windows 10\/11/);

  const mobAndroid = describeDeviceMeta(
    'Mozilla/5.0 (Linux; Android 15; SM-S928B Build/UP1A) Dart/3.13',
    'MOBILE',
    null,
    '0.2.10',
  );
  assert.equal(mobAndroid.deviceType, 'SMARTPHONE');
  assert.equal(mobAndroid.deviceTypeLabel, 'Smartfon');
  assert.match(mobAndroid.deviceLabel, /SM-S928B/);
  assert.match(mobAndroid.browser, /Sihhat\.uz ilovasi v0\.2\.10/);
  assert.equal(mobAndroid.channelLabel, 'Sihhat.uz mobil ilovasi');

  // Client Hints fallback for Chrome UA-reduction ("Android 10; K")
  const reducedUaLabel = detectDeviceLabel(
    'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 Chrome/131.0.0.0 Mobile Safari/537.36',
    'WEB',
    null,
    null,
    '"Google Chrome";v="131"',
    '"Android"',
    '"SM-A556E"',
  );
  assert.equal(reducedUaLabel, 'Chrome · Android (SM-A556E)');
});

test('AuthService: per-session backfill & hydrateSessionMeta upgrade generic device labels and preserve prior sessions', async () => {
  const now = new Date();
  const sessions: any[] = [
    {
      id: '00000000-0000-4000-8000-000000000011',
      userId: CUST_1_ID,
      channel: 'MOBILE',
      deviceLabel: 'Android (SM-A165F)',
      ipAddress: '203.0.113.10',
      userAgent: 'Mozilla/5.0 (Linux; Android 14; SM-A165F)',
      createdAt: new Date(now.getTime() - 120_000),
      lastActivityAt: new Date(now.getTime() - 60_000),
      expiresAt: new Date(now.getTime() + 600_000),
      refreshExpiresAt: new Date(now.getTime() + 86_400_000),
      revokedAt: null,
    },
    {
      id: '00000000-0000-4000-8000-000000000012',
      userId: CUST_1_ID,
      channel: 'MOBILE',
      deviceLabel: 'Noma’lum qurilma',
      ipAddress: null,
      userAgent: null,
      createdAt: new Date(now.getTime() - 10_000),
      lastActivityAt: now,
      expiresAt: new Date(now.getTime() + 600_000),
      refreshExpiresAt: new Date(now.getTime() + 86_400_000),
      revokedAt: null,
    },
  ];
  // First session ALREADY has an AuthEvent, second session does NOT!
  const authEvents: any[] = [
    {
      id: 'ev-1',
      userId: CUST_1_ID,
      sessionId: sessions[0].id,
      eventType: 'LOGIN',
      channel: 'MOBILE',
      authMethod: 'EMAIL_OTP',
      ipAddress: '203.0.113.10',
      deviceLabel: 'Android (SM-A165F)',
      userAgent: sessions[0].userAgent,
      userKind: 'CUSTOMER',
      userName: 'Mijoz Bir',
      userLogin: 'mijoz1@example.com',
      userEmail: 'mijoz1@example.com',
      sanatoriumId: null,
      createdAt: sessions[0].createdAt,
    },
  ];

  const mockDb: any = {
    user: {
      findMany: async () => [
        { id: CUST_1_ID, publicId: 482915, kind: 'CUSTOMER', name: 'Mijoz Bir', login: 'mijoz1@example.com', email: 'mijoz1@example.com' },
      ],
    },
    membership: { findMany: async () => [] },
    session: {
      findUnique: async ({ where }: any) => sessions.find((s) => s.id === where.id) ?? null,
      findMany: async ({ where }: any) =>
        sessions.filter((s) => (!where?.userId || s.userId === where.userId) && (where?.revokedAt === undefined || s.revokedAt === where.revokedAt)),
      updateMany: async ({ where, data }: any) => {
        for (const s of sessions) {
          if (s.id === where.id) Object.assign(s, data);
        }
        return { count: 1 };
      },
    },
    authEvent: {
      findMany: async ({ where }: any) => {
        if (where?.sessionId?.in) {
          return authEvents.filter((e) => where.sessionId.in.includes(e.sessionId));
        }
        return authEvents.filter((e) => !where?.userId || e.userId === where.userId);
      },
      count: async ({ where }: any) => authEvents.filter((e) => !where?.userId || e.userId === where.userId).length,
      createMany: async ({ data }: any) => {
        authEvents.push(...data);
        return { count: data.length };
      },
      updateMany: async ({ where, data }: any) => {
        for (const e of authEvents) {
          if (e.sessionId === where.sessionId) Object.assign(e, data);
        }
        return { count: 1 };
      },
    },
  };

  const svc = new AuthService(mockDb, {} as any, {} as any, {} as any);

  // Hydrate generic session 2 with real User-Agent + IP + deviceLabel
  await svc.hydrateSessionMeta(sessions[1].id, {
    ipAddress: '198.51.100.55',
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X)',
    deviceLabel: 'iPhone · iOS ilovasi (v0.2.10)',
  });
  assert.equal(sessions[1].ipAddress, '198.51.100.55');
  assert.equal(sessions[1].deviceLabel, 'iPhone · iOS ilovasi (v0.2.10)');

  // Login history backfills session 2 even though session 1 already existed in authEvents!
  const custActor: Actor = {
    id: CUST_1_ID,
    publicId: 482915,
    kind: 'CUSTOMER',
    name: 'Mijoz Bir',
    sessionId: sessions[1].id,
    mustChangePassword: false,
    memberships: [],
  };
  const hist = await svc.loginHistory(custActor, {});
  assert.equal(hist.total, 2);
  assert.ok(hist.data.some((e: any) => e.deviceLabel === 'iPhone · iOS ilovasi (v0.2.10)' && e.deviceTypeLabel === 'Smartfon'));

  // Active sessions include full device descriptions
  const active = await svc.sessions(custActor);
  assert.equal(active.data.length, 2);
  const current = active.data.find((d: any) => d.current);
  assert.ok(current);
  assert.equal(current.deviceTypeLabel, 'Smartfon');
  assert.match(current.deviceSummary, /Smartfon/);
});

test('StaffService.quickLookup resolves #ID for both Users and Partners with strict RBAC isolation', async () => {
  const now = new Date();
  const users = [
    {
      id: ADMIN_ID,
      publicId: 100100,
      kind: 'SUPERADMIN',
      status: 'ACTIVE',
      name: 'Super Admin',
      phone: null,
      email: 'admin@sihhat.uz',
      login: 'super.admin',
      avatarUrl: null,
      mustChangePassword: false,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: DIR_A_ID,
      publicId: 654321,
      kind: 'STAFF',
      status: 'ACTIVE',
      name: 'Zomin Direktori',
      phone: '+998901112233',
      email: 'dir@zomin.uz',
      login: 'zomin.dir',
      avatarUrl: null,
      mustChangePassword: false,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: DIR_B_ID,
      publicId: 654999,
      kind: 'STAFF',
      status: 'ACTIVE',
      name: 'Chortoq Direktori',
      phone: '+998909998877',
      email: 'dir@chortoq.uz',
      login: 'chortoq.dir',
      avatarUrl: null,
      mustChangePassword: false,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: CUST_1_ID,
      publicId: 482915,
      kind: 'CUSTOMER',
      status: 'ACTIVE',
      name: 'Azizbek Karimov',
      phone: '+998903334455',
      email: 'aziz@example.com',
      login: 'aziz@example.com',
      avatarUrl: null,
      mustChangePassword: false,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: CUST_2_ID,
      publicId: 482111,
      kind: 'CUSTOMER',
      status: 'ACTIVE',
      name: 'Begona Mijoz',
      phone: '+998907778899',
      email: 'stranger@example.com',
      login: null,
      avatarUrl: null,
      mustChangePassword: false,
      createdAt: now,
      updatedAt: now,
    },
  ];

  const memberships = [
    {
      id: '99999999-9999-4999-8999-999999999901',
      userId: DIR_A_ID,
      sanatoriumId: SAN_A,
      role: 'DIRECTOR',
      status: 'ACTIVE',
      ceiling: DIRECTOR,
      grants: [],
      denies: [],
      adminDenies: [],
      version: 1,
      createdAt: now,
    },
    {
      id: '99999999-9999-4999-8999-999999999902',
      userId: DIR_B_ID,
      sanatoriumId: SAN_B,
      role: 'DIRECTOR',
      status: 'ACTIVE',
      ceiling: DIRECTOR,
      grants: [],
      denies: [],
      adminDenies: [],
      version: 1,
      createdAt: now,
    },
  ];

  const mockDb: any = {
    user: {
      findMany: async ({ where }: any) => {
        return users.filter((u) => {
          if (where?.id?.in && !where.id.in.includes(u.id)) return false;
          return true;
        });
      },
    },
    membership: {
      findMany: async ({ where }: any) =>
        memberships.filter((m) => {
          if (where?.sanatoriumId?.in && !where.sanatoriumId.in.includes(m.sanatoriumId)) return false;
          if (where?.userId?.in && !where.userId.in.includes(m.userId)) return false;
          return true;
        }),
    },
    sanatorium: {
      findMany: async () => [
        { id: SAN_A, name: 'Zomin Sanatoriyasi' },
        { id: SAN_B, name: 'Chortoq Sanatoriyasi' },
      ],
    },
    booking: {
      findMany: async ({ where }: any) =>
        where?.sanatoriumId?.in?.includes(SAN_A) ? [{ userId: CUST_1_ID }] : [],
      groupBy: async () => [{ userId: CUST_1_ID, _count: { id: 2 } }],
    },
    supportTicket: {
      findMany: async () => [],
      groupBy: async () => [],
    },
    session: {
      findMany: async ({ where }: any) =>
        where?.userId?.in?.includes(DIR_A_ID)
          ? [
              {
                id: 'sess-dir-a',
                userId: DIR_A_ID,
                channel: 'WEB',
                deviceLabel: 'Chrome · Windows',
                userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/131.0.0.0',
                ipAddress: '198.51.100.22',
                createdAt: now,
                lastActivityAt: now,
                revokedAt: null,
                refreshExpiresAt: new Date(now.getTime() + 86_400_000),
              },
            ]
          : [],
    },
  };

  const staffSvc = new StaffService(mockDb);

  // 1. Superadmin finds User by exact #482915
  const hitUser = await staffSvc.quickLookup(adminActor, { q: '#482915' });
  assert.equal(hitUser.isHashId, true);
  assert.ok(hitUser.exactMatch);
  assert.equal(hitUser.exactMatch.matchType, 'USER');
  assert.equal(hitUser.exactMatch.user.name, 'Azizbek Karimov');
  assert.equal(hitUser.exactMatch.user.bookingsCount, 2);

  // 2. Superadmin finds Partner by exact #654321 with sanatorium & active device description
  const hitPartner = await staffSvc.quickLookup(adminActor, { q: '#654321' });
  assert.ok(hitPartner.exactMatch);
  assert.equal(hitPartner.exactMatch.matchType, 'PARTNER');
  assert.equal(hitPartner.exactMatch.staff?.sanatoriumName, 'Zomin Sanatoriyasi');
  assert.equal(hitPartner.exactMatch.staff?.role, 'DIRECTOR');
  assert.equal(hitPartner.exactMatch.user.activeDevices.length, 1);
  assert.match(hitPartner.exactMatch.user.activeDevices[0].deviceSummary, /Kompyuter · Windows 10\/11/);

  // 3. Prefix #654 returns both partners for Superadmin, but ONLY Sanatorium A partner for Director A!
  const adminPrefix = await staffSvc.quickLookup(adminActor, { q: '#654' });
  assert.equal(adminPrefix.data.length, 2);

  const dirPrefix = await staffSvc.quickLookup(dirAActor, { q: '#654' });
  assert.equal(dirPrefix.data.length, 1);
  assert.equal(dirPrefix.data[0].user.id, DIR_A_ID);

  // 4. Partner Director A can find own sanatorium guest (#482915), but NOT stranger customer (#482111) or Sanatorium B partner (#654999)
  const dirOwnGuest = await staffSvc.quickLookup(dirAActor, { q: '#482915' });
  assert.ok(dirOwnGuest.exactMatch);
  assert.equal(dirOwnGuest.exactMatch.user.id, CUST_1_ID);

  const dirStranger = await staffSvc.quickLookup(dirAActor, { q: '#482111' });
  assert.equal(dirStranger.exactMatch, null);
  assert.equal(dirStranger.data.length, 0);

  const dirOtherPartner = await staffSvc.quickLookup(dirAActor, { q: '#654999' });
  assert.equal(dirOtherPartner.exactMatch, null);
  assert.equal(dirOtherPartner.data.length, 0);
});

test('ReportsService.audit includes staff actions with sanatoriumId=null and supports search query q', async () => {
  const now = new Date();
  const auditRows = [
    {
      id: 'aud-1',
      actorId: DIR_A_ID,
      sanatoriumId: null,
      action: 'account.profile_updated',
      entityId: DIR_A_ID,
      before: null,
      after: { name: 'Zomin Direktori' },
      note: null,
      createdAt: now,
    },
    {
      id: 'aud-2',
      actorId: DIR_B_ID,
      sanatoriumId: SAN_B,
      action: 'booking.checked_in',
      entityId: 'book-2',
      before: null,
      after: { status: 'CHECKED_IN' },
      note: null,
      createdAt: now,
    },
  ];
  const mockDb: any = {
    membership: {
      findMany: async ({ where }: any) => {
        if (where?.sanatoriumId === SAN_A) return [{ userId: DIR_A_ID, sanatoriumId: SAN_A }];
        if (where?.userId?.in) {
          return [
            { userId: DIR_A_ID, sanatoriumId: SAN_A },
            { userId: DIR_B_ID, sanatoriumId: SAN_B },
          ].filter((m) => where.userId.in.includes(m.userId));
        }
        return [];
      },
    },
    user: {
      findMany: async ({ where }: any) => {
        const all = [
          { id: DIR_A_ID, publicId: 654321, name: 'Zomin Direktori', login: 'zomin.dir', kind: 'STAFF' },
          { id: DIR_B_ID, publicId: 654999, name: 'Chortoq Direktori', login: 'chortoq.dir', kind: 'STAFF' },
        ];
        if (where?.id?.in) return all.filter((u) => where.id.in.includes(u.id));
        if (where?.OR) {
          return all.filter((u) => where.OR.some((c: any) => c.publicId === u.publicId));
        }
        return all;
      },
    },
    sanatorium: {
      findMany: async () => [
        { id: SAN_A, name: 'Zomin Sanatoriyasi' },
        { id: SAN_B, name: 'Chortoq Sanatoriyasi' },
      ],
    },
    auditLog: {
      findMany: async ({ where }: any) =>
        auditRows.filter((r) => {
          if (where?.AND) {
            return where.AND.every((clause: any) =>
              clause.OR?.some((cond: any) => {
                if ('sanatoriumId' in cond && 'actorId' in cond) {
                  return r.sanatoriumId === cond.sanatoriumId && cond.actorId.in.includes(r.actorId);
                }
                if ('sanatoriumId' in cond) return r.sanatoriumId === cond.sanatoriumId;
                if (cond.actorId?.in) return cond.actorId.in.includes(r.actorId);
                if (cond.action?.contains) return r.action.includes(cond.action.contains);
                return false;
              }),
            );
          }
          return true;
        }),
      count: async () => 1,
    },
  };

  const reports = new ReportsService(mockDb);
  const partnerRes = await reports.audit(dirAActor, {}, true);
  assert.equal(partnerRes.data.length, 1);
  assert.equal(partnerRes.data[0].id, 'aud-1');
  assert.equal(partnerRes.data[0].actor_public_id, 654321);
  assert.equal(partnerRes.data[0].sanatorium_name, 'Zomin Sanatoriyasi');

  const adminSearchById = await reports.audit(adminActor, { q: '#654999' }, false);
  assert.equal(adminSearchById.data.length, 1);
  assert.equal(adminSearchById.data[0].id, 'aud-2');
});
