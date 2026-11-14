import assert from 'node:assert/strict';
import test, { after, before } from 'node:test';
import { randomBytes, randomUUID } from 'node:crypto';
import { setup, Client, testPassword } from './helpers';
import { EmailService } from '../src/auth/email';
import { OutboxService } from '../src/outbox/outbox.service';
import { TelegramService } from '../src/telegram/telegram.service';
import { TelegramClient } from '../src/telegram/client';
import { TelegramLinkService } from '../src/telegram/link.service';
import { loadConfig } from '../src/common/config';
import { formatAdminAlert, isAdminEmailTopic } from '../src/common/admin-alerts';
import type { Db } from '../src/common/db';

let ctx: Awaited<ReturnType<typeof setup>>;

before(async () => {
  ctx = await setup();
});

after(async () => {
  await ctx?.app.close();
});

test('Superadmin email profile + partner forgot-password + 5x wrong password brute-force alerts (Email + Telegram + IN_APP)', async () => {
  const emailSvc = ctx.app.get(EmailService);
  const outbox = ctx.app.get(OutboxService);
  emailSvc.sentAlerts.length = 0;

  // 1. Create a sanatorium and partner director so forgot-password finds rich context
  const sanRes = await ctx.admin.call('/superadmin/sanatoriums', 'POST', { name: 'Chorvoq Ororgohi' });
  assert.equal(sanRes.status, 201);
  const dirAssign = await ctx.admin.call('/superadmin/director-assignments', 'POST', {
    sanatorium_id: sanRes.body.id,
    name: 'Karimjon Direktor',
    login: 'karimjon.dir',
    phone: '+998901119988',
    temporary_password: testPassword,
  });
  assert.equal(dirAssign.status, 201);

  // 2. Superadmin sets personal email via PATCH /auth/profile
  const profileRes = await ctx.admin.call('/auth/profile', 'PATCH', {
    email: 'superadmin.alerts@example.com',
  });
  assert.equal(profileRes.status, 200);
  assert.equal(profileRes.body.email, 'superadmin.alerts@example.com');

  const meRes = await ctx.admin.call('/auth/me');
  assert.equal(meRes.status, 200);
  assert.equal(meRes.body.email, 'superadmin.alerts@example.com');

  // 3. Link a TelegramAccount for Superadmin to verify Telegram delivery rows are fanned out too
  const adminUser = await ctx.db.user.findUniqueOrThrow({ where: { login: 'admin.test' } });
  await ctx.db.telegramAccount.create({
    data: {
      userId: adminUser.id,
      telegramUserId: '998877665',
      chatId: '998877665',
      displayName: 'Superadmin TG',
      username: 'superadmin_tg',
      notificationsEnabled: true,
    },
  });

  // Enable Telegram client mode temporarily for outbox fanout verification
  const cfg = (outbox as any).config;
  const prevTgMode = cfg.TELEGRAM_MODE;
  cfg.TELEGRAM_MODE = 'webhook';

  try {
    // 4. Partner triggers "Parolni unutdingizmi?" on Partner login screen
    const anon = new Client(ctx.base);
    const forgotRes = await anon.call('/auth/partner-forgot-password', 'POST', {
      login: 'karimjon.dir',
      phone: '+998901119988',
      note: 'Yangi parol kerak',
    });
    assert.equal(forgotRes.status, 201);
    assert.equal(forgotRes.body.success, true);

    await outbox.tick();

    const forgotEmail = emailSvc.sentAlerts.find(a => a.topic === 'partner.password_reset_requested');
    assert.ok(forgotEmail, 'Superadmin email alert must be sent for partner forgot password');
    assert.equal(forgotEmail.to, 'superadmin.alerts@example.com');
    assert.match(forgotEmail.text, /@karimjon\.dir/);
    assert.match(forgotEmail.text, /Chorvoq Ororgohi/);

    const forgotDeliveries = await ctx.db.notificationDelivery.findMany({
      where: { userId: adminUser.id },
    });
    assert.ok(forgotDeliveries.some(d => d.channel === 'IN_APP' && (d.payload as any).topic === 'partner.password_reset_requested'));
    assert.ok(forgotDeliveries.some(d => d.channel === 'TELEGRAM' && (d.payload as any).topic === 'partner.password_reset_requested'));
    assert.ok(forgotDeliveries.some(d => d.channel === 'EMAIL' && d.status === 'SENT' && (d.payload as any).topic === 'partner.password_reset_requested'));

    // 5. Trigger 5 wrong password logins within 1 hour -> must emit alert strictly on 5th attempt (not 1..4 or 6)
    emailSvc.sentAlerts.length = 0;
    for (let i = 1; i <= 4; i++) {
      const r = await anon.call('/auth/staff/login', 'POST', {
        login: 'karimjon.dir',
        password: 'WrongPassword123',
      });
      assert.equal(r.status, 401);
    }
    await outbox.tick();
    assert.equal(
      emailSvc.sentAlerts.filter(a => a.topic === 'auth.bruteforce_alert').length,
      0,
      'Must not alert before 5 failed password attempts in 1 hour',
    );

    const fifth = await anon.call('/auth/staff/login', 'POST', {
      login: 'karimjon.dir',
      password: 'WrongPassword123',
    });
    assert.equal(fifth.status, 401);
    await outbox.tick();

    const bruteAlerts = emailSvc.sentAlerts.filter(a => a.topic === 'auth.bruteforce_alert');
    assert.equal(bruteAlerts.length, 1, 'Must send Superadmin email alert on 5th failed attempt in 1 hour');
    assert.equal(bruteAlerts[0].to, 'superadmin.alerts@example.com');
    assert.match(bruteAlerts[0].text, /@karimjon\.dir/);
    assert.match(bruteAlerts[0].text, /5 marta/);

    const bruteTg = await ctx.db.notificationDelivery.findFirst({
      where: { userId: adminUser.id, channel: 'TELEGRAM', payload: { path: ['topic'], equals: 'auth.bruteforce_alert' } },
    });
    assert.ok(bruteTg, 'Telegram notification delivery must be queued for 5x failed password alert');

    // 6th failed attempt should not spam immediately
    const sixth = await anon.call('/auth/staff/login', 'POST', {
      login: 'karimjon.dir',
      password: 'WrongPassword123',
    });
    assert.equal(sixth.status, 401);
    await outbox.tick();
    assert.equal(
      emailSvc.sentAlerts.filter(a => a.topic === 'auth.bruteforce_alert').length,
      1,
      '6th failed attempt must not duplicate the 5th-attempt alert',
    );
  } finally {
    cfg.TELEGRAM_MODE = prevTgMode;
  }
});

