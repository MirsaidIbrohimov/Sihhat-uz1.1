import assert from 'node:assert/strict';
import test from 'node:test';
import {
  AppVersionService,
  parseReleaseTag,
  pickApkAsset,
  sanitizeReleaseNotes,
} from '../src/catalog/app-version';
import { EngagementService } from '../src/engagement/engagement.service';

test('parseReleaseTag extracts version and build number across formats', () => {
  assert.deepEqual(parseReleaseTag('v0.2.6-b9'), { version: '0.2.6', buildNumber: 9 });
  assert.deepEqual(parseReleaseTag('0.2.5+8'), { version: '0.2.5', buildNumber: 8 });
  assert.deepEqual(parseReleaseTag('v1.2.0', 'Sihhat.uz Android v1.2.0 (build 14)'), {
    version: '1.2.0',
    buildNumber: 14,
  });
  assert.equal(parseReleaseTag('invalid-tag'), null);
});

test('pickApkAsset prefers sihhat-uz.apk over demo or alternate apks and requires https', () => {
  const picked = pickApkAsset([
    { name: 'Sihhat-uz-demo.apk', browser_download_url: 'https://example.com/demo.apk' },
    { name: 'sihhat-uz-0.2.6.apk', browser_download_url: 'https://example.com/v026.apk' },
    { name: 'sihhat-uz.apk', browser_download_url: 'https://example.com/sihhat-uz.apk' },
    { name: 'SHA256SUMS.txt', browser_download_url: 'https://example.com/sums.txt' },
  ]);
  assert.deepEqual(picked, {
    name: 'sihhat-uz.apk',
    url: 'https://example.com/sihhat-uz.apk',
  });
  assert.equal(
    pickApkAsset([{ name: 'sihhat-uz.apk', browser_download_url: 'http://insecure.example/a.apk' }]),
    null,
  );
});

test('AppVersionService caches GitHub release with ETag and detects newer builds', async () => {
  let calls = 0;
  const mockFetch = (async (_url: unknown, init?: RequestInit) => {
    calls++;
    const headers = init?.headers as Record<string, string> | undefined;
    if (calls === 2) {
      assert.equal(headers?.['If-None-Match'], '"etag-v9"');
      return new Response(null, { status: 304 });
    }
    return new Response(
      JSON.stringify({
        tag_name: 'v0.2.6-b9',
        name: 'Sihhat.uz Android v0.2.6 (build 9)',
        body: 'Tezkor bron qilish\nIlova yangilanishi bildirishnomasi\nhttps://github.com/link',
        published_at: '2026-11-15T12:00:00Z',
        assets: [
          {
            name: 'sihhat-uz.apk',
            browser_download_url: 'https://github.com/MirsaidIbrohimov/Sihhat-uz1.1/releases/download/v0.2.6-b9/sihhat-uz.apk',
          },
        ],
      }),
      {
        status: 200,
        headers: {
          'content-type': 'application/json',
          etag: '"etag-v9"',
        },
      },
    );
  }) as typeof fetch;

  const service = new AppVersionService();
  const statusOld = await service.getVersionStatus({ currentBuild: 8, fetchImpl: mockFetch });
  assert.equal(statusOld.available, true);
  assert.equal(statusOld.build_number, 9);
  assert.equal(statusOld.version, '0.2.6');
  assert.equal(statusOld.update_available, true);
  assert.match(statusOld.message, /Eng so‘nggi versiyani yuklab oling/);

  // Served from in-memory TTL cache without network call
  const statusSame = await service.getVersionStatus({ currentBuild: 9, fetchImpl: mockFetch });
  assert.equal(statusSame.update_available, false);
  assert.equal(calls, 1);

  // Force refresh sends ETag and keeps cached release on 304
  const statusRefreshed = await service.getVersionStatus({
    currentBuild: 7,
    forceRefresh: true,
    fetchImpl: mockFetch,
  });
  assert.equal(statusRefreshed.update_available, true);
  assert.equal(calls, 2);
});

test('sanitizeReleaseNotes strips raw URLs and SHA lines', () => {
  assert.equal(
    sanitizeReleaseNotes('<!-- note -->\nYangi dizayn\nSHA256: abc\nhttps://github.com/x\nXatolar tuzatildi'),
    'Yangi dizayn Xatolar tuzatildi',
  );
});

