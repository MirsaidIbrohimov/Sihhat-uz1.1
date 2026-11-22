import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { generateKeyPairSync, randomBytes } from 'node:crypto';
import test, { after, before } from 'node:test';
import { createApp } from '../src/app';
import { Db } from '../src/common/db';
import { AuthService } from '../src/auth/auth.service';
import { OutboxService } from '../src/outbox/outbox.service';
import { base32, totp } from '../src/common/crypto';
import { loadConfig, productionIssues } from '../src/common/config';
import {
  ANDROID_PUSH_CHANNEL_ID,
  ANDROID_PUSH_COLOR,
  ANDROID_PUSH_ICON,
  buildAndroidFcmMessage,
  isUrgentPushTopic,
  maskPushToken,
  resolveNotificationRoute,
} from '../src/outbox/fcm.service';
import { Client, testPassword } from './helpers';
import { customer } from './fixtures';

const { privateKey: TEST_RSA_PRIVATE_KEY } = generateKeyPairSync('rsa', {
  modulusLength: 2048,
  privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
  publicKeyEncoding: { type: 'spki', format: 'pem' },
});

test('FCM payload builder: sets HIGH priority only for urgent topics and includes Android channel/brand metadata', () => {
  assert.equal(isUrgentPushTopic('payment.succeeded'), true);
  assert.equal(isUrgentPushTopic('booking.confirmed'), true);
  assert.equal(isUrgentPushTopic('support.replied'), true);
  assert.equal(isUrgentPushTopic('message.created', { kind: 'WARNING' }), true);
  assert.equal(isUrgentPushTopic('message.created', { kind: 'MESSAGE' }), false);
  assert.equal(isUrgentPushTopic('app.update'), false);
  assert.equal(isUrgentPushTopic('booking.checked_out'), false);

  const urgentMsg = buildAndroidFcmMessage('fcm_token_example_1234567890', {
    notificationId: 'notif-1',
    topic: 'support.replied',
    title: 'Yordam xizmatidan javob',
    body: 'Murojaatingizga javob yozildi.',
    ticketId: 'ticket-111',
  });
  assert.equal(urgentMsg.message.notification.title, 'Yordam xizmatidan javob');
  assert.equal(urgentMsg.message.notification.body, 'Murojaatingizga javob yozildi.');
  assert.equal(urgentMsg.message.android.priority, 'HIGH');
  assert.equal(urgentMsg.message.android.notification.channel_id, ANDROID_PUSH_CHANNEL_ID);
  assert.equal(urgentMsg.message.android.notification.icon, ANDROID_PUSH_ICON);
  assert.equal(urgentMsg.message.android.notification.color, ANDROID_PUSH_COLOR);
  assert.equal(urgentMsg.message.android.notification.click_action, 'FLUTTER_NOTIFICATION_CLICK');
  assert.equal(urgentMsg.message.data.route, 'support');
  assert.equal(urgentMsg.message.data.ticket_id, 'ticket-111');
  assert.equal(urgentMsg.message.data.priority, 'HIGH');

  const normalMsg = buildAndroidFcmMessage('fcm_token_example_1234567890', {
    topic: 'message.created',
    kind: 'MESSAGE',
    title: 'Yangi aksiya',
    body: 'Bahorgi chegirmalar boshlandi.',
    messageId: 'msg-222',
  });
  assert.equal(normalMsg.message.android.priority, 'NORMAL');
  assert.equal(normalMsg.message.android.notification.notification_priority, 'PRIORITY_DEFAULT');
  assert.equal(normalMsg.message.data.route, 'notifications');
  assert.equal(normalMsg.message.data.message_id, 'msg-222');

  assert.equal(resolveNotificationRoute('booking.confirmed', { booking_id: 'b-1' }), 'booking');
  assert.equal(resolveNotificationRoute('app.update', { download_url: 'https://www.sihhat.uz/api/download/apk' }), 'update');
  assert.equal(maskPushToken('dAbCdEfG1234567890xYzWvU'), 'dAbCdEfG...xYzWvU');
});

