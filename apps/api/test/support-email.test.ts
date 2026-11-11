import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { loadConfig } from '../src/common/config';
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
const USER_ID = '22222222-2222-4222-8222-222222222222';
const PHONE_USER_ID = '33333333-3333-4333-8333-333333333333';
const TICKET_ID = '44444444-4444-4444-8444-444444444444';

function buildFixture() {
  const sentEmails: Array<{ to: string; subject: string; text: string; html: string }> = [];
  const emittedEvents: Array<{ topic: string; payload: any }> = [];
  const idempotencyStore = new Map<string, { bodyHash: string; result: any }>();

  const users = new Map<string, any>([
    [ADMIN_ID, { id: ADMIN_ID, name: 'Superadmin', login: 'superadmin', phone: null, kind: 'SUPERADMIN', status: 'ACTIVE' }],
    [USER_ID, { id: USER_ID, name: 'Ali Valiyev', login: 'ali.user@example.com', phone: null, kind: 'CUSTOMER', status: 'ACTIVE' }],
    [PHONE_USER_ID, { id: PHONE_USER_ID, name: 'Mijoz', login: null, phone: '+998901112233', kind: 'CUSTOMER', status: 'ACTIVE' }],
  ]);

  const tickets = new Map<string, any>([
    [TICKET_ID, { id: TICKET_ID, userId: USER_ID, sanatoriumId: null, bookingId: null, title: 'Bron bo‘yicha savol', status: 'OPEN', createdAt: new Date() }],
  ]);
  const messages: any[] = [];

  const tx: any = {
    $executeRaw: async () => 1,
    idempotencyRecord: {
      findUnique: async ({ where }: any) => {
        const k = `${where.userId_action_key.userId}:${where.userId_action_key.action}:${where.userId_action_key.key}`;
        return idempotencyStore.get(k) ?? null;
      },
      create: async ({ data }: any) => {
        const k = `${data.userId}:${data.action}:${data.key}`;
        idempotencyStore.set(k, { bodyHash: data.bodyHash, result: data.result });
        return data;
      },
    },
    supportTicket: {
      create: async ({ data }: any) => {
        const row = { id: '55555555-5555-4555-8555-555555555555', status: 'OPEN', createdAt: new Date(), ...data };
        tickets.set(row.id, row);
        return row;
      },
      findUnique: async ({ where }: any) => tickets.get(where.id) ?? null,
      update: async ({ where, data }: any) => {
        const row = tickets.get(where.id);
        Object.assign(row, data);
        return row;
      },
    },
    supportMessage: {
      create: async ({ data }: any) => {
        const row = { id: `66666666-6666-4666-8666-66666666660${messages.length + 1}`, createdAt: new Date(), isEdited: false, deletedForUser: false, ...data };
        messages.push(row);
        return row;
      },
      findUnique: async ({ where }: any) => messages.find((m) => m.id === where.id) ?? null,
      update: async ({ where, data }: any) => {
        const idx = messages.findIndex((m) => m.id === where.id);
        if (idx === -1) return null;
        Object.assign(messages[idx], data);
        return messages[idx];
      },
      delete: async ({ where }: any) => {
        const idx = messages.findIndex((m) => m.id === where.id);
        if (idx === -1) return null;
        return messages.splice(idx, 1)[0];
      },
      findMany: async ({ where }: any) =>
        messages.filter(
          (m) =>
            m.ticketId === where.ticketId &&
            (where.deletedForUser === undefined || m.deletedForUser === where.deletedForUser),
        ),
    },
    user: {
      findMany: async ({ where }: any) => {
        if (where?.id?.in) return where.id.in.map((id: string) => users.get(id)).filter(Boolean);
        if (where?.kind === 'SUPERADMIN') return [users.get(ADMIN_ID)];
        return [...users.values()];
      },
      findUnique: async ({ where }: any) => users.get(where.id) ?? null,
    },
    auditLog: { create: async () => ({}) },
    outboxEvent: {
      create: async ({ data }: any) => {
        emittedEvents.push(data);
        return data;
      },
    },
  };

  const mockDb = {
    supportTicket: tx.supportTicket,
    supportMessage: tx.supportMessage,
    user: tx.user,
    atomic: async (fn: (t: any) => Promise<any>) => fn(tx),
    idempotent: async (userId: string, action: string, key: string, _body: unknown, fn: (t: any) => Promise<any>) => {
      const k = `${userId}:${action}:${key}`;
      const existing = idempotencyStore.get(k);
      if (existing) return existing.result;
      const result = await fn(tx);
      idempotencyStore.set(k, { bodyHash: 'hash', result });
      return result;
    },
  } as unknown as Db;

  const config = loadConfig(env());
  const email = new EmailService(config);
  (email as any).transporter = {
    sendMail: async (mail: any) => {
      sentEmails.push({
        to: mail.to,
        subject: mail.subject,
        text: mail.text,
        html: mail.html,
      });
      return {};
    },
  };

  const service = new EngagementService(mockDb, email);
  return { service, email, sentEmails, emittedEvents, tickets };
}

