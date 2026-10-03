import { Inject, Injectable } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { CONFIG, type Config } from "../common/config";
import { Db, audit, bodyHash, emit, lock, type Tx } from "../common/db";
import { decrypt, encrypt } from "../common/crypto";
import { fail, parse, uuid } from "../common/errors";
import { type Actor, requirePlatform, scope } from "../auth/permissions";
import { PaymentService, financialLock } from "./payment.service";
import {
  TezcheckClient,
  TezcheckError,
  type TezStatus,
} from "./tezcheck.client";
import type { TezcheckBill } from "../generated/prisma/client";

const terminal = ["CANCELLED", "TEST"];
const capabilities = {
  full_refund: false,
  partial_refund: false,
  automatic_refund: false,
};

@Injectable()
export class TezcheckService {
  constructor(
    @Inject(Db) readonly db: Db,
    @Inject(CONFIG) readonly config: Config,
    @Inject(TezcheckClient) readonly client: TezcheckClient,
    @Inject(PaymentService) readonly payments: PaymentService,
  ) {}

  async checkout(
    actor: Actor,
    id: string,
    key: string | undefined,
    invoice = false,
  ) {
    parse(uuid, id);
    if (this.config.PAYMENT_MODE !== "tezcheck")
      fail("PAYMENT_UNAVAILABLE", "Tezcheck checkout yoqilmagan.", 503);
    if (invoice) {
      const current = await this.db.invoice.findUnique({ where: { id } });
      if (!current) fail("NOT_FOUND", "Hisob topilmadi.", 404);
      scope(actor, current.sanatoriumId, "invoices.pay");
    }
    const result = await this.db.idempotent(
      actor.id,
      invoice ? "tezcheck.invoice.checkout" : "tezcheck.booking.checkout",
      key,
      { id },
      async (tx) => {
        if (invoice) {
          const item = await tx.invoice.findUnique({ where: { id } });
          if (!item) fail("NOT_FOUND", "Hisob topilmadi.", 404);
          scope(actor, item.sanatoriumId, "invoices.pay");
          await financialLock(tx, item.sanatoriumId);
          if (
            (await tx.invoice.findUniqueOrThrow({ where: { id } })).status !==
            "UNPAID"
          )
            fail("PAYMENT_UNAVAILABLE", "Hisob allaqachon to‘langan.");
          const order = await tx.paymentOrder.upsert({
            where: { invoiceId: id },
            create: {
              invoiceId: id,
              sanatoriumId: item.sanatoriumId,
              userId: actor.id,
              purpose: item.purpose,
              amount: item.amount,
            },
            update: {},
          });
          return { order_id: order.id };
        }
        const booking = await tx.booking.findUnique({ where: { id } });
        if (!booking || booking.userId !== actor.id)
          fail("NOT_FOUND", "Bron topilmadi.", 404);
        await financialLock(tx, booking.sanatoriumId);
        const current = await tx.booking.findUniqueOrThrow({ where: { id } });
        if (
          !["HOLD", "PAYMENT_PENDING"].includes(current.status) ||
          (current.status === "HOLD" && current.holdExpiresAt! <= new Date())
        )
          fail("PAYMENT_UNAVAILABLE", "Bronning to‘lov muddati tugagan.");
        const order = await tx.paymentOrder.upsert({
          where: { bookingId: id },
          create: {
            bookingId: id,
            sanatoriumId: booking.sanatoriumId,
            userId: actor.id,
            purpose: "BOOKING",
            amount: booking.amount,
          },
          update: {},
        });
        return { order_id: order.id };
      },
    );
    const order = await this.db.paymentOrder.findUniqueOrThrow({
      where: { id: result.order_id },
    });
    if (!["CREATED", "PENDING"].includes(order.status))
      fail("PAYMENT_UNAVAILABLE", "To‘lov allaqachon yakunlangan.");
    let record = await this.db.tezcheckBill.findUnique({
      where: { orderId: order.id },
    });
    if (!record) {
      const desk = await this.client.readyDesk(); // A draft/suspended desk must not consume a booking hold.
      record = await this.db.atomic(async (tx) => {
        await financialLock(tx, order.sanatoriumId);
        await lock(tx, `tezcheck:order:${order.id}`);
        const existing = await tx.tezcheckBill.findUnique({
          where: { orderId: order.id },
        });
        if (existing) return existing;
        const current = await tx.paymentOrder.findUniqueOrThrow({
          where: { id: order.id },
        });
        if (
          !["CREATED", "PENDING"].includes(current.status) ||
          (await tx.providerTransaction.findFirst({
            where: { orderId: order.id, state: { in: [1, 2] } },
          }))
        )
          fail("PAYMENT_UNAVAILABLE", "Buyurtmada boshqa to‘lov mavjud.");
        const expiresAt = new Date(
          Date.now() + this.config.TEZCHECK_HOLD_MINUTES * 60000,
        );
        if (order.bookingId) {
          const booking = await tx.booking.findUniqueOrThrow({
            where: { id: order.bookingId },
          });
          if (booking.status !== "HOLD" || booking.holdExpiresAt! <= new Date())
            fail("PAYMENT_UNAVAILABLE", "Bronning to‘lov muddati tugagan.");
          await tx.booking.update({
            where: { id: booking.id },
            data: {
              status: "PAYMENT_PENDING",
              providerExpiresAt: expiresAt,
              version: { increment: 1 },
            },
          });
          await tx.roomAllocation.updateMany({
            where: { bookingId: booking.id, active: true },
            data: { kind: "PAYMENT_PENDING" },
          });
          await tx.bookingEvent.create({
            data: { bookingId: booking.id, status: "PAYMENT_PENDING" },
          });
        }
        await tx.paymentOrder.update({
          where: { id: order.id },
          data: { status: "PENDING" },
        });
        return tx.tezcheckBill.create({
          data: { orderId: order.id, cashDeskCode: desk, expiresAt },
        });
      });
    }
    if (terminal.includes(record.state) || record.state === "PAID")
      fail("PAYMENT_UNAVAILABLE", "To‘lov allaqachon yakunlangan.");
    if (!record.billId || !record.encryptedUrl) await this.process(record.id);
    record = await this.db.tezcheckBill.findUniqueOrThrow({
      where: { id: record.id },
    });
    if (
      !record.encryptedUrl ||
      record.state !== "ACTIVE" ||
      record.expiresAt <= new Date()
    )
      fail(
        "PAYMENT_PENDING",
        "To‘lov havolasi tekshirilmoqda. Bir ozdan keyin qayta urinib ko‘ring.",
        503,
      );
    return {
      order_id: order.id,
      amount: order.amount.toString(),
      mode: "tezcheck",
      checkout_url: decrypt(
        record.encryptedUrl,
        this.config.MFA_ENCRYPTION_KEY,
      ),
      expires_at: record.expiresAt,
      capabilities,
    };
  }

