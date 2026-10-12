import {
  test,
  expect,
  type Page,
  type Locator,
  type BrowserContext,
} from "@playwright/test";
import { readFileSync, mkdirSync, existsSync, writeFileSync } from "node:fs";
import { totp } from "../../apps/api/dist/src/common/crypto";
const access = JSON.parse(
  readFileSync(
    process.env.SIHHAT_WEB_ACCESS_FILE ?? ".local/dev-access.json",
    "utf8",
  ),
);
let adminLastStep = -1;
let adminCookies: Awaited<ReturnType<BrowserContext["cookies"]>> | null = null;
async function browserApi(
  page: Page,
  path: string,
  method = "GET",
  body?: unknown,
) {
  return page.evaluate(
    async ({ path, method, body }) => {
      const cookie = document.cookie
        .split("; ")
        .find((c) => c.startsWith("sihhat_csrf="));
      const response = await fetch("/api" + path, {
        method,
        headers: {
          "Content-Type": "application/json",
          "X-CSRF-Token": decodeURIComponent(
            cookie?.slice("sihhat_csrf=".length) ?? "",
          ),
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
  kind: "admin" | "director" | "reception" | "accountant",
) {
  if (kind === "admin" && adminCookies) {
    await page.context().addCookies(adminCookies);
    const valid = await page.request.get("http://localhost:3000/api/auth/me");
    if (valid.ok()) {
      await page.goto("http://localhost:3000");
      await expect(
        page.getByRole("button", { name: "Chiqish", exact: true }),
      ).toBeVisible();
      return;
    }
    adminCookies = null;
    await page.context().clearCookies();
  }
  await page.goto(
    kind === "admin" ? "http://localhost:3000" : "http://localhost:3001",
  );
  await page.getByLabel("Login", { exact: true }).fill(access[kind].login);
  await page.getByLabel("Parol", { exact: true }).fill(access[kind].password);
  if (kind === "admin") {
    const stepFile = ".local/runtime/web-test-mfa-step.json";
    if (existsSync(stepFile))
      adminLastStep = Math.max(
        adminLastStep,
        JSON.parse(readFileSync(stepFile, "utf8")).step,
      );
    // The API forbids reusing a TOTP. Each separate browser login needs a fresh step.
    while (Math.floor(Date.now() / 30000) <= adminLastStep)
      await page.waitForTimeout(
        Math.max(50, 30000 - (Date.now() % 30000) + 100),
      );
    adminLastStep = Math.floor(Date.now() / 30000);
    mkdirSync(".local/runtime", { recursive: true });
    writeFileSync(stepFile, JSON.stringify({ step: adminLastStep }));
    await page
      .getByLabel("Autentifikator kodi")
      .fill(totp(access.admin.mfa_secret, adminLastStep));
  }
  await page.getByRole("button", { name: "Kirish", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Chiqish", exact: true }),
  ).toBeVisible();
  if (kind === "admin") adminCookies = await page.context().cookies();
}
test("Superadmin Mashhur tick tanlovini saqlaydi, qayta ochadi va bosh sahifadan chiqaradi", async ({
  page,
}) => {
  await login(page, "admin");
  const loaded = page.waitForResponse(
    (response) =>
      response.url().includes("/superadmin/sanatoriums?") &&
      response.request().method() === "GET",
  );
  await section(page, "Sanatoriyalar");
  const first = (await (await loaded).json()).data[0];
  const choice = () =>
    page
      .getByRole("checkbox", {
        name: `Mashhur sanatoriya: ${first.name}`,
        exact: true,
      })
      .first();
  async function toggle(featured: boolean) {
    const saved = page.waitForResponse(
      (response) =>
        response.url().endsWith(`/sanatoriums/${first.id}/featured`) &&
        response.request().method() === "PATCH",
    );
    await choice().setChecked(featured);
    expect((await saved).status()).toBe(200);
    if (featured) await expect(choice()).toBeChecked();
    else await expect(choice()).not.toBeChecked();
  }
  try {
    if (first.featuredOnHome) await toggle(false);
    const endpoint = `**/api/superadmin/sanatoriums/${first.id}/featured`;
    await page.route(
      endpoint,
      (route) =>
        route.fulfill({
          status: 503,
          json: {
            code: "TEMPORARY_FAILURE",
            message: "Tanlovni saqlab bo‘lmadi. Qayta urinib ko‘ring.",
          },
        }),
      { times: 1 },
    );
    await choice().click();
    await expect(
      page.getByRole("alert").filter({ hasText: "Tanlovni saqlab bo‘lmadi" }),
    ).toContainText("Tanlovni saqlab bo‘lmadi");
    await expect(choice()).not.toBeChecked();
    await page.unroute(endpoint);
    await toggle(true);
    expect(
      (await browserApi(page, "/catalog/home")).body.featured.map(
        (row: any) => row.id,
      ),
    ).toContain(first.id);
    await page.reload();
    await section(page, "Sanatoriyalar");
    await expect(choice()).toBeChecked();
    await toggle(false);
    expect(
      (await browserApi(page, "/catalog/home")).body.featured.map(
        (row: any) => row.id,
      ),
    ).not.toContain(first.id);
    await page.reload();
    await section(page, "Sanatoriyalar");
    await expect(choice()).not.toBeChecked();
  } finally {
    const current = (await browserApi(page, `/partner/sanatoriums/${first.id}`))
      .body;
    if (current.featuredOnHome !== first.featuredOnHome) {
      expect(
        (
          await browserApi(
            page,
            `/superadmin/sanatoriums/${first.id}/featured`,
            "PATCH",
            {
              version: current.version,
              featured: first.featuredOnHome,
            },
          )
        ).status,
      ).toBe(200);
    }
  }
});

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
    await section(page, "Bronlar");
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
  await page.getByRole("dialog").getByLabel("Kelish sanasi").fill(checkIn);
  await page.getByRole("dialog").getByLabel("Ketish sanasi").fill(checkOut);
  for (const n of [1, 2]) {
    await page
      .getByLabel(`${n}-xona tarifi`)
      .selectOption(access.sanatoriums[0].rate_id);
    await page.getByLabel(`${n}-xona kattalari`).fill(String(n));
    if (n === 2) {
      const ages = page.getByRole("group", {
        name: `${n}-xona bolalar yoshi`,
        exact: true,
      });
      await ages
        .getByRole("button", { name: "Bola qo‘shish", exact: true })
        .click();
      await ages.getByRole("combobox").selectOption("7");
    }
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
  await rowAction(row, "Ochish");
  await page
    .getByRole("button", { name: "Joylashtirish", exact: true })
    .click();
  await saveDialog(page);
  await expect(
    page.getByRole("button", { name: "Ketishni qayd etish", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Ketishni qayd etish", exact: true })
    .click();
  await saveDialog(page);
  await expect(
    page.locator(".toolbar .badge").filter({ hasText: "Yakunlangan" }),
  ).toBeVisible();
  await section(page, "Xonalar va tariflar");
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
  await section(page, "Bronlar");
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
  await section(page, "Bronlar");
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
  await expect(
    page.getByRole("heading", { name: "AI sarfi", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText(/Xarajat joriy sozlangan narxlar asosida/),
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
    await section(page, menu);
    await expect(
      page.getByRole("heading", { name: title, exact: true, level: 1 }),
    ).toBeVisible();
    await expect(page.locator(".skeletons")).toHaveCount(0);
    await expect(page.locator(".error-box")).toHaveCount(0);
    if (menu === "To‘lovlar") {
      const card = page.locator(".card").filter({
        has: page.getByRole("heading", {
          name: "Tezcheck ulanishi",
          exact: true,
        }),
      });
      await expect(card).toBeVisible();
      await expect(card).toContainText(
        /ulanishi hali sozlanmagan|API bilan ulanish/,
      );
    }
  }
});
test("Tezcheck ulanish xatosidan qayta urinish draft kassani tayyor deb ko‘rsatmaydi", async ({
  page,
}) => {
  let unavailable = true;
  await page.route("**/api/superadmin/integrations/tezcheck", (route) =>
    route.fulfill(
      unavailable
        ? {
            status: 503,
            json: {
              code: "SERVICE_UNAVAILABLE",
              message: "Sinov: to‘lov xizmati vaqtincha javob bermadi.",
            },
          }
        : {
            json: {
              configured: true,
              authenticated: true,
              accepts_payments: false,
              state: "draft",
              currency: "UZS",
              methods: [{ name: "Click" }, { name: "Payme" }],
            },
          },
    ),
  );
  await login(page, "admin");
  await section(page, "To‘lovlar");
  const card = page.locator(".card").filter({
    has: page.getByRole("heading", { name: "Tezcheck ulanishi", exact: true }),
  });
  const error = card.getByRole("alert");
  await expect(error).toContainText(
    "Sinov: to‘lov xizmati vaqtincha javob bermadi.",
  );
  unavailable = false;
  await error.getByRole("button", { name: "Qayta urinish" }).click();
  await expect(card).toContainText("Kassa hali to‘lov qabul qilmayapti.");
  await expect(card).toContainText("draft");
  await expect(card).toContainText("Click, Payme");
  await expect(
    card.getByText("Kassa to‘lov qabul qilishga tayyor.", { exact: true }),
  ).toHaveCount(0);
});

test("Admin yangilikni qoralamadan e’longa va arxivga o‘tkazadi; Android public feed mos yangilanadi", async ({
  page,
  request,
}) => {
  await login(page, "admin");
  await section(page, "Yangilik va tavsiyalar");
  await page
    .getByRole("button", { name: "Maqola yozish", exact: true })
    .click();
  const title = `Yangilik oqimi sinovi ${Date.now()}`;
  await page.getByLabel("Sarlavha", { exact: false }).fill(title);
  await page
    .getByLabel("Qisqa mazmun", { exact: false })
    .fill("Bron shartlarini ilovada oldindan tekshiring.");
  await page
    .getByLabel("To‘liq matn", { exact: false })
    .fill(
      "Sana, xona va mehmonlarni tanlab, narx va bekor qilish shartlarini tekshiring.",
    );
  await page.getByRole("button", { name: "Saqlash", exact: true }).click();
  const row = page.locator("tbody tr, .feed-item").filter({ hasText: title });
  await expect(row).toBeVisible();
  const feed = async () =>
    (await request.get("http://127.0.0.1:4000/catalog/home")).json();
  expect((await feed()).news.some((a: any) => a.title === title)).toBe(false);
  await rowAction(row, "Tahrirlash");
  await page
    .getByLabel("Ilovada ko‘rinishi", { exact: false })
    .selectOption("PUBLISHED");
  const published = page.waitForResponse(
    (r) =>
      /\/superadmin\/articles\//.test(r.url()) &&
      r.request().method() === "PATCH" &&
      r.status() === 200,
  );
  await page.getByRole("button", { name: "Saqlash", exact: true }).click();
  const article = await (await published).json();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  expect((await feed()).news.some((a: any) => a.id === article.id)).toBe(true);
  const publicArticle = await request.get(
    `http://127.0.0.1:4000/catalog/news/${article.id}`,
  );
  expect(publicArticle.ok()).toBe(true);
  expect((await publicArticle.json()).body).toContain(
    "bekor qilish shartlarini",
  );
  await rowAction(row, "Tahrirlash");
  await page
    .getByLabel("Ilovada ko‘rinishi", { exact: false })
    .selectOption("ARCHIVED");
  const archived = page.waitForResponse(
    (r) =>
      /\/superadmin\/articles\//.test(r.url()) &&
      r.request().method() === "PATCH" &&
      r.status() === 200,
  );
  await page.getByRole("button", { name: "Saqlash", exact: true }).click();
  await archived;
  expect((await feed()).news.some((a: any) => a.id === article.id)).toBe(false);
  expect(
    (
      await request.get(`http://127.0.0.1:4000/catalog/news/${article.id}`)
    ).status(),
  ).toBe(404);
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
  await section(director, "Jamoa va ruxsatlar");
  const row = director
    .getByRole("row")
    .filter({ hasText: access.reception.login });
  await rowAction(row, "Ruxsatlar");
  const permission = director.getByRole("switch", {
    name: "Bronlarni ko‘rish",
    exact: true,
  });
  await expect(permission).toBeChecked();
  await permission.uncheck();
  await director.getByRole("button", { name: "Saqlash", exact: true }).click();
  await expect(director.getByRole("dialog")).toHaveCount(0);
  await reception.goto("http://localhost:3001/inventory");
  await expect(reception.locator(".error-box")).toContainText("ruxsat");
  await rowAction(row, "Ruxsatlar");
  await director
    .getByRole("switch", { name: "Bronlarni ko‘rish", exact: true })
    .check();
  await director.getByRole("button", { name: "Saqlash", exact: true }).click();
  await expect(director.getByRole("dialog")).toHaveCount(0);
  await reception.goto("http://localhost:3001/inventory");
  await expect(
    reception.getByRole("heading", { name: "Xonalar va tariflar" }),
  ).toBeVisible();
  await expect(reception.locator(".error-box")).toHaveCount(0);
  await dirContext.close();
  await recContext.close();
});

test("Sanatoriya tanlovi xodimlar jadvalini API va sahifada filtrlaydi", async ({
  page,
}) => {
  await login(page, "admin");
  await section(page, "Jamoa va ruxsatlar");
  let observedStaff = 0;
  for (const sanatorium of access.sanatoriums) {
    const response = page.waitForResponse(
      (r) =>
        r.url().includes("/partner/staff?") &&
        new URL(r.url()).searchParams.get("sanatorium_id") === sanatorium.id &&
        r.status() === 200,
    );
    const select = page.getByLabel("Sanatoriyani tanlash");
    if ((await select.inputValue()) === sanatorium.id) {
      // The initial request already proves this selection; switch away and back to trigger a fresh one.
      const other = access.sanatoriums.find((s: any) => s.id !== sanatorium.id);
      await select.selectOption(other.id);
    }
    await select.selectOption(sanatorium.id);
    const staff = await (await response).json();
    observedStaff += staff.data.length;
    expect(staff.data.every((m: any) => m.sanatoriumId === sanatorium.id)).toBe(
      true,
    );
    await expect(page.locator("tbody tr")).toHaveCount(staff.data.length);
    if (!staff.data.length)
      await expect(
        page.getByRole("heading", { name: "Hozircha ma’lumot yo‘q" }),
      ).toBeVisible();
    for (const member of staff.data)
      await expect(page.locator("tbody")).toContainText(member.user.login);
  }
  expect(observedStaff).toBeGreaterThan(0);
});

test("Anketa aniq xatolar, checkboxlar va oxirgi tahrirni saqlab rasmlarga o‘tishni qo‘llaydi", async ({
  page,
}) => {
  test.setTimeout(180000);
  await login(page, "admin");
  await section(page, "Sanatoriyalar");
  await page
    .getByRole("button", { name: "Yangi sanatoriya", exact: true })
    .click();
  const name = `Brauzer anketasi ${Date.now()}`;
  await page.getByLabel("Sanatoriya nomi").fill(name);
  const created = page.waitForResponse(
    (r) =>
      r.url().endsWith("/superadmin/sanatoriums") &&
      r.request().method() === "POST" &&
      r.status() === 201,
  );
  await page.getByRole("button", { name: "Saqlash", exact: true }).click();
  const sanatorium = await (await created).json();
  let release: (() => void) | undefined;
  try {
    await page
      .getByRole("row")
      .filter({ hasText: name })
      .getByRole("button", { name: "Profilni ko‘rish" })
      .click();
    await page
      .getByRole("button", { name: "Tekshiruvga yuborish", exact: true })
      .click();
    await page
      .getByRole("dialog").getByRole("button", { name: "Yuborish", exact: true })
      .click();
    const errors = page.locator(".validation-list");
    await expect(errors).toContainText("Yuridik nom");
    await expect(errors).toContainText("Sanatoriya rasmlari");
    await expect(errors).toContainText("Xonalar");
    await expect(errors).toContainText("Tariflar");
    await expect(errors).not.toContainText("Invalid input");
    await page
      .getByRole("button", { name: "Yopish", exact: true })
      .first()
      .click();
    await page
      .getByRole("button", { name: "Bank rekvizitlari", exact: true })
      .click();
    await expect(
      page.getByText("Bank rekvizitlarini platforma superadmini", {
        exact: false,
      }),
    ).toBeVisible();
    await page
      .getByRole("button", { name: "Yangi rekvizit", exact: true })
      .click();
    const bankForm = page.getByRole("dialog");
    for (const [label, value] of Object.entries({
      "Yuridik nom": "Bank sinov MChJ",
      "Hisob raqami": "20208000900000000002",
      MFO: "01234",
      STIR: "123456789",
    }))
      await bankForm.getByLabel(label).fill(value);
    await bankForm
      .getByRole("button", { name: "Saqlash", exact: true })
      .click();
    const bankRow = page
      .getByRole("row")
      .filter({ hasText: "Bank sinov MChJ" });
    await expect(bankRow).toContainText("Superadmin tasdig‘i kutilmoqda");
    await expect(bankRow).toContainText("123456789");
    await bankRow
      .getByRole("button", { name: "Tasdiqlash", exact: true })
      .click();
    await page
      .getByRole("dialog")
      .getByRole("button", { name: "Tasdiqlash", exact: true })
      .click();
    await expect(
      bankRow.getByRole("button", { name: "Tasdiqlash", exact: true }),
    ).toHaveCount(0);
    await page.getByRole("button", { name: "Tahrirlash", exact: true }).click();
    await page.getByLabel("Tavsif", { exact: false }).fill("a");
    await page.getByLabel("Yuridik nom", { exact: false }).fill("Sinov MChJ");
    await page.getByLabel("STIR", { exact: false }).fill("12");
    await page.getByRole("button", { name: "Saqlash va davom etish" }).click();
    await expect(
      page.getByRole("alert").filter({ hasText: "Tavsif: Kamida 30" }),
    ).toBeVisible();
    await expect(
      page.getByRole("alert").filter({ hasText: "STIR: 9 ta raqam" }),
    ).toBeVisible();
    await page
      .getByLabel("Tavsif", { exact: false })
      .fill(
        "Sanatoriya uchun brauzerda tekshirilgan to‘liq tavsif va mavjud sharoitlar.",
      );
    await page.getByLabel("STIR", { exact: false }).fill("123456789");
    await page.getByRole("button", { name: "Saqlash va davom etish" }).click();
    for (const [key, value] of Object.entries({
      region: "Toshkent",
      address: "Sinov ko‘chasi 10",
      map_url: "https://www.google.com/maps/search/?api=1&query=41.3,69.2",
      contact_phone: "+998901234567",
    }))
      await page.locator(`[name="${key}"]`).fill(value);
    await page.getByLabel("Joylashish vaqti — soat").selectOption("14");
    await page.getByLabel("Joylashish vaqti — daqiqa").selectOption("00");
    await page.getByLabel("Ketish vaqti — soat").selectOption("12");
    await page.getByLabel("Ketish vaqti — daqiqa").selectOption("00");
    await page.getByRole("button", { name: "Saqlash va davom etish" }).click();
    await page.getByRole("checkbox", { name: "Wi-Fi", exact: true }).check();
    await page.getByRole("checkbox", { name: "Massaj", exact: true }).check();
    await page.getByRole("button", { name: "Saqlash va davom etish" }).click();
    await page
      .getByRole("checkbox", { name: /Platforma xizmat shartlari/ })
      .check();
    const revisionRoute = `**/api/partner/sanatorium-revisions/${sanatorium.revision.id}`;
    await page.route(revisionRoute, async (route) => {
      if (route.request().method() === "PATCH") {
        await route.fulfill({
          status: 503,
          json: {
            code: "SERVICE_UNAVAILABLE",
            message: "Sinov: qoralama saqlanmadi.",
          },
        });
      } else await route.continue();
    });
    await page
      .locator('[name="medical_requirements"]')
      .fill("Saqlash xatosi sinovi");
    await page
      .getByRole("button", { name: "Saqlash va rasmlarga o‘tish" })
      .click();
    await expect(
      page
        .getByRole("alert")
        .filter({ hasText: "Sinov: qoralama saqlanmadi." }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Sanatoriya anketasi", exact: true }),
    ).toBeVisible();
    await expect(page.locator('[name="medical_requirements"]')).toHaveValue(
      "Saqlash xatosi sinovi",
    );
    await page.unroute(revisionRoute);
    let requested!: () => void;
    const started = new Promise<void>((resolve) => {
      requested = resolve;
    });
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    await page.route(
      `**/api/partner/sanatorium-revisions/${sanatorium.revision.id}`,
      async (route) => {
        if (
          route.request().method() === "PATCH" &&
          route.request().postDataJSON().data.medical_requirements ===
            "Avvalgi tahrir"
        ) {
          requested();
          await gate;
        }
        await route.continue();
      },
    );
    await page.locator('[name="medical_requirements"]').fill("Avvalgi tahrir");
    await started;
    await page
      .locator('[name="medical_requirements"]')
      .fill("Oxirgi tahrir: shifokor tavsiyasi bilan kelish.");
    await page
      .getByRole("button", { name: "Saqlash va rasmlarga o‘tish" })
      .click();
    release!();
    await expect(
      page.getByRole("heading", { name: "Rasmlar va hujjatlar", exact: true }),
    ).toBeVisible();
    const profile = (
      await browserApi(page, `/partner/sanatoriums/${sanatorium.id}`)
    ).body;
    const data = profile.revisions.find(
      (r: any) => r.id === sanatorium.revision.id,
    ).data;
    expect(data.amenities).toEqual(["Wi-Fi"]);
    expect(data.services).toEqual(["Massaj"]);
    expect(data.medical_requirements).toBe(
      "Oxirgi tahrir: shifokor tavsiyasi bilan kelish.",
    );
    await page
      .getByRole("button", { name: "Rasm yuklash", exact: true })
      .click();
    const pixel = Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+j8XcAAAAASUVORK5CYII=",
      "base64",
    );
    await page
      .getByRole("dialog")
      .locator('input[type="file"]')
      .setInputFiles(
        Array.from({ length: 4 }, (_, n) => ({
          name: `sanatorium-${n + 1}.png`,
          mimeType: "image/png",
          buffer: pixel,
        })),
      );
    await page
      .getByRole("dialog")
      .getByRole("button", { name: "Saqlash", exact: true })
      .click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(page.locator(".gallery-count")).toHaveText("1 / 4");
    await page
      .getByRole("button", { name: "Keyingi surat", exact: true })
      .click();
    await expect(page.locator(".gallery-count")).toHaveText("2 / 4");
    const savedPhotos = (
      await browserApi(page, `/partner/sanatoriums/${sanatorium.id}`)
    ).body.revisions.find((r: any) => r.id === sanatorium.revision.id).data
      .photo_ids;
    await page.getByRole("button", { name: "Oldinroqqa", exact: true }).click();
    await expect(page.locator(".gallery-count")).toHaveText("1 / 4");
    const reordered = (
      await browserApi(page, `/partner/sanatoriums/${sanatorium.id}`)
    ).body.revisions.find((r: any) => r.id === sanatorium.revision.id).data
      .photo_ids;
    expect(reordered).toEqual([
      savedPhotos[1],
      savedPhotos[0],
      savedPhotos[2],
      savedPhotos[3],
    ]);
    await page
      .getByRole("button", { name: "Suratni olib tashlash", exact: true })
      .click();
    await expect(page.locator(".gallery-count")).toHaveText("1 / 3");
    await page.screenshot({
      path: ".local/screenshots/anketa-files.png",
      fullPage: true,
    });
  } finally {
    release?.();
    const current = await browserApi(
      page,
      `/partner/sanatoriums/${sanatorium.id}`,
    );
    await browserApi(
      page,
      `/superadmin/sanatoriums/${sanatorium.id}/archive`,
      "POST",
      { version: current.body.version, reason: "Brauzer sinovi yakunlandi" },
    );
  }
});

test("Telegram ulash sahifasi shaxsni ko‘rsatadi va aniq tasdiqdan keyin bog‘laydi", async ({
  page,
}) => {
  const identity = {
    telegram_user_id: "61001",
    display_name: "Brauzer sinovi",
    username: "test_staff",
    blocked: false,
  };
  let link: any = null,
    account: any = null,
    confirmationCount = 0;
  await page.route("**/api/telegram/**", async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path.endsWith("/account"))
      return route.fulfill({
        json: { enabled: true, bot_username: "sihhat_test_bot", account, link },
      });
    if (path.endsWith("/link")) {
      link = {
        id: "b1a00000-0000-4000-8000-000000000001",
        expires_at: new Date(Date.now() + 300000).toISOString(),
        claimed: false,
        telegram_user_id: null,
        display_name: null,
        username: null,
      };
      return route.fulfill({
        status: 201,
        json: {
          id: link.id,
          expires_at: link.expires_at,
          url: "https://t.me/sihhat_test_bot?start=browser_example",
        },
      });
    }
    if (path.endsWith("/confirm")) {
      expect(route.request().postDataJSON()).toEqual({
        telegram_user_id: identity.telegram_user_id,
      });
      confirmationCount++;
      account = identity;
      link = null;
      return route.fulfill({ status: 201, json: { success: true } });
    }
    if (path.endsWith("/disconnect")) {
      account = null;
      link = null;
      return route.fulfill({ status: 201, json: { success: true } });
    }
    throw new Error("Unexpected Telegram browser route");
  });
  await login(page, "director");
  await section(page, "Telegram bot");
  await expect(
    page.getByRole("heading", { name: "Telegram hisobingizni ulang" }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Telegramga ulash", exact: true })
    .click();
  await expect(
    page.getByRole("link", { name: "Telegramda ochish ↗" }),
  ).toHaveAttribute("href", /t\.me\/sihhat_test_bot\?start=/);
  link = { ...link, ...identity, claimed: true };
  await page
    .getByRole("button", { name: "Holatni yangilash", exact: true })
    .click();
  await expect(page.getByText(/Telegram ID: 61001/)).toBeVisible();
  const confirm = page.getByRole("button", {
    name: "Bog‘lashni tasdiqlash",
    exact: true,
  });
  await expect(confirm).toBeDisabled();
  expect(confirmationCount).toBe(0);
  await page
    .getByRole("checkbox", { name: "Bu mening Telegram akkauntim" })
    .check();
  await confirm.click();
  await expect(
    page.getByRole("heading", { name: "Hisob bog‘langan" }),
  ).toBeVisible();
  expect(confirmationCount).toBe(1);
  await page
    .getByRole("button", { name: "Bog‘lanishni uzish", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Hisob bog‘langan" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Ha, uzish", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Telegram hisobingizni ulang" }),
  ).toBeVisible();
});

test("Admin va resepsion Telegram bo‘limida server xatosidan keyin qayta urinadi", async ({
  page,
}) => {
  for (const role of ["admin", "reception"] as const) {
    let fail = true;
    await page.route("**/api/telegram/account", (route) =>
      route.fulfill(
        fail
          ? {
              status: 503,
              json: {
                code: "SERVICE_UNAVAILABLE",
                message: "Sinov: bot ulanishi vaqtincha tekshirilmadi.",
              },
            }
          : {
              json: {
                enabled: false,
                bot_username: "",
                account: null,
                link: null,
              },
            },
      ),
    );
    await login(page, role);
    await section(page, "Telegram bot");
    const error = page
      .getByRole("alert")
      .filter({ hasText: "Sinov: bot ulanishi" });
    await expect(error).toBeVisible();
    fail = false;
    await error.getByRole("button", { name: "Qayta urinish" }).click();
    await expect(
      page.getByText("Bot hali yoqilmagan. Administrator bilan bog‘laning.", {
        exact: true,
      }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Telegramga ulash", exact: true }),
    ).toHaveCount(0);
    await page.getByRole("button", { name: "Chiqish", exact: true }).click();
    await page.unroute("**/api/telegram/account");
  }
});

async function section(page: Page, name: string) {
  const drawer = page.getByRole("button", {
    name: "Menyuni ochish",
    exact: true,
  });
  if (await drawer.isVisible()) await drawer.click();
  const link = page
    .locator("nav")
    .getByRole("button", { name, exact: true, includeHidden: true });
  if (!(await link.isVisible())) {
    await link
      .locator("xpath=ancestor::div[@class='nav-group']")
      .locator(".nav-group-toggle")
      .click();
  }
  await link.click();
  await expect(link).toHaveAttribute("aria-current", "page");
  await expect(page.locator("main .skeletons")).toHaveCount(0);
  await expect(page.locator("main h1").first()).toBeVisible();
}
async function rowAction(row: Locator, name: string) {
  const button = row
    .getByRole("button", { name, exact: true, includeHidden: true })
    .first();
  if (!(await button.isVisible())) {
    await button
      .locator("xpath=ancestor::div[@class='row-actions']")
      .getByRole("button", { name: /^Boshqa amallar:/ })
      .click();
  }
  await button.click();
}

for (const [role, seconds] of [
  ["admin", 7200],
  ["director", 14400],
  ["reception", 14400],
] as const) {
  test(`Faolsizlik: ${role} paneli ${seconds / 3600} soatdan keyin loginni ochadi`, async ({
    page,
  }) => {
    await login(page, role);
    await page.clock.install({ time: new Date() });
    await page.clock.fastForward((seconds - 2) * 1000);
    await expect(
      page.getByRole("button", { name: "Chiqish", exact: true }),
    ).toBeVisible();
    const loggedOut = page.waitForResponse(
      (r) => r.url().endsWith("/auth/logout") && r.status() === 201,
    );
    await page.clock.fastForward(2100);
    await expect(
      page.getByRole("button", { name: "Kirish", exact: true }),
    ).toBeVisible();
    await expect(page.getByRole("status")).toContainText("Faolsizlik sababli");
    await loggedOut;
    await page.reload();
    await expect(
      page.getByRole("button", { name: "Kirish", exact: true }),
    ).toBeVisible();
  });
}

test("Faolsizlik: foydalanuvchi harakati vaqtni uzaytiradi, avtomatik sessiya tekshiruvi esa uzaytirmaydi", async ({
  page,
}) => {
  await login(page, "director");
  await page.clock.install({ time: new Date() });
  await page.clock.fastForward((14400 - 10) * 1000);
  const touched = page.waitForResponse(
    (r) => r.url().endsWith("/auth/activity") && r.status() === 201,
  );
  await page.keyboard.press("Tab");
  await touched;
  await page.clock.fastForward(11000);
  await expect(
    page.getByRole("button", { name: "Chiqish", exact: true }),
  ).toBeVisible();
  await page.clock.fastForward(14400000);
  await expect(
    page.getByRole("button", { name: "Kirish", exact: true }),
  ).toBeVisible();
});
async function openAndCancel(page: Page, name: string) {
  await rowAction(page.locator("main"), name);
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await expect(
    dialog.getByRole("button", { name: "Yopish", exact: true }).first(),
  ).toBeEnabled();
  await dialog
    .getByRole("button", { name: "Yopish", exact: true })
    .first()
    .click();
  await expect(dialog).toHaveCount(0);
}

async function saveDialog(page: Page, name?: string) {
  const dialog = page.getByRole("dialog");
  await (
    name
      ? dialog.getByRole("button", { name, exact: true })
      : dialog.locator(".modal-footer button").last()
  ).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
}

test("Moliya auditi: refund qarori, bank dalili va abonentning lokal to‘lovi", async ({
  page,
}) => {
  test.setTimeout(150000);
  test.skip(
    !process.env.SIHHAT_WEB_ACCESS_FILE?.includes("browser-test-access"),
    "Faqat izolyatsiyalangan lokal adapterlar bilan",
  );
  await login(page, "admin");
  await page
    .getByLabel("Sanatoriyani tanlash")
    .selectOption(access.sanatoriums[0].id);
  await section(page, "Pulni qaytarish");
  const refund = page
    .locator("tbody tr")
    .filter({ hasText: "Faqat UI sinovi uchun" });
  await rowAction(refund, "Rad etish");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Yopish", exact: true })
    .first()
    .click();
  await refund.getByRole("button", { name: "Ma’qullash", exact: true }).click();
  await page.getByLabel("Qaror sababi").fill("Lokal auditda tasdiqlandi");
  await saveDialog(page);
  await expect(
    refund.getByRole("button", { name: "Jarayonga olish", exact: true }),
  ).toBeVisible();
  await refund
    .getByRole("button", { name: "Jarayonga olish", exact: true })
    .click();
  await saveDialog(page);
  await expect(refund).toContainText("Bajarilmoqda");

  await section(page, "Sanatoriyaga o‘tkazma");
  const payout = page.locator("tbody tr").first();
  await rowAction(payout, "Bekor qilish");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Yopish", exact: true })
    .first()
    .click();
  await rowAction(payout, "Ma’qullash");
  await saveDialog(page);
  await rowAction(payout, "Bank natijasi");
  await page.getByLabel("Bank o‘tkazma raqami").fill("LOCAL-UI-AUDIT-001");
  await page.getByLabel("Bank dalili").setInputFiles({
    name: "local-proof.png",
    mimeType: "image/png",
    buffer: Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+j8XcAAAAASUVORK5CYII=",
      "base64",
    ),
  });
  await page.getByLabel("Bank tekshiruvi").check();
  await saveDialog(page);
  await expect(payout).toContainText("To‘langan");
  const proof = await page.request.get(
    new URL(
      (await payout
        .getByRole("link", { name: "Dalil", exact: true })
        .getAttribute("href")) ?? "",
      page.url(),
    ).href,
  );
  expect(proof.ok()).toBe(true);

  await section(page, "Abonent va hisoblar");
  const invoice = page.locator("tbody tr").first();
  await rowAction(invoice, "To‘lash");
  await saveDialog(page, "To‘lovni ochish");
  await page
    .getByRole("button", { name: "Sinov to‘lovini tasdiqlash", exact: true })
    .click();
  await expect(invoice).toContainText("To‘langan");
  await page.getByRole("button", { name: "Abonentlar", exact: true }).click();
  await openAndCancel(page, "Yangi hisob");
});

test("Muloqot auditi: sharh javobi va moderatsiya, yordam suhbati, xabar va vazifa", async ({
  page,
  browser,
}) => {
  test.setTimeout(150000);
  test.skip(
    !process.env.SIHHAT_WEB_ACCESS_FILE?.includes("browser-test-access"),
    "Faqat alohida test hisoblari bilan",
  );
  await login(page, "admin");
  await page
    .getByLabel("Sanatoriyani tanlash")
    .selectOption(access.sanatoriums[0].id);
  await section(page, "Sharhlar");
  const review = page
    .locator("tbody tr, .feed-item")
    .filter({ hasText: "UI sinov sharhi" });
  await rowAction(review, "Javob yozish");
  await page
    .getByRole("dialog")
    .getByRole("textbox", { name: /^Javob/ })
    .fill("Fikringiz uchun rahmat");
  await saveDialog(page);
  await expect(review).toContainText("Fikringiz uchun rahmat");
  for (const name of ["Yashirish", "Ko‘rsatish"]) {
    await rowAction(review, name);
    await page.getByLabel("Moderatsiya sababi").fill("Lokal UI tekshiruvi");
    await saveDialog(page);
    await expect(review).toContainText(
      name === "Yashirish" ? "Yashirilgan" : "Ko‘rinmoqda",
    );
  }
  await section(page, "Yordam xizmati");
  const title = `UI yordam ${Date.now()}`;
  await page
    .getByRole("button", { name: "Murojaat yaratish", exact: true })
    .click();
  await page.getByLabel("Mavzu").fill(title);
  await page
    .getByLabel("Murojaat matni")
    .fill("Test hisobidagi panelni tekshirish");
  await saveDialog(page);
  await page
    .locator("tbody tr, .feed-item")
    .filter({ hasText: title })
    .getByRole("button", { name: "Ochish", exact: true })
    .click();
  await page.getByRole("button", { name: "Javob yozish", exact: true }).click();
  await page
    .getByRole("dialog")
    .getByRole("textbox", { name: /^Javob/ })
    .fill("Tekshiruv yakunlandi");
  await page.getByLabel("Murojaatni yopish").check();
  await saveDialog(page);
  await expect(page.locator("main")).toContainText("Tekshiruv yakunlandi");
  await page
    .getByRole("button", { name: "← Murojaatlarga qaytish", exact: true })
    .click();
  await expect(
    page.locator("tbody tr, .feed-item").filter({ hasText: title }),
  ).toContainText("Yopilgan");

  const context = await browser.newContext(),
    director = await context.newPage();
  await login(director, "director");
  await section(director, "Xabarlar");
  const message = director
    .locator("tbody tr, .feed-item")
    .filter({ hasText: "UI sinov xabari" });
  await rowAction(message, "Qabul qildim");
  await saveDialog(director);
  await expect(
    message.getByRole("button", { name: "Qabul qildim", exact: true }),
  ).toHaveCount(0);
  await section(director, "Vazifalar");
  const task = director
    .locator("tbody tr, .feed-item")
    .filter({ hasText: "UI sinov vazifasi" });
  await rowAction(task, "Qabul qilish");
  await saveDialog(director);
  await rowAction(task, "Bajarildi");
  await director.getByLabel("Natija").fill("Har bir holat lokal tekshirildi");
  await saveDialog(director);
  await expect(task).toContainText("Har bir holat lokal tekshirildi");
  await expect(task.getByRole("button")).toHaveCount(0);
  await section(director, "Bildirishnomalar");
  const notification = director
    .locator("tbody tr, .feed-item")
    .filter({
      has: director.getByRole("button", { name: "O‘qilgan", exact: true }),
    })
    .first();
  await rowAction(notification, "O‘qilgan");
  await saveDialog(director);
  await expect(
    director
      .locator("tbody tr, .feed-item")
      .getByRole("button", { name: "O‘qilgan", exact: true }),
  ).toHaveCount(0);
  await context.close();
});

test("Reklama: superadmin pauzadagi egadan yaratadi, barcha reklamalarni tahrirlaydi va qayta yoqadi", async ({
  page,
}) => {
  test.setTimeout(180000);
  await login(page, "admin");
  const title = "Boshqariladigan reklama " + Date.now();
  const owner = await browserApi(page, "/superadmin/sanatoriums", "POST", {
    name: "Reklama biriktirilgan sanatoriya " + Date.now(),
  });
  expect(owner.status).toBe(201);
  const paused = await browserApi(
    page,
    "/superadmin/sanatoriums/" + owner.body.id + "/pause",
    "POST",
    {
      version: owner.body.version,
      reason: "Reklama egasi katalogdagi manzildan mustaqil ekanini tekshirish",
    },
  );
  expect(paused.status).toBe(201);
  await page.reload();
  await page.getByLabel("Sanatoriyani tanlash").selectOption(owner.body.id);
  await section(page, "Reklama");
  await expect(page.getByLabel("Reklamalarni ko‘rsatish")).toHaveValue("all");
  await page
    .getByRole("button", { name: "Reklama yaratish", exact: true })
    .click();
  let form = page.getByRole("dialog");
  await form.getByLabel("Reklama sarlavhasi").fill(title);
  await form
    .getByLabel("Ochadigan sanatoriya")
    .selectOption(access.sanatoriums[0].id);
  await expect(
    form
      .getByLabel("Ochadigan sanatoriya")
      .locator("option[value='" + owner.body.id + "']"),
  ).toHaveCount(0);
  const imageFile = {
    name: "reklama.png",
    mimeType: "image/png",
    buffer: Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+j8XcAAAAASUVORK5CYII=",
      "base64",
    ),
  };
  await form.locator('input[name="photo_file"]').setInputFiles(imageFile);
  const yesterday = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tashkent",
  }).format(Date.now() - 86400000);
  await form.getByLabel("Boshlanish — sana").fill(yesterday);
  await saveDialog(page, "Tasdiqlashga yuborish");
  let row = page.locator("tbody tr").filter({ hasText: title });
  await expect(row).toContainText("Admin tasdig‘i kutilmoqda");
  // The admin list remains global when another tenant is selected.
  await page
    .getByLabel("Sanatoriyani tanlash")
    .selectOption(access.sanatoriums[1].id);
  await expect(row).toBeVisible();
  await page.getByLabel("Reklamalarni ko‘rsatish").selectOption("selected");
  await expect(row).toHaveCount(0);
  await page.getByLabel("Reklamalarni ko‘rsatish").selectOption("all");
  await rowAction(row, "Ma’qullash");
  await saveDialog(page);
  await expect(row).toContainText("Ilovada chiqmoqda");
  const firstAd = (await browserApi(page, "/catalog/ads")).body.find(
    (a: any) => a.title === title,
  );
  expect(firstAd.target.sanatorium_id).toBe(access.sanatoriums[0].id);
  expect(
    (await fetch("http://localhost:3000/api/media/" + firstAd.image_asset_id))
      .status,
  ).toBe(200);
  await rowAction(row, "Tahrirlash");
  form = page.getByRole("dialog");
  await expect(form.getByLabel("Reklama sarlavhasi")).toHaveValue(title);
  await expect(form.locator('input[name="image_asset_id"]')).toHaveValue(
    firstAd.image_asset_id,
  );
  const changedTitle = title + " yangilandi";
  await form.getByLabel("Reklama sarlavhasi").fill(changedTitle);
  await form.getByLabel("Reklama turi").selectOption("POPUP");
  await form.getByLabel("Bosilganda qayerga o‘tsin?").selectOption("URL");
  await form
    .getByRole("textbox", { name: /^Havola/ })
    .fill("https://example.com/boshqarilgan");
  await form.getByLabel("Reklama matni").fill("Yangilangan taklif");
  await form.getByLabel("Chegirma bormi?").check();
  await form.getByLabel("Chegirma foizi").fill("20");
  await form.getByLabel("Chegirma sharti").fill("Ish kunlari");
  await form
    .locator('input[name="photo_file"]')
    .setInputFiles({ ...imageFile, name: "yangi-reklama.png" });
  await saveDialog(page, "O‘zgarishlarni saqlash");
  row = page.locator("tbody tr").filter({ hasText: changedTitle });
  await expect(row).toContainText("Admin tasdig‘i kutilmoqda");
  expect(
    (await browserApi(page, "/catalog/ads")).body.some(
      (a: any) => a.id === firstAd.id,
    ),
  ).toBe(false);
  expect(
    (await fetch("http://localhost:3000/api/media/" + firstAd.image_asset_id))
      .status,
  ).toBe(404);
  await rowAction(row, "Ma’qullash");
  await saveDialog(page);
  await expect(row).toContainText("Ilovada chiqmoqda");
  const edited = (await browserApi(page, "/catalog/ads")).body.find(
    (a: any) => a.id === firstAd.id,
  );
  expect(edited.title).toBe(changedTitle);
  expect(edited.placement).toBe("POPUP");
  expect(edited.target.url).toBe("https://example.com/boshqarilgan");
  expect(edited.discount_percent).toBe(20);
  expect(edited.image_asset_id).not.toBe(firstAd.image_asset_id);
  await rowAction(row, "To‘xtatish");
  await saveDialog(page);
  await expect(row).toContainText("To‘xtatilgan");
  expect(
    (await browserApi(page, "/catalog/ads")).body.some(
      (a: any) => a.id === firstAd.id,
    ),
  ).toBe(false);
  expect(
    (await fetch("http://localhost:3000/api/media/" + edited.image_asset_id))
      .status,
  ).toBe(404);
  await rowAction(row, "Qayta yoqish");
  await saveDialog(page);
  await expect(row).toContainText("Ilovada chiqmoqda");
  expect(
    (await fetch("http://localhost:3000/api/media/" + edited.image_asset_id))
      .status,
  ).toBe(200);
  await rowAction(row, "To‘xtatish");
  await saveDialog(page);
});

test("Inventar auditi: xona turi, xona, tarif, kunlik narx, chegirma va ta’mir blokini ochish", async ({
  page,
}) => {
  test.setTimeout(180000);
  await login(page, "director");
  await section(page, "Xonalar va tariflar");
  const unique = Date.now(),
    name = `UI xona turi ${unique}`;
  await page.getByRole("button", { name: "Xona turlari", exact: true }).click();
  await page.getByRole("button", { name: "Qo‘shish", exact: true }).click();
  await page.getByLabel("Xona turi nomi").fill(name);
  await page.getByLabel("Jami mehmon sig‘imi").fill("4");
  await page.getByLabel("Kattalar sig‘imi").fill("2");
  await page.getByLabel("Bolalar sig‘imi").fill("2");
  const createdType = page.waitForResponse(
    (r) =>
      r.url().endsWith("/room-types") &&
      r.request().method() === "POST" &&
      r.status() === 201,
  );
  await saveDialog(page);
  const type = await (await createdType).json();
  await expect(page.locator("tbody")).toContainText(name);
  await page.getByRole("button", { name: "Xonalar", exact: true }).click();
  await page.getByRole("button", { name: "Qo‘shish", exact: true }).click();
  await page
    .getByRole("dialog")
    .getByRole("combobox", { name: /^Xona turi/ })
    .selectOption(type.id);
  const code = `UI-${unique}`;
  await page.getByLabel("Xona raqami").fill(code);
  await saveDialog(page);
  await expect(page.locator("tbody")).toContainText(code);
  await page.getByRole("button", { name: "Tariflar", exact: true }).click();
  await page.getByRole("button", { name: "Qo‘shish", exact: true }).click();
  const form = page.getByRole("dialog"),
    rateName = `UI tarif ${unique}`;
  await form
    .getByRole("combobox", { name: /^Xona turi/ })
    .selectOption(type.id);
  await form.getByLabel("Tarif nomi").fill(rateName);
  await form.getByLabel("Hisob usuli").selectOption("ROOM");
  await form.getByLabel("Bir tun narxi").fill("250000");
  await form.getByLabel("Qaytarish sharti").selectOption({ index: 1 });
  await saveDialog(page);
  const rate = page.locator("tbody tr").filter({ hasText: rateName });
  await rowAction(rate, "Tahrirlash");
  await page.getByLabel("Yangi narx").fill("350000");
  await saveDialog(page);
  await expect(rate).toContainText("350 000");
  const localDay = (offset: number) =>
    new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Tashkent" }).format(
      Date.now() + offset * 86400000,
    );
  await rowAction(rate, "Kunlik narx");
  await page.getByRole("dialog").getByLabel(/^Sana/).fill(localDay(5));
  await page.getByLabel("Kunlik narx (so‘m)").fill("200000");
  await page.getByLabel("Bu kun sotuvga yopiq").check();
  await saveDialog(page);
  await expect(
    page.locator(".card").filter({
      has: page.getByRole("heading", {
        name: "Kunlik o‘zgarishlar",
        exact: true,
      }),
    }),
  ).toContainText("Yopiq");
  await page.getByRole("button", { name: "Chegirmalar", exact: true }).click();
  await page.getByRole("button", { name: "Qo‘shish", exact: true }).click();
  await page.getByLabel("Chegirma nomi").fill(`UI chegirma ${unique}`);
  await page.getByRole("dialog").getByLabel(/^Turi/).selectOption("PERCENT");
  await page.getByLabel("Foiz yoki so‘m").fill("15");
  await page.getByLabel("Boshlanish — sana").fill(localDay(5));
  await page.getByLabel("Tugash — sana").fill(localDay(7));
  await saveDialog(page);
  await expect(page.locator("tbody")).toContainText("15%");
  await page
    .getByRole("button", { name: "Bandlik kalendari", exact: true })
    .click();
  await page.getByRole("button", { name: "Ta’mir bloki", exact: true }).click();
  await page
    .getByRole("dialog")
    .getByLabel(/^Xona/)
    .selectOption({ label: code });
  await page.getByLabel("Sabab").fill(`UI ta’mir ${unique}`);
  await saveDialog(page);
  const block = page
    .locator("tbody tr")
    .filter({ hasText: `UI ta’mir ${unique}` });
  await block
    .getByRole("button", { name: "Blokni ochish", exact: true })
    .click();
  await page.getByLabel("Sabab").fill("Lokal auditda ta’mir yakunlandi");
  await saveDialog(page);
  await expect(block).toHaveCount(0);
  await expect(page.locator(".error-box")).toHaveCount(0);
});

test("Hisobchi: faqat hisobotlar, barcha davrlar, CSV va mobil ko‘rinish", async ({
  page,
}) => {
  test.skip(
    !access.accountant,
    "Hisobchi hisobini npm run test:web:fixture yaratadi.",
  );
  await login(page, "accountant");
  await expect(
    page.getByRole("heading", { name: "Hisobchi hisobotlari", exact: true }),
  ).toBeVisible();
  await expect(page.getByText("HISOBCHI", { exact: true })).toBeVisible();
  const nav = page.getByRole("navigation", { name: "Asosiy menyu" });
  await expect(nav.locator(".nav-link")).toHaveCount(3);
  await expect(
    nav.getByRole("button", { name: "Hisobotlar", exact: true }),
  ).toBeVisible();
  for (const section of [
    "Bronlar",
    "Anketalar",
    "Sanatoriya profili",
    "To‘lovlar",
    "Jamoa va ruxsatlar",
  ])
    await expect(
      page.getByRole("button", { name: section, exact: true }),
    ).toHaveCount(0);
  const today = await page.evaluate(() => {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Tashkent",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(new Date());
    return ["year", "month", "day"]
      .map((type) => parts.find((p) => p.type === type)!.value)
      .join("-");
  });
  const shift = (date: string, days: number) =>
    new Date(Date.parse(date) + days * 86400000).toISOString().slice(0, 10);
  for (const [label, days] of [
    ["Bugun", 1],
    ["7 kun", 7],
    ["30 kun", 30],
    ["90 kun", 90],
  ] as const) {
    const pending = page.waitForResponse(
      (r) =>
        new URL(r.url()).pathname === "/api/partner/reports" &&
        r.status() === 200,
    );
    await page.getByRole("button", { name: label, exact: true }).click();
    const response = await pending,
      params = new URL(response.url()).searchParams;
    expect(params.get("from")).toBe(shift(today, 1 - days));
    expect(params.get("to")).toBe(shift(today, 1));
    expect(params.get("financial")).toBe("true");
    await expect(
      page.getByText("Onlayn tushum", { exact: true }),
    ).toBeVisible();
  }
  await page.getByRole("button", { name: "Oy bo‘yicha", exact: true }).click();
  const monthReport = page.waitForResponse(
    (r) =>
      new URL(r.url()).pathname === "/api/partner/reports" &&
      new URL(r.url()).searchParams.get("from") === "2028-02-01",
  );
  await page.getByLabel("Hisobot oyi", { exact: true }).fill("2028-02");
  expect((await monthReport).status()).toBe(200);
  await page.getByLabel("Oldingi davr bilan solishtirish").check();
  await expect(
    page.getByRole("heading", {
      name: "Oldingi davr bilan solishtirish",
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    page.getByText("01.01.2028 — 31.01.2028", { exact: true }),
  ).toBeVisible();
  const downloadable = page.waitForEvent("download");
  await page
    .getByRole("link", { name: "CSV yuklash (Excel)", exact: true })
    .click();
  const download = await downloadable;
  expect(download.suggestedFilename()).toBe(
    "sihhat-report-2028-02-01-2028-03-01.csv",
  );
  const csv = readFileSync((await download.path())!, "utf8");
  expect(csv).toContain("29");
  expect(csv).toContain("2028-02-29");
  expect(csv).toContain("Tasdiqlangan onlayn to‘lovlar");
  await page
    .getByRole("button", { name: "Sana oralig‘i", exact: true })
    .click();
  await page.getByLabel("Davr boshi", { exact: true }).fill("2028-02-29");
  const custom = page.waitForResponse(
    (r) =>
      new URL(r.url()).pathname === "/api/partner/reports" &&
      new URL(r.url()).searchParams.get("from") === "2028-02-29",
  );
  await page.getByLabel("Davr oxiri", { exact: true }).fill("2028-02-29");
  const customResult = await custom;
  expect(new URL(customResult.url()).searchParams.get("to")).toBe("2028-03-01");
  await expect(
    page.getByText("29.02.2028 — 29.02.2028 · Ikkala sana ham kiradi.", {
      exact: true,
    }),
  ).toBeVisible();
  for (const path of ["/partner/bookings", "/surveys", "/partner/payments"])
    expect((await browserApi(page, path)).status).toBe(403);
  await page.goto("http://localhost:3001/bookings");
  await expect(page.getByRole("alert")).toContainText("ruxsat yo‘q");
  await page.getByRole("button", { name: "Hisobotlar", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Hisobchi hisobotlari", exact: true }),
  ).toBeVisible();
  await expect(page.getByText("Onlayn tushum", { exact: true })).toBeVisible();
  mkdirSync(".local/screenshots", { recursive: true });
  await page.screenshot({
    path: ".local/screenshots/accountant-reports.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: ".local/screenshots/accountant-mobile.png",
    fullPage: true,
  });
  await page.emulateMedia({ media: "print" });
  await expect(page.locator(".report-downloads")).toBeHidden();
  await expect(
    page.getByRole("heading", { name: "Hisobchi hisobotlari", exact: true }),
  ).toBeVisible();
  await page.setViewportSize({ width: 794, height: 1123 });
  await page.screenshot({
    path: ".local/screenshots/accountant-print.png",
    fullPage: true,
  });
});
test("Hisobot auditi: uch sana mezoni, davr filtri va CSV eksport", async ({
  page,
}) => {
  await login(page, "director");
  await section(page, "Umumiy ko‘rinish");
  for (const basis of ["CREATED", "PAYMENT", "SERVICE"]) {
    await page.getByLabel("Bron hisobi mezoni").selectOption(basis);
    await expect(page.locator("main .skeletons")).toHaveCount(0);
    await expect(page.locator("main .error-box")).toHaveCount(0);
  }
  const date = new Date().toISOString().slice(0, 10);
  await page.getByLabel("Davr boshi").fill(date.slice(0, 8) + "01");
  await expect(page.locator("main .skeletons")).toHaveCount(0);
  const link = page.getByRole("link", {
    name: "CSV hisobotni yuklash",
    exact: true,
  });
  const exported = await page.request.get(
    new URL((await link.getAttribute("href")) ?? "", page.url()).href,
  );
  expect(exported.ok()).toBe(true);
  expect(exported.headers()["content-type"]).toContain("text/csv");
  expect((await exported.body()).length).toBeGreaterThan(20);
});

for (const role of ["admin", "director", "reception"] as const) {
  test(`Panel auditi: ${role} barcha bo‘limlar, yuqori tugmalar va telefon menyusi`, async ({
    page,
  }, testInfo) => {
    test.setTimeout(240000);
    const faults: string[] = [];
    page.on("pageerror", (e) => faults.push(e.message));
    await login(page, role);
    const names = await page.locator("nav .nav-link").allTextContents();
    const reviewed: { section: string; controls: string[] }[] = [];
    for (const name of names) {
      await test.step(name.trim(), async () => {
        await section(page, name.trim());
        await expect(page.locator("main .error-box")).toHaveCount(0);
        reviewed.push({
          section: name.trim(),
          controls: await page.locator("main button").allTextContents(),
        });
      });
    }
    await page
      .getByRole("button", { name: "Parolni almashtirish", exact: true })
      .click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await page.getByLabel("Bildirishnomalar", { exact: true }).click();
    await expect(page.locator("main h1")).toHaveText("Bildirishnomalar");
    await page.setViewportSize({ width: 390, height: 844 });
    await section(page, names[0].trim());
    await expect(page.locator(".sidebar")).not.toHaveClass(/open/);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth + 1,
      ),
    ).toBe(true);
    mkdirSync(".local/ui-review", { recursive: true });
    writeFileSync(
      `.local/ui-review/${role}-controls.json`,
      JSON.stringify(reviewed, null, 2),
    );
    await page.screenshot({
      path: `.local/ui-review/${role}-mobile.png`,
      fullPage: true,
    });
    await testInfo.attach("Bo‘limlar va ko‘rinadigan tugmalar", {
      body: JSON.stringify(reviewed, null, 2),
      contentType: "application/json",
    });
    expect(faults).toEqual([]);
    await page.getByRole("button", { name: "Chiqish", exact: true }).click();
    await expect(
      page.getByRole("button", { name: "Kirish", exact: true }),
    ).toBeVisible();
  });
}

test("Panel auditi: barcha asosiy yaratish oynalari, tahrirlar va kalendar bo‘sh sanasi", async ({
  page,
}) => {
  test.setTimeout(240000);
  const faults: string[] = [];
  page.on("pageerror", (e) => faults.push(e.message));
  await login(page, "admin");
  await page
    .getByLabel("Sanatoriyani tanlash")
    .selectOption(access.sanatoriums[0].id);
  await section(page, "Sanatoriyalar");
  await openAndCancel(page, "Yangi sanatoriya");
  const row = page.locator("tbody tr").first();
  const rowButtons = await row.locator("button.text-button").allTextContents();
  for (const name of rowButtons.filter(
    (name) => name.trim() !== "Profilni ko‘rish",
  )) {
    await rowAction(row, name.trim());
    await expect(page.getByRole("dialog")).toBeVisible();
    await page
      .getByRole("dialog")
      .getByRole("button", { name: "Yopish", exact: true })
      .first()
      .click();
  }
  await section(page, "Jamoa va ruxsatlar");
  await openAndCancel(page, "Xodim taklif qilish");
  const staffRow = page
    .locator("tbody tr")
    .filter({
      has: page.getByRole("button", {
        name: "Ruxsatlar",
        exact: true,
        includeHidden: true,
      }),
    })
    .first();
  if (await staffRow.count()) {
    for (const label of ["Ruxsatlar", "Parolni tiklash", "Bloklash"]) {
      if (
        await staffRow
          .getByRole("button", {
            name: label,
            exact: true,
            includeHidden: true,
          })
          .count()
      ) {
        await rowAction(staffRow, label);
        await expect(page.getByRole("dialog")).toBeVisible();
        await page
          .getByRole("dialog")
          .getByRole("button", { name: "Yopish", exact: true })
          .first()
          .click();
      }
    }
  }
  await section(page, "Xonalar va tariflar");
  await page.getByLabel("Kalendar boshi").fill("");
  await expect(page.locator(".calendar")).toBeVisible();
  await expect(page.getByLabel("Kalendar boshi")).not.toHaveValue("");
  await openAndCancel(page, "Ta’mir bloki");
  for (const tab of ["Xona turlari", "Xonalar", "Tariflar", "Chegirmalar"]) {
    await page
      .locator("main")
      .getByRole("button", { name: tab, exact: true })
      .click();
    await openAndCancel(page, "Qo‘shish");
  }
  for (const [menu, button] of [
    ["Sanatoriyaga o‘tkazma", "O‘tkazma tayyorlash"],
    ["Xabarlar", "Xabar yuborish"],
    ["Vazifalar", "Vazifa berish"],
    ["Yordam xizmati", "Murojaat yaratish"],
    ["To‘lovlarni solishtirish", "Reestr import qilish"],
    ["Yangilik va tavsiyalar", "Maqola yozish"],
    ["Reklama", "Reklama so‘rash"],
  ]) {
    await section(page, menu);
    await openAndCancel(page, button);
  }
  await section(page, "Abonent va hisoblar");
  for (const [tab, button] of [
    ["Abonent tariflari", "Tarif yaratish"],
    ["Abonentlar", "Abonent biriktirish"],
    ["Refund shartlari", "Yangi shart"],
  ]) {
    await page
      .locator("main")
      .getByRole("button", { name: tab, exact: true })
      .click();
    await openAndCancel(page, button);
  }
  expect(faults).toEqual([]);
});

test("Anketa: uch javob turi, majburiy maydon, saqlangan javob va admin natijasi", async ({
  page,
  browser,
}) => {
  test.setTimeout(150000);
  await login(page, "admin");
  const title = `UI tekshiruv anketasi ${Date.now()}`;
  await section(page, "Anketalar");
  await page
    .getByRole("button", { name: "Anketa yaratish", exact: true })
    .click();
  await page.getByLabel("Savollar soni").fill("3");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Saqlash", exact: true })
    .click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByLabel("Anketa nomi")).toBeVisible();
  await dialog.getByLabel("Anketa nomi").fill(title);
  for (const checkbox of await dialog
    .locator('input[name="sanatorium_ids"]')
    .all())
    await checkbox.check();
  await dialog
    .getByRole("textbox", { name: /^1-savol/ })
    .fill("Xizmat haqida fikringiz");
  await dialog.getByRole("textbox", { name: /^2-savol/ }).fill("Tayyormisiz");
  await dialog
    .getByRole("textbox", { name: /^3-savol/ })
    .fill("Mehmonlar soni");
  await dialog.getByLabel("2-javob turi").selectOption("BOOLEAN");
  await dialog.getByLabel("3-javob turi").selectOption("NUMBER");
  await dialog.getByRole("button", { name: "Saqlash", exact: true }).click();
  await expect(dialog).toHaveCount(0);
  const context = await browser.newContext();
  const director = await context.newPage();
  await login(director, "director");
  await section(director, "Anketalar");
  const row = director
    .locator("tbody tr, .feed-item")
    .filter({ hasText: title });
  await rowAction(row, "Javob berish");
  const answer = director.getByRole("dialog");
  await answer
    .getByLabel("Xizmat haqida fikringiz")
    .fill("Qulay va tushunarli");
  await answer.getByLabel("Tayyormisiz").selectOption("false");
  await answer.getByLabel("Mehmonlar soni").fill("2");
  await answer.getByRole("button", { name: "Saqlash", exact: true }).click();
  await expect(answer).toHaveCount(0);
  await expect(row).toContainText("Javob berilgan");
  await director.reload();
  await expect(row).toContainText("Javob berilgan");
  await rowAction(row, "Javobimni ko‘rish");
  await expect(director.locator("main")).toContainText("Qulay va tushunarli");
  await expect(director.locator("main")).toContainText("Yo‘q");
  await director
    .locator("main")
    .getByRole("button", { name: "Yopish", exact: true })
    .first()
    .click();
  await page.reload();
  await expect(
    page.locator("tbody tr, .feed-item").filter({ hasText: title }),
  ).toContainText("1 /");
  await context.close();
});

test("Reklama: joy tanlash, chegirma, sana, ma’qullash va to‘xtatish public bo‘shliqni boshqaradi", async ({
  page,
  browser,
}) => {
  test.setTimeout(180000);
  const context = await browser.newContext(),
    director = await context.newPage();
  await login(director, "director");
  const title = `UI reklama ${Date.now()}`;
  await section(director, "Reklama");
  await director
    .getByRole("button", { name: "Reklama so‘rash", exact: true })
    .click();
  const form = director.getByRole("dialog");
  await form.getByLabel("Reklama sarlavhasi").fill(title);
  await form.getByLabel("Bosilganda qayerga o‘tsin?").selectOption("URL");
  await form
    .getByRole("textbox", { name: /^Havola/ })
    .fill("https://example.com/taklif");
  await form
    .getByRole("button", { name: "Profil rasmi 1", exact: true })
    .click();
  await form.getByLabel("Chegirma bormi?").check();
  await form.getByLabel("Chegirma foizi").fill("15");
  await form.getByLabel("Chegirma sharti").fill("Ish kunlarida");
  await form.getByRole("button", { name: "7 kun", exact: true }).click();
  const localDay = (offset: number) =>
    new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Tashkent" }).format(
      Date.now() + offset * 86400000,
    );
  await form.getByLabel("Boshlanish — sana").fill(localDay(-1));
  await form.getByLabel("Tugash — sana").fill(localDay(7));
  await form
    .getByRole("button", { name: "Tasdiqlashga yuborish", exact: true })
    .click();
  await expect(form).toHaveCount(0);
  await login(page, "admin");
  await page
    .getByLabel("Sanatoriyani tanlash")
    .selectOption(access.sanatoriums[0].id);
  await section(page, "Reklama");
  const row = page.locator("tbody tr").filter({ hasText: title });
  await rowAction(row, "Ma’qullash");
  await saveDialog(page);
  await expect(row).toContainText("Tasdiqlangan");
  const publicAds = await browserApi(page, "/catalog/ads");
  expect(publicAds.body.some((ad: any) => ad.title === title)).toBe(true);
  await rowAction(row, "To‘xtatish");
  await saveDialog(page);
  await expect(row).toContainText("Arxivlangan");
  expect(
    (await browserApi(page, "/catalog/ads")).body.some(
      (ad: any) => ad.title === title,
    ),
  ).toBe(false);
  await context.close();
});
