import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { setup, staff } from "./helpers";
import { sanatorium, pixel } from "./fixtures";

let ctx: Awaited<ReturnType<typeof setup>>,
  s: Awaited<ReturnType<typeof sanatorium>>;
before(async () => {
  ctx = await setup();
  s = await sanatorium(ctx.admin);
});
after(async () => ctx.app.close());
const payload = () => ({
  sanatorium_id: s.id,
  title: "Yangi taklif",
  placement: "HOME",
  starts_at: new Date(Date.now() - 60000).toISOString(),
  ends_at: new Date(Date.now() + 86400000).toISOString(),
  image_asset_id: s.photo.id,
  text: "Dam olish uchun taklif",
});

test("ads: two placements, external link or sanatorium, discount and one campaign for repeated key", async () => {
  const input = {
    ...payload(),
    placement: "POPUP",
    target_kind: "URL",
    target_url: "https://example.com/taklif",
    has_discount: true,
    discount_percent: 15,
    discount_text: "Ish kunlari uchun",
  };
  const key = ctx.admin.key();
  const [one, two] = await Promise.all([
    ctx.admin.call("/partner/ad-campaigns", "POST", input, key),
    ctx.admin.call("/partner/ad-campaigns", "POST", input, key),
  ]);
  assert.equal(one.status, 201);
  assert.equal(two.body.id, one.body.id);
  assert.equal(
    await ctx.db.adCampaign.count({ where: { id: one.body.id } }),
    1,
  );
  assert.equal(
    (
      await ctx.admin.call(
        `/superadmin/ad-campaigns/${one.body.id}/approve`,
        "POST",
        {},
      )
    ).status,
    201,
  );
  const ad = (await ctx.admin.call("/catalog/ads")).body.find(
    (a: any) => a.id === one.body.id,
  );
  assert.equal(ad.placement, "POPUP");
  assert.deepEqual(ad.target, { kind: "URL", url: input.target_url });
  assert.equal(ad.discount_percent, 15);
  assert.equal(ad.has_discount, true);
  const second = await ctx.admin.call("/partner/ad-campaigns", "POST", {
    ...payload(),
    target_kind: "SANATORIUM",
    target_sanatorium_id: s.id,
  });
  assert.equal(second.status, 201);
  await ctx.admin.call(
    `/superadmin/ad-campaigns/${second.body.id}/approve`,
    "POST",
    {},
  );
  const home = (await ctx.admin.call("/catalog/ads")).body.find(
    (a: any) => a.id === second.body.id,
  );
  assert.equal(home.placement, "HOME");
  assert.deepEqual(home.target, { kind: "SANATORIUM", sanatorium_id: s.id });
  assert.equal(home.has_discount, false);
});

test("ads: uploaded advertisement image is private before approval and public only during publication", async () => {
  const uploaded = await ctx.admin.call("/partner/media", "POST", {
    sanatorium_id: s.id,
    visibility: "PUBLIC",
    mime: "image/png",
    base64:
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+j8XcAAAAASUVORK5CYII=",
  });
  assert.equal(uploaded.status, 201);
  const publicImage = () => fetch(`${ctx.base}/media/${uploaded.body.id}`);
  assert.equal((await publicImage()).status, 404);
  const created = await ctx.admin.call("/partner/ad-campaigns", "POST", {
    ...payload(),
    image_asset_id: uploaded.body.id,
  });
  assert.equal(created.status, 201);
  assert.equal((await publicImage()).status, 404);
  await ctx.admin.call(
    `/superadmin/ad-campaigns/${created.body.id}/approve`,
    "POST",
    {},
  );
  const image = await publicImage();
  assert.equal(image.status, 200);
  assert.match(image.headers.get("content-type") ?? "", /image\/png/);
  const other = await sanatorium(ctx.admin);
  const director = await staff(
    ctx.admin,
    "ad.other",
    "+998931445555",
    other.id,
  );
  assert.equal(
    (
      await director.client.call(
        `/partner/ad-campaigns/${created.body.id}/archive`,
        "POST",
        {},
      )
    ).status,
    404,
  );
  assert.equal(
    (
      await ctx.admin.call(
        `/partner/ad-campaigns/${created.body.id}/archive`,
        "POST",
        {},
      )
    ).status,
    201,
  );
  assert.equal((await publicImage()).status, 404);
  assert.ok(
    !(await ctx.admin.call("/catalog/ads")).body.some(
      (a: any) => a.id === created.body.id,
    ),
  );
});

