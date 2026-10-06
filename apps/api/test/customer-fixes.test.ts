import { before, after, test } from "node:test";
import assert from "node:assert/strict";
import { setup, staff } from "./helpers";
import {
  sanatorium,
  customer,
  quote,
  hold,
  pay,
  fixtureProfile,
} from "./fixtures";
import { mapLocation } from "../src/sanatoriums/maps";
import { PaymentService } from "../src/payments/payment.service";
import { TezcheckService } from "../src/payments/tezcheck.service";
import { CONFIG, type Config } from "../src/common/config";
let ctx: Awaited<ReturnType<typeof setup>>;
before(async () => {
  ctx = await setup();
});
after(async () => {
  await ctx?.app.close();
});

test("survey: checked sanatorium receives once, unchecked sanatorium receives nothing, answered state survives reload", async () => {
  const a = await sanatorium(ctx.admin),
    b = await sanatorium(ctx.admin);
  const selected = await staff(
    ctx.admin,
    "survey.selected",
    "+998955100001",
    a.id,
  );
  const excluded = await staff(
    ctx.admin,
    "survey.excluded",
    "+998955100002",
    b.id,
  );
  assert.equal(
    (
      await ctx.admin.call("/superadmin/surveys", "POST", {
        title: "Empty survey",
        sanatorium_ids: [],
        questions: [
          { id: "test", label: "Savol", type: "BOOLEAN", required: true },
        ],
      })
    ).status,
    422,
  );
  const created = await ctx.admin.call("/superadmin/surveys", "POST", {
    title: "Selected survey",
    sanatorium_ids: [a.id],
    questions: [
      { id: "test", label: "Savol", type: "BOOLEAN", required: true },
    ],
  });
  assert.equal(created.status, 201);
  const id = created.body.id;
  assert.equal(
    (await excluded.client.call("/surveys")).body.some((s: any) => s.id === id),
    false,
  );
  assert.equal(
    (
      await excluded.client.call(`/surveys/${id}/responses`, "POST", {
        version: 1,
        answers: { test: true },
      })
    ).status,
    404,
  );
  assert.equal(
    (await selected.client.call("/surveys")).body.find((s: any) => s.id === id)
      .answered,
    false,
  );
  const answers = await Promise.all(
    Array.from({ length: 3 }, () =>
      selected.client.call(`/surveys/${id}/responses`, "POST", {
        version: 1,
        answers: { test: true },
      }),
    ),
  );
  assert.ok(answers.every((a) => a.status === 201));
  assert.equal(new Set(answers.map((a) => a.body.id)).size, 1);
  assert.equal(
    await ctx.db.surveyResponse.count({ where: { surveyId: id } }),
    1,
  );
  const saved = (await selected.client.call("/surveys")).body.find(
    (s: any) => s.id === id,
  );
  assert.equal(saved.answered, true);
  assert.deepEqual(saved.response.answers, { test: true });
  assert.equal(
    (
      await selected.client.call(`/surveys/${id}/responses`, "POST", {
        version: 1,
        answers: { test: false },
      })
    ).body.code,
    "ANSWER_ALREADY_SAVED",
  );
});

test("support: parallel retries with one key create a single ticket and a single reply", async () => {
  const user = await customer(ctx.base, ctx.auth),
    key = user.key();
  const input = { title: "Yordam", text: "Bitta murojaat saqlansin" };
  const results = await Promise.all(
    Array.from({ length: 3 }, () =>
      user.call("/support/tickets", "POST", input, key),
    ),
  );
  assert.ok(results.every((r) => r.status === 201));
  assert.equal(new Set(results.map((r) => r.body.id)).size, 1);
  const id = results[0].body.id,
    replyKey = user.key();
  const replies = await Promise.all(
    Array.from({ length: 3 }, () =>
      user.call(
        `/support/tickets/${id}/messages`,
        "POST",
        { text: "Takrorlanmasin" },
        replyKey,
      ),
    ),
  );
  assert.ok(replies.every((r) => r.status === 201));
  assert.equal(new Set(replies.map((r) => r.body.id)).size, 1);
  assert.equal(
    (await user.call(`/support/tickets/${id}`)).body.messages.length,
    2,
  );
  assert.equal(
    (
      await user.call(
        `/support/tickets/${id}/messages`,
        "POST",
        { text: "Boshqa matn" },
        replyKey,
      )
    ).body.code,
    "IDEMPOTENCY_CONFLICT",
  );
});