test('App Users full management: avatar exposure, profile edit, avatar deletion, and session revocation', async () => {
  const customer = await ctx.db.user.create({
    data: {
      kind: 'CUSTOMER',
      status: 'ACTIVE',
      name: 'Dilshod Mijoz',
      phone: '+998901234455',
      email: 'dilshod@example.com',
      login: 'dilshod.app',
      avatarUrl: 'https://cdn.example.com/avatars/dilshod.png',
    },
  });
  await ctx.db.session.create({
    data: {
      userId: customer.id,
      channel: 'MOBILE',
      deviceLabel: 'Android · Samsung S24',
      tokenHash: `tok-${randomUUID()}`,
      refreshHash: `ref-${randomUUID()}`,
      csrfHash: `csrf-${randomUUID()}`,
      expiresAt: new Date(Date.now() + 600_000),
      refreshExpiresAt: new Date(Date.now() + 86_400_000),
      lastActivityAt: new Date(),
    },
  });

  // 1. List returns avatarUrl, email, and activeSessionsCount
  const listRes = await ctx.admin.call('/superadmin/customers?q=dilshod');
  assert.equal(listRes.status, 200);
  const found = listRes.body.data.find((u: any) => u.id === customer.id);
  assert.ok(found);
  assert.equal(found.avatarUrl, 'https://cdn.example.com/avatars/dilshod.png');
  assert.equal(found.email, 'dilshod@example.com');
  assert.equal(found.activeSessionsCount, 1);

  // 2. Superadmin edits customer details and deletes avatar
  const removeRes = await ctx.admin.call(`/superadmin/customers/${customer.id}`, 'PATCH', {
    name: 'Dilshod Yangilandi',
    email: 'dilshod.new@example.com',
    remove_avatar: true,
    avatarUrl: null,
  });
  assert.equal(removeRes.status, 200);
  assert.equal(removeRes.body.name, 'Dilshod Yangilandi');
  assert.equal(removeRes.body.email, 'dilshod.new@example.com');
  assert.equal(removeRes.body.avatarUrl, null);

  // 3. Superadmin revokes customer sessions
  const revokeRes = await ctx.admin.call(`/superadmin/customers/${customer.id}/revoke-sessions`, 'POST', {});
  assert.equal(revokeRes.status, 201);
  assert.equal(revokeRes.body.revoked_count, 1);

  const listAfter = await ctx.admin.call('/superadmin/customers?q=Dilshod');
  const updated = listAfter.body.data.find((u: any) => u.id === customer.id);
  assert.equal(updated.avatarUrl, null);
  assert.equal(updated.activeSessionsCount, 0);
});