test("ads: missing target, unsafe links, missing discount and foreign image are rejected", async () => {
  for (const extra of [
    { placement: "SEARCH" },
    { target_kind: "URL" },
    { target_kind: "URL", target_url: "javascript:alert(1)" },
    { target_kind: "URL", target_url: "https://user:pass@example.com" },
    { has_discount: true },
    { has_discount: true, discount_percent: 101 },
    { target_sanatorium_id: randomUUID() },
  ]) {
    const result = await ctx.admin.call("/partner/ad-campaigns", "POST", {
      ...payload(),
      ...extra,
    });
    assert.equal(result.status, 422);
  }
  const other = await sanatorium(ctx.admin);
  assert.equal(
    (
      await ctx.admin.call("/partner/ad-campaigns", "POST", {
        ...payload(),
        image_asset_id: other.photo.id,
      })
    ).status,
    404,
  );
});

test("ads: approval, feed and image follow the active destination instead of the paused owner", async () => {
  const owner = (
    await ctx.admin.call("/superadmin/sanatoriums", "POST", {
      name: "Reklama egasi",
    })
  ).body;
  await ctx.db.sanatorium.update({
    where: { id: owner.id },
    data: { status: "PAUSED" },
  });
  const image = (
    await ctx.admin.call("/partner/media", "POST", {
      sanatorium_id: owner.id,
      visibility: "PUBLIC",
      mime: "image/png",
      base64: pixel,
    })
  ).body;
  const input = {
    ...payload(),
    sanatorium_id: owner.id,
    image_asset_id: image.id,
    target_kind: "SANATORIUM",
    target_sanatorium_id: s.id,
  };
  const requested = await ctx.admin.call(
    "/partner/ad-campaigns",
    "POST",
    input,
  );
  assert.equal(requested.status, 201);
  const path = "/superadmin/ad-campaigns/" + requested.body.id;
  const anonymousImage = () => fetch(ctx.base + "/media/" + image.id);
  assert.equal((await anonymousImage()).status, 404);
  const approved = await ctx.admin.call(path + "/approve", "POST", {
    version: requested.body.version,
  });
  assert.equal(approved.status, 201);
  assert.equal(
    (await ctx.admin.call("/catalog/ads")).body.find(
      (a: any) => a.id === requested.body.id,
    ).target.sanatorium_id,
    s.id,
  );
  assert.equal(
    (await ctx.admin.call("/superadmin/ad-campaigns")).body.find(
      (a: any) => a.id === requested.body.id,
    ).publication_status,
    "LIVE",
  );
  assert.equal((await anonymousImage()).status, 200);
  try {
    await ctx.db.sanatorium.update({
      where: { id: s.id },
      data: { status: "PAUSED" },
    });
    assert.equal(
      (await ctx.admin.call("/catalog/ads")).body.some(
        (a: any) => a.id === requested.body.id,
      ),
      false,
    );
    assert.equal(
      (await ctx.admin.call("/superadmin/ad-campaigns")).body.find(
        (a: any) => a.id === requested.body.id,
      ).publication_status,
      "SANATORIUM_HIDDEN",
    );
    assert.equal((await anonymousImage()).status, 404);
    assert.equal(
      (
        await ctx.admin.call(path + "/approve", "POST", {
          version: approved.body.version,
        })
      ).body.code,
      "SANATORIUM_NOT_PUBLIC",
    );
    const { target_sanatorium_id, ...external } = input;
    const changed = await ctx.admin.call(path, "PATCH", {
      ...external,
      target_kind: "URL",
      target_url: "https://example.com/taklif",
      version: approved.body.version,
    });
    assert.equal(changed.status, 200);
    assert.equal(changed.body.status, "PENDING");
    assert.equal((await anonymousImage()).status, 404);
    assert.equal(
      (
        await ctx.admin.call(path + "/approve", "POST", {
          version: changed.body.version,
        })
      ).status,
      201,
    );
    assert.equal(
      (await ctx.admin.call("/catalog/ads")).body.find(
        (a: any) => a.id === requested.body.id,
      ).target.kind,
      "URL",
    );
    assert.equal((await anonymousImage()).status, 200);
  } finally {
    await ctx.db.sanatorium.update({
      where: { id: s.id },
      data: { status: "ACTIVE" },
    });
  }
});

