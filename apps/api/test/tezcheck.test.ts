import { after, afterEach, before, test } from "node:test";
import assert from "node:assert/strict";
import { createHash, createHmac, randomUUID } from "node:crypto";
import { setup } from "./helpers";
import { customer, sanatorium, quote, hold } from "./fixtures";
import { TezcheckService } from "../src/payments/tezcheck.service";
import { TezcheckClient } from "../src/payments/tezcheck.client";
import { CONFIG, type Config } from "../src/common/config";

let ctx: Awaited<ReturnType<typeof setup>>,
  config: Config,
  saved: Config,
  tez: TezcheckService;
let sequence = 0;
before(async () => {
  ctx = await setup();
  config = ctx.app.get(CONFIG);
  saved = { ...config };
  tez = ctx.app.get(TezcheckService);
});
afterEach(() => {
  Object.assign(config, saved);
  tez.client.fetcher = (...args) => fetch(...args);
});
after(async () => {
  await ctx?.app.close();
});

function fake() {
  Object.assign(config, {
    PAYMENT_MODE: "tezcheck",
    BOOKING_SETTLEMENT_MODE: "legacy_platform",
    TEZCHECK_API_KEY: "fake-tezcheck-key",
    TEZCHECK_CASH_DESK_CODE: "fake-desk",
    TEZCHECK_WEBHOOK_SECRET: "fake-webhook-secret",
  });
  const records = new Map<string, any>(),
    keys = new Map<string, any>();
  const state = {
    ready: true,
    calls: 0,
    creations: 0,
    cancels: 0,
    loseCreateResponse: false,
  };
  tez.client.fetcher = async (url, init) => {
    const path = new URL(String(url)).pathname.replace("/api/merchant/v1", "");
    const headers = init!.headers as Record<string, string>,
      raw = (init!.body as string) ?? "";
    assert.equal(headers.Authorization, "Bearer fake-tezcheck-key");
    assert.equal(init!.redirect, "error");
    assert.equal(
      headers["X-TezCheck-Signature"],
      "v1=" +
        createHmac("sha256", config.TEZCHECK_API_KEY)
          .update(
            `${headers["X-TezCheck-Timestamp"]}.${init!.method}.${new URL(String(url)).pathname}.${createHash("sha256").update(raw).digest("hex")}`,
          )
          .digest("hex"),
    );
    assert.ok(!raw.includes(config.TEZCHECK_API_KEY));
    if (path === "/cash-desks")
      return Response.json({
        data: [
          {
            code: "fake-desk",
            state: state.ready ? "active" : "draft",
            currency: "UZS",
            accepts_payments: state.ready,
          },
        ],
      });
    assert.equal(headers["X-Cash-Desk-Code"], "fake-desk");
    if (path === "/payment-methods")
      return Response.json({
        data: [
          {
            provider_code: "payme",
            name: "Payme",
            min_amount_minor: 100000,
            max_amount_minor: 5000000000,
          },
        ],
      });
    if (path === "/bills") {
      state.calls++;
      const key = headers["Idempotency-Key"];
      assert.ok(key);
      let value = keys.get(key);
      if (!value) {
        state.creations++;
        const input = JSON.parse(raw),
          id = "link_UPPER_" + randomUUID().replaceAll("-", "");
        const bill = {
          id,
          amount_minor: input.amount_minor,
          external_reference: input.external_reference,
          currency: "UZS",
          state: "active",
          available_until: new Date(Date.now() + 3600000).toISOString(),
          paid: false,
          livemode: false,
          environment: null,
        };
        value = {
          bill,
          payment_url: "https://tezcheck.uz/pay/fake-payer-token",
        };
        keys.set(key, value);
        records.set(id, { bill: { ...bill }, payment: null });
      }
      if (state.loseCreateResponse) {
        state.loseCreateResponse = false;
        throw new Error("simulated response loss");
      }
      return Response.json({ data: value });
    }
    const id = path.split("/")[2],
      record = records.get(id);
    assert.ok(record, path);
    if (path.endsWith("/cancel")) {
      state.cancels++;
      if (record.bill.paid || record.payment?.state === "processing")
        return Response.json(
          { error: { code: "resource.state_invalid" } },
          { status: 409 },
        );
      return Response.json({
        data: { cancelled: true, bill: { ...record.bill, state: "revoked" } },
      });
    }
    return Response.json({ data: record });
  };
  return {
    state,
    records,
    paid(id: string, environment = "live") {
      const record = records.get(id);
      assert.ok(record);
      Object.assign(record.bill, {
        paid: true,
        livemode: environment === "live",
        environment,
        state: "expired",
      });
      record.payment = {
        id: "pay_UPPER_" + randomUUID().replaceAll("-", ""),
        state: "succeeded",
        amount_minor: record.bill.amount_minor,
        fee_minor: 100,
        net_minor: record.bill.amount_minor - 100,
        refunded_amount_minor: 0,
        currency: "UZS",
        livemode: environment === "live",
        environment,
        succeeded_at: new Date().toISOString(),
        problem: null,
      };
      return record;
    },
  };
}
async function booking() {
  const user = await customer(ctx.base, ctx.auth),
    site = await sanatorium(ctx.admin);
  const date = new Date(Date.now() + (10 + ++sequence) * 86400000)
    .toISOString()
    .slice(0, 10);
  const end = new Date(Date.parse(date) + 86400000).toISOString().slice(0, 10);
  const result = await hold(user, await quote(user, site, date, end));
  assert.equal(result.status, 201);
  return { user, site, id: result.body.id };
}
async function checkout(user: any, id: string, key = user.key()) {
  const result = await user.call(
    `/customer/bookings/${id}/checkout`,
    "POST",
    {},
    key,
  );
  return {
    result,
    record: await ctx.db.tezcheckBill.findFirst({
      where: { orderId: result.body.order_id },
    }),
  };
}


