import { Inject, Injectable, Optional } from '@nestjs/common';
import { Db, lock } from '../common/db';
import { CONFIG, type Config } from '../common/config';
import { AUTO_SUPERADMIN_TOPICS, isAdminEmailTopic } from '../common/admin-alerts';
import { EmailService } from '../auth/email';

@Injectable()
export class OutboxService {
  constructor(
    @Inject(Db) readonly db: Db,
    @Inject(CONFIG) readonly config: Config,
    @Optional() @Inject(EmailService) readonly email?: EmailService,
  ) {}

  async claim() {
    return this.db.atomic(async tx => {
      const rows = await tx.$queryRaw<{ id: string }[]>`SELECT id FROM "OutboxEvent" WHERE "processedAt" IS NULL AND "availableAt"<=now() AND ("leaseUntil" IS NULL OR "leaseUntil"<=now()) ORDER BY "createdAt" LIMIT 100 FOR UPDATE SKIP LOCKED`;
      const leaseUntil = new Date(Date.now() + 60000);
      await tx.outboxEvent.updateMany({ where: { id: { in: rows.map(r => r.id) } }, data: { leaseUntil } });
      return rows.map(r => r.id);
    });
  }

  async process(id: string) {
    try {
      await this.db.atomic(async tx => {
        await lock(tx, `outbox:${id}`);
        const event = await tx.outboxEvent.findUniqueOrThrow({ where: { id } });
        if (event.processedAt) return;
        const payload = (event.payload ?? {}) as Record<string, any>;
        let ids: string[] = Array.isArray(payload.recipient_ids) ? [...payload.recipient_ids] : [];
        if (!ids.length && AUTO_SUPERADMIN_TOPICS.has(event.topic)) {
          ids = (await tx.user.findMany({ where: { kind: 'SUPERADMIN', status: 'ACTIVE' }, select: { id: true } })).map(u => u.id);
        }
        if (payload.booking_id) {
          const b = await tx.booking.findUnique({ where: { id: payload.booking_id } });
          if (b) {
            const staff = await tx.membership.findMany({ where: { sanatoriumId: b.sanatoriumId, status: 'ACTIVE' }, select: { userId: true } });
            ids.push(...staff.map(s => s.userId));
          }
          const admins = await tx.user.findMany({ where: { kind: 'SUPERADMIN', status: 'ACTIVE' }, select: { id: true } });
          ids.push(...admins.map(a => a.id));
        }
        for (const userId of new Set(ids)) {
          const exists = await tx.user.findUnique({ where: { id: userId } });
          if (!exists) continue;
          await tx.notificationDelivery.upsert({
            where: { eventId_userId_channel: { eventId: event.id, userId, channel: 'IN_APP' } },
            create: { eventId: event.id, userId, channel: 'IN_APP', payload: { topic: event.topic, ...payload }, status: 'SENT', sentAt: new Date() },
            update: {},
          });
          if (this.config.PUSH_ADAPTER === 'http' && exists.kind === 'CUSTOMER') {
            await tx.notificationDelivery.upsert({
              where: { eventId_userId_channel: { eventId: event.id, userId, channel: 'PUSH' } },
              create: { eventId: event.id, userId, channel: 'PUSH', payload: { topic: event.topic, booking_id: payload.booking_id ?? null } },
              update: {},
            });
          }
          if (this.config.TELEGRAM_MODE !== 'disabled' && ['STAFF', 'SUPERADMIN'].includes(exists.kind) && exists.status === 'ACTIVE' && await tx.telegramAccount.findUnique({ where: { userId } })) {
            await tx.notificationDelivery.upsert({
              where: { eventId_userId_channel: { eventId: event.id, userId, channel: 'TELEGRAM' } },
              create: { eventId: event.id, userId, channel: 'TELEGRAM', payload: { topic: event.topic, ...payload } },
              update: {},
            });
          }
          const recipientEmail = exists.email ?? (exists.login?.includes('@') ? exists.login : null);
          if (this.email && exists.kind === 'SUPERADMIN' && exists.status === 'ACTIVE' && recipientEmail && isAdminEmailTopic(event.topic)) {
            await tx.notificationDelivery.upsert({
              where: { eventId_userId_channel: { eventId: event.id, userId, channel: 'EMAIL' } },
              create: {
                eventId: event.id,
                userId,
                channel: 'EMAIL',
                payload: { topic: event.topic, recipient_email: recipientEmail, recipient_name: exists.name, ...payload },
              },
              update: {},
            });
          }
        }
        await tx.outboxEvent.update({ where: { id }, data: { processedAt: new Date(), leaseUntil: null, lastError: null } });
      });
    } catch {
      await this.db.outboxEvent.update({
        where: { id },
        data: { attempts: { increment: 1 }, leaseUntil: null, availableAt: new Date(Date.now() + 30000), lastError: 'DISPATCH_FAILED' },
      });
      throw new Error('Outbox dispatch failed');
    }
  }

