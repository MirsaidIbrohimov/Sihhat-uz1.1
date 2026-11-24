import { Inject, Injectable, OnModuleInit, Optional } from '@nestjs/common';
import { Db, lock, type Tx } from '../common/db';
import { CONFIG, type Config } from '../common/config';
import { AUTO_SUPERADMIN_TOPICS, isAdminEmailTopic } from '../common/admin-alerts';
import { EmailService } from '../auth/email';
import { FcmService, isUrgentPushTopic, resolveNotificationRoute, type PushNotificationInput } from './fcm.service';

const TOPIC_DEFAULT_TITLES: Record<string, string> = {
  'payment.succeeded': 'To‘lov tasdiqlandi',
  'booking.created': 'Yangi bron yaratildi',
  'booking.confirmed': 'Bron tasdiqlandi',
  'booking.checked_in': 'Joylashish qayd etildi',
  'booking.checked_out': 'Yashash yakunlandi',
  'booking.cancelled': 'Bron bekor qilindi',
  'booking.no_show': 'Mehmon kelmadi',
  'payment.exception': 'To‘lovni tekshirish kerak',
  'refund.requested': 'Pul qaytarish so‘rovi',
  'refund.succeeded': 'Pul mablag‘i qaytarildi',
  'message.created': 'Yangi e’lon va xabar',
  'support.opened': 'Yangi murojaat ochildi',
  'support.replied': 'Yordam xizmatidan javob',
  'support.assigned': 'Sizga yordam murojaati biriktirildi',
  'sanatorium.submitted': 'Sanatoriya anketasi yuborildi',
  'sanatorium.moderated': 'Sanatoriya anketasi ko‘rib chiqildi',
  'staff.invited': 'Yangi xodim taklifi',
  'task.assigned': 'Yangi vazifa biriktirildi',
  'survey.created': 'Yangi so‘rovnoma yuborildi',
  'ad.requested': 'Yangi reklama arizasi',
  'ad.moderated': 'Reklama holati yangilandi',
  'subscription.status_changed': 'Obuna holati o‘zgardi',
  'bank.change_requested': 'Bank rekvizitlari so‘rovi',
  'partner.password_reset_requested': 'Parolni tiklash so‘rovi',
  'partner.registration_submitted': 'Yangi sanatoriya hamkor arizasi',
  'partner.registration_approved': 'Hamkor hisobingiz tasdiqlandi',
  'auth.bruteforce_alert': 'Xavfsizlik ogohlantirishi',
  'telegram.linked': 'Telegram bot ulandi',
  'app.update': 'Ilovaning yangi versiyasi chiqdi',
};

export const ENSURE_DEVICE_PUSH_TOKEN_SQL = [
  `CREATE TABLE IF NOT EXISTS "DevicePushToken" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "token" TEXT NOT NULL,
    "platform" TEXT NOT NULL DEFAULT 'ANDROID',
    "deviceId" TEXT,
    "deviceLabel" TEXT,
    "appVersion" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "invalidatedAt" TIMESTAMP(3),
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "DevicePushToken_pkey" PRIMARY KEY ("id")
  )`,
  'CREATE UNIQUE INDEX IF NOT EXISTS "DevicePushToken_token_key" ON "DevicePushToken"("token")',
  'CREATE INDEX IF NOT EXISTS "DevicePushToken_userId_active_idx" ON "DevicePushToken"("userId", "active")',
  'CREATE INDEX IF NOT EXISTS "DevicePushToken_userId_deviceId_idx" ON "DevicePushToken"("userId", "deviceId")',
];

@Injectable()
export class OutboxService implements OnModuleInit {
  constructor(
    @Inject(Db) readonly db: Db,
    @Inject(CONFIG) readonly config: Config,
    @Optional() @Inject(EmailService) readonly email?: EmailService,
    @Optional() @Inject(FcmService) readonly fcm?: FcmService,
  ) {}

  async onModuleInit() {
    if (typeof (this.db as unknown as { $executeRawUnsafe?: unknown })?.$executeRawUnsafe !== 'function') return;
    for (const stmt of ENSURE_DEVICE_PUSH_TOKEN_SQL) {
      await this.db.$executeRawUnsafe(stmt).catch(() => undefined);
    }
  }

