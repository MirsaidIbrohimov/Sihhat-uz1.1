import { before, after, test } from "node:test";
import assert from "node:assert/strict";
import { setup, staff, Client } from "./helpers";
import { sanatorium, customer } from "./fixtures";
import { hash } from "../src/common/db";

let ctx: Awaited<ReturnType<typeof setup>>;
const users: Record<string, string> = {};
before(async () => {
  ctx = await setup();
  users.admin = (await ctx.admin.call("/auth/me")).body.id;
  const s = await sanatorium(ctx.admin);
  users.director = (
    await staff(ctx.admin, "idle.director", "+998921222221", s.id)
  ).membership.userId;
  const rec = await staff(
    ctx.admin,
    "idle.reception",
    "+998921222222",
    s.id,
    false,
  );
  users.reception = rec.membership.userId;
});
after(async () => {
  await ctx?.app.close();
});

async function web(role: string, idleMs: number) {
  const issued = await ctx.db.atomic((tx) =>
    ctx.auth.issue(tx, users[role], "WEB", new Date(Date.now() - idleMs)),
  );
  await ctx.db.session.update({
    where: { id: issued.session_id },
    data: { expiresAt: new Date(Date.now() + 86400000) },
  });
  const c = new Client(ctx.base);
  c.cookies.set("sihhat_access", issued.access_token);
  c.cookies.set("sihhat_refresh", issued.refresh_token);
  c.cookies.set("sihhat_csrf", issued.csrf_token);
  c.csrf = issued.csrf_token;
  return { c, issued };
}

for (const [role, seconds] of [
  ["admin", 7200],
  ["director", 14400],
  ["reception", 14400],
] as const) {
  test(`Web idle: ${role} expires at ${seconds} seconds; polling never extends activity`, async () => {
    const { c, issued } = await web(role, (seconds - 10) * 1000);
    const stamp = (
      await ctx.db.session.findUniqueOrThrow({
        where: { id: issued.session_id },
      })
    ).lastActivityAt;
    const me = await c.call("/auth/me");
    assert.equal(me.status, 200);
    assert.equal(me.body.idleTimeoutSeconds, seconds);
    assert.equal((await c.call("/auth/me")).status, 200);
    assert.equal(
      (
        await ctx.db.session.findUniqueOrThrow({
          where: { id: issued.session_id },
        })
      ).lastActivityAt.toISOString(),
      stamp.toISOString(),
    );
    await ctx.db.session.update({
      where: { id: issued.session_id },
      data: { lastActivityAt: new Date(Date.now() - seconds * 1000) },
    });
    assert.equal((await c.call("/auth/me")).status, 401);
    assert.equal((await c.call("/auth/activity", "POST", {})).status, 401);
    assert.equal((await c.call("/auth/refresh", "POST", {})).status, 401);
    assert.ok(
      (
        await ctx.db.session.findUniqueOrThrow({
          where: { id: issued.session_id },
        })
      ).revokedAt,
    );
  });
  test(`Web idle: ${role} cannot use an expired refresh cookie`, async () => {
    const { c, issued } = await web(role, seconds * 1000 + 1000);
    const refreshed = await c.call("/auth/refresh", "POST", {});
    assert.equal(refreshed.status, 401);
    assert.equal(refreshed.body.code, "SESSION_IDLE_EXPIRED");
    assert.ok(
      (
        await ctx.db.session.findUniqueOrThrow({
          where: { id: issued.session_id },
        })
      ).revokedAt,
    );
  });
}

test("Web idle: explicit activity requires CSRF; rotation preserves the activity timestamp", async () => {
  const { c, issued } = await web("director", 3600000);
  const stamp = (
    await ctx.db.session.findUniqueOrThrow({ where: { id: issued.session_id } })
  ).lastActivityAt;
  assert.equal(
    (await c.call("/auth/activity", "POST", {}, { "X-CSRF-Token": "invalid" }))
      .status,
    403,
  );
  assert.equal(
    (
      await ctx.db.session.findUniqueOrThrow({
        where: { id: issued.session_id },
      })
    ).lastActivityAt.toISOString(),
    stamp.toISOString(),
  );
  const activity = await c.call("/auth/activity", "POST", {});
  assert.equal(activity.status, 201);
  assert.equal(activity.body.idle_timeout_seconds, 14400);
  const renewedStamp = activity.body.last_activity_at;
  assert.equal((await c.call("/auth/refresh", "POST", {})).status, 201);
  const me = await c.call("/auth/me");
  assert.equal(me.status, 200);
  assert.equal(me.body.lastActivityAt, renewedStamp);
  assert.notEqual(me.body.sessionId, issued.session_id);
});

test("Mobile customer refresh remains independent of the management-panel idle policy", async () => {
  const c = await customer(ctx.base, ctx.auth);
  const session = await ctx.db.session.findUniqueOrThrow({
    where: { tokenHash: hash(c.token) },
  });
  await ctx.db.session.update({
    where: { id: session.id },
    data: { lastActivityAt: new Date(Date.now() - 2 * 86400000) },
  });
  const me = await c.call("/auth/me");
  assert.equal(me.status, 200);
  assert.equal(me.body.idleTimeoutSeconds, null);
});
