import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import { writeFileSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { Client, setup, staff, testPassword } from "./helpers";
import { customer, hold, pay, quote, sanatorium } from "./fixtures";
import { reportXlsx } from "../src/reports/report-xlsx";

let ctx: Awaited<ReturnType<typeof setup>>,
  first: any,
  second: any,
  booking: any;
let director: Awaited<ReturnType<typeof staff>>,
  reception: Awaited<ReturnType<typeof staff>>,
  foreign: Awaited<ReturnType<typeof staff>>;
const nextPassword = `${testPassword}Reset`;
const day = new Date(Date.now() + 90 * 86400000).toISOString().slice(0, 10),
  through = new Date(Date.now() + 92 * 86400000).toISOString().slice(0, 10);
before(async () => {
  ctx = await setup();
  first = await sanatorium(ctx.admin, 4);
  second = await sanatorium(ctx.admin);
  director = await staff(
    ctx.admin,
    "features.director",
    "+998901450101",
    first.id,
  );
  reception = await staff(
    ctx.admin,
    "features.reception",
    "+998901450102",
    first.id,
    false,
  );
  foreign = await staff(
    ctx.admin,
    "features.foreign",
    "+998901450103",
    second.id,
    false,
  );
  const client = await customer(ctx.base, ctx.auth);
  booking = (await hold(client, await quote(client, first, day, through))).body;
  await pay(client, booking.id);
  await ctx.db.booking.update({
    where: { id: booking.id },
    data: { guest: { name: "Feature MeHmOn", phone: "+998901444444" } },
  });
});
after(async () => {
  await ctx.app.close();
});

test("Portal: direktor yangi parolni o‘rnatadi; eski kirishlar yopiladi va vakolat chegarasi saqlanadi", async () => {
  const body = { new_password: nextPassword, confirm_password: nextPassword };
  assert.equal(
    (
      await reception.client.call(
        `/partner/staff/${reception.membership.id}/reset-password`,
        "POST",
        body,
      )
    ).status,
    403,
  );
  assert.equal(
    (
      await director.client.call(
        `/partner/staff/${foreign.membership.id}/reset-password`,
        "POST",
        body,
      )
    ).status,
    404,
  );
  assert.equal(
    (
      await director.client.call(
        `/partner/staff/${director.membership.id}/reset-password`,
        "POST",
        body,
      )
    ).status,
    403,
  );
  assert.equal(
    (
      await director.client.call(
        `/partner/staff/${reception.membership.id}/reset-password`,
        "POST",
        { ...body, confirm_password: nextPassword + "x" },
      )
    ).status,
    422,
  );
  assert.equal(
    (
      await director.client.call(
        `/partner/staff/${reception.membership.id}/reset-password`,
        "POST",
        body,
      )
    ).status,
    201,
  );
  assert.equal((await reception.client.call("/auth/me")).status, 401);
  const replacement = new Client(ctx.base);
  assert.equal(
    (
      await replacement.call("/auth/staff/login", "POST", {
        login: "features.reception",
        password: `${testPassword}Changed`,
      })
    ).status,
    401,
  );
  assert.equal(
    (
      await replacement.call("/auth/staff/login", "POST", {
        login: "features.reception",
        password: nextPassword,
      })
    ).status,
    201,
  );
  assert.equal(
    (await replacement.call("/auth/me")).body.mustChangePassword,
    false,
  );
  assert.equal(
    (await replacement.call(`/partner/bookings?sanatorium_id=${first.id}`))
      .status,
    200,
  );
  const record = await ctx.db.auditLog.findFirstOrThrow({
    where: {
      action: "staff.password_reset",
      entityId: reception.membership.userId,
    },
  });
  assert.equal(record.sanatoriumId, first.id);
  assert.equal(record.before, null);
  assert.equal(record.after, null);
});

test("Portal: faol kirishlar faqat o‘z hisobiga tegishli, tanlangan va boshqa kirishlar yopiladi", async () => {
  const other = new Client(ctx.base);
  assert.equal(
    (
      await other.call("/auth/staff/login", "POST", {
        login: "features.director",
        password: `${testPassword}Changed`,
      })
    ).status,
    201,
  );
  const sessions = (await director.client.call("/auth/sessions")).body.data;
  assert.equal(sessions.filter((row: any) => row.current).length, 1);
  assert.ok(
    sessions.every(
      (row: any) =>
        !("tokenHash" in row) &&
        !("refreshHash" in row) &&
        !("csrfHash" in row) &&
        !("userId" in row),
    ),
  );
  const otherId = (await other.call("/auth/me")).body.sessionId;
  assert.equal(
    (await foreign.client.call(`/auth/sessions/${otherId}/revoke`, "POST", {}))
      .status,
    404,
  );
  assert.equal(
    (await director.client.call(`/auth/sessions/${otherId}/revoke`, "POST", {}))
      .status,
    201,
  );
  assert.equal((await other.call("/auth/me")).status, 401);
  assert.equal(
    (
      await other.call("/auth/staff/login", "POST", {
        login: "features.director",
        password: `${testPassword}Changed`,
      })
    ).status,
    201,
  );
  assert.equal(
    (await director.client.call("/auth/sessions/revoke-others", "POST", {}))
      .status,
    201,
  );
  assert.equal((await director.client.call("/auth/me")).status, 200);
  assert.equal((await other.call("/auth/me")).status, 401);
});

test("Portal: bron va to‘lov qidiruvi registr/telefon/sanalarni tekshiradi, begona sanatoriyani ochmaydi", async () => {
  for (const q of [
    booking.reference,
    "feature mehmon",
    "+998 (90) 144-44-44",
  ]) {
    const result = await director.client.call(
      `/partner/bookings?sanatorium_id=${first.id}&q=${encodeURIComponent(q)}&from=${day}&to=${day}`,
    );
    assert.equal(result.status, 200);
    assert.equal(result.body.data[0].id, booking.id);
  }
  assert.equal(
    (await foreign.client.call(`/partner/bookings?q=${booking.reference}`)).body
      .total,
    0,
  );
  assert.equal(
    (await director.client.call(`/partner/bookings?from=${through}&to=${day}`))
      .status,
    422,
  );
  assert.equal(
    (await director.client.call(`/partner/payments?q=${booking.reference}`))
      .body.data[0].bookingId,
    booking.id,
  );
  assert.equal(
    (await director.client.call(`/partner/staff?q=features.reception`)).body
      .data[0].userId,
    reception.membership.userId,
  );
  assert.equal(
    (await foreign.client.call(`/partner/staff?q=features.reception`)).body
      .total,
    0,
  );
});

test("Portal: bugungi ro‘yxat check-in/out bilan yangilanadi va tasdiqlangan joyida to‘lovni qoldiqdan ayiradi", async () => {
  const endpoint = `/partner/bookings/daily?sanatorium_id=${first.id}&date=${day}`;
  assert.equal(
    (await director.client.call(endpoint)).body.arrivals[0].id,
    booking.id,
  );
  assert.equal((await foreign.client.call(endpoint)).status, 404);
  const detail = (await director.client.call(`/partner/bookings/${booking.id}`))
    .body;
  assert.equal(
    (
      await director.client.call(
        `/partner/bookings/${booking.id}/check-in`,
        "POST",
        { version: detail.version },
      )
    ).status,
    201,
  );
  assert.equal(
    (await director.client.call(endpoint)).body.arrivals[0].status,
    "CHECKED_IN",
  );
  assert.equal(
    (
      await director.client.call(
        `/partner/bookings/daily?sanatorium_id=${first.id}&date=${through}`,
      )
    ).body.departures[0].id,
    booking.id,
  );
  const client = await customer(ctx.base, ctx.auth);
  const unpaid = (await hold(client, await quote(client, first, day, through)))
    .body;
  await ctx.db.booking.update({
    where: { id: unpaid.id },
    data: {
      status: "CONFIRMED",
      source: "PARTNER_MANUAL",
      holdExpiresAt: null,
    },
  });
  await ctx.db.offlinePayment.create({
    data: {
      sanatoriumId: first.id,
      bookingId: unpaid.id,
      amount: 1000n,
      method: "CASH",
      evidence: "Faqat sinov",
      status: "VERIFIED",
      recordedBy: director.membership.userId,
    },
  });
  const daily = (await director.client.call(endpoint)).body;
  assert.equal(
    daily.unpaid.find((row: any) => row.id === unpaid.id).remaining_amount,
    (BigInt(unpaid.amount) - 1000n).toString(),
  );
  assert.ok(!daily.unpaid.some((row: any) => row.id === booking.id));
});

test("Portal: direktor auditi o‘z sanatoriyasini va amal muallifini ko‘rsatadi", async () => {
  const result = await director.client.call(
    `/partner/audit?sanatorium_id=${first.id}`,
  );
  assert.equal(result.status, 200);
  assert.ok(result.body.total > 0);
  assert.ok(
    result.body.data.every((row: any) => row.sanatoriumId === first.id),
  );
  assert.ok(result.body.data.some((row: any) => row.actor_name));
  assert.equal(
    (await director.client.call(`/partner/audit?sanatorium_id=${second.id}`))
      .status,
    404,
  );
  assert.equal(
    (await foreign.client.call(`/partner/audit?sanatorium_id=${second.id}`))
      .status,
    403,
  );
});

test("Portal: haqiqiy XLSX matn/formulalarni ajratadi va katta summalarni aniq saqlaydi", () => {
  const report = {
    sanatorium: { id: first.id, name: '=HYPERLINK("x") & <Sinov>' },
    generated_at: new Date().toISOString(),
    period: {
      from: day,
      to: through,
      timezone: "Asia/Tashkent",
      booking_basis: "SERVICE",
    },
    bookings: 2,
    gmv: "9000000000000000000",
    occupancy: 0.5,
    booking_statuses: { CONFIRMED: 2 },
  };
  const data = reportXlsx(report);
  assert.equal(data.subarray(0, 4).toString("hex"), "504b0304");
  const archive = data.toString("utf8");
  assert.ok(archive.includes("inlineStr"));
  assert.ok(archive.includes("90000000000000000.00"));
  assert.ok(!archive.includes("<f>"));
  const folder = resolve("../../.local/portal-audit");
  mkdirSync(folder, { recursive: true });
  writeFileSync(resolve(folder, "xlsx-validation.xlsx"), data);
});

test("Portal: superadmin direktor parolini yangi qiymatga tiklaydi", async () => {
  const result = await ctx.admin.call(
    `/superadmin/staff/${director.membership.userId}/reset-password`,
    "POST",
    { new_password: nextPassword, confirm_password: nextPassword },
  );
  assert.equal(result.status, 201);
  assert.equal(result.body.success, true);
  assert.ok(!("temporary_password" in result.body));
  assert.equal((await director.client.call("/auth/me")).status, 401);
  assert.equal(
    (
      await director.client.call("/auth/staff/login", "POST", {
        login: "features.director",
        password: nextPassword,
      })
    ).status,
    201,
  );
});