  private async buildPushPayload(tx: Tx, topic: string, payload: Record<string, any>) {
    let title = typeof payload.title === 'string' && payload.title.trim() ? payload.title.trim() : '';
    let body = typeof payload.body === 'string' && payload.body.trim()
      ? payload.body.trim()
      : (typeof payload.text === 'string' && payload.text.trim() ? payload.text.trim() : '');
    let bookingReference: string | null = null;
    let sanatoriumName: string | null = typeof payload.sanatorium_name === 'string' ? payload.sanatorium_name : null;

    if (typeof payload.booking_id === 'string' && payload.booking_id) {
      const booking = await tx.booking.findUnique({
        where: { id: payload.booking_id },
        select: { reference: true, sanatoriumId: true, checkIn: true, checkOut: true, amount: true },
      });
      if (booking) {
        bookingReference = booking.reference;
        if (!sanatoriumName && booking.sanatoriumId) {
          const san = await tx.sanatorium.findUnique({ where: { id: booking.sanatoriumId }, select: { name: true } });
          sanatoriumName = san?.name ?? null;
        }
        if (!title) {
          const base = TOPIC_DEFAULT_TITLES[topic] || 'Bron yangilanishi';
          title = `${base} (#${booking.reference})`;
        }
        if (!body) {
          const checkIn = booking.checkIn.toISOString().slice(0, 10);
          const checkOut = booking.checkOut.toISOString().slice(0, 10);
          body = `${sanatoriumName ? `${sanatoriumName} — ` : ''}#${booking.reference} (${checkIn} – ${checkOut})`;
        }
      }
    }

    if (topic === 'message.created') {
      if (title) {
        title = payload.kind === 'WARNING' ? `Muhim e’lon: ${title}` : title;
      } else {
        title = TOPIC_DEFAULT_TITLES[topic];
      }
    } else if (topic === 'support.replied' || topic === 'support.opened' || topic === 'support.assigned') {
      const subject = title || 'Yordam xizmati';
      title = topic === 'support.replied'
        ? `Yangi javob: ${subject}`
        : topic === 'support.assigned'
          ? `Sizga murojaat biriktirildi: ${subject}`
          : `Yangi murojaat: ${subject}`;
    }

    if (!title) title = TOPIC_DEFAULT_TITLES[topic] || 'Sihhat.uz yangilanishi';
    if (!body) body = typeof payload.summary === 'string' && payload.summary.trim() ? payload.summary.trim() : 'Batafsil ma’lumotni ilovada ko‘ring.';

    const urgent = isUrgentPushTopic(topic, payload);
    const route = resolveNotificationRoute(topic, payload);

    return {
      topic,
      title,
      body,
      route,
      urgent,
      kind: typeof payload.kind === 'string' ? payload.kind : null,
      booking_id: typeof payload.booking_id === 'string' ? payload.booking_id : null,
      booking_reference: bookingReference,
      ticket_id: typeof payload.ticket_id === 'string' ? payload.ticket_id : null,
      message_id: typeof payload.message_id === 'string' ? payload.message_id : null,
      download_url: typeof payload.download_url === 'string' ? payload.download_url : null,
    };
  }

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

        const uniqueRecipientIds = [...new Set(ids)];
        const fcmActive = Boolean(this.fcm?.enabled);
        const httpPushActive = this.config.PUSH_ADAPTER === 'http';
        let pushPayloadCache: Record<string, any> | null = null;
        let usersWithPushTokens: Set<string> | null = null;

        if (fcmActive && uniqueRecipientIds.length && (tx as any).devicePushToken?.findMany) {
          const tokenUsers = await tx.devicePushToken.findMany({
            where: { userId: { in: uniqueRecipientIds }, active: true },
            select: { userId: true },
            distinct: ['userId'],
          });
          usersWithPushTokens = new Set(tokenUsers.map(t => t.userId));
        }