test("Tezcheck: signed read works; draft desk rejects checkout without changing inventory", async () => {
  const provider = fake();
  provider.state.ready = false;
  const b = await booking();
  const result = await b.user.call(
    `/customer/bookings/${b.id}/checkout`,
    "POST",
    {},
    b.user.key(),
  );
  assert.equal(result.status, 503);
  assert.equal(result.body.code, "PAYMENT_NOT_READY");
  assert.equal(
    (await ctx.db.booking.findUniqueOrThrow({ where: { id: b.id } })).status,
    "HOLD",
  );
  assert.equal(await ctx.db.tezcheckBill.count(), 0);
  assert.equal(provider.state.creations, 0);
  const admin = await ctx.admin.call("/superadmin/integrations/tezcheck");
  assert.equal(admin.status, 200);
  assert.equal(admin.body.accepts_payments, false);
  assert.ok(!JSON.stringify(admin.body).includes("fake-tezcheck-key"));
  assert.ok(!JSON.stringify(admin.body).includes("fake-desk"));
  assert.equal(
    (await b.user.call("/superadmin/integrations/tezcheck")).status,
    403,
  );
  tez.client.fetcher = async () => {
    throw new Error("Simulated provider network failure");
  };
  const unavailable = await b.user.call(
    `/customer/bookings/${b.id}/checkout`,
    "POST",
    {},
    b.user.key(),
  );
  assert.equal(unavailable.status, 503);
  assert.equal(unavailable.body.code, "PAYMENT_UNAVAILABLE");
  assert.equal(
    (await ctx.db.booking.findUniqueOrThrow({ where: { id: b.id } })).status,
    "HOLD",
  );
  assert.equal(await ctx.db.tezcheckBill.count(), 0);
});

