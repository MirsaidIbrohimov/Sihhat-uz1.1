import assert from "node:assert/strict";
import test from "node:test";
import { portalSection, portalUrl } from "../packages/ui/src/portal-routes";

test("panel navigation and reload stay within the chosen panel", () => {
  for (const basePath of ["/superadmin", "/hamkorlar"]) {
    assert.equal(portalSection(basePath, basePath), "dashboard");
    assert.equal(portalSection(basePath + "/", basePath), "dashboard");
    const report = portalUrl("finance", basePath, {
      period: "month",
      search: "ikki so‘z",
    });
    const url = new URL(report, "https://sihhat.uz");
    assert.equal(url.pathname, basePath + "/finance");
    assert.equal(portalSection(url.pathname, basePath), "finance");
    assert.equal(url.searchParams.get("search"), "ikki so‘z");
    assert.equal(portalUrl("dashboard", basePath), basePath);
  }
});

test("existing standalone panels keep their root routes", () => {
  assert.equal(portalUrl("dashboard"), "/");
  assert.equal(portalUrl("bookings"), "/bookings");
  assert.equal(portalSection("/"), "dashboard");
  assert.equal(portalSection("/bookings"), "bookings");
  assert.equal(
    portalSection("/superadministrator", "/superadmin"),
    "superadministrator",
  );
});