test('Important platform alert topics and Telegram Render auto-webhook startupSync', async () => {
  for (const topic of [
    'partner.password_reset_requested',
    'auth.bruteforce_alert',
    'payment.exception',
    'refund.requested',
    'provider.sms.failed',
    'system.health.issue',
    'sanatorium.submitted',
    'staff.invited',
    'ad.requested',
    'support.opened',
    'bank.change_requested',
  ]) {
    assert.equal(isAdminEmailTopic(topic), true, `${topic} must be enabled for superadmin email alerts`);
    const formatted = formatAdminAlert(topic, { attempted_login: 'test.login', ip: '1.2.3.4' });
    assert.ok(formatted.subject.length > 10 && formatted.telegramText.length > 10);
  }

  const webhookCalls: Array<{ method: string; body: any }> = [];
  const cfg = loadConfig({
    NODE_ENV: 'production',
    DEPLOYMENT_PLATFORM: 'render',
    BOOKING_SETTLEMENT_MODE: 'direct',
    RESEND_API_KEY: 're_test_key',
    DATABASE_URL: 'postgresql://user:pass@db.example.com:5432/sihhat',
    CORS_ORIGINS: 'https://www.sihhat.uz',
    AUTH_SECRET: randomBytes(32).toString('hex'),
    MFA_ENCRYPTION_KEY: randomBytes(32).toString('hex'),
    TEZCHECK_API_KEY: 'key',
    TEZCHECK_CASH_DESK_CODE: 'desk',
    TELEGRAM_MODE: 'webhook',
    TELEGRAM_BOT_TOKEN: '8276436518:' + 'A'.repeat(35),
    TELEGRAM_BOT_USERNAME: 'sihhat_admins_bot',
    TELEGRAM_WEBHOOK_SECRET: 'SihhatWebhookSecretKey1234567890ABCDEF',
    TELEGRAM_ADMIN_URL: 'https://www.sihhat.uz/superadmin',
    TELEGRAM_PARTNER_URL: 'https://www.sihhat.uz/hamkorlar',
  });
  const mockClient = {
    botId: '8276436518',
    enabled: true,
    call: async (method: string, body?: any) => {
      webhookCalls.push({ method, body });
      if (method === 'getMe') return { id: 8276436518, username: 'sihhat_admins_bot', is_bot: true };
      if (method === 'getWebhookInfo') return { url: '' };
      return true;
    },
  } as unknown as TelegramClient;
  const mockDb = {
    telegramBotState: { upsert: async () => ({}) },
  } as unknown as Db;

  const prodConfig = { ...cfg, NODE_ENV: 'development' as const }; // allow startupSync to run without live network
  const tgService = new TelegramService(
    mockDb,
    prodConfig,
    mockClient,
    new TelegramLinkService(mockDb, prodConfig, mockClient),
    {} as any,
    {} as any,
    {} as any,
  );

  const prevRenderUrl = process.env.RENDER_EXTERNAL_URL;
  process.env.RENDER_EXTERNAL_URL = 'https://sihhat-api.onrender.com';
  try {
    await tgService.startupSync();
  } finally {
    if (prevRenderUrl === undefined) delete process.env.RENDER_EXTERNAL_URL;
    else process.env.RENDER_EXTERNAL_URL = prevRenderUrl;
  }

  const hookCall = webhookCalls.find(c => c.method === 'setWebhook');
  assert.ok(hookCall, 'startupSync must auto-register Telegram webhook when RENDER_EXTERNAL_URL is set');
  assert.equal(hookCall.body.url, 'https://sihhat-api.onrender.com/telegram/webhook');
  assert.equal(hookCall.body.secret_token, cfg.TELEGRAM_WEBHOOK_SECRET);
});