test("ads: editing withdraws publication, checks versions and permissions, and allows stop, resume and reschedule", async () => {
  const uploaded = (
    await ctx.admin.call("/partner/media", "POST", {
      sanatorium_id: s.id,
      visibility: "PUBLIC",
      mime: "image/png",
      base64: pixel,
    })
  ).body;
  const input = {
    ...payload(),
    image_asset_id: uploaded.id,
    target_kind: "URL",
    target_url: "https://example.com/first",
  };
  const requested = await ctx.admin.call(
    "/partner/ad-campaigns",
    "POST",
    input,
  );
  assert.equal(requested.status, 201);
  const path = "/superadmin/ad-campaigns/" + requested.body.id;
  let current = (
    await ctx.admin.call(path + "/approve", "POST", {
      version: requested.body.version,
    })
  ).body;
  const update = {
    ...input,
    title: "Yangilangan reklama",
    placement: "POPUP",
    target_url: "https://example.com/changed",
    has_discount: true,
    discount_percent: 20,
  };
  assert.equal(
    (
      await ctx.admin.call(path, "PATCH", {
        ...update,
        version: requested.body.version,
      })
    ).body.code,
    "VERSION_CONFLICT",
  );
  const director = await staff(
    ctx.admin,
    "ad.manage.director",
    "+998931445556",
    s.id,
  );
  assert.equal(
    (
      await director.client.call(path, "PATCH", {
        ...update,
        version: current.version,
      })
    ).status,
    403,
  );
  assert.equal(
    (
      await director.client.call(path + "/approve", "POST", {
        version: current.version,
      })
    ).status,
    403,
  );
  const other = await sanatorium(ctx.admin);
  assert.equal(
    (
      await ctx.admin.call(path, "PATCH", {
        ...update,
        image_asset_id: other.photo.id,
        version: current.version,
      })
    ).body.code,
    "AD_IMAGE_MISSING",
  );
  assert.equal(
    (
      await ctx.admin.call(path, "PATCH", {
        ...update,
        sanatorium_id: other.id,
        version: current.version,
      })
    ).body.code,
    "AD_SCOPE_CHANGE",
  );
  const saved = await ctx.admin.call(path, "PATCH", {
    ...update,
    version: current.version,
  });
  assert.equal(saved.status, 200);
  assert.equal(saved.body.version, current.version + 1);
  assert.equal(saved.body.status, "PENDING");
  assert.equal(
    (await ctx.admin.call("/catalog/ads")).body.some(
      (a: any) => a.id === requested.body.id,
    ),
    false,
  );
  assert.equal((await fetch(ctx.base + "/media/" + uploaded.id)).status, 404);
  assert.equal(
    (
      await ctx.admin.call(path + "/approve", "POST", {
        version: current.version,
      })
    ).body.code,
    "VERSION_CONFLICT",
  );
  current = (
    await ctx.admin.call(path + "/approve", "POST", {
      version: saved.body.version,
    })
  ).body;
  const published = (await ctx.admin.call("/catalog/ads")).body.find(
    (a: any) => a.id === requested.body.id,
  );
  assert.equal(published.title, update.title);
  assert.equal(published.placement, "POPUP");
  assert.equal(published.target.url, update.target_url);
  assert.equal(published.discount_percent, 20);
  const archived = await ctx.admin.call(
    "/partner/ad-campaigns/" + requested.body.id + "/archive",
    "POST",
    { version: current.version },
  );
  assert.equal(archived.status, 201);
  assert.equal(archived.body.status, "ARCHIVED");
  assert.equal(
    (await ctx.admin.call("/catalog/ads")).body.some(
      (a: any) => a.id === requested.body.id,
    ),
    false,
  );
  assert.equal((await fetch(ctx.base + "/media/" + uploaded.id)).status, 404);
  assert.equal(
    (
      await ctx.admin.call(path + "/approve", "POST", {
        version: current.version,
      })
    ).body.code,
    "VERSION_CONFLICT",
  );
  const resumed = await ctx.admin.call(path + "/approve", "POST", {
    version: archived.body.version,
  });
  assert.equal(resumed.status, 201);
  assert.equal((await fetch(ctx.base + "/media/" + uploaded.id)).status, 200);
  const scheduled = await ctx.admin.call(path, "PATCH", {
    ...update,
    version: resumed.body.version,
    starts_at: new Date(Date.now() + 3600000).toISOString(),
    ends_at: new Date(Date.now() + 7200000).toISOString(),
  });
  assert.equal(scheduled.status, 200);
  assert.equal(
    (
      await ctx.admin.call(path + "/approve", "POST", {
        version: scheduled.body.version,
      })
    ).status,
    201,
  );
  assert.equal(
    (await ctx.admin.call("/superadmin/ad-campaigns")).body.find(
      (a: any) => a.id === requested.body.id,
    ).publication_status,
    "SCHEDULED",
  );
  assert.equal((await fetch(ctx.base + "/media/" + uploaded.id)).status, 404);
  await ctx.db.adCampaign.update({
    where: { id: requested.body.id },
    data: {
      startsAt: new Date(Date.now() - 7200000),
      endsAt: new Date(Date.now() - 3600000),
    },
  });
  assert.equal(
    (await ctx.admin.call(path + "/approve", "POST", {})).body.code,
    "AD_EXPIRED",
  );
  assert.equal(
    (await ctx.admin.call("/superadmin/ad-campaigns")).body.find(
      (a: any) => a.id === requested.body.id,
    ).publication_status,
    "EXPIRED",
  );
});