test("booking: unpaid cancellation is retryable and terminal; paid bookings require refunds", async () => {
  const site = await sanatorium(ctx.admin),
    user = await customer(ctx.base, ctx.auth);
  const b = (
    await hold(user, await quote(user, site, "2027-04-01", "2027-04-03"))
  ).body;
  const order = (
    await user.call(
      `/customer/bookings/${b.id}/checkout`,
      "POST",
      {},
      user.key(),
    )
  ).body;
  const payments = ctx.app.get(PaymentService);
  await ctx.db.atomic((tx) =>
    payments.createTransaction(tx, {
      id: "user_cancel_test",
      time: Date.now(),
      amount: Number(b.amount),
      account: { order_id: order.order_id },
    }),
  );
  const key = user.key(),
    request = { reason: "Safar rejasi o‘zgardi" };
  const canceled = await user.call(
    `/customer/bookings/${b.id}/cancel`,
    "POST",
    request,
    key,
  );
  assert.equal(canceled.status, 201);
  assert.equal(canceled.body.status, "CANCELLED");
  assert.equal(
    (await user.call(`/customer/bookings/${b.id}/cancel`, "POST", request, key))
      .status,
    201,
  );
  assert.equal(
    (
      await user.call(
        `/customer/bookings/${b.id}/cancel`,
        "POST",
        request,
        user.key(),
      )
    ).status,
    201,
  );
  assert.equal(
    await ctx.db.roomAllocation.count({
      where: { bookingId: b.id, active: true },
    }),
    0,
  );
  const transaction = await ctx.db.providerTransaction.findFirstOrThrow({
    where: { orderId: order.order_id },
  });
  assert.equal(transaction.state, -1);
  await assert.rejects(
    ctx.db.atomic((tx) => payments.perform(tx, transaction.providerId)),
  );
  const paid = (
    await hold(user, await quote(user, site, "2027-04-05", "2027-04-07"))
  ).body;
  await pay(user, paid.id);
  assert.equal(
    (
      await user.call(
        `/customer/bookings/${paid.id}/cancel`,
        "POST",
        request,
        user.key(),
      )
    ).body.code,
    "REFUND_REQUEST_REQUIRED",
  );
  assert.equal(
    (await user.call(`/customer/bookings/${paid.id}`)).body.status,
    "CONFIRMED",
  );
});

test("history: unpaid bookings disappear after two hours; paid and staff records remain", async () => {
  const site = await sanatorium(ctx.admin, 2),
    user = await customer(ctx.base, ctx.auth);
  const unpaid = (
    await hold(user, await quote(user, site, "2027-05-01", "2027-05-03"))
  ).body;
  const paid = (
    await hold(user, await quote(user, site, "2027-05-05", "2027-05-07"))
  ).body;
  await pay(user, paid.id);
  const old = new Date(Date.now() - 121 * 60000);
  await ctx.db.booking.updateMany({
    where: { id: { in: [unpaid.id, paid.id] } },
    data: { createdAt: old },
  });
  const history = (await user.call("/customer/bookings")).body;
  assert.equal(
    history.data.some((b: any) => b.id === unpaid.id),
    false,
  );
  assert.equal(
    history.data.some((b: any) => b.id === paid.id),
    true,
  );
  assert.equal(
    (
      await ctx.admin.call(`/partner/bookings?sanatorium_id=${site.id}`)
    ).body.data.some((b: any) => b.id === unpaid.id),
    true,
  );
  assert.ok(await ctx.db.booking.findUnique({ where: { id: unpaid.id } }));
  assert.equal(
    (await user.call(`/customer/bookings/${unpaid.id}`)).status,
    200,
  );
});