test("Tezcheck: retries reuse one encrypted link; live expired-but-paid bill confirms exactly once with net and fee ledger", async () => {
  const provider = fake(),
    b = await booking(),
    key = b.user.key();
  const first = await checkout(b.user, b.id, key);
  assert.equal(first.result.status, 201);
  const again = await checkout(b.user, b.id, key);
  assert.equal(again.result.body.checkout_url, first.result.body.checkout_url);
  const otherKey = await checkout(b.user, b.id);
  assert.equal(otherKey.result.body.order_id, first.result.body.order_id);
  assert.equal(provider.state.creations, 1);
  assert.ok(
    first.record?.encryptedUrl &&
      !first.record.encryptedUrl.includes("fake-payer-token"),
  );
  const idem = await ctx.db.idempotencyRecord.findMany({
    where: { action: "tezcheck.booking.checkout" },
  });
  assert.ok(!JSON.stringify(idem).includes("fake-payer-token"));
  provider.paid(first.record!.billId!);
  await Promise.all([
    tez.process(first.record!.id),
    tez.process(first.record!.id),
  ]);
  await tez.process(first.record!.id);
  const order = await ctx.db.paymentOrder.findUniqueOrThrow({
    where: { id: first.result.body.order_id },
  });
  assert.equal(order.status, "SUCCEEDED");
  assert.equal(
    (await ctx.db.booking.findUniqueOrThrow({ where: { id: b.id } })).status,
    "CONFIRMED",
  );
  const transaction = await ctx.db.providerTransaction.findFirstOrThrow({
    where: { orderId: order.id },
  });
  assert.equal(transaction.provider, "TEZCHECK");
  const journal = await ctx.db.ledgerJournal.findUniqueOrThrow({
    where: { source: `payment:${transaction.id}` },
  });
  const lines = await ctx.db.ledgerLine.findMany({
    where: { journalId: journal.id },
  });
  assert.equal(
    lines.find((l) => l.account === "PSP_CLEARING")!.debit,
    order.amount - 100n,
  );
  assert.equal(
    lines.find((l) => l.account === "PROCESSING_EXPENSE")!.debit,
    100n,
  );
  assert.equal(
    lines.reduce((v, l) => v + l.debit - l.credit, 0n),
    0n,
  );
  assert.equal(
    await ctx.db.ledgerJournal.count({
      where: { source: `payment:${transaction.id}` },
    }),
    1,
  );
  const stranger = await customer(ctx.base, ctx.auth);
  assert.equal(
    (await stranger.call(`/payments/${order.id}/refresh`, "POST", {})).status,
    404,
  );
});

test("Tezcheck: lost create response recovers with the same provider key; unknown outcome never releases rooms", async () => {
  const provider = fake(),
    b = await booking(),
    key = b.user.key();
  provider.state.loseCreateResponse = true;
  const lost = await b.user.call(
    `/customer/bookings/${b.id}/checkout`,
    "POST",
    {},
    key,
  );
  assert.equal(lost.status, 503);
  const recovered = await checkout(b.user, b.id, key);
  assert.equal(recovered.result.status, 201);
  assert.equal(provider.state.creations, 1);
  assert.equal(provider.state.calls, 2);
  const record = recovered.record!,
    data = provider.records.get(record.billId!);
  data.payment = {
    id: "pay_pending",
    state: "processing",
    amount_minor: data.bill.amount_minor,
    fee_minor: 0,
    net_minor: 0,
    refunded_amount_minor: 0,
    currency: "UZS",
    environment: "live",
    livemode: true,
    problem: { unknown_reason: "provider_timeout" },
  };
  await ctx.db.tezcheckBill.update({
    where: { id: record.id },
    data: { expiresAt: new Date(Date.now() - 1000) },
  });
  await tez.process(record.id);
  assert.equal(provider.state.cancels, 0);
  assert.equal(
    (await ctx.db.booking.findUniqueOrThrow({ where: { id: b.id } })).status,
    "PAYMENT_PENDING",
  );
  assert.equal(
    await ctx.db.roomAllocation.count({
      where: { bookingId: b.id, active: true },
    }),
    1,
  );
  data.payment = null;
  await tez.process(record.id);
  assert.equal(provider.state.cancels, 1);
  assert.equal(
    (await ctx.db.booking.findUniqueOrThrow({ where: { id: b.id } })).status,
    "EXPIRED",
  );
  assert.equal(
    await ctx.db.roomAllocation.count({
      where: { bookingId: b.id, active: true },
    }),
    0,
  );
});

