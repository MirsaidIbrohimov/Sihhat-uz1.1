import assert from 'node:assert/strict';
import test, { after, before } from 'node:test';
import { setup, staff } from './helpers';
import { customer, sanatorium } from './fixtures';

let ctx: Awaited<ReturnType<typeof setup>>;
let sanA: any;

before(async () => {
  ctx = await setup();
  sanA = await sanatorium(ctx.admin, 1);
});

after(async () => {
  await ctx?.app.close();
});

test('Customer support tickets always route to Superadmin first, and Superadmin can answer directly or assign to a sanatorium staff member', async () => {
  const cust = await customer(ctx.base, ctx.auth);
  const receptionA = await staff(ctx.admin, 'support.rec.a', '+998911112233', sanA.id, false);
  const receptionB = await staff(ctx.admin, 'support.rec.b', '+998911112244', sanA.id, false);

  // Approve both reception staff so they are ACTIVE
  await ctx.admin.call(`/superadmin/staff-approvals/${receptionA.membership.id}/approve`, 'POST', { version: 1 });
  await ctx.admin.call(`/superadmin/staff-approvals/${receptionB.membership.id}/approve`, 'POST', { version: 1 });

  const recAUserId = receptionA.membership.userId;

  // 1. Even if a legacy client sends target_role / sanatorium_id, customer tickets go strictly to Superadmin
  const opened = await cust.call('/support/tickets', 'POST', {
    title: 'Ilovadan murojaat',
    text: 'Xona bron qilishda savolim bor',
    sanatorium_id: sanA.id,
    target_role: 'DIRECTOR',
  });
  assert.equal(opened.status, 201, JSON.stringify(opened.body));
  const ticketId = opened.body.id;
  assert.equal(opened.body.sanatoriumId, null, 'Customer ticket must not auto-attach sanatoriumId');
  assert.equal(opened.body.assignedToUserId, null, 'Customer ticket must start unassigned (handled by Superadmin)');

  // 2. Superadmin sees it; sanatorium staff CANNOT see it before assignment
  const adminList = await ctx.admin.call('/support/tickets');
  assert.equal(adminList.status, 200);
  assert.ok(adminList.body.some((t: any) => t.id === ticketId));

  const recAListBefore = await receptionA.client.call('/support/tickets');
  assert.equal(recAListBefore.status, 200);
  assert.equal(recAListBefore.body.some((t: any) => t.id === ticketId), false);
  assert.equal((await receptionA.client.call(`/support/tickets/${ticketId}`)).status, 404);

  // Customer sees Superadmin as peer by default
  const custDetailBefore = await cust.call(`/support/tickets/${ticketId}`);
  assert.equal(custDetailBefore.status, 200);
  assert.equal(custDetailBefore.body.peer?.kind, 'SUPERADMIN');
  assert.equal(custDetailBefore.body.peer?.name, 'Superadmin');

  // 3. Superadmin can reply directly
  const adminReply = await ctx.admin.call(`/support/tickets/${ticketId}/messages`, 'POST', {
    text: 'Salom! Men Superadminman, hozir ko‘rib chiqaman.',
  });
  assert.equal(adminReply.status, 201);

  // 4. Non-superadmin cannot assign tickets (403)
  assert.equal(
    (await cust.call(`/support/tickets/${ticketId}/assign`, 'PATCH', { assigned_to_user_id: recAUserId })).status,
    403,
  );
  assert.equal(
    (await receptionA.client.call(`/support/tickets/${ticketId}/assign`, 'PATCH', { assigned_to_user_id: recAUserId })).status,
    403,
  );

  // 5. Superadmin assigns the ticket to receptionA
  const assigned = await ctx.admin.call(`/support/tickets/${ticketId}/assign`, 'PATCH', {
    assigned_to_user_id: recAUserId,
    sanatorium_id: sanA.id,
    note: 'Iltimos mehmonning xona savoliga javob bering',
  });
  assert.equal(assigned.status, 200, JSON.stringify(assigned.body));
  assert.equal(assigned.body.assignedToUserId, recAUserId);
  assert.equal(assigned.body.sanatoriumId, sanA.id);
  assert.equal(assigned.body.assignedStaff?.id, recAUserId);
  assert.equal(assigned.body.assignedStaff?.sanatoriumId, sanA.id);

  // Assigned staff receives immediate IN_APP notification and sees the ticket
  const recANotifs = await receptionA.client.call('/notifications');
  assert.equal(recANotifs.status, 200);
  assert.ok(
    recANotifs.body.some((n: any) => n.payload?.topic === 'support.assigned' && n.payload?.ticket_id === ticketId),
    'Assigned sanatorium staff must immediately receive support.assigned notification',
  );

  const recAListAfter = await receptionA.client.call('/support/tickets');
  assert.equal(recAListAfter.status, 200);
  assert.ok(recAListAfter.body.some((t: any) => t.id === ticketId));

  // Another unassigned reception staff in same sanatorium does NOT see receptionA's assigned ticket
  const recBList = await receptionB.client.call('/support/tickets');
  assert.equal(recBList.status, 200);
  assert.equal(recBList.body.some((t: any) => t.id === ticketId), false);
  assert.equal((await receptionB.client.call(`/support/tickets/${ticketId}`)).status, 404);

  // Assigned staff replies to customer
  const staffReply = await receptionA.client.call(`/support/tickets/${ticketId}/messages`, 'POST', {
    text: 'Assalomu alaykum, sanatoriya xodimi sifatida yordam beraman.',
  });
  assert.equal(staffReply.status, 201);

  // Customer now sees the assigned sanatorium staff as peer
  const custDetailAfter = await cust.call(`/support/tickets/${ticketId}`);
  assert.equal(custDetailAfter.status, 200);
  assert.equal(custDetailAfter.body.peer?.kind, 'STAFF');
  assert.equal(custDetailAfter.body.peer?.id, recAUserId);
  assert.equal(custDetailAfter.body.peer?.sanatoriumId, sanA.id);

  // 6. Superadmin unassigns ticket back to Superadmin
  const unassigned = await ctx.admin.call(`/support/tickets/${ticketId}/assign`, 'PATCH', {
    assigned_to_user_id: null,
    sanatorium_id: null,
  });
  assert.equal(unassigned.status, 200);
  assert.equal(unassigned.body.assignedToUserId, null);
  assert.equal(unassigned.body.sanatoriumId, null);
  assert.equal(unassigned.body.assignedStaff, null);

  const custDetailUnassigned = await cust.call(`/support/tickets/${ticketId}`);
  assert.equal(custDetailUnassigned.status, 200);
  assert.equal(custDetailUnassigned.body.peer?.kind, 'SUPERADMIN');
});