test('checkAndAnnounceNewRelease records baseline b8 silently and announces newer releases once', async () => {
  const auditLogs: Array<{ action: string; entityId: string; after: Record<string, unknown> }> = [];
  const emitted: Array<{ topic: string; payload: Record<string, unknown> }> = [];

  const mockDb = {
    atomic: async <T>(fn: (tx: any) => Promise<T>) =>
      fn({
        $executeRaw: async () => 1,
        auditLog: {
          findMany: async () =>
            auditLogs.map((a, idx) => ({ ...a, createdAt: new Date(Date.now() + idx) })),
          create: async ({ data }: any) => {
            auditLogs.push(data);
            return data;
          },
        },
        user: {
          findMany: async () => [{ id: 'cust-1' }, { id: 'cust-2' }],
        },
        session: {
          findMany: async () => [{ userId: 'cust-2' }, { userId: 'mobile-user-3' }],
        },
        outboxEvent: {
          create: async ({ data }: any) => {
            emitted.push({ topic: data.topic, payload: data.payload });
            return { id: `evt-${emitted.length}`, ...data };
          },
        },
      }),
  } as any;

  let currentTag = 'v0.2.5-b8';
  let currentVersion = '0.2.5';
  const mockFetch = (async () =>
    new Response(
      JSON.stringify({
        tag_name: currentTag,
        name: `Sihhat.uz Android v${currentVersion}`,
        assets: [
          {
            name: 'sihhat-uz.apk',
            browser_download_url: `https://github.com/MirsaidIbrohimov/Sihhat-uz1.1/releases/download/${currentTag}/sihhat-uz.apk`,
          },
        ],
      }),
      { status: 200, headers: { 'content-type': 'application/json' } },
    )) as typeof fetch;

  const service = new AppVersionService(mockDb);

  // Initial b8 baseline does not notify
  const resBaseline = await service.checkAndAnnounceNewRelease({ fetchImpl: mockFetch });
  assert.equal(resBaseline.announced, false);
  assert.equal(resBaseline.reason, 'baseline_recorded');
  assert.equal(emitted.length, 0);

  // Newer b9 notifies all active customers + mobile session owners once
  currentTag = 'v0.2.6-b9';
  currentVersion = '0.2.6';
  const resNew = await service.checkAndAnnounceNewRelease({ force: true, fetchImpl: mockFetch });
  assert.equal(resNew.announced, true);
  assert.equal(resNew.recipients, 3);
  assert.equal(emitted.length, 1);
  assert.equal(emitted[0].topic, 'app.update');
  assert.deepEqual(emitted[0].payload.recipient_ids, ['cust-1', 'cust-2', 'mobile-user-3']);
  assert.equal(emitted[0].payload.target_build, 9);

  // Re-running on b9 is idempotent and does not re-emit
  const resDuplicate = await service.checkAndAnnounceNewRelease({ force: true, fetchImpl: mockFetch });
  assert.equal(resDuplicate.announced, false);
  assert.equal(emitted.length, 1);
});

test('EngagementService.notifications keeps app.update for older clients and hides for updated clients', async () => {
  const deliveries = [
    {
      id: 'notif-update-9',
      userId: 'cust-1',
      channel: 'IN_APP',
      readAt: null,
      payload: {
        topic: 'app.update',
        title: 'Ilova yangilandi (v0.2.6)',
        body: 'Eng so‘nggi versiyani yuklab oling.',
        target_version: '0.2.6',
        target_build: 9,
        download_url: 'https://www.sihhat.uz/api/download/apk',
      },
    },
    {
      id: 'notif-msg-1',
      userId: 'cust-1',
      channel: 'IN_APP',
      readAt: null,
      payload: {
        topic: 'message.created',
        title: 'E’lon',
        body: 'Oddiy xabar',
      },
    },
  ];

  const engagement = new EngagementService({
    notificationDelivery: { findMany: async () => deliveries },
  } as any);

  const actor = { id: 'cust-1', kind: 'CUSTOMER' } as any;
  const legacyClientItems = await engagement.notifications(actor);
  assert.equal(legacyClientItems.length, 2);
  assert.equal((legacyClientItems[0].payload as Record<string, unknown>).topic, 'app.update');

  const updatedClientItems = await engagement.notifications(actor, '9');
  assert.equal(updatedClientItems.length, 1);
  assert.equal(updatedClientItems[0].id, 'notif-msg-1');
});