test("Tezcheck: test-provider success creates no financial journal or confirmed booking", async () => {
  const provider = fake(),
    b = await booking(),
    first = await checkout(b.user, b.id);
  assert.equal(first.result.status, 201);
  provider.paid(first.record!.billId!, "test");
  const before = await ctx.db.ledgerJournal.count();
  await tez.process(first.record!.id);
  assert.equal(await ctx.db.ledgerJournal.count(), before);
  assert.equal(
    (
      await ctx.db.tezcheckBill.findUniqueOrThrow({
        where: { id: first.record!.id },
      })
    ).state,
    "TEST",
  );
  assert.equal(
    (await ctx.db.booking.findUniqueOrThrow({ where: { id: b.id } })).status,
    "EXPIRED",
  );
  assert.equal(
    await ctx.db.providerTransaction.count({
      where: { orderId: first.result.body.order_id },
    }),
    0,
  );
});

test("Tezcheck: wrong amount is quarantined; late live payment becomes PAYMENT_EXCEPTION rather than taking released inventory", async () => {
  const provider = fake(),
    b = await booking(),
    first = await checkout(b.user, b.id),
    record = first.record!;
  const data = provider.paid(record.billId!);
  data.payment.amount_minor++;
  await tez.process(record.id);
  assert.equal(
    (await ctx.db.tezcheckBill.findUniqueOrThrow({ where: { id: record.id } }))
      .state,
    "REVIEW",
  );
  assert.equal(
    await ctx.db.providerTransaction.count({
      where: { orderId: first.result.body.order_id },
    }),
    0,
  );
  data.payment.amount_minor--;
  await ctx.db.atomic(async (tx) => {
    await tx.booking.update({
      where: { id: b.id },
      data: { status: "EXPIRED" },
    });
    await tx.roomAllocation.updateMany({
      where: { bookingId: b.id },
      data: { active: false },
    });
  });
  await tez.process(record.id);
  assert.equal(
    (await ctx.db.booking.findUniqueOrThrow({ where: { id: b.id } })).status,
    "PAYMENT_EXCEPTION",
  );
  assert.equal(
    (
      await ctx.db.refundRequest.findUniqueOrThrow({
        where: { bookingId: b.id },
      })
    ).status,
    "REQUESTED",
  );
  assert.equal(
    await ctx.db.roomAllocation.count({
      where: { bookingId: b.id, active: true },
    }),
    0,
  );
});

test("Tezcheck: raw-body webhook signature, rotation, replay deduplication and durable wakeup do not trust webhook amounts", async () => {
  const provider = fake(),
    b = await booking(),
    first = await checkout(b.user, b.id),
    record = first.record!;
  const event = {
    id: "oev_BODY_EVENT",
    type: "payment.succeeded",
    schema_version: 1,
    mode: "test",
    data: {
      bill_id: record.billId,
      external_reference: record.orderId,
      amount_minor: 1,
      environment: "live",
    },
  };
  const timestamp = String(Math.floor(Date.now() / 1000));
  const headers = (body: unknown, delivery: string) => ({
    "X-Checkout-Timestamp": timestamp,
    "X-Checkout-Delivery": delivery,
    "X-Checkout-Event-Id": randomUUID(),
    "X-Checkout-Signature":
      "v1=" +
      "0".repeat(64) +
      ",v1=" +
      createHmac("sha256", config.TEZCHECK_WEBHOOK_SECRET)
        .update(`${timestamp}.${delivery}.${JSON.stringify(body)}`)
        .digest("hex"),
  });
  assert.equal(
    (
      await b.user.call("/payments/tezcheck", "POST", event, {
        ...headers(event, "whd_FIRST"),
        "X-Checkout-Signature": "v2=" + "0".repeat(64),
      })
    ).status,
    401,
  );
  assert.equal(
    (
      await b.user.call(
        "/payments/tezcheck",
        "POST",
        event,
        headers(event, "whd_FIRST"),
      )
    ).status,
    200,
  );
  assert.equal(
    (
      await b.user.call(
        "/payments/tezcheck",
        "POST",
        event,
        headers(event, "whd_REPLAY"),
      )
    ).status,
    200,
  );
  assert.equal(
    await ctx.db.tezcheckWebhook.count({ where: { eventId: event.id } }),
    1,
  );
  assert.equal(
    (
      await ctx.db.paymentOrder.findUniqueOrThrow({
        where: { id: record.orderId },
      })
    ).status,
    "PENDING",
  );
  const changed = { ...event, data: { ...event.data, amount_minor: 2 } };
  assert.equal(
    (
      await b.user.call(
        "/payments/tezcheck",
        "POST",
        changed,
        headers(changed, "whd_CHANGED"),
      )
    ).status,
    400,
  );
  provider.paid(record.billId!);
  await tez.tick();
  assert.equal(
    (
      await ctx.db.paymentOrder.findUniqueOrThrow({
        where: { id: record.orderId },
      })
    ).status,
    "SUCCEEDED",
  );
});

