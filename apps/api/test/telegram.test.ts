import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { setup, Client, staff, testPassword } from './helpers';
import { sanatorium, customer, quote, hold, pay } from './fixtures';
import { CONFIG, type Config } from '../src/common/config';
import { hash } from '../src/common/db';
import { TelegramClient, TelegramError } from '../src/telegram/client';
import { TelegramService } from '../src/telegram/telegram.service';
import { TelegramLinkService } from '../src/telegram/link.service';
import { OutboxService } from '../src/outbox/outbox.service';
import { EngagementService } from '../src/engagement/engagement.service';
import { localDate, plusDays } from '../src/telegram/types';

let ctx: Awaited<ReturnType<typeof setup>>, bot: TelegramService, api: TelegramClient, links: TelegramLinkService, config: Config;
let tenant: any, other: any, director: Awaited<ReturnType<typeof staff>>, reception: Awaited<ReturnType<typeof staff>>, booking: any;
let sequence = 1;
const update = (id: number, text: string) => ({ update_id: sequence++, message: { message_id: sequence, from: { id, first_name: 'Sinov xodimi' }, chat: { id, type: 'private' as const }, text } });
const press = (id: number, data: string) => ({ update_id: sequence++, callback_query: { id: String(sequence), from: { id, first_name: 'Sinov xodimi' }, message: { chat: { id, type: 'private' as const } }, data } });
const last = () => api.sent.filter(s => s.method === 'sendMessage').at(-1)!.body;
async function connect(client: Client, telegramId: number) {
  const result = await client.call('/telegram/link', 'POST', {}); assert.equal(result.status, 201);
  const token = new URL(result.body.url).searchParams.get('start')!;
  await bot.handle(update(telegramId, `/start ${token}`));
  const confirmed = await client.call(`/telegram/link/${result.body.id}/confirm`, 'POST', { telegram_user_id: String(telegramId) });
  assert.equal(confirmed.status, 201); return result.body;
}
before(async () => {
  ctx = await setup(); config = ctx.app.get<Config>(CONFIG); config.TELEGRAM_MODE = 'polling'; config.TELEGRAM_BOT_TOKEN = '10001:' + 'A'.repeat(35);
  bot = ctx.app.get(TelegramService); api = ctx.app.get(TelegramClient); links = ctx.app.get(TelegramLinkService);
  await bot.identity();
  tenant = await sanatorium(ctx.admin, 2); other = await sanatorium(ctx.admin);
  director = await staff(ctx.admin, 'telegram.director', '+998901230101', tenant.id);
  reception = await staff(ctx.admin, 'telegram.reception', '+998901230102', tenant.id, false);
  await connect(director.client, 41001); await connect(reception.client, 41002); await connect(ctx.admin, 41003);
  const c = await customer(ctx.base, ctx.auth); const q = await quote(c, tenant, plusDays(localDate(), 1), plusDays(localDate(), 4)); const h = await hold(c, q); assert.equal(h.status, 201); booking = h.body; await pay(c, booking.id);
});
after(async () => { await ctx?.app.close(); });