  private async claim(id: string) {
    const token = randomUUID(),
      now = new Date();
    const claimed = await this.db.tezcheckBill.updateMany({
      where: {
        id,
        state: { notIn: terminal },
        OR: [{ leasedUntil: null }, { leasedUntil: { lte: now } }],
      },
      data: { leasedUntil: new Date(Date.now() + 45000), leaseToken: token },
    });
    return claimed.count
      ? {
          record: await this.db.tezcheckBill.findUniqueOrThrow({
            where: { id },
          }),
          token,
        }
      : null;
  }
  private async withLease<T>(
    record: TezcheckBill,
    token: string,
    operation: (tx: Tx) => Promise<T>,
  ) {
    return this.db.atomic(async (tx) => {
      const order = await tx.paymentOrder.findUniqueOrThrow({
        where: { id: record.orderId },
      });
      await financialLock(tx, order.sanatoriumId);
      await lock(tx, `tezcheck:order:${record.orderId}`);
      const current = await tx.tezcheckBill.findUniqueOrThrow({
        where: { id: record.id },
      });
      if (current.leaseToken !== token) return;
      return operation(tx);
    });
  }

  async process(id: string) {
    const claimed = await this.claim(id);
    if (!claimed) return;
    let { record } = claimed;
    const { token } = claimed;
    try {
      const order = await this.db.paymentOrder.findUniqueOrThrow({
        where: { id: record.orderId },
      });
      if (!record.billId) {
        // Tezcheck remembers successful create keys for 24 hours; never replay a lost creation beyond it.
        if (record.createdAt.getTime() < Date.now() - 23 * 3600000)
          throw new TezcheckError("creation_requires_reconciliation");
        const created = await this.client.create(order, record.cashDeskCode);
        if (
          created.bill.external_reference !== order.id ||
          BigInt(created.bill.amount_minor) !== order.amount
        )
          throw new TezcheckError("bill_mismatch");
        const url = this.client.checkoutUrl(created.payment_url);
        const providerExpiry = Date.parse(created.bill.available_until ?? "");
        await this.withLease(record, token, (tx) =>
          tx.tezcheckBill.update({
            where: { id },
            data: {
              billId: created.bill.id,
              encryptedUrl: encrypt(url, this.config.MFA_ENCRYPTION_KEY),
              state: "ACTIVE",
              ...(Number.isFinite(providerExpiry) &&
              providerExpiry < record.expiresAt.getTime()
                ? { expiresAt: new Date(providerExpiry) }
                : {}),
            },
          }),
        );
        record = await this.db.tezcheckBill.findUniqueOrThrow({
          where: { id },
        });
        if (record.leaseToken !== token) return;
      }
      const status = await this.client.status(
        record.billId!,
        record.cashDeskCode,
      );
      if (
        status.bill.id !== record.billId ||
        status.bill.external_reference !== order.id ||
        BigInt(status.bill.amount_minor) !== order.amount
      )
        throw new TezcheckError("bill_mismatch");
      if (
        status.payment &&
        BigInt(status.payment.amount_minor) !== order.amount
      )
        throw new TezcheckError("amount_mismatch");
      if (order.status === "SUCCEEDED" && !status.bill.paid)
        throw new TezcheckError("payment_requires_reconciliation");
      if (status.bill.paid) {
        if (!status.payment) throw new TezcheckError("payment_missing");
        if (
          status.bill.environment === "test" &&
          status.payment.environment === "test" &&
          !status.bill.livemode &&
          !status.payment.livemode
        ) {
          await this.withLease(record, token, async (tx) => {
            await this.release(tx, record, "Sinov to‘lovi haqiqiy pul emas");
            await tx.tezcheckBill.update({
              where: { id },
              data: {
                state: "TEST",
                encryptedUrl: null,
                lastError: "test_payment_ignored",
              },
            });
          });
        } else {
          if (
            !status.bill.livemode ||
            !status.payment.livemode ||
            status.bill.environment !== "live" ||
            status.payment.environment !== "live"
          )
            throw new TezcheckError("environment_mismatch");
          await this.withLease(record, token, (tx) =>
            this.settle(tx, record, status),
          );
        }
      } else if (
        !status.payment?.problem?.unknown_reason &&
        !["processing", "requires_action"].includes(
          status.payment?.state ?? "",
        ) &&
        (record.expiresAt <= new Date() ||
          ["revoked", "expired"].includes(status.bill.state))
      ) {
        // Cancellation is not a refund. A 409 or unknown result keeps inventory reserved for reconciliation.
        const cancelled = await this.client.cancel(
          record.billId!,
          record.cashDeskCode,
        );
        if (
          cancelled.bill.id !== record.billId ||
          cancelled.bill.external_reference !== order.id ||
          BigInt(cancelled.bill.amount_minor) !== order.amount
        )
          throw new TezcheckError("cancel_mismatch");
        await this.withLease(record, token, async (tx) => {
          await this.release(
            tx,
            record,
            "Tezcheck to‘lanmagan hisob bekor qilinganini tasdiqladi",
          );
          await tx.tezcheckBill.update({
            where: { id },
            data: { state: "CANCELLED", encryptedUrl: null },
          });
        });
      }
      await this.db.tezcheckBill.updateMany({
        where: { id, leaseToken: token },
        data: {
          lastCheckedAt: new Date(),
          nextPollAt: new Date(
            Date.now() +
              (status.bill.paid && status.bill.environment === "live"
                ? 3600000
                : 60000),
          ),
          lastError:
            status.bill.environment === "test" && status.bill.paid
              ? "test_payment_ignored"
              : null,
        },
      });
    } catch (error) {
      const code =
        error instanceof TezcheckError
          ? error.code
          : "invalid_response_or_processing_failed";
      const review = [
        "bill_mismatch",
        "amount_mismatch",
        "payment_missing",
        "environment_mismatch",
        "payment_requires_reconciliation",
        "duplicate_payment_requires_reconciliation",
        "payment_mismatch",
        "fee_mismatch",
        "already_settled",
        "creation_requires_reconciliation",
        "unsafe_checkout_url",
      ].includes(code);
      await this.withLease(record, token, async (tx) => {
        const current = await tx.tezcheckBill.findUniqueOrThrow({
          where: { id },
        });
        await tx.tezcheckBill.update({
          where: { id },
          data: {
            lastError: code,
            lastCheckedAt: new Date(),
            nextPollAt: new Date(Date.now() + (review ? 300000 : 60000)),
            ...(review ? { state: "REVIEW" } : {}),
          },
        });
        if (review && current.lastError !== code) {
          const order = await tx.paymentOrder.findUniqueOrThrow({
            where: { id: record.orderId },
          });
          await audit(
            tx,
            null,
            "tezcheck.reconciliation_required",
            order.id,
            order.sanatoriumId,
            undefined,
            { code },
          );
          const admins = await tx.user.findMany({
            where: { kind: "SUPERADMIN", status: "ACTIVE" },
            select: { id: true },
          });
          await emit(tx, "payment.exception", {
            recipient_ids: admins.map((a) => a.id),
            order_id: order.id,
            booking_id: order.bookingId,
            reason: code,
          });
        }
      });
    } finally {
      await this.db.tezcheckBill.updateMany({
        where: { id, leaseToken: token },
        data: { leasedUntil: null, leaseToken: null },
      });
    }
  }

