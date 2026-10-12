import { test, expect, type Page, type Locator } from "@playwright/test";
import { readFileSync, mkdirSync } from "node:fs";
const access = JSON.parse(
  readFileSync(".local/browser-test-access.json", "utf8"),
);

async function api(page: Page, path: string, method = "GET", body?: unknown) {
  return page.evaluate(
    async ({ path, method, body }) => {
      const csrf =
        document.cookie
          .split("; ")
          .find((c) => c.startsWith("sihhat_csrf="))
          ?.slice(12) ?? "";
      const response = await fetch("/api" + path, {
        method,
        headers: {
          "Content-Type": "application/json",
          "X-CSRF-Token": decodeURIComponent(csrf),
        },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      });
      return { status: response.status, body: await response.json() };
    },
    { path, method, body },
  );
}
async function login(
  page: Page,
  role: "director" | "reception" | "accountant",
  password = access[role].password,
) {
  await page.goto("http://localhost:3001");
  await page.getByLabel("Login", { exact: true }).fill(access[role].login);
  await page.getByLabel("Parol", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Kirish", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Chiqish", exact: true }),
  ).toBeVisible();
}
async function section(page: Page, name: string) {
  const drawer = page.getByRole("button", {
    name: "Menyuni ochish",
    exact: true,
  });
  if (await drawer.isVisible()) await drawer.click();
  const item = page
    .locator("nav")
    .getByRole("button", { name, exact: true, includeHidden: true });
  if (!(await item.isVisible()))
    await item
      .locator('xpath=ancestor::div[@class="nav-group"]')
      .locator(".nav-group-toggle")
      .click();
  await item.click();
  await expect(item).toHaveAttribute("aria-current", "page");
  await expect(page.locator("main .skeletons")).toHaveCount(0);
}
async function action(row: Locator, name: string) {
  const item = row
    .getByRole("button", { name, exact: true, includeHidden: true })
    .first();
  if (!(await item.isVisible()))
    await row.getByRole("button", { name: /^Boshqa amallar:/ }).click();
  await item.click();
}
async function save(page: Page) {
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Saqlash", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
}

test("Yetti: direktor parolni tiklaydi, yangi parol ishlaydi va boshqa panellardagi eski kirish yopiladi", async ({
  page,
  browser,
}) => {
  const other = await browser.newContext(),
    employee = await other.newPage();
  await login(employee, "reception");
  await login(page, "director");
  const members = (
    await api(page, "/partner/staff?sanatorium_id=" + access.sanatoriums[0].id)
  ).body.data;
  const target = members.find(
    (m: any) => m.user.login === access.reception.login,
  );
  const replacement = access.reception.password + "Reset";
  try {
    await section(page, "Jamoa va ruxsatlar");
    const row = page
      .getByRole("row")
      .filter({ hasText: access.reception.login });
    await action(row, "Parolni tiklash");
    await page.getByRole("dialog").getByLabel("Yangi parol").fill(replacement);
    await page
      .getByLabel("Parolni takrorlang")
      .fill(replacement + "x");
    await page
      .getByRole("dialog")
      .getByRole("button", { name: "Saqlash", exact: true })
      .click();
    await expect(
      page.getByText("Yangi parollar bir xil bo‘lsin", { exact: true }),
    ).toBeVisible();
    await page
      .getByLabel("Parolni takrorlang")
      .fill(replacement);
    await save(page);
    expect((await api(employee, "/auth/me")).status).toBe(401);
    await employee.reload();
    await login(employee, "reception", replacement);
    await expect(employee.getByText("RESEPSHN", { exact: true })).toBeVisible();
    await section(page, "Amallar tarixi");
    await expect(
      page.getByText("Xodim paroli tiklandi", { exact: true }).first(),
    ).toBeVisible();
  } finally {
    expect(
      (
        await api(page, `/partner/staff/${target.id}/reset-password`, "POST", {
          new_password: access.reception.password,
          confirm_password: access.reception.password,
        })
      ).status,
    ).toBe(201);
    await other.close();
  }
});