test("Tezcheck: checkout refuses insecure, credential-bearing and foreign payment URLs", async () => {
  const client = new TezcheckClient(config);
  for (const url of [
    "http://tezcheck.uz/pay/x",
    "https://tezcheck.uz.evil.example/pay/x",
    "https://private:secret@tezcheck.uz/pay/x",
    "https://api.tezcheck.uz/admin",
  ])
    assert.throws(() => client.checkoutUrl(url));
  assert.equal(
    client.checkoutUrl("https://checkout.tezcheck.uz/pay/example"),
    "https://checkout.tezcheck.uz/pay/example",
  );
});

test("Tezcheck: bank receipt uses net clearing without double fees; refund signals freeze payout approval", async () => {
  const provider = fake(),
    b = await booking(),
    first = await checkout(b.user, b.id),
    record = first.record!;
  const status = provider.paid(record.billId!);
  await tez.process(record.id);
  const transaction = await ctx.db.providerTransaction.findFirstOrThrow({
    where: { orderId: record.orderId },
  });
  const imported = await ctx.admin.call(
    "/superadmin/reconciliation/imports",
    "POST",
    {
      kind: "BANK",
      evidence_asset_id: b.site.document.id,
      rows: [
        {
          provider: "TEZCHECK",
          provider_id: transaction.providerId,
          order_id: record.orderId,
          amount: transaction.amount.toString(),
          state: 2,
          bank_reference: "TEZ-BANK-" + randomUUID(),
          fee: "100",
        },
      ],
    },
  );
  assert.equal(imported.status, 201);
  const journals = await ctx.db.ledgerJournal.findMany({
    where: { bookingId: b.id },
  });
  const lines = await ctx.db.ledgerLine.findMany({
    where: { journalId: { in: journals.map((j) => j.id) } },
  });
  assert.equal(
    lines
      .filter((l) => l.account === "PSP_CLEARING")
      .reduce((v, l) => v + l.debit - l.credit, 0n),
    0n,
  );
  assert.equal(
    lines
      .filter((l) => l.account === "PROCESSING_EXPENSE")
      .reduce((v, l) => v + l.debit - l.credit, 0n),
    100n,
  );
  await ctx.db.booking.update({
    where: { id: b.id },
    data: { status: "CHECKED_OUT" },
  });
  const payout = await ctx.admin.call(
    "/superadmin/payouts",
    "POST",
    { sanatorium_id: b.site.id, booking_ids: [b.id] },
    ctx.admin.key(),
  );
  assert.equal(payout.status, 201);
  status.payment.state = "refunded";
  status.payment.refunded_amount_minor = status.payment.amount_minor;
  await tez.process(record.id);
  assert.equal(
    (await ctx.db.tezcheckBill.findUniqueOrThrow({ where: { id: record.id } }))
      .state,
    "REVIEW",
  );
  const blocked = await ctx.admin.call(
    `/superadmin/payouts/${payout.body.id}/approve`,
    "POST",
    {},
  );
  assert.equal(blocked.body.code, "PAYMENT_RECONCILIATION_REQUIRED");
  assert.equal(
    (await ctx.db.payout.findUniqueOrThrow({ where: { id: payout.body.id } }))
      .status,
    "DRAFT",
  );
});

