import assert from 'node:assert/strict';
import test, { after, before } from 'node:test';
import { setup, staff } from './helpers';
import { customer, sanatorium } from './fixtures';

let ctx: Awaited<ReturnType<typeof setup>>;
let san1: any;
let san2: any;
let dir1: Awaited<ReturnType<typeof staff>>;
let rec1: Awaited<ReturnType<typeof staff>>;
let dir2: Awaited<ReturnType<typeof staff>>;
let user1: Awaited<ReturnType<typeof customer>>;
let user2: Awaited<ReturnType<typeof customer>>;

before(async () => {
  ctx = await setup();
  san1 = await sanatorium(ctx.admin, 1);
  san2 = await sanatorium(ctx.admin, 1);
  dir1 = await staff(ctx.admin, 'ann.dir1', '+998907100101', san1.id, true);
  rec1 = await staff(ctx.admin, 'ann.rec1', '+998907100102', san1.id, false);
  dir2 = await staff(ctx.admin, 'ann.dir2', '+998907100103', san2.id, true);
  user1 = await customer(ctx.base, ctx.auth);
  user2 = await customer(ctx.base, ctx.auth);
});

after(async () => {
  await ctx?.app.close();
});

test('Announcements & Messages API: CUSTOMERS broadcast delivers immediately to app users and syncs read status', async () => {
  const res = await ctx.admin.call('/superadmin/announcements', 'POST', {
    target: 'CUSTOMERS',
    title: 'Mijozlar uchun bahorgi aksiya',
    body: 'Barcha ilova foydalanuvchilari uchun yangi chegirmalar ochildi!',
    kind: 'MESSAGE',
  });
  assert.equal(res.status, 201);
  const msgId = res.body.id;
  assert.ok(msgId);

  // 1. Both app users immediately receive the announcement in GET /notifications (0ms delay without waiting for worker)
  const u1Notifs = await user1.call('/notifications');
  assert.equal(u1Notifs.status, 200);
  const u1Ann = u1Notifs.body.find((n: any) => n.payload?.message_id === msgId);
  assert.ok(u1Ann, 'User 1 must receive the announcement in /notifications immediately');
  assert.match(u1Ann.payload.title, /Mijozlar uchun bahorgi aksiya/);
  assert.equal(u1Ann.readAt, null);

  const u2Notifs = await user2.call('/notifications');
  assert.equal(u2Notifs.status, 200);
  const u2Ann = u2Notifs.body.find((n: any) => n.payload?.message_id === msgId);
  assert.ok(u2Ann, 'User 2 must receive the announcement in /notifications immediately');

  // Partners must NOT receive a CUSTOMERS-only broadcast
  const dir1Inbox = await dir1.client.call('/messages?box=inbox');
  assert.equal(dir1Inbox.status, 200);
  assert.ok(!dir1Inbox.body.data.some((r: any) => r.messageId === msgId));

  // 2. User 1 reads the notification in mobile app via POST /notifications/:id/read
  const readRes = await user1.call(`/notifications/${u1Ann.id}/read`, 'POST', {});
  assert.equal(readRes.status, 201);

  // 3. Superadmin checks GET /messages?box=sent and sees accurate customerStats and recipient readAt
  const sentRes = await ctx.admin.call('/messages?box=sent');
  assert.equal(sentRes.status, 200);
  const sentRow = sentRes.body.data.find((r: any) => r.id === msgId);
  assert.ok(sentRow);
  assert.equal(sentRow.targetAudience, 'CUSTOMERS');
  assert.ok(sentRow.customerStats.total >= 2);
  assert.equal(sentRow.customerStats.delivered, sentRow.customerStats.total);
  assert.equal(sentRow.customerStats.read, 1);
  assert.equal(sentRow.partnerStats.total, 0);
});