test('FCM config validation: production requires Firebase Service Account for fcm adapter and demo forbids Firebase keys', () => {
  const prodBase: NodeJS.ProcessEnv = {
    NODE_ENV: 'production',
    PORT: '8080',
    DATABASE_URL: 'postgresql://example:example@db.example.internal:5432/sihhat',
    REDIS_URL: 'redis://example:example@redis.example.internal:6379',
    AUTH_SECRET: randomBytes(32).toString('hex'),
    MFA_ENCRYPTION_KEY: randomBytes(32).toString('hex'),
    CORS_ORIGINS: 'https://admin.example.com',
    SMS_ADAPTER: 'eskiz',
    ESKIZ_TOKEN: 'example-provider-token',
    ESKIZ_OTP_APPROVED: 'true',
    PAYMENT_MODE: 'tezcheck',
    BOOKING_SETTLEMENT_MODE: 'direct',
    TEZCHECK_API_KEY: 'example-provider-key',
    TEZCHECK_CASH_DESK_CODE: 'example-cashdesk',
    STORAGE_ADAPTER: 's3',
    S3_ENDPOINT: 'https://storage.example.com',
    S3_BUCKET: 'example-media',
    S3_ACCESS_KEY: 'example-access-key',
    S3_SECRET_KEY: 'example-secret-key',
    WORKER_MODE: 'redis',
  };

  assert.throws(() => loadConfig({ ...prodBase, PUSH_ADAPTER: 'fcm' }), /Firebase Service Account/);

  const validFcmConfig = loadConfig({
    ...prodBase,
    PUSH_ADAPTER: 'fcm',
    FIREBASE_PROJECT_ID: 'sihhat-prod-test',
    FIREBASE_CLIENT_EMAIL: 'firebase-adminsdk@sihhat-prod-test.iam.gserviceaccount.com',
    FIREBASE_PRIVATE_KEY: TEST_RSA_PRIVATE_KEY.replace(/\n/g, '\\n'),
  });
  assert.deepEqual(productionIssues(validFcmConfig), []);

  const demoBase: NodeJS.ProcessEnv = {
    NODE_ENV: 'test',
    PUBLIC_DEMO_ENABLED: 'true',
    DEMO_OTP_ENABLED: 'true',
    DATABASE_URL: 'postgresql://demo:example@localhost/sihhat_demo',
    CORS_ORIGINS: 'https://sihhat.uz',
    AUTH_SECRET: randomBytes(32).toString('hex'),
    MFA_ENCRYPTION_KEY: randomBytes(32).toString('hex'),
    SMS_ADAPTER: 'local',
    PAYMENT_MODE: 'local',
    STORAGE_PATH: '/home/terminal/.sihhat/demo-media',
  };
  assert.throws(() => loadConfig({ ...demoBase, PUSH_ADAPTER: 'fcm' }), /Public demo/);
  assert.throws(() => loadConfig({ ...demoBase, FIREBASE_PRIVATE_KEY: TEST_RSA_PRIVATE_KEY }), /Public demo/);
});