test('support email: admin reply notifies user by email with "Sizga admin javob berdi"', async () => {
  const { service, sentEmails } = buildFixture();
  const admin: Actor = { kind: 'SUPERADMIN', id: ADMIN_ID } as Actor;

  await service.ticketReply(admin, TICKET_ID, { text: 'Murojaatingiz tasdiqlandi <test>' }, 'reply-key-123456');

  assert.equal(sentEmails.length, 1);
  assert.equal(sentEmails[0].to, 'ali.user@example.com');
  assert.match(sentEmails[0].subject, /Sizga admin javob berdi/i);
  assert.match(sentEmails[0].text, /Sizga admin javob berdi/i);
  assert.match(sentEmails[0].html, /Sizga admin javob berdi/i);
  assert.match(sentEmails[0].html, /&lt;test&gt;/);

  // Replaying with same idempotency key does not send duplicate notification emails
  await service.ticketReply(admin, TICKET_ID, { text: 'Murojaatingiz tasdiqlandi <test>' }, 'reply-key-123456');
  assert.equal(sentEmails.length, 1);
});

test('support email: admin creating a ticket for a user notifies target user via email and outbox', async () => {
  const { service, sentEmails, emittedEvents } = buildFixture();
  const admin: Actor = { kind: 'SUPERADMIN', id: ADMIN_ID } as Actor;

  await service.ticket(admin, {
    target_user_id: USER_ID,
    title: 'Muhim xabar',
    text: 'Iltimos hujjatni tekshiring',
  }, 'open-key-123456');

  assert.equal(sentEmails.length, 1);
  assert.equal(sentEmails[0].to, 'ali.user@example.com');
  assert.match(sentEmails[0].text, /Muhim xabar/);
  assert.match(sentEmails[0].text, /Iltimos hujjatni tekshiring/);
  assert.ok(emittedEvents.some((e) => e.topic === 'support.opened' && e.payload.recipient_ids.includes(USER_ID)));
});

test('support email: skips customer self-reply & non-email users, and survives SMTP failure', async () => {
  const { service, email, sentEmails, tickets } = buildFixture();
  const customer: Actor = { kind: 'CUSTOMER', id: USER_ID } as Actor;
  const admin: Actor = { kind: 'SUPERADMIN', id: ADMIN_ID } as Actor;

  // Customer replying to own ticket should not send "admin replied" email
  await service.ticketReply(customer, TICKET_ID, { text: 'Rahmat' });
  assert.equal(sentEmails.length, 0);

  // Phone-only customer has no email
  const phoneTicketId = '77777777-7777-4777-8777-777777777777';
  tickets.set(phoneTicketId, { id: phoneTicketId, userId: PHONE_USER_ID, sanatoriumId: null, bookingId: null, title: 'Telefon user', status: 'OPEN', createdAt: new Date() });
  await service.ticketReply(admin, phoneTicketId, { text: 'Javob' });
  assert.equal(sentEmails.length, 0);

  // Empty text with imageUrl defaults to "📷 Rasm" and sends email
  const imgMsg = await service.ticketReply(admin, TICKET_ID, { text: '', imageUrl: 'data:image/png;base64,AAAA' });
  assert.equal(imgMsg.text, '📷 Rasm');
  assert.equal(sentEmails.length, 1);

  // SMTP failure does not crash chat reply
  (email as any).transporter = {
    sendMail: async () => {
      throw new Error('SMTP connection timeout');
    },
  };
  const msg = await service.ticketReply(admin, TICKET_ID, { text: 'Yana xabar' });
  assert.equal(msg.text, 'Yana xabar');
});

test('support messages: customer edit/soft-delete hides from customer while keeping audit for superadmin until superadmin deletes', async () => {
  const { service } = buildFixture();
  const customer: Actor = { kind: 'CUSTOMER', id: USER_ID } as Actor;
  const admin: Actor = { kind: 'SUPERADMIN', id: ADMIN_ID } as Actor;

  const created = await service.ticketReply(customer, TICKET_ID, { text: 'Boshlangich xabar' });
  const edited = await service.ticketMessageEdit(customer, TICKET_ID, created.id, { text: 'Tahrirlangan xabar' });
  assert.equal(edited.text, 'Tahrirlangan xabar');
  assert.equal(edited.isEdited, true);

  // Customer deletes own message -> soft-deleted for customer, audit stays for superadmin
  const custDelete = await service.ticketMessageDelete(customer, TICKET_ID, created.id);
  assert.equal(custDelete.deleted, false);

  const custThread = await service.ticketGet(customer, TICKET_ID);
  assert.equal(custThread.messages.some((m: any) => m.id === created.id), false);

  const adminThreadBefore = await service.ticketGet(admin, TICKET_ID);
  const auditMsg = adminThreadBefore.messages.find((m: any) => m.id === created.id);
  assert.ok(auditMsg);
  assert.equal(auditMsg.text, 'Tahrirlangan xabar');
  assert.equal(auditMsg.isDeleted, true);

  // Superadmin permanently deletes the audit message
  const adminDelete = await service.ticketMessageDelete(admin, TICKET_ID, created.id);
  assert.equal(adminDelete.deleted, true);

  const adminThreadAfter = await service.ticketGet(admin, TICKET_ID);
  assert.equal(adminThreadAfter.messages.some((m: any) => m.id === created.id), false);
});
