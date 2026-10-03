import { test, expect, type Page } from "@playwright/test";
import { readFileSync, mkdirSync } from "node:fs";
import { totp } from "../../apps/api/dist/src/common/crypto";
const access = JSON.parse(readFileSync(".local/dev-access.json", "utf8"));
async function login(page: Page, kind: "admin" | "director" | "reception") {
  await page.goto(
    kind === "admin" ? "http://localhost:3000" : "http://localhost:3001",
  );
  await page.getByLabel("Login", { exact: true }).fill(access[kind].login);
  await page.getByLabel("Parol", { exact: true }).fill(access[kind].password);
  if (kind === "admin")
    await page
      .getByLabel("Autentifikator kodi")
      .fill(totp(access.admin.mfa_secret));
  await page.getByRole("button", { name: "Kirish", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Chiqish", exact: true }),
  ).toBeVisible();
}
test("Direktor ko‘p xonali bron yaratadi; kalendar va check-in/out serverda yangilanadi", async ({
  page,
}) => {
  const inventoryPath = "**/api/partner/sanatoriums/*/inventory";
  let releaseInventory!: () => void;
  let requestedInventory!: () => void;
  const gate = new Promise<void>((resolve) => {
    releaseInventory = resolve;
  });
  const requested = new Promise<void>((resolve) => {
    requestedInventory = resolve;
  });
  await page.route(inventoryPath, async (route) => {
    requestedInventory();
    await gate;
    await route.continue();
  });
  let inventory: any;
  try {
    await login(page, "director");
    await page.getByRole("button", { name: "Bronlar", exact: true }).click();
    await requested;
    const manual = page.getByRole("button", {
      name: "Qo‘lda bron",
      exact: true,
    });
    await expect(manual).toBeDisabled();
    const response = page.waitForResponse(
      (r) => r.url().endsWith("/inventory") && r.status() === 200,
    );
    releaseInventory();
    inventory = await (await response).json();
    await expect(manual).toBeEnabled();
    await manual.click();
  } finally {
    releaseInventory();
    await page.unroute(inventoryPath);
  }
  // Repeated runs use an empty calendar period without deleting demo bookings.
  const lastEnd = [
    new Date().toISOString().slice(0, 10),
    ...inventory.allocations.map((a: any) => a.checkOut.slice(0, 10)),
  ]
    .sort()
    .at(-1)!;
  const nextDate = (days: number) =>
    new Date(Date.parse(lastEnd) + days * 86400000).toISOString().slice(0, 10);
  const checkIn = nextDate(1),
    checkOut = nextDate(3);
  await page
    .getByRole("spinbutton", { name: "Xonalar soni *", exact: true })
    .fill("2");
  await page.getByRole("button", { name: "Saqlash", exact: true }).click();
  const name = `Brauzer sinovi ${Date.now()}`;
  await page.getByLabel("Mehmon ism-familiyasi").fill(name);
  await page.getByLabel("Mehmon telefoni").fill("+998909000001");
  await page.getByLabel("Kelish sanasi").fill(checkIn);
  await page.getByLabel("Ketish sanasi").fill(checkOut);
  for (const n of [1, 2]) {
    await page
      .getByLabel(`${n}-xona tarifi`)
      .selectOption(access.sanatoriums[0].rate_id);
    await page.getByLabel(`${n}-xona kattalari`).fill(String(n));
    if (n === 2) await page.getByLabel(`${n}-xona bolalar yoshi`).fill("7");
  }
  await page
    .getByRole("button", { name: "Narxni hisoblash", exact: true })
    .click();
  await expect(page.getByRole("heading", { name: /Bron jami:/ })).toBeVisible();
  await page.getByLabel("Qaytarish shartlari").check();
  await page.getByLabel("Bron kafolati").check();
  await page
    .getByRole("button", { name: "Bronni yaratish", exact: true })
    .click();
  const row = page.getByRole("row").filter({ hasText: name });
  await expect(row).toBeVisible();
  await row.getByRole("button", { name: "Ochish", exact: true }).click();
  await page
    .getByRole("button", { name: "Joylashtirish", exact: true })
    .click();
  await page.getByRole("button", { name: "Saqlash", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Ketishni qayd etish", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Ketishni qayd etish", exact: true })
    .click();
  await page.getByRole("button", { name: "Saqlash", exact: true }).click();
  await expect(
    page.locator(".toolbar .badge").filter({ hasText: "Yakunlangan" }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Xonalar va tariflar", exact: true })
    .click();
  await page.getByLabel("Kalendar boshi").fill(checkIn);
  await expect(page.locator(".calendar-cell.booked")).toHaveCount(4);
  mkdirSync(".local/screenshots", { recursive: true });
  await page.screenshot({
    path: ".local/screenshots/partner-calendar.png",
    fullPage: true,
  });
});
test("Faol tarif bo‘lmasa qo‘lda bron yopiq va sababi ko‘rinadi", async ({
  page,
}) => {
  await page.route("**/api/partner/sanatoriums/*/inventory", async (route) => {
    const response = await route.fetch();
    const inventory = await response.json();
    await route.fulfill({
      response,
      json: {
        ...inventory,
        rates: inventory.rates.map((r: any) => ({ ...r, active: false })),
      },
    });
  });
  await login(page, "director");
  await page.getByRole("button", { name: "Bronlar", exact: true }).click();
  await expect(
    page.getByRole("status").filter({ hasText: "faol tarif qo‘shing" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Qo‘lda bron", exact: true }),
  ).toBeDisabled();
  await expect(page.getByRole("dialog")).toHaveCount(0);
});
test("Tariflarni yuklash xatosidan keyin qayta urinish bronni ochadi", async ({
  page,
}) => {
  let first = true;
  await page.route("**/api/partner/sanatoriums/*/inventory", async (route) => {
    if (first) {
      first = false;
      await route.fulfill({
        status: 503,
        json: {
          code: "SERVICE_UNAVAILABLE",
          message: "Sinov: tariflarni yuklab bo‘lmadi.",
        },
      });
    } else await route.continue();
  });
  await login(page, "director");
  await page.getByRole("button", { name: "Bronlar", exact: true }).click();
  const error = page
    .getByRole("alert")
    .filter({ hasText: "Sinov: tariflarni yuklab bo‘lmadi." });
  await expect(error).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Qo‘lda bron", exact: true }),
  ).toBeDisabled();
  await error.getByRole("button", { name: "Qayta urinish" }).click();
  await expect(
    page.getByRole("button", { name: "Qo‘lda bron", exact: true }),
  ).toBeEnabled();
  await expect(error).toHaveCount(0);
});
test("Admin MFA, ko‘rsatkichlar va moliya ekranlari haqiqiy APIga ulanadi", async ({
  page,
}) => {
  await login(page, "admin");
  await expect(
    page.getByText("Platforma daromadi", { exact: true }),
  ).toBeVisible();
  await expect(page.locator(".error-box")).toHaveCount(0);
  await page.screenshot({
    path: ".local/screenshots/superadmin-dashboard.png",
    fullPage: true,
  });
  for (const [menu, title] of [
    ["Sanatoriyalar", "Sanatoriyalar"],
    ["Jamoa va ruxsatlar", "Jamoa va ruxsatlar"],
    ["To‘lovlar", "Onlayn to‘lovlar"],
    ["Pulni qaytarish", "Pulni to‘liq qaytarish"],
    ["Sanatoriyaga o‘tkazma", "Sanatoriyaga o‘tkazmalar"],
    ["Abonent va hisoblar", "Abonent va hisoblar"],
    ["Reklama", "Reklama kampaniyalari"],
    ["To‘lovlarni solishtirish", "To‘lovlarni solishtirish"],
    ["Xabarlar", "Xabarlar"],
    ["Vazifalar", "Jamoa vazifalari"],
    ["Anketalar", "Anketalar"],
    ["Sharhlar", "Mehmonlar sharhlari"],
    ["Yordam xizmati", "Yordam xizmati"],
    ["Amallar tarixi", "Amallar tarixi"],
  ]) {
    await page.getByRole("button", { name: menu, exact: true }).click();
    await expect(
      page.getByRole("heading", { name: title, exact: true }),
    ).toBeVisible();
    await expect(page.locator(".skeletons")).toHaveCount(0);
    await expect(page.locator(".error-box")).toHaveCount(0);
  }
});
test("Admin yangilikni qoralamadan e’longa va arxivga o‘tkazadi; Android public feed mos yangilanadi", async ({ page, request }) => {
  await login(page, "admin");
  await page.getByRole("button", { name: "Yangilik va tavsiyalar", exact: true }).click();
  await page.getByRole("button", { name: "Maqola yozish", exact: true }).click();
  const title = `Yangilik oqimi sinovi ${Date.now()}`;
  await page.getByLabel("Sarlavha", { exact: false }).fill(title);
  await page.getByLabel("Qisqa mazmun", { exact: false }).fill("Bron shartlarini ilovada oldindan tekshiring.");
  await page.getByLabel("To‘liq matn", { exact: false }).fill("Sana, xona va mehmonlarni tanlab, narx va bekor qilish shartlarini tekshiring.");
  await page.getByRole("button", { name: "Saqlash", exact: true }).click();
  const row = page.getByRole("row").filter({ hasText: title });
  await expect(row).toBeVisible();
  const feed = async () => (await request.get("http://127.0.0.1:4000/catalog/home")).json();
  expect((await feed()).news.some((a: any) => a.title === title)).toBe(false);
  await row.getByRole("button", { name: "Tahrirlash", exact: true }).click();
  await page.getByLabel("Ilovada ko‘rinishi", { exact: false }).selectOption("PUBLISHED");
  const published = page.waitForResponse(r => /\/superadmin\/articles\//.test(r.url()) && r.request().method() === "PATCH" && r.status() === 200);
  await page.getByRole("button", { name: "Saqlash", exact: true }).click();
  const article = await (await published).json();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  expect((await feed()).news.some((a: any) => a.id === article.id)).toBe(true);
  const publicArticle = await request.get(`http://127.0.0.1:4000/catalog/news/${article.id}`);
  expect(publicArticle.ok()).toBe(true);
  expect((await publicArticle.json()).body).toContain("bekor qilish shartlarini");
  await row.getByRole("button", { name: "Tahrirlash", exact: true }).click();
  await page.getByLabel("Ilovada ko‘rinishi", { exact: false }).selectOption("ARCHIVED");
  const archived = page.waitForResponse(r => /\/superadmin\/articles\//.test(r.url()) && r.request().method() === "PATCH" && r.status() === 200);
  await page.getByRole("button", { name: "Saqlash", exact: true }).click();
  await archived;
  expect((await feed()).news.some((a: any) => a.id === article.id)).toBe(false);
  expect((await request.get(`http://127.0.0.1:4000/catalog/news/${article.id}`)).status()).toBe(404);
});
test("Resepshn moliyaga kira olmaydi; direktor huquqni bekor qilib qayta beradi", async ({
  browser,
}) => {
  const dirContext = await browser.newContext(),
    recContext = await browser.newContext();
  const director = await dirContext.newPage(),
    reception = await recContext.newPage();
  await login(director, "director");
  await login(reception, "reception");
  await expect(
    reception.getByRole("button", {
      name: "Sanatoriyaga o‘tkazma",
      exact: true,
    }),
  ).toHaveCount(0);
  await director
    .getByRole("button", { name: "Jamoa va ruxsatlar", exact: true })
    .click();
  const row = director
    .getByRole("row")
    .filter({ hasText: access.reception.login });
  await row.getByRole("button", { name: "Ruxsatlar", exact: true }).click();
  const permission = director.getByLabel("Ruxsat etilgan amallar");
  const old = await permission
    .locator("option:checked")
    .evaluateAll((nodes) => nodes.map((n) => (n as HTMLOptionElement).value));
  await permission.selectOption(old.filter((p) => p !== "bookings.read"));
  await director.getByRole("button", { name: "Saqlash", exact: true }).click();
  await reception.goto("http://localhost:3001/inventory");
  await expect(reception.locator(".error-box")).toContainText("ruxsat");
  await row.getByRole("button", { name: "Ruxsatlar", exact: true }).click();
  await director.getByLabel("Ruxsat etilgan amallar").selectOption(old);
  await director.getByRole("button", { name: "Saqlash", exact: true }).click();
  await reception.goto("http://localhost:3001/inventory");
  await expect(
    reception.getByRole("heading", { name: "Xonalar va tariflar" }),
  ).toBeVisible();
  await expect(reception.locator(".error-box")).toHaveCount(0);
  await dirContext.close();
  await recContext.close();
});

test("Telegram ulash sahifasi shaxsni ko‘rsatadi va aniq tasdiqdan keyin bog‘laydi", async ({ page }) => {
  const identity = { telegram_user_id: "61001", display_name: "Brauzer sinovi", username: "test_staff", blocked: false };
  let link: any = null, account: any = null, confirmationCount = 0;
  await page.route("**/api/telegram/**", async route => {
    const path = new URL(route.request().url()).pathname;
    if (path.endsWith("/account")) return route.fulfill({ json: { enabled: true, bot_username: "sihhat_test_bot", account, link } });
    if (path.endsWith("/link")) {
      link = { id: "b1a00000-0000-4000-8000-000000000001", expires_at: new Date(Date.now() + 300000).toISOString(), claimed: false, telegram_user_id: null, display_name: null, username: null };
      return route.fulfill({ status: 201, json: { id: link.id, expires_at: link.expires_at, url: "https://t.me/sihhat_test_bot?start=browser_example" } });
    }
    if (path.endsWith("/confirm")) {
      expect(route.request().postDataJSON()).toEqual({ telegram_user_id: identity.telegram_user_id });
      confirmationCount++; account = identity; link = null;
      return route.fulfill({ status: 201, json: { success: true } });
    }
    if (path.endsWith("/disconnect")) {
      account = null; link = null;
      return route.fulfill({ status: 201, json: { success: true } });
    }
    throw new Error("Unexpected Telegram browser route");
  });
  await login(page, "director");
  await page.getByRole("button", { name: "Telegram bot", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Telegram hisobingizni ulang" })).toBeVisible();
  await page.getByRole("button", { name: "Telegramga ulash", exact: true }).click();
  await expect(page.getByRole("link", { name: "Telegramda ochish ↗" })).toHaveAttribute("href", /t\.me\/sihhat_test_bot\?start=/);
  link = { ...link, ...identity, claimed: true };
  await page.getByRole("button", { name: "Holatni yangilash", exact: true }).click();
  await expect(page.getByText(/Telegram ID: 61001/)).toBeVisible();
  const confirm = page.getByRole("button", { name: "Bog‘lashni tasdiqlash", exact: true });
  await expect(confirm).toBeDisabled(); expect(confirmationCount).toBe(0);
  await page.getByRole("checkbox", { name: "Bu mening Telegram akkauntim" }).check();
  await confirm.click();
  await expect(page.getByRole("heading", { name: "Hisob bog‘langan" })).toBeVisible(); expect(confirmationCount).toBe(1);
  await page.getByRole("button", { name: "Bog‘lanishni uzish", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Hisob bog‘langan" })).toBeVisible();
  await page.getByRole("button", { name: "Ha, uzish", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Telegram hisobingizni ulang" })).toBeVisible();
});

test("Admin va resepsion Telegram bo‘limida server xatosidan keyin qayta urinadi", async ({ page }) => {
  for (const role of ["admin", "reception"] as const) {
    let fail = true;
    await page.route("**/api/telegram/account", route => route.fulfill(fail
      ? { status: 503, json: { code: "SERVICE_UNAVAILABLE", message: "Sinov: bot ulanishi vaqtincha tekshirilmadi." } }
      : { json: { enabled: false, bot_username: "", account: null, link: null } }));
    await login(page, role);
    await page.getByRole("button", { name: "Telegram bot", exact: true }).click();
    const error = page.getByRole("alert").filter({ hasText: "Sinov: bot ulanishi" });
    await expect(error).toBeVisible(); fail = false;
    await error.getByRole("button", { name: "Qayta urinish" }).click();
    await expect(page.getByText("Bot hali yoqilmagan. Administrator bilan bog‘laning.", { exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Telegramga ulash", exact: true })).toHaveCount(0);
    await page.getByRole("button", { name: "Chiqish", exact: true }).click();
    await page.unroute("**/api/telegram/account");
  }
});