test("Tezcheck: invoice checkout credits deferred services and cannot be paid by another customer", async () => {
  const provider = fake(),
    b = await booking();
  const invoice = await ctx.db.invoice.create({
    data: {
      sanatoriumId: b.site.id,
      purpose: "AD",
      sourceKey: "tez-invoice-" + randomUUID(),
      amount: 100000n,
      startsAt: new Date(),
      endsAt: new Date(Date.now() + 86400000),
      data: {},
    },
  });
  const result = await ctx.admin.call(
    `/partner/invoices/${invoice.id}/checkout`,
    "POST",
    {},
    ctx.admin.key(),
  );
  assert.equal(result.status, 201);
  const record = await ctx.db.tezcheckBill.findUniqueOrThrow({
    where: { orderId: result.body.order_id },
  });
  provider.paid(record.billId!);
  await tez.process(record.id);
  assert.equal(
    (await ctx.db.invoice.findUniqueOrThrow({ where: { id: invoice.id } }))
      .status,
    "PAID",
  );
  const transaction = await ctx.db.providerTransaction.findFirstOrThrow({
    where: { orderId: record.orderId },
  });
  const journal = await ctx.db.ledgerJournal.findUniqueOrThrow({
    where: { source: "payment:" + transaction.id },
  });
  assert.equal(
    (
      await ctx.db.ledgerLine.findFirstOrThrow({
        where: { journalId: journal.id, account: "DEFERRED_SERVICE_REVENUE" },
      })
    ).credit,
    100000n,
  );
  assert.equal(
    (
      await b.user.call(
        `/partner/invoices/${invoice.id}/checkout`,
        "POST",
        {},
        b.user.key(),
      )
    ).status,
    403,
  );
});

test('Tezcheck cancellation: unpaid bill closes once; paid or processing bill never releases a reserved room', async () => {
  const provider = fake(), unpaid = await booking();
  const { record } = await checkout(unpaid.user, unpaid.id);
  assert.ok(record);
  const result = await unpaid.user.call(`/customer/bookings/${unpaid.id}/cancel`, 'POST', { reason: 'Safar bekor bo‘ldi' }, unpaid.user.key());
  assert.equal(result.status, 201); assert.equal(provider.state.cancels, 1);
  assert.equal((await unpaid.user.call(`/customer/bookings/${unpaid.id}/cancel`, 'POST', { reason: 'Safar bekor bo‘ldi' }, unpaid.user.key())).status, 201);
  assert.equal(provider.state.cancels, 1);
  assert.equal(await ctx.db.roomAllocation.count({ where: { bookingId: unpaid.id, active: true } }), 0);
  const paid = await booking(), paidCheckout = await checkout(paid.user, paid.id);
  provider.paid(paidCheckout.record!.billId!);
  const blocked = await paid.user.call(`/customer/bookings/${paid.id}/cancel`, 'POST', { reason: 'Bekor qilish' }, paid.user.key());
  assert.equal(blocked.body.code, 'REFUND_REQUEST_REQUIRED');
  assert.equal((await paid.user.call(`/customer/bookings/${paid.id}`)).body.status, 'CONFIRMED');
  assert.equal(await ctx.db.roomAllocation.count({ where: { bookingId: paid.id, active: true } }), 1);
  const processing = await booking(), processingCheckout = await checkout(processing.user, processing.id);
  const processingRecord = provider.paid(processingCheckout.record!.billId!);
  processingRecord.bill.paid = false; processingRecord.bill.state = 'active'; processingRecord.payment.state = 'processing';
  const pending = await processing.user.call(`/customer/bookings/${processing.id}/cancel`, 'POST', { reason: 'Bekor qilish' }, processing.user.key());
  assert.equal(pending.body.code, 'PAYMENT_CANCELLATION_PENDING');
  assert.equal(await ctx.db.roomAllocation.count({ where: { bookingId: processing.id, active: true } }), 1);
});
