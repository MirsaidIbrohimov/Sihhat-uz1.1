import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { Client, setup, staff, testPassword } from "./helpers";
import { customer, hold, pay, quote, sanatorium } from "./fixtures";
import { ACCOUNTANT, effective } from "../src/auth/permissions";
import { reportCsv } from "../src/reports/report-data";

let ctx: Awaited<ReturnType<typeof setup>>, first: any, second: any;
let director: Awaited<ReturnType<typeof staff>>,
  accountant: Client,
  membership: any,
  booking: any;
before(async () => {
  ctx = await setup();
  first = await sanatorium(ctx.admin, 2);
  second = await sanatorium(ctx.admin);
  director = await staff(
    ctx.admin,
    "accounting.director",
    "+998901441111",
    first.id,
  );
  const invitation = await director.client.call(
    "/partner/staff-invitations",
    "POST",
    {
      sanatorium_id: first.id,
      name: "Hisobchi sinov",
      login: "accounting.staff",
      phone: "+998901441112",
      role: "ACCOUNTANT",
      temporary_password: testPassword,
    },
  );
  assert.equal(invitation.status, 201);
  membership = invitation.body.membership;
  accountant = new Client(ctx.base);
  const client = await customer(ctx.base, ctx.auth);
  booking = (
    await hold(client, await quote(client, first, "2028-01-01", "2028-01-03"))
  ).body;
  await pay(client, booking.id);
});
after(async () => {
  await ctx?.app.close();
});