test('Announcements & Messages API: PARTNERS broadcast (filtered by sanatorium and role) delivers to partners and tracks acceptance', async () => {
  const res = await ctx.admin.call('/superadmin/announcements', 'POST', {
    target: 'PARTNERS',
    sanatorium_ids: [san1.id],
    roles: ['DIRECTOR', 'RECEPTION'],
    title: 'Zomin sanatoriyasi uchun muhim topshiriq',
    body: 'Shaxmatka va tariflarni bugun yangilang.',
    kind: 'WARNING',
  });
  assert.equal(res.status, 201);
  const msgId = res.body.id;

  // 1. Sanatorium 1 director and reception receive the announcement in inbox & notifications
  const dir1Inbox = await dir1.client.call('/messages?box=inbox');
  assert.equal(dir1Inbox.status, 200);
  const dir1Msg = dir1Inbox.body.data.find((r: any) => r.messageId === msgId);
  assert.ok(dir1Msg, 'Sanatorium 1 Director must receive partner announcement');
  assert.equal(dir1Msg.sender?.kind, 'SUPERADMIN');

  const rec1Inbox = await rec1.client.call('/messages?box=inbox');
  assert.equal(rec1Inbox.status, 200);
  assert.ok(rec1Inbox.body.data.some((r: any) => r.messageId === msgId), 'Sanatorium 1 Reception must receive partner announcement');

  // Sanatorium 2 director must NOT receive announcement filtered to san1
  const dir2Inbox = await dir2.client.call('/messages?box=inbox');
  assert.equal(dir2Inbox.status, 200);
  assert.ok(!dir2Inbox.body.data.some((r: any) => r.messageId === msgId), 'Sanatorium 2 Director must not receive san1-only announcement');

  // 2. Director 1 accepts the announcement via POST /messages/:id/receipt
  const receiptRes = await dir1.client.call(`/messages/${msgId}/receipt`, 'POST', { accepted: true });
  assert.equal(receiptRes.status, 201);
  assert.ok(receiptRes.body.readAt);
  assert.ok(receiptRes.body.acceptedAt);

  // Director 1 notification in /notifications is also marked read automatically
  const dir1Notifs = await dir1.client.call('/notifications');
  const dir1Notif = dir1Notifs.body.find((n: any) => n.payload?.message_id === msgId);
  assert.ok(dir1Notif?.readAt, 'Matching IN_APP notification must be marked read when receipt is confirmed');

  // 3. Superadmin sees partnerStats updated with read=1, accepted=1
  const sentRes = await ctx.admin.call('/messages?box=sent');
  const sentRow = sentRes.body.data.find((r: any) => r.id === msgId);
  assert.ok(sentRow);
  assert.equal(sentRow.targetAudience, 'PARTNERS');
  assert.equal(sentRow.partnerStats.total, 2);
  assert.equal(sentRow.partnerStats.delivered, 2);
  assert.equal(sentRow.partnerStats.read, 1);
  assert.equal(sentRow.partnerStats.accepted, 1);
});

test('Announcements & Messages API: ALL broadcast + verify-delivery repairs missing IN_APP deliveries + deleteMessage cleans up', async () => {
  const res = await ctx.admin.call('/superadmin/announcements', 'POST', {
    target: 'ALL',
    title: 'Umumiy platforma e’loni',
    body: 'Barcha foydalanuvchilar va hamkorlar uchun yangilanish.',
    kind: 'MESSAGE',
  });
  assert.equal(res.status, 201);
  const msgId = res.body.id;

  // Simulate a missing IN_APP delivery row for dir2
  await ctx.db.notificationDelivery.deleteMany({
    where: { userId: dir2.membership.userId, channel: 'IN_APP' },
  });

  // Call verify-delivery endpoint
  const verifyRes = await ctx.admin.call(`/messages/${msgId}/verify-delivery`, 'POST', {});
  assert.equal(verifyRes.status, 201);
  assert.equal(verifyRes.body.verified, true);
  assert.ok(verifyRes.body.repairedDeliveries >= 1, 'verify-delivery must repair missing IN_APP deliveries');
  assert.ok(verifyRes.body.customers.total >= 2);
  assert.equal(verifyRes.body.customers.deliveredInApp, verifyRes.body.customers.total);
  assert.ok(verifyRes.body.partners.total >= 3);
  assert.equal(verifyRes.body.partners.deliveredInApp, verifyRes.body.partners.total);

  // Partner Director can send message to own team and Superadmin, but not foreign sanatorium
  const adminMe = (await ctx.admin.call('/auth/me')).body;
  const partnerSend = await dir1.client.call('/messages', 'POST', {
    title: 'Jamoa va Superadminga xabar',
    body: 'Smena topshirildi.',
    kind: 'MESSAGE',
    recipient_ids: [rec1.membership.userId, adminMe.id],
  });
  assert.equal(partnerSend.status, 201);

  const forbiddenSend = await dir1.client.call('/messages', 'POST', {
    title: 'Begona sanatoriyaga',
    body: 'Ruxsat yo‘q',
    kind: 'MESSAGE',
    recipient_ids: [dir2.membership.userId],
  });
  assert.equal(forbiddenSend.status, 403);

  // Delete announcement
  const delRes = await ctx.admin.call(`/messages/${msgId}`, 'DELETE');
  assert.equal(delRes.status, 200);
  assert.equal(delRes.body.success, true);

  const afterSent = await ctx.admin.call('/messages?box=sent');
  assert.ok(!afterSent.body.data.some((r: any) => r.id === msgId));
});