        for (const userId of uniqueRecipientIds) {
          const exists = await tx.user.findUnique({ where: { id: userId } });
          if (!exists) continue;
          await tx.notificationDelivery.upsert({
            where: { eventId_userId_channel: { eventId: event.id, userId, channel: 'IN_APP' } },
            create: { eventId: event.id, userId, channel: 'IN_APP', payload: { topic: event.topic, ...payload }, status: 'SENT', sentAt: new Date() },
            update: {},
          });
          const shouldQueuePush =
            (fcmActive && exists.status === 'ACTIVE' && Boolean(usersWithPushTokens?.has(userId))) ||
            (httpPushActive && exists.kind === 'CUSTOMER');
          if (shouldQueuePush) {
            pushPayloadCache ??= await this.buildPushPayload(tx, event.topic, payload);
            await tx.notificationDelivery.upsert({
              where: { eventId_userId_channel: { eventId: event.id, userId, channel: 'PUSH' } },
              create: { eventId: event.id, userId, channel: 'PUSH', payload: pushPayloadCache },
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

  async push(limit = 50) {
    if (this.fcm?.enabled) {
      return this.flushFcm(limit);
    }
    if (this.config.PUSH_ADAPTER !== 'http') return 0;
    let sent = 0;
    const rows = await this.db.notificationDelivery.findMany({ where: { channel: 'PUSH', status: 'PENDING' }, take: limit });
    for (const row of rows) {
      try {
        const res = await fetch(this.config.PUSH_HTTP_URL, {
          method: 'POST',
          signal: AbortSignal.timeout(8000),
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${this.config.PUSH_HTTP_TOKEN}`, 'Idempotency-Key': row.id },
          body: JSON.stringify({ user_id: row.userId, event: row.payload }),
        });
        if (!res.ok) throw new Error();
        await this.db.notificationDelivery.update({ where: { id: row.id }, data: { status: 'SENT', sentAt: new Date(), lastError: null } });
        sent++;
      } catch {
        /* Durable PENDING delivery remains available to the next worker pass. */
      }
    }
    return sent;
  }

  private async flushFcm(limit = 50): Promise<number> {
    if (!this.fcm?.enabled) return 0;
    let processed = 0;
    for (let n = 0; n < limit; n++) {
      const row = await this.db.atomic(async tx => {
        const rows = await tx.$queryRaw<{ id: string }[]>`SELECT id FROM "NotificationDelivery" WHERE channel='PUSH' AND status='PENDING' AND "availableAt"<=now() AND ("leaseUntil" IS NULL OR "leaseUntil"<=now()) ORDER BY "availableAt" FOR UPDATE SKIP LOCKED LIMIT 1`;
        return rows.length
          ? tx.notificationDelivery.update({
              where: { id: rows[0].id },
              data: { leaseUntil: new Date(Date.now() + 60000), attempts: { increment: 1 } },
            })
          : null;
      });
      if (!row) break;

      const tokens = await this.db.devicePushToken.findMany({
        where: { userId: row.userId, active: true },
        orderBy: { lastSeenAt: 'desc' },
        take: 25,
      });

      if (!tokens.length) {
        await this.db.notificationDelivery.update({
          where: { id: row.id },
          data: { status: 'SKIPPED', leaseUntil: null, lastError: 'NO_ACTIVE_TOKENS' },
        });
        continue;
      }

      const p = (row.payload ?? {}) as Record<string, any>;
      const messageInput: PushNotificationInput = {
        notificationId: row.id,
        topic: String(p.topic || 'notification'),
        title: String(p.title || TOPIC_DEFAULT_TITLES[String(p.topic || '')] || 'Sihhat.uz'),
        body: String(p.body || p.summary || 'Sizda yangi bildirishnoma bor.'),
        kind: typeof p.kind === 'string' ? p.kind : null,
        bookingId: typeof p.booking_id === 'string' ? p.booking_id : null,
        ticketId: typeof p.ticket_id === 'string' ? p.ticket_id : null,
        messageId: typeof p.message_id === 'string' ? p.message_id : null,
        downloadUrl: typeof p.download_url === 'string' ? p.download_url : null,
        route: typeof p.route === 'string' ? p.route : null,
        urgent: typeof p.urgent === 'boolean' ? p.urgent : undefined,
      };

      let sentCount = 0;
      let invalidCount = 0;
      let retryableFailure = false;
      let lastError: string | null = null;

      for (const device of tokens) {
        const res = await this.fcm.sendToToken(device.token, messageInput);
        if (res.ok) {
          sentCount++;
          await this.db.devicePushToken.update({
            where: { id: device.id },
            data: { lastError: null },
          }).catch(() => undefined);
        } else if (res.invalidToken) {
          invalidCount++;
          lastError = res.errorCode ?? 'INVALID_TOKEN';
          await this.db.devicePushToken.update({
            where: { id: device.id },
            data: { active: false, invalidatedAt: new Date(), lastError },
          }).catch(() => undefined);
        } else {
          lastError = res.errorCode ?? 'FCM_SEND_FAILED';
          if (res.retryable) retryableFailure = true;
          await this.db.devicePushToken.update({
            where: { id: device.id },
            data: { lastError },
          }).catch(() => undefined);
        }
      }

      if (sentCount > 0) {
        await this.db.notificationDelivery.update({
          where: { id: row.id },
          data: { status: 'SENT', sentAt: new Date(), leaseUntil: null, lastError: null },
        });
        processed++;
      } else if (invalidCount === tokens.length) {
        await this.db.notificationDelivery.update({
          where: { id: row.id },
          data: { status: 'SKIPPED', leaseUntil: null, lastError: lastError ?? 'ALL_TOKENS_INVALID' },
        });
      } else {
        const exhausted = !retryableFailure || row.attempts >= 8;
        const delay = Math.min(900, 2 ** Math.min(row.attempts, 9));
        await this.db.notificationDelivery.update({
          where: { id: row.id },
          data: {
            status: exhausted ? 'FAILED' : 'PENDING',
            availableAt: new Date(Date.now() + delay * 1000),
            leaseUntil: null,
            lastError: lastError ?? 'FCM_DELIVERY_FAILED',
          },
        });
      }
    }
    return processed;
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