test("Yetti: hisobchi shaxsiy profilini boshqaradi va boshqa qurilmalardagi kirishlarni yopadi", async ({
  page,
  browser,
}) => {
  await login(page, "accountant");
  const original = (await api(page, "/auth/me")).body.name;
  const other = await browser.newContext({
      userAgent: "Mozilla/5.0 (X11; Linux x86_64) Firefox/151.0",
    }),
    device = await other.newPage();
  try {
    await login(device, "accountant");
    await section(page, "Mening hisobim");
    await page
      .getByRole("button", { name: "Ismni o‘zgartirish", exact: true })
      .click();
    await page
      .getByRole("dialog")
      .getByLabel("Ism")
      .fill("Hisobchi profil sinovi");
    await save(page);
    await expect(page.locator(".account-details")).toContainText(
      "Hisobchi profil sinovi",
    );
    const row = page.getByRole("row").filter({ hasText: "Firefox · Linux" });
    await action(row, "Kirishni yopish");
    await save(page);
    expect((await api(device, "/auth/me")).status).toBe(401);
    await device.reload();
    await login(device, "accountant");
    await page
      .getByRole("button", {
        name: "Boshqa qurilmalardan chiqish",
        exact: true,
      })
      .click();
    await save(page);
    expect((await api(device, "/auth/me")).status).toBe(401);
    expect((await api(page, "/auth/me")).status).toBe(200);
    await section(page, "Foydalanish yo‘riqnomasi");
    await expect(page.locator("main")).toContainText("Hisobotlar");
    await expect(
      page.locator("nav").getByRole("button", { name: "Bronlar", exact: true }),
    ).toHaveCount(0);
  } finally {
    await api(page, "/auth/profile", "PATCH", { name: original });
    await other.close();
  }
});

test("Yetti: bron raqami kamerasiz topiladi, sana va holat filtrlari saqlanadi", async ({
  page,
}) => {
  await login(page, "director");
  const booking = (
    await api(
      page,
      "/partner/bookings?sanatorium_id=" + access.sanatoriums[0].id,
    )
  ).body.data[0];
  await section(page, "Bronlar");
  await page.getByLabel("Qidirish", { exact: true }).fill(booking.reference);
  await page.getByRole("button", { name: "Qidirish", exact: true }).click();
  const row = page.getByRole("row").filter({ hasText: booking.reference });
  await expect(row).toHaveCount(1);
  await page.getByLabel("Holat", { exact: true }).selectOption(booking.status);
  await page
    .getByLabel("Davr boshi", { exact: true })
    .fill(booking.checkIn.slice(0, 10));
  await page
    .getByLabel("Davr oxiri", { exact: true })
    .fill(booking.checkIn.slice(0, 10));
  await expect(row).toHaveCount(1);
  await page.reload();
  await expect(page.getByLabel("Holat", { exact: true })).toHaveValue(
    booking.status,
  );
  await expect(page.getByLabel("Davr boshi", { exact: true })).toHaveValue(
    booking.checkIn.slice(0, 10),
  );
  await expect(page.getByLabel("Qidirish", { exact: true })).toHaveValue("");
  await page
    .getByRole("button", { name: "Filtrlarni tozalash", exact: true })
    .click();
  await expect(page.getByLabel("Holat", { exact: true })).toHaveValue("");
  await section(page, "Bugungi ishlar");
  await page
    .getByLabel("Ish kuni", { exact: true })
    .fill(booking.checkIn.slice(0, 10));
  await expect(page.locator("main .error-box")).toHaveCount(0);
  await section(page, "To‘lovlar");
  await page.getByLabel("Qidirish", { exact: true }).fill(booking.reference);
  await page.getByRole("button", { name: "Qidirish", exact: true }).click();
  await expect(page.locator("main .error-box")).toHaveCount(0);
});

test("Yetti: hisobchi haqiqiy Excel faylini yuklaydi va barcha yangi sahifalar telefonda/klaviaturada ishlaydi", async ({
  page,
}) => {
  await login(page, "accountant");
  const download = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Excel yuklash (.xlsx)", exact: true })
    .click();
  const file = await download;
  expect(file.suggestedFilename()).toMatch(/\.xlsx$/);
  mkdirSync(".local/portal-audit", { recursive: true });
  await file.saveAs(".local/portal-audit/accountant-download.xlsx");
  expect(
    readFileSync(".local/portal-audit/accountant-download.xlsx")
      .subarray(0, 4)
      .toString("hex"),
  ).toBe("504b0304");
  await page.setViewportSize({ width: 390, height: 844 });
  for (const name of [
    "Mening hisobim",
    "Foydalanish yo‘riqnomasi",
    "Hisobotlar",
  ]) {
    await section(page, name);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1,
      ),
    ).toBe(true);
    await expect(page.locator("main .error-box")).toHaveCount(0);
  }
  await section(page, "Mening hisobim");
  await page
    .locator("main")
    .getByRole("button", { name: "Parolni almashtirish", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.keyboard.press("Tab");
  expect(await page.evaluate(() => document.activeElement?.tagName)).not.toBe(
    "BODY",
  );
});
