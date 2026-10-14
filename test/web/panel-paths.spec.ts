import { test, expect, type Page } from "@playwright/test";

const origin = "http://localhost:3001";

async function mockSession(
  page: Page,
  kind?: "SUPERADMIN" | "STAFF" | "CUSTOMER",
) {
  await page.route("**/api/**", async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path === "/api/auth/me" || path === "/api/auth/refresh") {
      if (!kind) {
        await route.fulfill({
          status: 401,
          json: { code: "UNAUTHORIZED", message: "Kirish kerak" },
        });
        return;
      }
      await route.fulfill({
        json: {
          id: "panel-paths-fixture",
          kind,
          name: "Yo‘l sinovi",
          mustChangePassword: false,
          memberships:
            kind === "STAFF"
              ? [
                  {
                    id: "membership-fixture",
                    sanatoriumId: "sanatorium-fixture",
                    role: "DIRECTOR",
                    status: "ACTIVE",
                    version: 1,
                    permissions: ["bookings.read", "reports.operational.read"],
                  },
                ]
              : [],
        },
      });
      return;
    }
    await route.fulfill({
      json: {
        data: path.endsWith("/sanatoriums")
          ? [{ id: "sanatorium-fixture", name: "Sinov sanatoriyasi" }]
          : [],
        total: 0,
        page: 1,
        pages: 1,
        limit: 20,
      },
    });
  });
}

for (const [basePath, deniedKinds] of [
  ["/superadmin", ["STAFF", "CUSTOMER"]],
  ["/hamkorlar", ["SUPERADMIN", "CUSTOMER"]],
] as const) {
  for (const kind of deniedKinds) {
    test(`${basePath}: ${kind} cannot open the dashboard or request panel data`, async ({
      page,
    }) => {
      const panelRequests: string[] = [];
      page.on("request", (request) => {
        const path = new URL(request.url()).pathname;
        if (/^\/api\/(superadmin|partner)(\/|$)/.test(path)) {
          panelRequests.push(path);
        }
      });
      await mockSession(page, kind);
      await page.goto(origin + basePath + "/bookings");
      await expect(page.getByLabel("Login", { exact: true })).toBeVisible();
      await expect(
        page.getByRole("button", { name: "Chiqish", exact: true }),
      ).toHaveCount(0);
      await expect(page.locator("#portal-sidebar")).toHaveCount(0);
      await page.reload();
      await expect(page.getByLabel("Login", { exact: true })).toBeVisible();
      expect(panelRequests).toEqual([]);
    });
  }
}

test("staff credentials entered on the superadmin form cannot open the panel", async ({
  page,
}) => {
  await mockSession(page, "STAFF");
  let loggedOut = false;
  await page.route("**/api/auth/logout", async (route) => {
    loggedOut = true;
    await route.fulfill({ json: { ok: true } });
  });
  await page.goto(origin + "/superadmin");
  await page.getByLabel("Login", { exact: true }).fill("staff.fixture");
  await page
    .getByLabel("Parol", { exact: true })
    .fill("Fixture-Password-2026!");
  await page
    .getByRole("textbox", { name: /^Autentifikator kodi/ })
    .fill("123456");
  await page.getByRole("button", { name: "Kirish", exact: true }).click();
  await expect(
    page.getByText("Bu panel uchun tegishli xodim hisobi bilan kiring."),
  ).toBeVisible();
  expect(loggedOut).toBe(true);
  await expect(page.locator("#portal-sidebar")).toHaveCount(0);
});

test("domen yo‘llari to‘g‘ri login va MFA maydonini ochadi", async ({
  page,
}) => {
  await mockSession(page);
  await page.goto(origin + "/superadmin");
  await expect(page).toHaveTitle("Sihhat.uz · Boshqaruv");
  await expect(
    page.getByRole("textbox", { name: /^Autentifikator kodi/ }),
  ).toBeVisible();
  await page.goto(origin + "/hamkorlar");
  await expect(page).toHaveTitle("Sihhat.uz · Sanatoriya");
  await expect(page.getByLabel("Login", { exact: true })).toBeVisible();
  await expect(
    page.getByRole("textbox", { name: /^Autentifikator kodi/ }),
  ).toHaveCount(0);
});

for (const [basePath, kind] of [
  ["/superadmin", "SUPERADMIN"],
  ["/hamkorlar", "STAFF"],
] as const) {
  test(`${basePath}: menyu, reload va orqaga yurish panel yo‘lini saqlaydi`, async ({
    page,
  }) => {
    await mockSession(page, kind);
    await page.goto(origin + basePath + "/bookings");
    await expect(
      page.getByRole("button", { name: "Chiqish", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Bronlar", exact: true }),
    ).toHaveAttribute("aria-current", "page");
    await expect(page.locator("a.brand")).toHaveAttribute("href", basePath);
    await page.locator('button[aria-label="Bildirishnomalar"]').click();
    await expect(page).toHaveURL(origin + basePath + "/notifications");
    await page.reload();
    await expect(
      page.getByRole("button", { name: "Chiqish", exact: true }),
    ).toBeVisible();
    await page.goBack();
    await expect(page).toHaveURL(origin + basePath + "/bookings");
    await expect(
      page.getByRole("button", { name: "Bronlar", exact: true }),
    ).toHaveAttribute("aria-current", "page");
  });
}