test("maps: shared Google/Yandex links work without coordinate fields; unsafe domains are rejected", async () => {
  assert.deepEqual(
    mapLocation("https://www.google.com/maps/search/?api=1&query=41.3,69.2"),
    {
      map_url: "https://www.google.com/maps/search/?api=1&query=41.3,69.2",
      latitude: 41.3,
      longitude: 69.2,
    },
  );
  assert.equal(
    mapLocation("https://yandex.uz/maps/?ll=69.2,41.3").latitude,
    41.3,
  );
  assert.equal(
    mapLocation("https://yandex.uz/maps/?ll=69.2,41.3").longitude,
    69.2,
  );
  assert.equal(
    mapLocation("https://maps.app.goo.gl/example").latitude,
    undefined,
  );
  for (const value of [
    "http://www.google.com/maps",
    "https://google.com.evil.test/maps",
    "https://google.com@evil.test/maps",
    "https://127.0.0.1/maps",
  ])
    assert.throws(() => mapLocation(value));
  const site = await sanatorium(ctx.admin);
  const draft = (
    await ctx.admin.call(`/partner/sanatoriums/${site.id}/drafts`, "POST", {})
  ).body;
  const incomplete = await ctx.admin.call(
    `/partner/sanatorium-revisions/${draft.id}`,
    "PATCH",
    { version: draft.version, data: { map_url: "https://" } },
  );
  assert.equal(incomplete.status, 200);
  assert.equal(
    (
      await ctx.admin.call(
        `/partner/sanatorium-revisions/${draft.id}/submit`,
        "POST",
        { version: incomplete.body.version },
      )
    ).body.code,
    "ONBOARDING_INCOMPLETE",
  );
  const saved = await ctx.admin.call(
    `/partner/sanatorium-revisions/${draft.id}`,
    "PATCH",
    {
      version: incomplete.body.version,
      data: { map_url: "https://maps.app.goo.gl/example" },
    },
  );
  assert.equal(saved.status, 200);
  assert.equal(saved.body.data.latitude, undefined);
  assert.equal(
    (
      await ctx.admin.call(
        `/partner/sanatorium-revisions/${draft.id}/submit`,
        "POST",
        { version: saved.body.version },
      )
    ).status,
    201,
  );
  assert.equal(
    (await ctx.admin.call(`/catalog/sanatoriums/${site.id}`)).body
      .contact_phone,
    undefined,
  );
});

test("merchant setup: scoped metadata, ownership matching and version checks; no real platform checkout for new direct bookings", async () => {
  const site = await sanatorium(ctx.admin),
    other = await sanatorium(ctx.admin);
  const director = await staff(
    ctx.admin,
    "merchant.director",
    "+998955100003",
    site.id,
  );
  const bank = await ctx.db.bankRevision.findFirstOrThrow({
    where: { sanatoriumId: site.id, status: "APPROVED" },
  });
  const path = `/partner/sanatoriums/${site.id}/merchant-setup`;
  assert.equal(
    (
      await director.client.call(
        `/partner/sanatoriums/${other.id}/merchant-setup`,
      )
    ).status,
    404,
  );
  const data = {
    version: 0,
    legal_name: fixtureProfile.legal_name,
    stir: fixtureProfile.stir,
    bank_revision_id: bank.id,
  };
  assert.equal(
    (
      await director.client.call(path, "PATCH", {
        ...data,
        api_key: "never-save-a-secret",
      })
    ).status,
    422,
  );
  assert.equal(
    (
      await director.client.call(path, "PATCH", {
        ...data,
        legal_name: "Wrong owner",
      })
    ).body.code,
    "MERCHANT_OWNER_MISMATCH",
  );
  const saved = await director.client.call(path, "PATCH", data);
  assert.equal(saved.status, 200);
  assert.equal(saved.body.payments_enabled, false);
  assert.equal(saved.body.setup.status, "WAITING_MERCHANT");
  assert.equal(
    (await director.client.call(path, "PATCH", data)).body.code,
    "VERSION_CONFLICT",
  );
  assert.equal(
    (await director.client.call(path)).body.settlement_mode,
    "DIRECT",
  );
  const user = await customer(ctx.base, ctx.auth);
  const booking = (
    await hold(user, await quote(user, site, "2027-06-01", "2027-06-03"))
  ).body;
  const config = ctx.app.get<Config>(CONFIG),
    original = { ...config },
    tez = ctx.app.get(TezcheckService);
  let calls = 0;
  const fetcher = tez.client.fetcher;
  try {
    Object.assign(config, {
      PAYMENT_MODE: "tezcheck",
      BOOKING_SETTLEMENT_MODE: "direct",
    });
    tez.client.fetcher = async () => {
      calls++;
      throw new Error("No network expected");
    };
    const result = await user.call(
      `/customer/bookings/${booking.id}/checkout`,
      "POST",
      {},
      user.key(),
    );
    assert.equal(result.body.code, "MERCHANT_NOT_READY");
    assert.equal(calls, 0);
    assert.equal(
      (await user.call(`/customer/bookings/${booking.id}`)).body.status,
      "HOLD",
    );
    assert.equal(await ctx.db.tezcheckBill.count(), 0);
  } finally {
    Object.assign(config, original);
    tez.client.fetcher = fetcher;
  }
});