test('Telegram: linking requires authenticated owner confirmation, CSRF and one-time token', async () => {
  const result = await director.client.call('/telegram/link', 'POST', {}); assert.equal(result.status, 201);
  const token = new URL(result.body.url).searchParams.get('start')!;
  const saved = await ctx.db.telegramLinkRequest.findUniqueOrThrow({ where: { id: result.body.id } });
  assert.equal(saved.tokenHash, hash(token)); assert.notEqual(saved.tokenHash, token);
  await bot.handle(update(41101, `/start ${token}`));
  assert.equal(await ctx.db.telegramAccount.findUnique({ where: { telegramUserId: '41101' } }), null);
  assert.equal((await reception.client.call(`/telegram/link/${saved.id}/confirm`, 'POST', { telegram_user_id: '41101' })).status, 409);
  assert.equal((await director.client.call(`/telegram/link/${saved.id}/confirm`, 'POST', { telegram_user_id: '99999' })).status, 409);
  const csrf = director.client.csrf; director.client.csrf = '';
  assert.equal((await director.client.call(`/telegram/link/${saved.id}/confirm`, 'POST', { telegram_user_id: '41101' })).status, 403); director.client.csrf = csrf;
  await assert.rejects(() => links.claim(token, '41102', '41102', 'Other'), (e: any) => e.code === 'TELEGRAM_LINK_CLAIMED');
  assert.equal((await director.client.call(`/telegram/link/${saved.id}/confirm`, 'POST', { telegram_user_id: '41101' })).status, 201);
  await assert.rejects(() => links.claim(token, '41101', '41101', 'Again'), (e: any) => e.code === 'TELEGRAM_LINK_EXPIRED');
  const status = (await director.client.call('/telegram/account')).body;
  assert.equal(status.account.telegram_user_id, '41101'); assert.equal(JSON.stringify(status).includes(saved.tokenHash), false);
  await connect(director.client, 41001);
});
test('Telegram: expired/revoked-session links and pending staff cannot gain bot access', async () => {
  const result = await reception.client.call('/telegram/link', 'POST', {});
  await ctx.db.telegramLinkRequest.update({ where: { id: result.body.id }, data: { expiresAt: new Date(Date.now() - 1000) } });
  await assert.rejects(() => links.claim(new URL(result.body.url).searchParams.get('start')!, '41104', '41104', 'Expired'), (e: any) => e.code === 'TELEGRAM_LINK_EXPIRED');
  const revoked = await reception.client.call('/telegram/link', 'POST', {});
  const session = await ctx.db.telegramLinkRequest.findUniqueOrThrow({ where: { id: revoked.body.id } });
  await ctx.db.session.update({ where: { id: session.sessionId }, data: { revokedAt: new Date() } });
  await assert.rejects(() => links.claim(new URL(revoked.body.url).searchParams.get('start')!, '41104', '41104', 'Revoked'), (e: any) => e.code === 'TELEGRAM_LINK_EXPIRED');
  await ctx.db.session.update({ where: { id: session.sessionId }, data: { revokedAt: null } });
  const request = await director.client.call('/partner/staff-invitations', 'POST', { sanatorium_id: tenant.id, name: 'Pending Bot', login: 'pending.bot', phone: '+998901230103', temporary_password: testPassword });
  const userId = request.body.membership.userId;
  await assert.rejects(() => links.actor(userId), (e: any) => e.code === 'TELEGRAM_ACCESS_DENIED');
  const anonymous = new Client(ctx.base); assert.equal((await anonymous.call('/telegram/link', 'POST', {})).status, 401);
  const c = await customer(ctx.base, ctx.auth); assert.equal((await c.call('/telegram/account')).status, 403);
  const link = await ctx.db.telegramLinkRequest.create({ data: { userId: director.membership.userId, sessionId: randomUUID(), tokenHash: hash('invalid-session-token-' + 'a'.repeat(20)), expiresAt: new Date(Date.now() + 60000) } }).catch(() => null);
  assert.equal(link, null, 'SQL foreign key prevents orphaned linking sessions');
});
test('Telegram: private chats and server-side tenant permissions govern every menu', async () => {
  await bot.handle(update(41002, '/start'));
  const labels = JSON.stringify(last().reply_markup);
  assert.match(labels, /Bronlar/); assert.doesNotMatch(labels, /Boshqaruv/);
  const beforeCount = api.sent.filter(s => s.method === 'sendMessage').length;
  const group = update(41002, '/bronlar'); group.message.chat = { id: -12345, type: 'group' as any };
  await bot.handle(group); assert.equal(api.sent.filter(s => s.method === 'sendMessage').length, beforeCount);
  const c = await customer(ctx.base, ctx.auth);
  const foreignHold = await hold(c, await quote(c, other, plusDays(localDate(), 1), plusDays(localDate(), 2)));
  assert.equal(foreignHold.status, 201);
  const foreign = await ctx.db.booking.update({ where: { id: foreignHold.body.id }, data: { guest: { name: 'Private other guest' } } });
  await bot.handle(press(41002, `booking:${foreign.id}`));
  assert.doesNotMatch(last().text, /Private other guest/); assert.match(last().text, /topilmadi/);
  await bot.handle(press(41002, 'approvals:0')); assert.match(last().text, /Admin vakolati/);
});
test('Telegram: all authorized main sections render working buttons and short callbacks', async () => {
  const actions = ['today', 'tomorrow', 'bookings:all:0', 'bookings:confirmed:0', 'rooms:1', 'rooms:7', 'report:day', 'report:month', 'finance', 'payments:0', 'refunds:0', 'payouts:0', 'billing:0', 'tasks:0', 'management', 'staff:0', 'approvals:0', 'health', 'communication', 'tickets:0', 'messages:0', 'settings', 'tenants:0', 'account', 'help'];
  for (const action of actions) {
    await bot.handle(press(41003, action)); const page = last();
    assert.doesNotMatch(page.text, /^⚠️|Amal bajarilmadi|Tugma eskirgan/, action);
    for (const row of page.reply_markup?.inline_keyboard || []) for (const button of row) {
      assert.ok(button.text.length > 0, action); if (button.callback_data) assert.ok(Buffer.byteLength(button.callback_data) <= 64, action);
    }
  }
  await bot.handle(press(41001, 'staff:0')); assert.match(last().text, /telegram.reception|Jamoa/);
});
test('Telegram: permission revocation and director replacement take effect without cached grants', async () => {
  await ctx.db.membership.update({ where: { id: reception.membership.id }, data: { denies: ['bookings.read', 'payments.read'] } });
  await bot.handle(press(41002, `booking:${booking.id}`)); assert.match(last().text, /ruxsat/);
  await ctx.db.membership.update({ where: { id: reception.membership.id }, data: { denies: [] } });
  await ctx.db.membership.update({ where: { id: director.membership.id }, data: { status: 'BLOCKED' } });
  await bot.handle(update(41001, '/bronlar')); assert.match(last().text, /vakolati faol emas/); assert.doesNotMatch(last().text, /SH-/);
  await ctx.db.membership.update({ where: { id: director.membership.id }, data: { status: 'ACTIVE' } });
});
test('Telegram: search, cancel, notification preferences and time buttons work without accepting unknown settings', async () => {
  await bot.handle(press(41002, 'search')); await bot.handle(update(41002, booking.reference));
  assert.match(last().text, new RegExp(booking.reference));
  await bot.handle(update(41002, '/cancel'));
  assert.deepEqual((await ctx.db.telegramAccount.findUniqueOrThrow({ where: { telegramUserId: '41002' } })).state, {});
  await bot.handle(press(41002, 'setting:notifyBookings'));
  assert.equal((await ctx.db.telegramAccount.findUniqueOrThrow({ where: { telegramUserId: '41002' } })).notifyBookings, false);
  await bot.handle(press(41002, 'setting:role')); assert.match(last().text, /Sozlamani tanlang/);
  await bot.handle(press(41002, 'setting:notifyBookings'));
  await bot.handle(press(41002, 'hour:9'));
  assert.equal((await ctx.db.telegramAccount.findUniqueOrThrow({ where: { telegramUserId: '41002' } })).digestHour, 9);
  const original = api.call.bind(api);
  api.call = async (method, body) => { if (method === 'answerCallbackQuery') throw new TelegramError(400); return original(method, body); };
  try { await bot.handle(press(41002, 'today')); assert.match(last().text, /Kelishlar/); } finally { api.call = original; }
});
test('Telegram: task wizard is scoped, confirmed and idempotent; assignee handles transitions', async () => {
  await bot.handle(press(41001, 'tasknew:0')); assert.match(last().text, /Vazifa kimga/);
  await bot.handle(press(41001, `assignee:${reception.membership.userId}`));
  await bot.handle(update(41001, 'Xonani mehmon uchun tayyorlash')); await bot.handle(update(41001, 'Keladigan mehmon xonasini tekshiring.'));
  await bot.handle(press(41001, 'taskdue:1'));
  const state = (await ctx.db.telegramAccount.findUniqueOrThrow({ where: { telegramUserId: '41001' } })).state as any;
  await bot.handle(press(41001, 'taskconfirm'));
  const task = await ctx.db.task.findFirstOrThrow({ where: { title: state.title } });
  assert.equal(task.sanatoriumId, tenant.id); assert.equal(task.assignedTo, reception.membership.userId);
  const actor = await links.actor(director.membership.userId);
  await ctx.app.get(EngagementService).task(actor, { sanatorium_id: tenant.id, assigned_to: state.assignee, title: state.title, body: state.body, due_at: new Date(state.due).toISOString() }, `telegram:${state.requestId}`);
  assert.equal(await ctx.db.task.count({ where: { title: state.title } }), 1);
  await bot.handle(press(41002, `taskaccept:${task.id}:1`)); await bot.handle(press(41002, `taskdone:${task.id}:2`));
  assert.equal((await ctx.db.task.findUniqueOrThrow({ where: { id: task.id } })).status, 'COMPLETED');
  await ctx.db.user.update({ where: { id: reception.membership.userId }, data: { status: 'BLOCKED' } });
  try {
    await assert.rejects(() => ctx.app.get(EngagementService).task(actor, { sanatorium_id: tenant.id, assigned_to: reception.membership.userId, title: 'Blocked assignee', body: 'No active user', due_at: new Date(Date.now() + 86400000).toISOString() }), (e: any) => e.code === 'NOT_FOUND');
  } finally { await ctx.db.user.update({ where: { id: reception.membership.userId }, data: { status: 'ACTIVE' } }); }
});
test('Telegram: receptionist confirms check-in/out; repeated clicks do not duplicate transitions', async () => {
  const version = (await ctx.db.booking.findUniqueOrThrow({ where: { id: booking.id } })).version;
  await bot.handle(press(41002, `checkin:${booking.id}:${version}`)); assert.match(last().text, /tasdiqlaysizmi/);
  await bot.handle(press(41002, `checkinok:${booking.id}:${version}`));
  let current = await ctx.db.booking.findUniqueOrThrow({ where: { id: booking.id } });
  assert.equal(current.status, 'CHECKED_IN');
  await bot.handle(press(41002, `checkinok:${booking.id}:${version}`)); assert.match(last().text, /holati o‘zgargan/);
  await bot.handle(press(41002, `checkoutok:${booking.id}:${current.version}`));
  current = await ctx.db.booking.findUniqueOrThrow({ where: { id: booking.id } }); assert.equal(current.status, 'CHECKED_OUT');
});
test('Telegram: support wizard and replies use existing authorization and idempotency', async () => {
  await bot.handle(press(41002, 'ticketnew')); await bot.handle(update(41002, 'Bron haqida savol')); await bot.handle(update(41002, 'Mehmon kelish vaqtini aniqlashtirish kerak.'));
  await bot.handle(press(41002, 'ticketconfirm'));
  const ticket = await ctx.db.supportTicket.findFirstOrThrow({ where: { title: 'Bron haqida savol' } }); assert.equal(ticket.sanatoriumId, tenant.id);
  await bot.handle(press(41003, `ticketreply:${ticket.id}`)); await bot.handle(update(41003, 'Kelish vaqti sanatoriya profilida ko‘rsatilgan.')); await bot.handle(press(41003, 'replyconfirm'));
  assert.equal(await ctx.db.supportMessage.count({ where: { ticketId: ticket.id } }), 2);
});
test('Telegram: signed webhook, durable encrypted inbox and duplicate updates are enforced', async () => {
  const previous = config.TELEGRAM_MODE; config.TELEGRAM_MODE = 'webhook'; config.TELEGRAM_WEBHOOK_SECRET = 'test-webhook-' + 'x'.repeat(32);
  const anonymous = new Client(ctx.base), event = update(41002, '/menu');
  assert.equal((await anonymous.call('/telegram/webhook', 'POST', event)).status, 401);
  assert.equal((await anonymous.call('/telegram/webhook', 'POST', event, { 'X-Telegram-Bot-Api-Secret-Token': config.TELEGRAM_WEBHOOK_SECRET })).status, 201);
  await bot.enqueue(event, true); await bot.enqueue(event, true);
  assert.equal(await ctx.db.telegramInbound.count({ where: { id: `${api.botId}:${event.update_id}` } }), 1);
  const record = await ctx.db.telegramInbound.findUniqueOrThrow({ where: { id: `${api.botId}:${event.update_id}` } }); assert.equal(record.encryptedPayload.includes('/menu'), false);
  assert.equal(await bot.runPending(), 1); assert.equal(await bot.runPending(), 0);
  assert.equal((await ctx.db.telegramInbound.findUniqueOrThrow({ where: { id: record.id } })).encryptedPayload, '');
  assert.equal((await ctx.db.telegramBotState.findUniqueOrThrow({ where: { botId: api.botId } })).offset, BigInt(event.update_id + 1));
  config.TELEGRAM_MODE = previous;
});
test('Telegram: outbox notifications retry and respect current permissions and user settings', async () => {
  const outbox = ctx.app.get(OutboxService);
  for (const id of await outbox.claim()) await outbox.process(id);
  await ctx.db.notificationDelivery.updateMany({ where: { channel: 'TELEGRAM' }, data: { status: 'CANCELLED' } });
  await ctx.db.telegramAccount.updateMany({ data: { quietHours: false } });
  const event = await ctx.db.outboxEvent.create({ data: { topic: 'booking.created', payload: { booking_id: booking.id, recipient_ids: [reception.membership.userId] } } });
  await outbox.process(event.id);
  const row = await ctx.db.notificationDelivery.findUniqueOrThrow({ where: { eventId_userId_channel: { eventId: event.id, userId: reception.membership.userId, channel: 'TELEGRAM' } } });
  await ctx.db.notificationDelivery.updateMany({ where: { channel: 'TELEGRAM', id: { not: row.id } }, data: { status: 'CANCELLED' } });
  const original = api.call.bind(api); let failOnce = true;
  api.call = async (method, body) => { if (method === 'sendMessage' && failOnce) { failOnce = false; throw new TelegramError(429, 3); } return original(method, body); };
  await bot.flushNotifications(1); api.call = original;
  const pending = await ctx.db.notificationDelivery.findUniqueOrThrow({ where: { id: row.id } }); assert.equal(pending.status, 'PENDING'); assert.equal(pending.lastError, 'TELEGRAM_DELIVERY_FAILED');
  await ctx.db.notificationDelivery.update({ where: { id: row.id }, data: { availableAt: new Date(0) } });
  await ctx.db.membership.update({ where: { id: reception.membership.id }, data: { denies: ['bookings.read'] } });
  await bot.flushNotifications(); assert.equal((await ctx.db.notificationDelivery.findUniqueOrThrow({ where: { id: row.id } })).status, 'CANCELLED');
  await ctx.db.membership.update({ where: { id: reception.membership.id }, data: { denies: [] } });
  await ctx.db.telegramAccount.update({ where: { userId: reception.membership.userId }, data: { notificationsEnabled: false } });
  const muted = await ctx.db.outboxEvent.create({ data: { topic: 'booking.checked_out', payload: { booking_id: booking.id, recipient_ids: [reception.membership.userId] } } });
  await outbox.process(muted.id); await bot.flushNotifications();
  assert.equal((await ctx.db.notificationDelivery.findUniqueOrThrow({ where: { eventId_userId_channel: { eventId: muted.id, userId: reception.membership.userId, channel: 'TELEGRAM' } } })).status, 'CANCELLED');
  await ctx.db.telegramAccount.update({ where: { userId: reception.membership.userId }, data: { notificationsEnabled: true } });
});
test('Telegram: daily and subscription reminders are scheduled once; disconnect cancels pending delivery', async () => {
  const account = await ctx.db.telegramAccount.findUniqueOrThrow({ where: { telegramUserId: '41002' } });
  await ctx.db.telegramAccount.update({ where: { id: account.id }, data: { digestHour: 0, dailyDigest: true } });
  const now = new Date(`${localDate()}T12:00:00+05:00`); await bot.schedule(now); await bot.schedule(now);
  assert.equal(await ctx.db.telegramScheduledEvent.count({ where: { id: `daily:${account.id}:${localDate()}` } }), 1);
  const plan = await ctx.db.subscriptionPlan.create({ data: { name: 'Test reminder plan', amount: 100n, periodDays: 30 } });
  const subscription = await ctx.db.subscription.create({ data: { sanatoriumId: tenant.id, planId: plan.id, status: 'ACTIVE', startsAt: new Date(plusDays(localDate(), -20)), endsAt: new Date(plusDays(localDate(), 3)), graceEndsAt: new Date(plusDays(localDate(), 5)) } });
  await bot.schedule(now); await bot.schedule(now);
  assert.equal(await ctx.db.telegramScheduledEvent.count({ where: { id: `subscription:${subscription.id}:${localDate()}` } }), 1);
  const outbox = ctx.app.get(OutboxService);
  for (const id of await outbox.claim()) await outbox.process(id);
  assert.ok(await ctx.db.notificationDelivery.count({ where: { userId: reception.membership.userId, channel: 'TELEGRAM', status: 'PENDING' } }) > 0);
  assert.equal((await reception.client.call('/telegram/disconnect', 'POST', {})).status, 201);
  assert.equal(await ctx.db.telegramAccount.findUnique({ where: { userId: reception.membership.userId } }), null);
  assert.equal(await ctx.db.notificationDelivery.count({ where: { userId: reception.membership.userId, channel: 'TELEGRAM', status: 'PENDING' } }), 0);
  await bot.handle(update(41002, '/start')); assert.match(last().text, /Telegramga ulash/);
});