  private async settle(tx: Tx, record: TezcheckBill, status: TezStatus) {
    const payment = status.payment!,
      order = await tx.paymentOrder.findUniqueOrThrow({
        where: { id: record.orderId },
      });
    if (
      payment.state !== "succeeded" ||
      payment.refunded_amount_minor !== 0 ||
      payment.fee_minor + payment.net_minor !== payment.amount_minor
    )
      throw new TezcheckError("payment_requires_reconciliation");
    await lock(tx, `provider:TEZCHECK:${payment.id}`);
    const prior = await tx.providerTransaction.findUnique({
      where: {
        provider_providerId: { provider: "TEZCHECK", providerId: payment.id },
      },
    });
    if (prior && (prior.orderId !== order.id || prior.amount !== order.amount))
      throw new TezcheckError("payment_mismatch");
    if (
      prior &&
      Number((prior.fiscalData as any)?.fee_minor) !== payment.fee_minor
    )
      throw new TezcheckError("fee_mismatch");
    const conflicting = await tx.providerTransaction.findFirst({
      where: {
        orderId: order.id,
        state: { in: [1, 2] },
        NOT: { provider: "TEZCHECK", providerId: payment.id },
      },
    });
    if (conflicting)
      throw new TezcheckError("duplicate_payment_requires_reconciliation");
    if (!prior)
      await tx.providerTransaction.create({
        data: {
          provider: "TEZCHECK",
          providerId: payment.id,
          orderId: order.id,
          amount: order.amount,
          providerTime: BigInt(Date.now()),
          createTime: BigInt(Date.now()),
          fiscalData: {
            fee_minor: payment.fee_minor,
            net_minor: payment.net_minor,
            environment: "live",
          },
        },
      });
    await this.payments.perform(
      tx,
      payment.id,
      "TEZCHECK",
      BigInt(payment.fee_minor),
    );
    await tx.tezcheckBill.update({
      where: { id: record.id },
      data: { state: "PAID", encryptedUrl: null },
    });
  }
  private async release(tx: Tx, record: TezcheckBill, reason: string) {
    const order = await tx.paymentOrder.findUniqueOrThrow({
      where: { id: record.orderId },
    });
    if (order.status === "SUCCEEDED")
      throw new TezcheckError("already_settled");
    await tx.paymentOrder.update({
      where: { id: order.id },
      data: { status: "CANCELLED" },
    });
    if (order.bookingId) {
      const booking = await tx.booking.findUniqueOrThrow({
        where: { id: order.bookingId },
      });
      if (["HOLD", "PAYMENT_PENDING"].includes(booking.status)) {
        await tx.booking.update({
          where: { id: booking.id },
          data: { status: "EXPIRED", version: { increment: 1 } },
        });
        await tx.roomAllocation.updateMany({
          where: { bookingId: booking.id, active: true },
          data: { active: false },
        });
        await tx.bookingEvent.create({
          data: { bookingId: booking.id, status: "EXPIRED", reason },
        });
      }
    }
    await audit(
      tx,
      null,
      "tezcheck.unpaid_closed",
      order.id,
      order.sanatoriumId,
      undefined,
      { reason },
    );
  }