test("ads: resuming preserves paid invoice history and unresolved payments still block free publication", async () => {
  const requested = (
    await ctx.admin.call("/partner/ad-campaigns", "POST", payload())
  ).body;
  const invoice = await ctx.db.invoice.create({
    data: {
      sanatoriumId: s.id,
      purpose: "AD",
      sourceKey: "ad-paid-history:" + randomUUID(),
      amount: 15000n,
      startsAt: new Date(payload().starts_at),
      endsAt: new Date(payload().ends_at),
      status: "PAID",
      data: {},
    },
  });
  await ctx.db.adCampaign.update({
    where: { id: requested.id },
    data: { status: "APPROVED", invoiceId: invoice.id, amount: invoice.amount },
  });
  const ledgerCount = await ctx.db.ledgerJournal.count();
  const archived = await ctx.admin.call(
    "/partner/ad-campaigns/" + requested.id + "/archive",
    "POST",
    {},
  );
  const resumed = await ctx.admin.call(
    "/superadmin/ad-campaigns/" + requested.id + "/approve",
    "POST",
    { version: archived.body.version },
  );
  assert.equal(resumed.status, 201);
  assert.equal(resumed.body.status, "APPROVED");
  assert.equal(resumed.body.invoiceId, invoice.id);
  assert.equal(resumed.body.amount, "15000");
  assert.equal(
    (await ctx.db.invoice.findUniqueOrThrow({ where: { id: invoice.id } }))
      .status,
    "PAID",
  );
  assert.equal(await ctx.db.ledgerJournal.count(), ledgerCount);
  assert.equal(
    (await ctx.admin.call("/catalog/ads")).body.some(
      (a: any) => a.id === requested.id,
    ),
    true,
  );
  assert.equal(
    (
      await ctx.admin.call(
        "/superadmin/ad-campaigns/" + requested.id,
        "PATCH",
        { ...payload(), version: resumed.body.version },
      )
    ).body.code,
    "AD_PAYMENT_HISTORY",
  );
  const pending = (
    await ctx.admin.call("/partner/ad-campaigns", "POST", payload())
  ).body;
  const unpaid = await ctx.db.invoice.create({
    data: {
      sanatoriumId: s.id,
      purpose: "AD",
      sourceKey: "ad-pending-history:" + randomUUID(),
      amount: 15000n,
      startsAt: new Date(payload().starts_at),
      endsAt: new Date(payload().ends_at),
      status: "UNPAID",
      data: {},
    },
  });
  const adminId = (await ctx.admin.call("/auth/me")).body.id;
  const order = await ctx.db.paymentOrder.create({
    data: {
      invoiceId: unpaid.id,
      sanatoriumId: s.id,
      userId: adminId,
      purpose: "AD",
      amount: unpaid.amount,
      status: "PENDING",
    },
  });
  await ctx.db.adCampaign.update({
    where: { id: pending.id },
    data: { invoiceId: unpaid.id, amount: unpaid.amount },
  });
  assert.equal(
    (
      await ctx.admin.call(
        "/superadmin/ad-campaigns/" + pending.id + "/approve",
        "POST",
        {},
      )
    ).body.code,
    "PAYMENT_RECONCILIATION_REQUIRED",
  );
  assert.equal(
    (await ctx.db.invoice.findUniqueOrThrow({ where: { id: unpaid.id } }))
      .status,
    "UNPAID",
  );
  assert.equal(
    (await ctx.db.paymentOrder.findUniqueOrThrow({ where: { id: order.id } }))
      .status,
    "PENDING",
  );
});

test("ads: OpenAPI includes guarded editing and versioned publication controls", () => {
  const paths = ctx.document.paths as any;
  const update = paths["/superadmin/ad-campaigns/{id}"].patch;
  assert.deepEqual(update["x-roles"], ["SUPERADMIN"]);
  const schema = update.requestBody.content["application/json"].schema;
  assert.ok(schema.required.includes("version"));
  assert.ok(schema.required.includes("image_asset_id"));
  assert.ok(schema.properties.placement.enum.includes("POPUP"));
  assert.ok(
    paths["/superadmin/ad-campaigns/{id}/approve"].post.requestBody.content[
      "application/json"
    ].schema.properties.version,
  );
  assert.ok(
    paths["/partner/ad-campaigns/{id}/archive"].post.requestBody.content[
      "application/json"
    ].schema.properties.version,
  );
});