test('FCM end-to-end lifecycle: multi-device register, token rotation, HTTP v1 push, UNREGISTERED cleanup, user switch & logout detach', async () => {
  const url = process.env.TEST_DATABASE_URL;
  if (!url || new URL(url).pathname !== '/sihhat_test') {
    throw new Error('Sinov faqat sihhat_testda bajariladi');
  }

  let oauthCalls = 0;
  const fcmRequests: Array<{ token: string; body: any }> = [];
  const unregisteredTokens = new Set<string>();

  const mockGoogle = createServer((req, res) => {
    const chunks: Buffer[] = [];
    req.on('data', c => chunks.push(c));
    req.on('end', () => {
      const raw = Buffer.concat(chunks).toString('utf8');
      if (req.url === '/oauth2/token' && req.method === 'POST') {
        oauthCalls++;
        const params = new URLSearchParams(raw);
        assert.equal(params.get('grant_type'), 'urn:ietf:params:oauth:grant-type:jwt-bearer');
        const assertion = params.get('assertion') ?? '';
        assert.equal(assertion.split('.').length, 3, 'JWT assertion must have 3 RS256 segments');
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ access_token: 'mock-fcm-oauth-access-token', expires_in: 3600 }));
        return;
      }
      if (req.url === '/v1/projects/sihhat-test-proj/messages:send' && req.method === 'POST') {
        assert.equal(req.headers.authorization, 'Bearer mock-fcm-oauth-access-token');
        const parsed = JSON.parse(raw);
        const token = String(parsed?.message?.token ?? '');
        fcmRequests.push({ token, body: parsed });
        if (unregisteredTokens.has(token)) {
          res.writeHead(404, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            error: {
              code: 404,
              message: 'Requested entity was not found.',
              status: 'NOT_FOUND',
              details: [{ '@type': 'type.googleapis.com/google.firebase.fcm.v1.FcmError', errorCode: 'UNREGISTERED' }],
            },
          }));
          return;
        }
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ name: `projects/sihhat-test-proj/messages/${fcmRequests.length}` }));
        return;
      }
      res.writeHead(404);
      res.end();
    });
  });

  await new Promise<void>(resolve => mockGoogle.listen(0, '127.0.0.1', resolve));
  const address = mockGoogle.address();
  assert.ok(address && typeof address === 'object');
  const mockBase = `http://127.0.0.1:${address.port}`;

  const prevEnv = {
    PUSH_ADAPTER: process.env.PUSH_ADAPTER,
    FIREBASE_PROJECT_ID: process.env.FIREBASE_PROJECT_ID,
    FIREBASE_CLIENT_EMAIL: process.env.FIREBASE_CLIENT_EMAIL,
    FIREBASE_PRIVATE_KEY: process.env.FIREBASE_PRIVATE_KEY,
    FCM_API_BASE_URL: process.env.FCM_API_BASE_URL,
    FCM_OAUTH_TOKEN_URL: process.env.FCM_OAUTH_TOKEN_URL,
  };

  process.env.NODE_ENV = 'test';
  process.env.DATABASE_URL = url;
  process.env.SMS_ADAPTER = 'local';
  process.env.AI_ADAPTER = 'catalog';
  process.env.DEMO_OTP_ENABLED = 'false';
  process.env.PAYMENT_MODE = 'local';
  process.env.TELEGRAM_MODE = 'disabled';
  process.env.TELEGRAM_BOT_TOKEN = '';
  process.env.PUSH_ADAPTER = 'fcm';
  process.env.FIREBASE_PROJECT_ID = 'sihhat-test-proj';
  process.env.FIREBASE_CLIENT_EMAIL = 'firebase-adminsdk@sihhat-test-proj.iam.gserviceaccount.com';
  process.env.FIREBASE_PRIVATE_KEY = TEST_RSA_PRIVATE_KEY;
  process.env.FCM_API_BASE_URL = mockBase;
  process.env.FCM_OAUTH_TOKEN_URL = `${mockBase}/oauth2/token`;

  const { app } = await createApp({ quiet: true, swagger: false });
  await app.listen(0, '127.0.0.1');

  try {
    const db = app.get(Db);
    const outbox = app.get(OutboxService);
    const auth = app.get(AuthService);
    const base = await app.getUrl();

    const tables = await db.$queryRaw<{ tablename: string }[]>`SELECT tablename FROM pg_tables WHERE schemaname='public' AND tablename<>'_prisma_migrations'`;
    await db.$executeRawUnsafe(`TRUNCATE ${tables.map(t => '"' + t.tablename.replace(/"/g, '""') + '"').join(',')} CASCADE`);

    const secret = base32(Buffer.from('12345678901234567890'));
    await auth.bootstrap('admin.push', testPassword, secret);
    const admin = new Client(base);
    const adminLogin = await admin.call('/auth/staff/login', 'POST', { login: 'admin.push', password: testPassword, mfa_code: totp(secret) });
    assert.equal(adminLogin.status, 201);

    const user1 = await customer(base, auth);
    const user2 = await customer(base, auth);

    const tokenDev1Old = 'fcm_device1_old_token_00000000000001';
    const tokenDev1New = 'fcm_device1_new_token_00000000000002';
    const tokenDev2Dead = 'fcm_device2_dead_token_0000000000003';

    // 1. Register 2 devices for User 1
    const r1 = await user1.call('/notifications/device-token', 'POST', {
      token: tokenDev1Old,
      platform: 'ANDROID',
      device_id: 'android-dev-1',
      device_label: 'Samsung SM-A165F',
      app_version: '0.2.9+12',
    });
    assert.equal(r1.status, 201);
    assert.equal(r1.body.active_devices, 1);
    assert.equal(r1.body.fcm_configured, true);

    const r2 = await user1.call('/notifications/device-token', 'POST', {
      token: tokenDev2Dead,
      platform: 'ANDROID',
      device_id: 'android-dev-2',
      device_label: 'Pixel 8',
      app_version: '0.2.9+12',
    });
    assert.equal(r2.status, 201);
    assert.equal(r2.body.active_devices, 2);

    // 2. Rotate token on android-dev-1 -> old token automatically deactivated
    const r1Rotate = await user1.call('/notifications/device-token', 'POST', {
      token: tokenDev1New,
      platform: 'ANDROID',
      device_id: 'android-dev-1',
      device_label: 'Samsung SM-A165F',
      app_version: '0.2.9+12',
    });
    assert.equal(r1Rotate.status, 201);
    assert.equal(r1Rotate.body.active_devices, 2);
    const rotatedRow = await db.devicePushToken.findUnique({ where: { token: tokenDev1Old } });
    assert.equal(rotatedRow?.active, false);
    assert.equal(rotatedRow?.lastError, 'TOKEN_ROTATED');

    // Check push-status masks tokens and reports 2 active devices
    const statusRes = await user1.call('/notifications/push-status');
    assert.equal(statusRes.status, 200);
    assert.equal(statusRes.body.fcm_configured, true);
    assert.equal(statusRes.body.active_devices, 2);
    assert.equal(statusRes.body.devices.some((d: any) => String(d.token_hint).includes(tokenDev1New)), false);

    // 3. Mark Device 2 as UNREGISTERED on mock FCM, send urgent WARNING announcement -> Device 1 receives HIGH priority push, Device 2 auto-cleaned
    unregisteredTokens.add(tokenDev2Dead);
    const ann = await admin.call('/superadmin/announcements', 'POST', {
      target: 'CUSTOMERS',
      title: 'Muhim texnik xabar',
      body: 'Sizning bron tizimingiz yangilandi.',
      kind: 'WARNING',
    });
    assert.equal(ann.status, 201);

    await outbox.tick();

    assert.equal(oauthCalls, 1, 'OAuth2 access token must be fetched once and cached');
    const sentToDev1 = fcmRequests.find(r => r.token === tokenDev1New);
    const sentToDev2 = fcmRequests.find(r => r.token === tokenDev2Dead);
    assert.ok(sentToDev1, 'Active Device 1 must receive FCM HTTP v1 push');
    assert.ok(sentToDev2, 'Device 2 must be attempted before invalidation');
    assert.equal(sentToDev1.body.message.android.priority, 'HIGH');
    assert.equal(sentToDev1.body.message.android.notification.channel_id, ANDROID_PUSH_CHANNEL_ID);
    assert.equal(sentToDev1.body.message.notification.title, 'Muhim e’lon: Muhim texnik xabar');
    assert.equal(sentToDev1.body.message.notification.body, 'Sizning bron tizimingiz yangilandi.');
    assert.equal(sentToDev1.body.message.data.message_id, ann.body.id);

    // Device 2 must now be deactivated in DB
    const deadRow = await db.devicePushToken.findUnique({ where: { token: tokenDev2Dead } });
    assert.equal(deadRow?.active, false);
    assert.equal(deadRow?.lastError, 'UNREGISTERED');
    assert.ok(deadRow?.invalidatedAt);

    // Delivery record marked SENT because Device 1 succeeded
    const pushDeliveries = await db.notificationDelivery.findMany({ where: { channel: 'PUSH' } });
    assert.equal(pushDeliveries.length, 1);
    assert.equal(pushDeliveries[0].status, 'SENT');

    // 4. Account switch: User 2 logs in on Device 1 and registers tokenDev1New -> ownership moves from User 1 to User 2
    const switchRes = await user2.call('/notifications/device-token', 'POST', {
      token: tokenDev1New,
      platform: 'ANDROID',
      device_id: 'android-dev-1',
    });
    assert.equal(switchRes.status, 201);
    const u1Status = await user1.call('/notifications/push-status');
    const u2Status = await user2.call('/notifications/push-status');
    assert.equal(u1Status.body.active_devices, 0);
    assert.equal(u2Status.body.active_devices, 1);

    // 5. Normal (non-urgent) announcement delivers with NORMAL priority only to User 2
    fcmRequests.length = 0;
    const normalAnn = await admin.call('/superadmin/announcements', 'POST', {
      target: 'CUSTOMERS',
      title: 'Oddiy yangilik',
      body: 'Yangi sanatoriyalar qo‘shildi.',
      kind: 'MESSAGE',
    });
    assert.equal(normalAnn.status, 201);
    await outbox.tick();
    assert.equal(fcmRequests.length, 1);
    assert.equal(fcmRequests[0].token, tokenDev1New);
    assert.equal(fcmRequests[0].body.message.android.priority, 'NORMAL');

    // 6. Logout safely detaches Device 1 token
    const logoutRes = await user2.call('/auth/logout', 'POST', { push_token: tokenDev1New, device_id: 'android-dev-1' });
    assert.equal(logoutRes.status, 201);
    const detachedRow = await db.devicePushToken.findUnique({ where: { token: tokenDev1New } });
    assert.equal(detachedRow?.active, false);
    assert.equal(detachedRow?.lastError, 'USER_LOGOUT');
  } finally {
    await app.close();
    await new Promise<void>(resolve => mockGoogle.close(() => resolve()));
    for (const [k, v] of Object.entries(prevEnv)) {
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
  }
});