  async refresh(actor: Actor, id: string) {
    parse(uuid, id);
    const order = await this.db.paymentOrder.findUnique({ where: { id } });
    if (!order || order.userId !== actor.id)
      fail("NOT_FOUND", "To‘lov topilmadi.", 404);
    const record = await this.db.tezcheckBill.findUnique({
      where: { orderId: id },
    });
    if (record && record.nextPollAt <= new Date())
      await this.process(record.id);
    const current = await this.db.paymentOrder.findUniqueOrThrow({
      where: { id },
    });
    return {
      order_id: id,
      status: current.status,
      amount: current.amount.toString(),
    };
  }
  async tick() {
    if (!this.config.TEZCHECK_API_KEY) return;
    const records = await this.db.tezcheckBill.findMany({
      where: { state: { notIn: terminal }, nextPollAt: { lte: new Date() } },
      orderBy: { nextPollAt: "asc" },
      take: 40,
      select: { id: true },
    });
    for (const record of records) await this.process(record.id);
  }
  async webhook(
    raw: Buffer,
    timestamp?: string,
    delivery?: string,
    signature?: string,
  ) {
    this.client.verifyWebhook(raw, timestamp, delivery, signature);
    let decoded: unknown;
    try {
      decoded = JSON.parse(raw.toString("utf8"));
    } catch {
      fail("WEBHOOK_INVALID", "Webhook JSON noto‘g‘ri.", 400);
    }
    const event = parse(
      z.object({
        id: z.string().regex(/^oev_[A-Za-z0-9_-]{1,120}$/),
        schema_version: z.literal(1),
        type: z.string().regex(/^payment\.[a-z_]{1,40}$/),
        data: z.object({
          bill_id: z.string().regex(/^link_[A-Za-z0-9_-]{1,120}$/),
          external_reference: z.string().nullable(),
        }),
      }),
      decoded,
    );
    return this.db.atomic(async (tx) => {
      await lock(tx, `tezcheck:event:${event.id}`);
      const digest = bodyHash(decoded),
        existing = await tx.tezcheckWebhook.findUnique({
          where: { eventId: event.id },
        });
      if (existing) {
        if (existing.payloadHash !== digest)
          fail("WEBHOOK_INVALID", "Hodisa ma’lumoti o‘zgargan.", 400);
        return { received: true };
      }
      await tx.tezcheckWebhook.create({
        data: {
          eventId: event.id,
          billId: event.data.bill_id,
          payloadHash: digest,
        },
      });
      // Only the signed server-to-server status read can change ledger/inventory. Webhooks wake the durable poller.
      await tx.tezcheckBill.updateMany({
        where: {
          billId: event.data.bill_id,
          orderId: event.data.external_reference ?? undefined,
          state: { notIn: terminal },
        },
        data: { nextPollAt: new Date() },
      });
      return { received: true };
    });
  }
  async overview(actor: Actor) {
    requirePlatform(actor, "reconciliation.manage");
    if (!this.config.TEZCHECK_API_KEY)
      return { configured: false, mode: this.config.PAYMENT_MODE };
    try {
      const desks = await this.client.desks();
      const selected =
        desks.find((d) => d.code === this.config.TEZCHECK_CASH_DESK_CODE) ??
        (!this.config.TEZCHECK_CASH_DESK_CODE && desks.length === 1
          ? desks[0]
          : undefined);
      const methods = selected
        ? (
            await this.client.request(
              "/payment-methods",
              {},
              { desk: selected.code },
            )
          ).data
        : [];
      return {
        configured: true,
        mode: this.config.PAYMENT_MODE,
        authenticated: true,
        desk_count: desks.length,
        state: selected?.state ?? "not_selected",
        accepts_payments: selected?.accepts_payments ?? false,
        currency: selected?.currency ?? "UZS",
        methods: z
          .array(
            z.object({
              provider_code: z.string().max(64),
              name: z.string().max(120),
              min_amount_minor: z.number().safe().nonnegative(),
              max_amount_minor: z
                .number()
                .safe()
                .nonnegative()
                .nullable()
                .optional(),
            }),
          )
          .parse(methods),
        pending: await this.db.tezcheckBill.count({
          where: { state: { in: ["CREATING", "ACTIVE", "REVIEW"] } },
        }),
        capabilities,
      };
    } catch (error) {
      return {
        configured: true,
        mode: this.config.PAYMENT_MODE,
        authenticated: false,
        error_code:
          error instanceof TezcheckError ? error.code : "invalid_response",
      };
    }
  }
}
