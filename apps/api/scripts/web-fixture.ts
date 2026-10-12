import { config } from "dotenv";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { randomUUID } from "node:crypto";
import { createServer } from "node:http";
import { Client, setup, staff, testPassword } from "../test/helpers";
import { sanatorium, customer, quote, hold, pay } from "../test/fixtures";
import { hash } from "../src/common/db";

const root = resolve(__dirname, "../../..");
const local = resolve(root, ".local");
const controlPath = resolve(local, "runtime/web-fixture-control.json");
const stopPath = resolve(local, "runtime/web-fixture-stop.json");
config({ path: resolve(root, "apps/api/.env"), quiet: true });
let closeFixture: (() => Promise<void>) | undefined;
let fixtureStage = "setup";

async function checked(
  client: Client,
  path: string,
  method = "GET",
  body?: unknown,
  headers?: Record<string, string>,
) {
  const result = await client.call(path, method, body, headers);
  if (result.status >= 400)
    throw new Error(
      `Fixture HTTP ${method} ${path}: ${result.status} ${result.body?.code ?? ""}`,
    );
  return result.body;
}

async function main() {
  mkdirSync(resolve(local, "runtime"), { recursive: true });
  if (process.argv.includes("--stop")) {
    const control = JSON.parse(readFileSync(controlPath, "utf8"));
    if (control.db !== "sihhat_test") throw new Error("Invalid fixture scope");
    writeFileSync(stopPath, JSON.stringify({ token: control.token }), {
      mode: 0o600,
    });
    console.log("Isolated browser fixture: stop requested.");
    return;
  }
  // setup accepts only sihhat_test and disables real payments, AI, SMS, push and Telegram.
  const ctx = await setup({ port: 4000 });
  closeFixture = () => ctx.app.close();
  const first = await sanatorium(ctx.admin, 6);
  const second = await sanatorium(ctx.admin, 6);
  fixtureStage = "staff";
  const director = await staff(
    ctx.admin,
    "browser.director",
    "+998921111110",
    first.id,
  );
  const reception = await staff(
    ctx.admin,
    "browser.reception",
    "+998921111111",
    first.id,
    false,
  );
  const member = await ctx.db.membership.findUniqueOrThrow({
    where: { id: reception.membership.id },
  });
  if (member.status === "PENDING_APPROVAL")
    await checked(
      ctx.admin,
      `/superadmin/staff-approvals/${member.id}/approve`,
      "POST",
      { version: member.version },
    );
  const accountantCreated = await checked(
    director.client,
    "/partner/staff-invitations",
    "POST",
    {
      sanatorium_id: first.id,
      role: "ACCOUNTANT",
      name: "Browser hisobchi",
      login: "browser.accountant",
      phone: "+998921111112",
      temporary_password: testPassword,
    },
  );
  await checked(
    ctx.admin,
    `/superadmin/staff-approvals/${accountantCreated.membership.id}/approve`,
    "POST",
    { version: accountantCreated.membership.version },
  );
  const accountantClient = new Client(ctx.base);
  await checked(accountantClient, "/auth/staff/login", "POST", {
    login: "browser.accountant",
    password: testPassword,
  });
  await checked(accountantClient, "/auth/change-password", "POST", {
    current_password: testPassword,
    new_password: `${testPassword}Changed`,
  });
  const date = (days: number) =>
    new Date(Date.now() + days * 86400000).toISOString().slice(0, 10);
  const client = await customer(ctx.base, ctx.auth);
  fixtureStage = "completed booking";
  async function paidBooking(days: number) {
    const calculation = await quote(client, first, date(days), date(days + 2));
    const held = await hold(client, calculation);
    if (held.status !== 201) throw new Error("Fixture hold failed");
    const booking = held.body;
    await pay(client, booking.id);
    return booking;
  }
  const completed = await paidBooking(120);
  fixtureStage = "check-in/out";
  let version = (await checked(ctx.admin, `/partner/bookings/${completed.id}`))
    .version;
  await checked(
    ctx.admin,
    `/partner/bookings/${completed.id}/check-in`,
    "POST",
    { version },
  );
  version = (await checked(ctx.admin, `/partner/bookings/${completed.id}`))
    .version;
  await checked(
    ctx.admin,
    `/partner/bookings/${completed.id}/check-out`,
    "POST",
    { version },
  );
  await checked(
    ctx.admin,
    "/superadmin/payouts",
    "POST",
    { sanatorium_id: first.id, booking_ids: [completed.id] },
    ctx.admin.key(),
  );
  fixtureStage = "refundable booking";
  const refundable = await paidBooking(130);
  await checked(
    client,
    `/customer/bookings/${refundable.id}/refund-request`,
    "POST",
    { reason: "Faqat UI sinovi uchun" },
    client.key(),
  );
  await checked(client, "/reviews", "POST", {
    booking_id: completed.id,
    rating: 4,
    text: "UI sinov sharhi",
  });
  fixtureStage = "communication";
  await checked(ctx.admin, "/superadmin/announcements", "POST", {
    title: "UI sinov xabari",
    body: "Faqat alohida test hisoblari uchun",
    kind: "MESSAGE",
    sanatorium_ids: [first.id],
  });
  await checked(
    ctx.admin,
    "/tasks",
    "POST",
    {
      sanatorium_id: first.id,
      assigned_to: director.membership.userId,
      title: "UI sinov vazifasi",
      body: "Lokal tekshiruvni yakunlang",
      due_at: new Date(Date.now() + 86400000).toISOString(),
    },
    ctx.admin.key(),
  );
  const plan = await checked(
    ctx.admin,
    "/superadmin/subscription-plans",
    "POST",
    {
      name: "UI sinov tarifi",
      amount: "10000",
      period_days: 30,
      grace_days: 3,
      features: ["Katalog"],
    },
  );
  fixtureStage = "subscription";
  await checked(
    ctx.admin,
    "/superadmin/subscriptions",
    "POST",
    { sanatorium_id: first.id, plan_id: plan.id, trial_days: 30 },
    ctx.admin.key(),
  );
  const notificationEvent = await ctx.db.outboxEvent.create({
    data: {
      topic: "task.assigned",
      payload: { recipient_ids: [director.membership.userId] },
    },
  });
  await ctx.db.notificationDelivery.create({
    data: {
      eventId: notificationEvent.id,
      userId: director.membership.userId,
      channel: "IN_APP",
      status: "SENT",
      sentAt: new Date(),
      payload: { topic: "task.assigned" },
    },
  });
  const customerAccount = await checked(client, "/auth/me");
  await ctx.db.sanatorium.update({
    where: { id: second.id },
    data: { name: "Ikkinchi sinov sanatoriyasi" },
  });
  const secondRevision = await ctx.db.sanatoriumRevision.findUniqueOrThrow({
    where: { id: second.revision.id },
  });
  await ctx.db.sanatoriumRevision.update({
    where: { id: second.revision.id },
    data: {
      data: {
        ...(secondRevision.data as any),
        name: "Ikkinchi sinov sanatoriyasi",
      },
    },
  });
  const mobileFixture = {
    key: randomUUID(),
    phone: customerAccount.phone,
    sanatorium_id: first.id,
  };
  const mobileBridge = createServer(async (request, response) => {
    response.setHeader("Content-Type", "application/json");
    response.setHeader("Cache-Control", "no-store");
    if (request.headers["x-test-key"] !== mobileFixture.key) {
      response.writeHead(403);
      return response.end("{}");
    }
    try {
      if (request.method === "GET" && request.url === "/fixture") {
        const target = await ctx.db.sanatorium.findUniqueOrThrow({
          where: { id: first.id },
        });
        const revision = target.publicRevisionId
          ? await ctx.db.sanatoriumRevision.findUnique({
              where: { id: target.publicRevisionId },
            })
          : null;
        return response.end(
          JSON.stringify({
            ...mobileFixture,
            key: undefined,
            sanatorium_name: (revision?.data as any)?.name ?? target.name,
          }),
        );
      }
      const match = /^\/otp\/([a-f0-9-]{36})$/.exec(request.url ?? "");
      if (request.method === "GET" && match) {
        const challenge = await ctx.db.otpChallenge.findUnique({
          where: { id: match[1] },
        });
        const code = ctx.auth.sms.sent.get(match[1]);
        if (
          !challenge ||
          challenge.phone !== mobileFixture.phone ||
          challenge.expiresAt <= new Date() ||
          !code
        )
          throw new Error("Invalid fixture OTP");
        return response.end(JSON.stringify({ code }));
      }
      response.writeHead(404);
      response.end("{}");
    } catch {
      response.writeHead(400);
      response.end('{"error":"Mahalliy sinov so‘rovi bajarilmadi"}');
    }
  });
  await new Promise<void>((resolveReady, reject) => {
    mobileBridge.once("error", reject);
    mobileBridge.listen(4001, "127.0.0.1", resolveReady);
  });
  const closeApi = closeFixture;
  closeFixture = async () => {
    await new Promise<void>((resolveClosed) =>
      mobileBridge.close(() => resolveClosed()),
    );
    await closeApi?.();
  };
  writeFileSync(
    resolve(local, "mobile-test.json"),
    JSON.stringify(mobileFixture),
    { mode: 0o600 },
  );
  const access = {
    customer: { phone: customerAccount.phone, user_id: customerAccount.id },
    sanatoriums: [first, second].map((s) => ({
      id: s.id,
      rate_id: s.rate.id,
      room_type_id: s.type.id,
    })),
    admin: {
      login: "admin.test",
      password: testPassword,
      mfa_secret: ctx.secret,
    },
    director: { login: "browser.director", password: `${testPassword}Changed` },
    reception: {
      login: "browser.reception",
      password: `${testPassword}Changed`,
    },
    accountant: {
      login: "browser.accountant",
      password: `${testPassword}Changed`,
    },
  };
  writeFileSync(
    resolve(local, "browser-test-access.json"),
    JSON.stringify(access),
    { mode: 0o600 },
  );
  writeFileSync(
    resolve(local, "runtime/web-test-mfa-step.json"),
    JSON.stringify({ step: Math.floor(Date.now() / 30000) }),
  );
  const token = randomUUID();
  writeFileSync(
    controlPath,
    JSON.stringify({ pid: process.pid, token, db: "sihhat_test" }),
    { mode: 0o600 },
  );
  // Repeated fresh UI logins are not a rate-limit stress test. Reset only these
  // synthetic fixture login counters; MFA replay protection remains enabled.
  const loginCounters = [
    "staff-login-ip:127.0.0.1",
    "staff-login:admin.test",
    "staff-login:browser.director",
    "staff-login:browser.reception",
    "staff-login:browser.accountant",
  ].map(hash);
  await ctx.db.rateLimit.deleteMany({ where: { id: { in: loginCounters } } });
  let lastCounterReset = Date.now();
  const interval = setInterval(() => {
    if (Date.now() - lastCounterReset >= 60000) {
      lastCounterReset = Date.now();
      void ctx.db.rateLimit
        .deleteMany({ where: { id: { in: loginCounters } } })
        .catch(() => undefined);
    }
    if (!existsSync(stopPath)) return;
    try {
      if (JSON.parse(readFileSync(stopPath, "utf8")).token === token) {
        clearInterval(interval);
        void closeFixture?.();
      }
    } catch {
      /* Ignore stale or incomplete requests. */
    }
  }, 250);
  console.log(
    JSON.stringify({
      ready: true,
      db: "sihhat_test",
      port: 4000,
      real_providers: false,
    }),
  );
}

main().catch(async (error) => {
  console.error(`Fixture stage: ${fixtureStage}`);
  try {
    const code = JSON.parse(error.message)?.code;
    if (typeof code === "string" && /^[A-Z_]{2,50}$/.test(code))
      console.error(`Fixture error code: ${code}`);
  } catch {
    /* Secret-bearing error text is never printed. */
  }
  if (error instanceof Error && error.message.startsWith("Fixture HTTP "))
    console.error(error.message);
  console.error(
    "Isolated browser fixture failed. Check the test database and free port 4000. Secret values were not printed.",
  );
  await closeFixture?.();
  process.exitCode = 1;
});