  async push() {
    if (this.config.PUSH_ADAPTER !== 'http') return;
    const rows = await this.db.notificationDelivery.findMany({ where: { channel: 'PUSH', status: 'PENDING' }, take: 100 });
    for (const row of rows) {
      try {
        const res = await fetch(this.config.PUSH_HTTP_URL, {
          method: 'POST',
          signal: AbortSignal.timeout(8000),
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${this.config.PUSH_HTTP_TOKEN}`, 'Idempotency-Key': row.id },
          body: JSON.stringify({ user_id: row.userId, event: row.payload }),
        });
        if (!res.ok) throw new Error();
        await this.db.notificationDelivery.update({ where: { id: row.id }, data: { status: 'SENT', sentAt: new Date() } });
      } catch {
        /* Durable PENDING delivery remains available to the next worker pass. */
      }
    }
  }

  async flushEmails(limit = 20) {
    if (!this.email) return 0;
    let processed = 0;
    for (let n = 0; n < limit; n++) {
      const row = await this.db.atomic(async tx => {
        const rows = await tx.$queryRaw<{ id: string }[]>`SELECT id FROM "NotificationDelivery" WHERE channel='EMAIL' AND status='PENDING' AND "availableAt"<=now() AND ("leaseUntil" IS NULL OR "leaseUntil"<=now()) ORDER BY "availableAt" FOR UPDATE SKIP LOCKED LIMIT 1`;
        return rows.length
          ? tx.notificationDelivery.update({ where: { id: rows[0].id }, data: { leaseUntil: new Date(Date.now() + 60000), attempts: { increment: 1 } } })
          : null;
      });
      if (!row) break;
      const payload = (row.payload ?? {}) as Record<string, any>;
      try {
        const targetUser = await this.db.user.findUnique({ where: { id: row.userId }, select: { email: true, login: true, name: true, status: true, kind: true } });
        const emailAddr = targetUser && targetUser.status === 'ACTIVE' && targetUser.kind === 'SUPERADMIN'
          ? (targetUser.email ?? (targetUser.login?.includes('@') ? targetUser.login : null) ?? payload.recipient_email)
          : null;
        if (!emailAddr) {
          await this.db.notificationDelivery.update({ where: { id: row.id }, data: { status: 'CANCELLED', leaseUntil: null } });
          continue;
        }
        const status = await this.email.sendAdminAlert({
          id: row.id,
          email: String(emailAddr),
          recipientName: targetUser?.name ?? payload.recipient_name,
          topic: String(payload.topic || ''),
          payload,
          failOnError: this.config.NODE_ENV === 'production',
        });
        await this.db.notificationDelivery.update({
          where: { id: row.id },
          data: {
            status,
            sentAt: status === 'SENT' ? new Date() : null,
            leaseUntil: null,
            lastError: status === 'SKIPPED' ? 'EMAIL_NOT_CONFIGURED' : null,
          },
        });
        if (status === 'SENT') processed++;
      } catch {
        const delay = Math.min(900, 2 ** Math.min(row.attempts, 10));
        await this.db.notificationDelivery.update({
          where: { id: row.id },
          data: {
            status: row.attempts >= 12 ? 'FAILED' : 'PENDING',
            availableAt: new Date(Date.now() + delay * 1000),
            leaseUntil: null,
            lastError: 'EMAIL_DELIVERY_FAILED',
          },
        });
      }
    }
    return processed;
  }

  async tick() {
    const ids = await this.claim();
    for (const id of ids) {
      try {
        await this.process(id);
      } catch {
        /* A persisted retry is scheduled by process. */
      }
    }
    await this.push();
    await this.flushEmails();
    return ids.length;
  }
}