test("Accountant: role has a fixed report-only ceiling even with injected mutation grants", () => {
  assert.deepEqual(
    effective({
      role: "ACCOUNTANT",
      grants: [
        "bookings.check_in",
        "surveys.respond",
        "payments.read",
        "sanatorium.profile.edit",
      ],
      denies: [],
      ceiling: [],
    }).sort(),
    [...ACCOUNTANT].sort(),
  );
  assert.deepEqual(
    effective({
      role: "UNKNOWN",
      grants: ["bookings.read"],
      denies: [],
      ceiling: [],
    }),
    [],
  );
  assert.deepEqual(
    effective({
      role: "ACCOUNTANT",
      grants: [],
      denies: ["reports.export"],
      adminDenies: ["reports.financial.read"],
      ceiling: [],
    }),
    ["reports.operational.read"],
  );
});
test("Accountant: director invitation needs approval and first login changes password", async () => {
  assert.equal(membership.role, "ACCOUNTANT");
  assert.equal(membership.status, "PENDING_APPROVAL");
  assert.equal(
    (
      await accountant.call("/auth/staff/login", "POST", {
        login: "accounting.staff",
        password: testPassword,
      })
    ).status,
    403,
  );
  assert.equal(
    (
      await ctx.admin.call(
        `/superadmin/staff-approvals/${membership.id}/approve`,
        "POST",
        { version: membership.version },
      )
    ).status,
    201,
  );
  assert.equal(
    (
      await accountant.call("/auth/staff/login", "POST", {
        login: "accounting.staff",
        password: testPassword,
      })
    ).status,
    201,
  );
  assert.equal(
    (await accountant.call("/partner/reports?from=2028-01-01&to=2028-02-01"))
      .body.code,
    "PASSWORD_CHANGE_REQUIRED",
  );
  assert.equal(
    (
      await accountant.call("/auth/change-password", "POST", {
        current_password: testPassword,
        new_password: `${testPassword}Changed`,
      })
    ).status,
    201,
  );
  const me = await accountant.call("/auth/me");
  assert.equal(me.body.memberships[0].role, "ACCOUNTANT");
  assert.deepEqual(
    me.body.memberships[0].permissions.sort(),
    [...ACCOUNTANT].sort(),
  );
  assert.equal(
    (await accountant.call("/auth/activity", "POST", {})).status,
    201,
  );
});
test("Accountant: own reports/export work while another tenant and private profile remain inaccessible", async () => {
  const tenants = await accountant.call("/partner/sanatoriums");
  assert.equal(tenants.status, 200);
  assert.equal(tenants.body.total, 1);
  assert.deepEqual(Object.keys(tenants.body.data[0]).sort(), [
    "id",
    "name",
    "status",
  ]);
  const params = "from=2028-01-01&to=2028-02-01&financial=true";
  const own = await accountant.call(
    `/partner/reports?sanatorium_id=${first.id}&${params}`,
  );
  assert.equal(own.status, 200);
  assert.equal(own.body.sanatorium.id, first.id);
  assert.equal(own.headers.get("cache-control"), "private, no-store");
  assert.equal(own.body.guest, undefined);
  assert.equal(own.body.platform_revenue, undefined);
  assert.equal(
    (
      await accountant.call(
        `/partner/reports?sanatorium_id=${second.id}&${params}`,
      )
    ).status,
    404,
  );
  assert.equal(
    (
      await accountant.call(
        `/partner/reports/export?sanatorium_id=${second.id}&${params}`,
      )
    ).status,
    404,
  );
  const csv = await accountant.call(
    `/partner/reports/export?sanatorium_id=${first.id}&${params}`,
  );
  assert.equal(csv.status, 200);
  assert.match(csv.body, /2028-01-31/);
  assert.match(csv.body, /Tasdiqlangan onlayn to‘lovlar/);
  assert.match(
    csv.headers.get("content-disposition")!,
    /sihhat-report-2028-01-01-2028-02-01\.csv/,
  );
  const audit = await ctx.db.auditLog.findFirstOrThrow({
    where: { action: "report.exported", actorId: meId() },
    orderBy: { createdAt: "desc" },
  });
  assert.deepEqual(audit.after, {
    from: "2028-01-01",
    to: "2028-02-01",
    financial: true,
    format: "CSV",
  });
});
function meId() {
  return membership.userId;
}
test("Accountant: direct APIs cannot alter bookings, questionnaires, profile, payments or staff", async () => {
  const survey = await ctx.admin.call("/superadmin/surveys", "POST", {
    title: "Hisobchi cheklovi",
    recipient_ids: [membership.userId],
    questions: [{ id: "answer", label: "Sinov", type: "TEXT", required: true }],
  });
  assert.equal(survey.status, 201);
  const before = await ctx.db.booking.findUniqueOrThrow({
    where: { id: booking.id },
  });
  const forbidden: [string, string, unknown?][] = [
    ["/partner/bookings", "GET"],
    [`/partner/bookings/${booking.id}`, "GET"],
    [
      `/partner/bookings/${booking.id}/check-in`,
      "POST",
      { version: before.version },
    ],
    ["/partner/bookings/manual", "POST", {}],
    ["/partner/payments", "GET"],
    ["/surveys", "GET"],
    [
      `/surveys/${survey.body.id}/responses`,
      "POST",
      { version: survey.body.version, answers: { answer: "Taqiqlangan" } },
    ],
    [
      `/partner/sanatorium-revisions/${first.revision.id}`,
      "PATCH",
      { version: 1, data: { name: "Buzilgan" } },
    ],
    [`/partner/sanatoriums/${first.id}`, "GET"],
    ["/partner/staff", "GET"],
    ["/partner/staff-invitations", "POST", {}],
    ["/partner/offline-payments", "POST", {}],
    ["/superadmin/reports?from=2028-01-01&to=2028-02-01", "GET"],
    ["/messages", "POST", {}],
  ];
  for (const [path, method, body] of forbidden)
    assert.equal(
      (await accountant.call(path, method, body)).status,
      403,
      `${method} ${path}`,
    );
  assert.equal(
    (await ctx.db.booking.findUniqueOrThrow({ where: { id: booking.id } }))
      .version,
    before.version,
  );
  assert.equal(
    await ctx.db.surveyResponse.count({ where: { userId: membership.userId } }),
    0,
  );
  assert.equal(
    (
      await director.client.call(
        `/partner/staff/${membership.id}/permissions`,
        "PATCH",
        { version: 2, grants: ["surveys.respond"], denies: [] },
      )
    ).status,
    403,
  );
  assert.equal(
    (
      await ctx.admin.call(
        `/partner/staff/${membership.id}/permissions`,
        "PATCH",
        {
          version: 2,
          grants: ["bookings.check_in"],
          denies: [],
          ceiling: ["bookings.check_in"],
        },
      )
    ).status,
    403,
  );
});
test("Accountant: Tashkent period boundaries, offline corrections and completed bank payouts are separate", async () => {
  const order = await ctx.db.paymentOrder.findUniqueOrThrow({
    where: { bookingId: booking.id },
  });
  await ctx.db.paymentOrder.update({
    where: { id: order.id },
    data: { paidAt: new Date("2028-01-31T19:00:00Z") },
  }); // February 1, 00:00 in Tashkent.
  const january = `sanatorium_id=${first.id}&from=2028-01-01&to=2028-02-01&financial=true`;
  assert.equal(
    (await accountant.call(`/partner/reports?${january}`)).body.gmv,
    "0",
  );
  await ctx.db.paymentOrder.update({
    where: { id: order.id },
    data: { paidAt: new Date("2028-01-31T18:59:59.999Z") },
  });
  for (const [method, status, amount] of [
    ["CASH", "VERIFIED", 12345n],
    ["TERMINAL", "VERIFIED", 4567n],
    ["CASH", "UNVERIFIED", 999n],
    ["CASH", "CORRECTED", 888n],
  ]) {
    await ctx.db.offlinePayment.create({
      data: {
        sanatoriumId: first.id,
        bookingId: booking.id,
        method: String(method),
        status: String(status),
        amount: BigInt(amount),
        evidence: "Synthetic report record",
        recordedBy: director.membership.userId,
        createdAt: new Date("2028-01-15T10:00:00Z"),
      },
    });
  }
  await ctx.db.payout.create({
    data: {
      sanatoriumId: first.id,
      status: "PAID",
      amount: 333n,
      bankSnapshot: {},
      paidAt: new Date("2028-01-31T18:59:00Z"),
    },
  });
  await ctx.db.payout.create({
    data: {
      sanatoriumId: first.id,
      status: "APPROVED",
      amount: 777n,
      bankSnapshot: {},
    },
  });
  const report = await accountant.call(`/partner/reports?${january}`);
  assert.equal(report.status, 200);
  assert.equal(report.body.gmv, order.amount.toString());
  assert.equal(report.body.offline_cash_receipts, "12345");
  assert.equal(report.body.offline_terminal_receipts, "4567");
  assert.equal(report.body.verified_offline_receipts, "16912");
  assert.equal(report.body.unverified_offline_receipts, "999");
  assert.equal(report.body.paid_payouts, "333");
  assert.equal(report.body.period.to_exclusive, true);
  assert.equal(report.body.period.offline_basis, "created_at_current_status");
  const csv = await accountant.call(`/partner/reports/export?${january}`);
  assert.match(csv.body, /"Naqd to‘lov qaydlari","123\.45","UZS"/);
  const malicious = reportCsv({
    ...report.body,
    sanatorium: {
      id: randomUUID(),
      name: ' \t=HYPERLINK("https://example.invalid")',
    },
  });
  assert.match(malicious, /' \t=HYPERLINK/);
  assert.equal(
    (
      await accountant.call(
        `/partner/reports?sanatorium_id=${first.id}&from=2028-01-01&to=2028-01-01&financial=true`,
      )
    ).status,
    422,
  );
});
test("Accountant: revoked export permission applies to an existing session and blocking revokes access", async () => {
  const changed = await ctx.admin.call(
    `/partner/staff/${membership.id}/permissions`,
    "PATCH",
    { version: 2, grants: [], denies: ["reports.export"] },
  );
  assert.equal(changed.status, 200);
  const params = `sanatorium_id=${first.id}&from=2028-01-01&to=2028-02-01&financial=true`;
  assert.equal(
    (await accountant.call(`/partner/reports?${params}`)).status,
    200,
  );
  assert.equal(
    (await accountant.call(`/partner/reports/export?${params}`)).status,
    403,
  );
  assert.equal(
    (
      await ctx.admin.call(`/superadmin/staff/${membership.id}/block`, "POST", {
        version: changed.body.version,
        reason: "Hisobchi sinovi yakuni",
      })
    ).status,
    201,
  );
  assert.equal(
    (await accountant.call(`/partner/reports?${params}`)).status,
    401,
  );
});
